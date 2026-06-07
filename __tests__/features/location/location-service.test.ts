import { pickCityLabel } from '@/features/location/location-service';

describe('location-service pickCityLabel', () => {
  it('prefers city when present', () => {
    const city = pickCityLabel([
      {
        city: 'London',
        district: 'Greater London',
        subregion: 'England',
        region: 'UK',
      } as any,
    ]);

    expect(city).toBe('London');
  });

  it('falls back in order district -> subregion -> region', () => {
    const district = pickCityLabel([
      {
        city: null,
        district: 'Hackney',
        subregion: 'Greater London',
        region: 'England',
      } as any,
    ]);
    const subregion = pickCityLabel([
      {
        city: null,
        district: null,
        subregion: 'Greater London',
        region: 'England',
      } as any,
    ]);
    const region = pickCityLabel([
      {
        city: null,
        district: null,
        subregion: null,
        region: 'England',
      } as any,
    ]);

    expect(district).toBe('Hackney');
    expect(subregion).toBe('Greater London');
    expect(region).toBe('England');
  });

  it('returns null when no address labels are available', () => {
    const city = pickCityLabel([]);
    expect(city).toBeNull();
  });
});
