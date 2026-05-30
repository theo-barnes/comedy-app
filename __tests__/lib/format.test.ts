import {
  formatEventDate,
  formatEventDateLong,
  formatTime,
  formatDistance,
  formatPrice,
} from '@/lib/format';

// A fixed Saturday at 20:00 UTC to avoid timezone-dependent flakiness.
// Using UTC midnight offset so the display time is stable across environments.
const DATE = new Date('2026-06-13T20:00:00Z');

describe('formatEventDate', () => {
  it('includes weekday, day, month and time separated by ·', () => {
    const result = formatEventDate(DATE, 'en-GB');
    expect(result).toContain('·');
    // Contains a recognisable part of the date
    expect(result).toMatch(/Jun/i);
  });

  it('accepts an ISO string as well as a Date object', () => {
    const fromString = formatEventDate('2026-06-13T20:00:00Z', 'en-GB');
    const fromDate = formatEventDate(DATE, 'en-GB');
    expect(fromString).toBe(fromDate);
  });
});

describe('formatEventDateLong', () => {
  it('includes the full month name and year', () => {
    const result = formatEventDateLong(DATE, 'en-GB');
    expect(result).toMatch(/June/i);
    expect(result).toMatch(/2026/);
  });

  it('includes the full weekday name', () => {
    const result = formatEventDateLong(DATE, 'en-US');
    expect(result).toMatch(/Saturday/i);
  });
});

describe('formatTime', () => {
  it('returns a time string', () => {
    const result = formatTime(DATE, 'en-US');
    // Should contain digits and a colon
    expect(result).toMatch(/\d+:\d+/);
  });

  it('accepts a string date', () => {
    const fromString = formatTime('2026-06-13T20:00:00Z', 'en-US');
    const fromDate = formatTime(DATE, 'en-US');
    expect(fromString).toBe(fromDate);
  });
});

describe('formatDistance', () => {
  it('returns miles for en-US locale', () => {
    const result = formatDistance(1609, 'en-US');
    expect(result).toContain('mi');
  });

  it('returns miles for en locale', () => {
    const result = formatDistance(1609, 'en');
    expect(result).toContain('mi');
  });

  it('returns km for fr locale', () => {
    const result = formatDistance(1000, 'fr');
    expect(result).toContain('km');
  });

  it('returns km for de locale', () => {
    const result = formatDistance(1000, 'de');
    expect(result).toContain('km');
  });

  it('returns < 0.1 mi for very short distances in en-US', () => {
    const result = formatDistance(10, 'en-US');
    expect(result).toBe('< 0.1 mi');
  });

  it('returns < 0.1 km for very short distances in fr', () => {
    const result = formatDistance(10, 'fr');
    expect(result).toBe('< 0.1 km');
  });

  it('converts 1609.344 metres to approximately 1 mi', () => {
    const result = formatDistance(1609.344, 'en-US');
    expect(result).toMatch(/^1(\.\d)? mi$/);
  });
});

describe('formatPrice', () => {
  it('formats GBP with £ symbol', () => {
    const result = formatPrice(12, 'GBP', 'en-GB');
    expect(result).toContain('£');
    expect(result).toContain('12');
  });

  it('formats USD with $ symbol', () => {
    const result = formatPrice(15, 'USD', 'en-US');
    expect(result).toContain('$');
    expect(result).toContain('15');
  });

  it('formats EUR for fr locale', () => {
    const result = formatPrice(12, 'EUR', 'fr');
    expect(result).toContain('€');
    expect(result).toContain('12');
  });

  it('formats zero price', () => {
    const result = formatPrice(0, 'GBP', 'en-GB');
    expect(result).toContain('£');
  });
});
