import { randomUUID } from 'expo-crypto';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod/v3';

import { ApiError } from '@/lib/api/client';
import {
  updateEventDraft,
  useCreateNativeEvent,
  type NativeEventInput,
  type VenueEvent,
} from '@/lib/api/events';
import { useEvent } from '@/lib/api/gig-posters';
import { IncompleteStoredValueError, LargeSecureStore } from '@/lib/large-secure-store';

import { nativeEventInputSchema } from './event-form';

const legacyJournalSchema = z.object({
  version: z.literal(1),
  key: z.string().uuid(),
  input: nativeEventInputSchema,
  eventId: z.string().min(1).optional(),
  posterWanted: z.boolean(),
});
const journalSchema = z.object({
  version: z.literal(2),
  key: z.string().uuid(),
  input: nativeEventInputSchema,
  creationInput: nativeEventInputSchema,
  eventId: z.string().min(1).optional(),
});
export type PendingPublication = z.infer<typeof journalSchema>;
export const publicationJournalKey = (userId: string) => `gig-publication.${userId}`;

export class InvalidPublicationJournalError extends Error {
  constructor() {
    super('events.poster.invalidRecovery');
    this.name = 'InvalidPublicationJournalError';
  }
}

export async function readPublication(userId: string): Promise<PendingPublication | null> {
  let value: string | null;
  try {
    value = await LargeSecureStore.getItem(publicationJournalKey(userId), {
      requireComplete: true,
    });
  } catch (failure) {
    if (failure instanceof IncompleteStoredValueError) {
      throw new InvalidPublicationJournalError();
    }
    throw failure;
  }
  if (value === null) return null;
  try {
    const record = z.union([journalSchema, legacyJournalSchema]).parse(JSON.parse(value));
    if (record.version === 2) return record;
    return {
      version: 2,
      key: record.key,
      input: record.input,
      creationInput: record.input,
      eventId: record.eventId,
    };
  } catch (failure) {
    if (failure instanceof SyntaxError || failure instanceof z.ZodError) {
      throw new InvalidPublicationJournalError();
    }
    throw failure;
  }
}

