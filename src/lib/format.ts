/**
 * Locale-aware formatting utilities using the built-in Intl API.
 * Hermes (RN 0.85 / SDK 56) ships full Intl support — no polyfill needed.
 *
 * These are intentionally separate from i18next: translated strings handle
 * copy, while Intl handles structured data (dates, numbers, distances).
 */

/** ISO 8601 date string or Date object */
type DateLike = string | Date;

function toDate(value: DateLike): Date {
  return typeof value === 'string' ? new Date(value) : value;
}

/**
 * Formats an event date for display in a listing card.
 * en-GB: "Sat 14 Jun · 8:00 pm"
 * en-US: "Sat Jun 14 · 8:00 PM"
 * fr:    "sam. 14 juin · 20:00"
 * de:    "Sa., 14. Juni · 20:00 Uhr"
 */
export function formatEventDate(value: DateLike, locale: string): string {
  const date = toDate(value);
  const datePart = new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(date);
  const timePart = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
  return `${datePart} · ${timePart}`;
}

/**
 * Formats an event date with the full month name for detail screens.
 * en-GB: "Saturday, 14 June 2026"
 * en-US: "Saturday, June 14, 2026"
 */
export function formatEventDateLong(value: DateLike, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(toDate(value));
}

/**
 * Formats a time-only string for doors/show-start labels.
 * en-GB: "7:30 pm"
 * en-US: "7:30 PM"
 * fr/de: "19:30"
 */
export function formatTime(value: DateLike, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(toDate(value));
}

/**
 * Formats a distance for venue proximity.
 * UK/US: miles  →  "0.3 mi" / "1.2 mi"
 * FR/DE: km     →  "0.5 km" / "2.1 km"
 */
export function formatDistance(metres: number, locale: string): string {
  const usesMiles = locale.startsWith('en-US') || locale === 'en-GB' || locale === 'en';

  if (usesMiles) {
    const miles = metres / 1609.344;
    return miles < 0.1
      ? '< 0.1 mi'
      : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(miles)} mi`;
  }

  const km = metres / 1000;
  return km < 0.1
    ? '< 0.1 km'
    : `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(km)} km`;
}

/**
 * Formats a ticket price. Assumes the value is already in the correct currency
 * for the locale (price is stored per-event from Supabase).
 * en-GB: "£12.00"
 * en-US: "$15.00"
 * fr/de: "12,00 €"
 */
export function formatPrice(amount: number, currencyCode: string, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}
