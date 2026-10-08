import { nativeEventInputSchema, venueLocationSchema } from '@/features/events/event-form';

const input = {
  title: 'Friday comedy',
  localStartTime: '2027-02-12T20:00',
  timeZone: 'Europe/London',
};

describe('native event input', () => {
  it('trims titles and supports overnight shows with an explicit end date', () => {
    expect(
      nativeEventInputSchema.parse({
        ...input,
        title: '  Friday comedy  ',
        localEndTime: '2027-02-13T01:00',
      }),
    ).toEqual({ ...input, localEndTime: '2027-02-13T01:00' });
  });

  it.each([
    { title: '   ' },
    { localStartTime: '2027-02-30T20:00' },
    { localStartTime: '2027-02-12T25:00' },
    { localStartTime: '2027-02-12T20:00Z' },
    { localEndTime: '2027-02-12T19:00' },
    { timeZone: 'not-a-timezone' },
    { ticketUrl: 'http://tickets.example.com/show' },
    { ticketUrl: 'not a URL' },
  ])('rejects invalid input %j without throwing', (override) => {
    expect(nativeEventInputSchema.safeParse({ ...input, ...override }).success).toBe(false);
  });

  it('requires coordinates without coercing empty text to zero', () => {
    expect(
      venueLocationSchema.safeParse({
        name: 'Comedy Cellar',
        address: '10 High Street',
        latitude: '',
        longitude: '',
      }).success,
    ).toBe(false);
  });

  it('accepts valid zero coordinates and rejects out-of-range values', () => {
    const venue = {
      name: 'Comedy Cellar',
      address: '10 High Street',
      latitude: '0',
      longitude: '0',
    };
    expect(venueLocationSchema.parse(venue).latitude).toBe(0);
    expect(venueLocationSchema.safeParse({ ...venue, latitude: '91' }).success).toBe(false);
  });
});