export function useEventPublication(userId: string, enabled: boolean, draftId?: string) {
  const prepare = useCreateNativeEvent(userId);
  const [pending, setPending] = useState<PendingPublication | null>(null);
  const [created, setCreated] = useState<VenueEvent | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [journalRecovered, setJournalRecovered] = useState(false);
  const [recoveryError, setRecoveryError] = useState<Error | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isPending, setIsPending] = useState(false);
  const alive = useRef(true);
  const busy = useRef(false);
  const activeEventId = created?.id ?? (pending ? pending.eventId : draftId);
  const eventQuery = useEvent(activeEventId, enabled && !!activeEventId);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  async function recover() {
    if (!enabled || busy.current) return;
    busy.current = true;
    setIsPending(true);
    try {
      const record = await readPublication(userId);
      if (alive.current) {
        setPending(record);
        setJournalRecovered(!!record);
      }
    } catch (failure) {
      if (alive.current) setRecoveryError(asError(failure));
    } finally {
      busy.current = false;
      if (alive.current) {
        setLoaded(true);
        setIsPending(false);
      }
    }
  }

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    void readPublication(userId).then(
      (record) => {
        if (!cancelled) {
          setPending(record);
          setJournalRecovered(!!record);
          setLoaded(true);
        }
      },
      (failure: unknown) => {
        if (!cancelled) {
          setRecoveryError(asError(failure));
          setLoaded(true);
        }
      },
    );
    return () => {
      cancelled = true;
    };
  }, [enabled, userId]);

  const recovered = eventQuery.data;
  const ownedRecovered = recovered?.venueId === userId ? recovered : null;
  const currentEvent =
    created && ownedRecovered
      ? (ownedRecovered.posterRevision ?? 0) >= (created.posterRevision ?? 0)
        ? ownedRecovered
        : created
      : (created ?? ownedRecovered);

  async function submit(input?: NativeEventInput) {
    if (!enabled || busy.current || recoveryError || !loaded) {
      return null;
    }
    if (currentEvent?.publicationStatus === 'published') return currentEvent;
    if ((pending?.eventId || draftId) && !currentEvent) {
      setError(new Error('events.poster.refreshFailed'));
      return null;
    }
    if (draftId && pending && pending.eventId !== draftId) {
      setError(new Error('events.poster.otherPreparation'));
      return null;
    }
    const record: PendingPublication | null =
      (pending
        ? {
            ...pending,
            ...(currentEvent && input ? { input } : {}),
            ...(currentEvent ? { eventId: currentEvent.id } : {}),
          }
        : null) ??
      (input
        ? {
            version: 2,
            key: randomUUID(),
            input,
            creationInput: input,
            ...(currentEvent ? { eventId: currentEvent.id } : {}),
          }
        : null);
    if (!record) return null;
    busy.current = true;
    setIsPending(true);
    setError(null);
    let posting = false;
    try {
      await LargeSecureStore.setItem(publicationJournalKey(userId), JSON.stringify(record));
      if (!alive.current) return null;
      setPending(record);
      posting = true;
      const event = currentEvent
        ? await updateEventDraft(currentEvent.id, record.input, currentEvent.posterRevision ?? 0)
        : await prepare.mutateAsync({
            ...record.creationInput,
            idempotencyKey: record.key,
          });
      if (!alive.current) return null;
      setCreated(event);
      const saved = { ...record, eventId: event.id };
      await LargeSecureStore.setItem(publicationJournalKey(userId), JSON.stringify(saved));
      if (alive.current) setPending(saved);
      return alive.current ? event : null;
    } catch (failure) {
      if (!alive.current) return null;
      if (posting && !currentEvent && failure instanceof ApiError && failure.status === 422) {
        try {
          await LargeSecureStore.removeItem(publicationJournalKey(userId));
          if (alive.current) {
            setPending(null);
            setJournalRecovered(false);
          }
        } catch (clearFailure) {
          if (alive.current) setError(asError(clearFailure));
          return null;
        }
      }
      if (alive.current) setError(asError(failure));
      return null;
    } finally {
      busy.current = false;
      if (alive.current) setIsPending(false);
    }
  }

  async function clear(): Promise<boolean> {
    if (busy.current) return false;
    busy.current = true;
    setIsPending(true);
    setError(null);
    try {
      await LargeSecureStore.removeItem(publicationJournalKey(userId));
      if (!alive.current) return false;
      setPending(null);
      setCreated(null);
      setJournalRecovered(false);
      setRecoveryError(null);
      setLoaded(true);
      return true;
    } catch (failure) {
      if (alive.current) setError(asError(failure));
      return false;
    } finally {
      busy.current = false;
      if (alive.current) setIsPending(false);
    }
  }

  return {
    pending,
    journalRecovered,
    created: currentEvent,
    setCreated,
    recovering: (enabled && !loaded) || (!!activeEventId && !created && eventQuery.isPending),
    recoveryError:
      recoveryError ??
      (draftId && pending && pending.eventId !== draftId
        ? new Error('events.poster.otherPreparation')
        : null) ??
      (!created
        ? (eventQuery.error ??
          (recovered && !ownedRecovered ? new Error('events.poster.notOwner') : null))
        : null),
    error,
    isPending,
    submit,
    clear,
    discardInvalidJournal: () =>
      loaded && recoveryError instanceof InvalidPublicationJournalError
        ? clear()
        : Promise.resolve(false),
    retryRecovery: () => {
      if (activeEventId) {
        void eventQuery.refetch();
      } else {
        setLoaded(false);
        setRecoveryError(null);
        void recover();
      }
    },
  };
}

function asError(failure: unknown): Error {
  return failure instanceof Error ? failure : new Error('events.create.publishFailed');
}
