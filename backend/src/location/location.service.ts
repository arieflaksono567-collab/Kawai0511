import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { UpdateLocationDto } from './dto/update-location.dto';
import { LocationFreshnessService, FreshnessStatus } from './location-freshness.service';
import { RedisGeoService } from './redis-geo.service';

export interface DriverLocationRecord {
  id: string;
  driverId: string;
  latitude: number;
  longitude: number;
  accuracyMeters: number;
  altitudeMeters?: number;
  speedMps: number;
  headingDegrees: number;
  batteryLevel?: number;
  networkType?: string;
  recordedAt: string;
  serverReceivedAt: string;
  createdAt: string;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);

  // In-Memory Persistent Database Store (PostGIS representation)
  private locationsHistory = new Map<string, DriverLocationRecord[]>(); // driverId -> history array
  private latestLocations = new Map<string, DriverLocationRecord>(); // driverId -> latest record

  // Rate Limiting tracker (driverId -> timestamps array within last 60s)
  private updateRateTracker = new Map<string, number[]>();
  private readonly maxUpdatesPerMinute = parseInt(process.env.LOCATION_MAX_UPDATES_PER_MINUTE || '60', 10);

  constructor(
    private readonly freshnessService: LocationFreshnessService,
    private readonly redisGeoService: RedisGeoService
  ) {
    this.seedInitialLocation();
  }

  private seedInitialLocation() {
    const driverId = 'd0000000-0000-0000-0000-000000000001'; // Ahmad Gazali
    const now = new Date().toISOString();

    const initialRecord: DriverLocationRecord = {
      id: crypto.randomUUID(),
      driverId,
      latitude: -3.319437,
      longitude: 114.590822,
      accuracyMeters: 5.0,
      altitudeMeters: 12.0,
      speedMps: 4.5,
      headingDegrees: 180.0,
      batteryLevel: 88,
      networkType: '4G',
      recordedAt: now,
      serverReceivedAt: now,
      createdAt: now,
    };

    this.latestLocations.set(driverId, initialRecord);
    this.locationsHistory.set(driverId, [initialRecord]);

    // Seed to Redis GEO
    this.redisGeoService.geoAdd('kawai:drivers:locations', 114.590822, -3.319437, driverId);
    this.redisGeoService.setMetadata(`kawai:driver:${driverId}:location`, initialRecord);
  }

  // 1. UPDATE DRIVER LOCATION
  async updateDriverLocation(
    driverId: string,
    dto: UpdateLocationDto
  ): Promise<{ success: boolean; data: any }> {
    // 1. Validasi batas koordinat & parameter fisik
    if (dto.latitude < -90 || dto.latitude > 90) {
      throw new BadRequestException('Latitude harus berada dalam rentang -90 hingga 90');
    }
    if (dto.longitude < -180 || dto.longitude > 180) {
      throw new BadRequestException('Longitude harus berada dalam rentang -180 hingga 180');
    }
    if (dto.accuracyMeters !== undefined && dto.accuracyMeters < 0) {
      throw new BadRequestException('Akurasi lokasi tidak boleh bernilai negatif');
    }
    if (dto.speedMps !== undefined && dto.speedMps < 0) {
      throw new BadRequestException('Kecepatan tidak boleh bernilai negatif');
    }
    if (dto.headingDegrees !== undefined && (dto.headingDegrees < 0 || dto.headingDegrees > 360)) {
      throw new BadRequestException('Heading sudut harus berada dalam rentang 0 hingga 360 derajat');
    }
    if (dto.batteryLevel !== undefined && (dto.batteryLevel < 0 || dto.batteryLevel > 100)) {
      throw new BadRequestException('Level baterai harus berada dalam rentang 0 hingga 100%');
    }

    // 2. Rate Limiting Check (Max 60 update/menit)
    const nowMs = Date.now();
    let timestamps = this.updateRateTracker.get(driverId) || [];
    timestamps = timestamps.filter((t) => nowMs - t < 60000);
    if (timestamps.length >= this.maxUpdatesPerMinute) {
      throw new BadRequestException('Batas frekuensi pembaruan lokasi terlampaui (429 Rate Limit)');
    }
    timestamps.push(nowMs);
    this.updateRateTracker.set(driverId, timestamps);

    const serverReceivedAt = new Date().toISOString();
    const recordedDate = new Date(dto.recordedAt || serverReceivedAt);

    // 3. Out-of-Order / Duplicate check
    const currentLatest = this.latestLocations.get(driverId);
    const isOutdated = currentLatest && new Date(currentLatest.recordedAt).getTime() > recordedDate.getTime();

    const record: DriverLocationRecord = {
      id: crypto.randomUUID(),
      driverId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      accuracyMeters: dto.accuracyMeters || 10.0,
      altitudeMeters: dto.altitudeMeters,
      speedMps: dto.speedMps || 0.0,
      headingDegrees: dto.headingDegrees || 0.0,
      batteryLevel: dto.batteryLevel,
      networkType: dto.networkType || 'UNKNOWN',
      recordedAt: recordedDate.toISOString(),
      serverReceivedAt,
      createdAt: serverReceivedAt,
    };

    // Append to history
    let history = this.locationsHistory.get(driverId) || [];
    history.push(record);
    this.locationsHistory.set(driverId, history);

    // Hanya perbarui latest location & Redis GEO jika bukan data usang
    if (!isOutdated) {
      this.latestLocations.set(driverId, record);

      // Async Update Redis GEO (dengan penanganan kegagalan yang aman)
      try {
        await this.redisGeoService.geoAdd(
          'kawai:drivers:locations',
          dto.longitude,
          dto.latitude,
          driverId
        );
        await this.redisGeoService.setMetadata(`kawai:driver:${driverId}:location`, record);
      } catch (err: any) {
        this.logger.warn(`Redis GEO update failed: ${err.message}`);
      }
    }

    const freshness = this.freshnessService.calculateFreshness(record.recordedAt);

    return {
      success: true,
      data: {
        latitude: record.latitude,
        longitude: record.longitude,
        accuracyMeters: record.accuracyMeters,
        recordedAt: record.recordedAt,
        freshness,
      },
    };
  }

  // 2. GET DRIVER LATEST LOCATION
  async getDriverLatestLocation(driverId: string) {
    const loc = this.latestLocations.get(driverId);
    if (!loc) {
      throw new NotFoundException('Lokasi driver belum tercatat');
    }

    const freshness = this.freshnessService.calculateFreshness(loc.recordedAt);
    return {
      ...loc,
      freshness,
    };
  }

  // 3. GET DRIVER LOCATION STATUS
  async getDriverLocationStatus(driverId: string) {
    const loc = this.latestLocations.get(driverId);
    if (!loc) {
      return {
        recorded: false,
        freshness: 'EXPIRED' as FreshnessStatus,
        message: 'Belum ada koordinat lokasi GPS yang dikirimkan.',
      };
    }

    const freshness = this.freshnessService.calculateFreshness(loc.recordedAt);
    return {
      recorded: true,
      latitude: loc.latitude,
      longitude: loc.longitude,
      accuracyMeters: loc.accuracyMeters,
      recordedAt: loc.recordedAt,
      freshness,
      isOperationallyAvailable: this.freshnessService.isOperationallyAvailable(freshness),
    };
  }

  // 4. ADMIN GET ALL OPERATIONAL DRIVER LOCATIONS
  async getAdminDriverLocations() {
    const results: any[] = [];
    const now = new Date();

    for (const [driverId, loc] of this.latestLocations.entries()) {
      const freshness = this.freshnessService.calculateFreshness(loc.recordedAt, now);
      results.push({
        driverId,
        latitude: loc.latitude,
        longitude: loc.longitude,
        accuracyMeters: loc.accuracyMeters,
        headingDegrees: loc.headingDegrees,
        speedMps: loc.speedMps,
        freshness,
        recordedAt: loc.recordedAt,
        lastSeen: loc.serverReceivedAt,
      });
    }

    return results;
  }

  getAllLatestLocationsList(): DriverLocationRecord[] {
    return Array.from(this.latestLocations.values());
  }
}
