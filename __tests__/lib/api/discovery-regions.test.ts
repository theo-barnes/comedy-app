import { bucketCoordinate, buildDiscoveryRegionsUrl } from '@/lib/api/discovery-regions';

describe('discovery-regions api helpers', () => {
  it('buckets coordinates for cache keys', () => {
    expect(bucketCoordinate(51.5074)).toBe(1030);
    expect(bucketCoordinate(-0.1278)).toBe(-3);
  });

  it('builds a relative url when no discovery api base is configured', () => {
    expect(buildDiscoveryRegionsUrl(51.5, -0.12)).toBe('/discovery-regions?lat=51.5&lng=-0.12');
  });
});
