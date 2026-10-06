import { Injectable, Logger } from '@nestjs/common';
import { calculateDistanceMeters } from '../common/utils/haversine.util';

export interface RedisGeoResult {
  member: string;
  distanceMeters: number;
  latitude: number;
  longitude: number;
}

@Injectable()
export class RedisGeoService {
  private readonly logger = new Logger(RedisGeoService.name);
  private isConnected = true;

  // In-Memory Redis GEO store simulation
  private geoStore = new Map<string, Map<string, { lat: number; lon: number }>>();
  private metadataStore = new Map<string, any>();

  // Toggle for testing Redis failure resilience
  setConnectionStatus(connected: boolean) {
    this.isConnected = connected;
  }

  async geoAdd(key: string, lon: number, lat: number, member: string): Promise<boolean> {
    if (!this.isConnected) {
      this.logger.warn(`[REDIS GEO CACHE MISS/FAILURE] Gagal melakukan GEOADD pada key ${key} untuk member ${member}: Redis unavailable`);
      return false;
    }

    let subMap = this.geoStore.get(key);
    if (!subMap) {
      subMap = new Map();
      this.geoStore.set(key, subMap);
    }
    subMap.set(member, { lat, lon });
    return true;
  }

  async setMetadata(memberKey: string, data: any): Promise<boolean> {
    if (!this.isConnected) return false;
    this.metadataStore.set(memberKey, { ...data, updatedAt: Date.now() });
    return true;
  }

  async getMetadata(memberKey: string): Promise<any | null> {
    if (!this.isConnected) return null;
    return this.metadataStore.get(memberKey) || null;
  }

  async geoPos(key: string, member: string): Promise<{ lat: number; lon: number } | null> {
    if (!this.isConnected) return null;
    const subMap = this.geoStore.get(key);
    if (!subMap) return null;
    return subMap.get(member) || null;
  }

  async geoSearch(
    key: string,
    centerLon: number,
    centerLat: number,
    radiusMeters: number
  ): Promise<RedisGeoResult[]> {
    if (!this.isConnected) {
      this.logger.warn(`[REDIS GEO CACHE MISS/FAILURE] Gagal melakukan GEOSEARCH pada key ${key}: Fallback ke PostGIS`);
      return [];
    }

    const subMap = this.geoStore.get(key);
    if (!subMap) return [];

    const results: RedisGeoResult[] = [];
    for (const [member, coords] of subMap.entries()) {
      const distance = calculateDistanceMeters(centerLat, centerLon, coords.lat, coords.lon);
      if (distance <= radiusMeters) {
        results.push({
          member,
          distanceMeters: distance,
          latitude: coords.lat,
          longitude: coords.lon,
        });
      }
    }

    return results.sort((a, b) => a.distanceMeters - b.distanceMeters);
  }
}
