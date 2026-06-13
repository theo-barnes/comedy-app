import * as Sentry from '@sentry/react-native';
import { env } from '@/lib/env';

/** * Crash reporting — initialized once at app start (see app/_layout.tsx).
 * * Privacy rules enforced here:
 * * - No-op when EXPO_PUBLIC_SENTRY_DSN is not configured (local dev default).
 * * - Disabled in dev builds so local errors never leave the machine.
 * * - sendDefaultPii: false plus a beforeSend scrubber: no emails, usernames,
 * *   IP addresses, or request payloads (which could carry auth tokens) are sent.
 * * - Console breadcrumbs are dropped — they may echo tokens or user data. */
export function initSentry(): void {
  const dsn = env?.EXPO_PUBLIC_SENTRY_DSN;
  const isTest =
    process.env.NODE_ENV === 'test' || typeof process.env.JEST_WORKER_ID !== 'undefined';

  if (!dsn || (__DEV__ && !isTest)) return;

  Sentry.init({
    dsn,
    enabled: !__DEV__ || isTest,
    sendDefaultPii: false,
    tracesSampleRate: 0.2,

    beforeSend(event) {
      if (event.user) {
        delete event.user.email;
        delete event.user.username;
        delete event.user.ip_address;
      }

      delete event.request;
      return event;
    },

    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === 'console') return null;
      return breadcrumb;
    },
  });
}

export { Sentry };
