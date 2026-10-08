import { z } from 'zod/v3';

function isLocalDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 16) === value;
}

function isTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en', { timeZone: value }).format();
    return true;
  } catch (error) {
    if (error instanceof RangeError) return false;
    throw error;
  }
}

const localDateTime = z.string().refine(isLocalDateTime, 'events.create.validation.dateTime');

export const nativeEventInputSchema = z
  .object({
    title: z.string().trim().min(1, 'events.create.validation.title').max(200),
    description: z.string().trim().max(2000).optional(),
    localStartTime: localDateTime,
    localEndTime: localDateTime.optional(),
    timeZone: z.string().trim().refine(isTimeZone, 'events.create.validation.timeZone'),
    ticketUrl: z
      .string()
      .url('events.create.validation.ticketUrl')
      .refine((value) => value.startsWith('https://'), 'events.create.validation.ticketUrl')
      .optional(),
  })
  .refine(
    (value) => !value.localEndTime || value.localEndTime > value.localStartTime,
    'events.create.validation.endTime',
  );

export const venueLocationSchema = z.object({
  name: z.string().trim().min(1, 'events.create.validation.venueName').max(120),
  address: z.string().trim().min(1, 'events.create.validation.address').max(300),
  latitude: z
    .string()
    .trim()
    .min(1, 'events.create.validation.coordinates')
    .pipe(z.coerce.number().finite().min(-90).max(90)),
  longitude: z
    .string()
    .trim()
    .min(1, 'events.create.validation.coordinates')
    .pipe(z.coerce.number().finite().min(-180).max(180)),
});
