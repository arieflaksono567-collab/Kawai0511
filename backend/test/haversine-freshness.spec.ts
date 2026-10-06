import { calculateDistanceMeters } from '../src/common/utils/haversine.util';
import { LocationFreshnessService } from '../src/location/location-freshness.service';

describe('HaversineAndFreshnessUnitTests', () => {
  let freshnessService: LocationFreshnessService;

  beforeEach(() => {
    freshnessService = new LocationFreshnessService();
  });

  // 1. HAVERSINE DISTANCE UNIT TESTS
  test('should calculate distance accurately between Duta Mall and ULM Banjarmasin', () => {
    // Duta Mall: (-3.319437, 114.590822), ULM: (-3.298510, 114.588020)
    const dist = calculateDistanceMeters(-3.319437, 114.590822, -3.298510, 114.588020);
    // Straight line distance is approximately 2.3 km (~2340m)
    expect(dist).toBeGreaterThan(2200);
    expect(dist).toBeLessThan(2500);
  });

  test('should return 0 meters for identical coordinates', () => {
    const dist = calculateDistanceMeters(-3.319437, 114.590822, -3.319437, 114.590822);
    expect(dist).toBe(0);
  });

  test('should throw error on invalid coordinates out of range', () => {
    expect(() => calculateDistanceMeters(95, 114, -3, 114)).toThrow();
    expect(() => calculateDistanceMeters(-3, 190, -3, 114)).toThrow();
  });

  // 2. LOCATION FRESHNESS UNIT TESTS
  test('should classify timestamp under 15 seconds as FRESH', () => {
    const now = new Date();
    const recordedAt = new Date(now.getTime() - 8 * 1000); // 8 detik lalu
    const freshness = freshnessService.calculateFreshness(recordedAt, now);
    expect(freshness).toBe('FRESH');
    expect(freshnessService.isOperationallyAvailable(freshness)).toBe(true);
  });

  test('should classify timestamp between 16 and 30 seconds as STALE', () => {
    const now = new Date();
    const recordedAt = new Date(now.getTime() - 22 * 1000); // 22 detik lalu
    const freshness = freshnessService.calculateFreshness(recordedAt, now);
    expect(freshness).toBe('STALE');
    expect(freshnessService.isOperationallyAvailable(freshness)).toBe(true);
  });

  test('should classify timestamp between 31 and 120 seconds as DEGRADED', () => {
    const now = new Date();
    const recordedAt = new Date(now.getTime() - 65 * 1000); // 65 detik lalu
    const freshness = freshnessService.calculateFreshness(recordedAt, now);
    expect(freshness).toBe('DEGRADED');
    expect(freshnessService.isOperationallyAvailable(freshness)).toBe(false);
  });

  test('should classify timestamp older than 120 seconds as EXPIRED', () => {
    const now = new Date();
    const recordedAt = new Date(now.getTime() - 180 * 1000); // 3 menit lalu
    const freshness = freshnessService.calculateFreshness(recordedAt, now);
    expect(freshness).toBe('EXPIRED');
    expect(freshnessService.isOperationallyAvailable(freshness)).toBe(false);
  });
});
