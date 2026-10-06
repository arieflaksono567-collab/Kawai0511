import { LocationService } from '../src/location/location.service';
import { LocationFreshnessService } from '../src/location/location-freshness.service';
import { RedisGeoService } from '../src/location/redis-geo.service';
import { GeocodingService } from '../src/location/geocoding.service';
import { RoutingService } from '../src/location/routing.service';
import { GeospatialService } from '../src/location/geospatial.service';
import { BadRequestException } from '@nestjs/common';

describe('Phase4MapsAndLocationAcceptanceTests', () => {
  let locationService: LocationService;
  let freshnessService: LocationFreshnessService;
  let redisGeoService: RedisGeoService;
  let geocodingService: GeocodingService;
  let routingService: RoutingService;
  let geospatialService: GeospatialService;

  const mockDriverId = 'd0000000-0000-0000-0000-000000000001';

  beforeEach(() => {
    freshnessService = new LocationFreshnessService();
    redisGeoService = new RedisGeoService();
    geocodingService = new GeocodingService();
    routingService = new RoutingService();
    geospatialService = new GeospatialService(freshnessService, redisGeoService);
    locationService = new LocationService(freshnessService, redisGeoService);
  });

  // TEST 1: Driver updates location successfully
  test('TEST 1: Driver updates location successfully with fresh status', async () => {
    const res = await locationService.updateDriverLocation(mockDriverId, {
      latitude: -3.319437,
      longitude: 114.590822,
      accuracyMeters: 6.5,
      speedMps: 5.2,
      headingDegrees: 90,
      batteryLevel: 85,
      recordedAt: new Date().toISOString(),
    });

    expect(res.success).toBe(true);
    expect(res.data.latitude).toBe(-3.319437);
    expect(res.data.freshness).toBe('FRESH');
  });

  // TEST 2: Reject invalid latitude/longitude
  test('TEST 2: Reject invalid coordinates exceeding Earth bounds', async () => {
    await expect(
      locationService.updateDriverLocation(mockDriverId, {
        latitude: -95.0,
        longitude: 114.5,
        recordedAt: new Date().toISOString(),
      })
    ).rejects.toThrow(BadRequestException);

    await expect(
      locationService.updateDriverLocation(mockDriverId, {
        latitude: -3.3,
        longitude: 195.0,
        recordedAt: new Date().toISOString(),
      })
    ).rejects.toThrow(BadRequestException);
  });

  // TEST 3: Reject negative accuracy, speed, or invalid heading
  test('TEST 3: Reject negative accuracy or invalid heading degrees', async () => {
    await expect(
      locationService.updateDriverLocation(mockDriverId, {
        latitude: -3.3,
        longitude: 114.5,
        accuracyMeters: -5,
        recordedAt: new Date().toISOString(),
      })
    ).rejects.toThrow('Akurasi lokasi tidak boleh bernilai negatif');

    await expect(
      locationService.updateDriverLocation(mockDriverId, {
        latitude: -3.3,
        longitude: 114.5,
        headingDegrees: 400,
        recordedAt: new Date().toISOString(),
      })
    ).rejects.toThrow('Heading sudut harus berada dalam rentang 0 hingga 360');
  });

  // TEST 4: Out-of-order timestamp handling
  test('TEST 4: Out-of-order older location does not overwrite latest location', async () => {
    const tNew = new Date().toISOString();
    const tOld = new Date(Date.now() - 60000).toISOString(); // 1 menit lalu

    // Update with newest position
    await locationService.updateDriverLocation(mockDriverId, {
      latitude: -3.3194,
      longitude: 114.5908,
      recordedAt: tNew,
    });

    // Send delayed out-of-order packet with older timestamp
    await locationService.updateDriverLocation(mockDriverId, {
      latitude: -3.3300,
      longitude: 114.6000,
      recordedAt: tOld,
    });

    // Latest location must remain the newest one
    const latest = await locationService.getDriverLatestLocation(mockDriverId);
    expect(latest.latitude).toBe(-3.3194);
  });

  // TEST 5: Redis GEO Search finds drivers within default 1500m radius
  test('TEST 5: Geospatial search finds drivers within 1500m radius', async () => {
    // Driver at Duta Mall (-3.319437, 114.590822)
    await locationService.updateDriverLocation(mockDriverId, {
      latitude: -3.319437,
      longitude: 114.590822,
      recordedAt: new Date().toISOString(),
    });

    // Passenger nearby at Menara Pandang (-3.322841, 114.593510) ~480m away
    const drivers = await geospatialService.findNearbyDrivers(-3.322841, 114.593510, 1500);
    expect(drivers.length).toBeGreaterThan(0);
    expect(drivers[0].distanceMeters).toBeLessThan(1500);
  });

  // TEST 6: Resilience when Redis is unavailable (graceful degradation)
  test('TEST 6: Graceful degradation when Redis is unavailable', async () => {
    redisGeoService.setConnectionStatus(false); // Simulate Redis downtime

    // Search should not throw exception, will fallback safely
    const drivers = await geospatialService.findNearbyDrivers(-3.319437, 114.590822, 1500, [
      {
        driverId: 'fallback-drv',
        latitude: -3.319437,
        longitude: 114.590822,
        recordedAt: new Date(),
      },
    ]);

    expect(drivers.length).toBe(1);
    expect(drivers[0].driverId).toBe('fallback-drv');
  });

  // TEST 7: Reverse geocoding resolves coordinates to Banjarmasin landmark
  test('TEST 7: Reverse geocoding resolves coordinates to Banjarmasin address', async () => {
    const address = await geocodingService.reverseGeocode(-3.319437, 114.590822);
    expect(address.city).toBe('Kota Banjarmasin');
    expect(address.formattedAddress).toContain('Duta Mall Banjarmasin');
  });

  // TEST 8: Place search matches landmarks
  test('TEST 8: Place search matches Banjarmasin landmarks', async () => {
    const places = await geocodingService.searchPlaces('ulin');
    expect(places.length).toBeGreaterThan(0);
    expect(places[0].name).toContain('RSUD Ulin');
  });

  // TEST 9: Route calculation returns distance and duration without fare calculation
  test('TEST 9: Route calculation calculates distance & duration without fare', async () => {
    const route = await routingService.getRoute(-3.319437, 114.590822, -3.298510, 114.588020);
    expect(route.distanceMeters).toBeGreaterThan(2000);
    expect(route.durationSeconds).toBeGreaterThan(100);
    expect((route as any).fare).toBeUndefined(); // Strictly NO fare engine in Phase 4!
  });

  // TEST 10: Admin operational location retrieval
  test('TEST 10: Admin retrieves operational driver locations list', async () => {
    const adminLocations = await locationService.getAdminDriverLocations();
    expect(adminLocations.length).toBeGreaterThan(0);
    expect(adminLocations[0].driverId).toBe(mockDriverId);
  });
});
