import { Injectable } from '@nestjs/common';
import { LocationFreshnessService, FreshnessStatus } from './location-freshness.service';
import { RedisGeoService } from './redis-geo.service';
import { calculateDistanceMeters } from '../common/utils/haversine.util';

export interface NearbyDriverResult {
  driverId: string;
  distanceMeters: number;
  latitude: number;
  longitude: number;
  locationFreshness: FreshnessStatus;
  recordedAt: string;
  accuracyMeters?: number;
}

@Injectable()
export class GeospatialService {
  private readonly defaultRadiusMeters = parseInt(
    process.env.DEFAULT_DRIVER_SEARCH_RADIUS_METERS || '1500',
    10
  );

  constructor(
    private readonly freshnessService: LocationFreshnessService,
    private readonly redisGeoService: RedisGeoService
  ) {}

  async findNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusMeters: number = this.defaultRadiusMeters,
    persistedLocations: any[] = []
  ): Promise<NearbyDriverResult[]> {
    const results: NearbyDriverResult[] = [];
    const now = new Date();

    // 1. Coba kueri Redis GEO untuk pencarian instan
    const redisResults = await this.redisGeoService.geoSearch(
      'kawai:drivers:locations',
      longitude,
      latitude,
      radiusMeters
    );

    if (redisResults.length > 0) {
      for (const r of redisResults) {
        const metadata = await this.redisGeoService.getMetadata(`kawai:driver:${r.member}:location`);
        const recordedAt = metadata?.recordedAt || now.toISOString();
        const freshness = this.freshnessService.calculateFreshness(recordedAt, now);

        results.push({
          driverId: r.member,
          distanceMeters: r.distanceMeters,
          latitude: r.latitude,
          longitude: r.longitude,
          locationFreshness: freshness,
          recordedAt,
          accuracyMeters: metadata?.accuracyMeters,
        });
      }
      return results;
    }

    // 2. Fallback ke Persistent PostGIS / Database Store
    for (const loc of persistedLocations) {
      const distance = calculateDistanceMeters(latitude, longitude, loc.latitude, loc.longitude);
      if (distance <= radiusMeters) {
        const freshness = this.freshnessService.calculateFreshness(loc.recordedAt, now);
        results.push({
          driverId: loc.driverId,
          distanceMeters: distance,
          latitude: loc.latitude,
          longitude: loc.longitude,
          locationFreshness: freshness,
          recordedAt: new Date(loc.recordedAt).toISOString(),
          accuracyMeters: loc.accuracyMeters,
        });
      }
    }

    return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}
