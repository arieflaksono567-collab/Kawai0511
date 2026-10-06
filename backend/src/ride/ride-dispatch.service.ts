import { Injectable, Logger } from '@nestjs/common';
import { GeospatialService } from '../location/geospatial.service';
import { LocationFreshnessService } from '../location/location-freshness.service';
import { DriverEligibilityService } from '../driver/driver-eligibility.service';

export interface DispatchCandidate {
  driverId: string;
  driverName?: string;
  vehiclePlate?: string;
  distanceMeters: number;
  estimatedEtaMinutes: number;
  locationFreshness: string;
  isEligible: boolean;
}

export interface DispatchResult {
  matched: boolean;
  selectedDriver?: DispatchCandidate;
  candidatesCount: number;
  rejectedReasons: string[];
}

@Injectable()
export class RideDispatchService {
  private readonly logger = new Logger(RideDispatchService.name);
  private readonly defaultRadiusMeters = 1500; // 1.5 km Kota Banjarmasin

  constructor(
    private readonly geospatialService: GeospatialService,
    private readonly freshnessService: LocationFreshnessService,
    private readonly driverEligibilityService: DriverEligibilityService
  ) {}

  async matchNearestDriver(
    pickupLat: number,
    pickupLng: number,
    activeDriverIdsInTrip: Set<string>,
    persistedLocations: any[] = []
  ): Promise<DispatchResult> {
    const rejectedReasons: string[] = [];

    // 1. Kueri radius 1.5 km melalui GeospatialService (Redis GEO / PostGIS fallback)
    const nearby = await this.geospatialService.findNearbyDrivers(
      pickupLat,
      pickupLng,
      this.defaultRadiusMeters,
      persistedLocations
    );

    if (nearby.length === 0) {
      return {
        matched: false,
        candidatesCount: 0,
        rejectedReasons: ['Tidak ada mitra driver terdeteksi dalam radius 1.5 km.'],
      };
    }

    const eligibleCandidates: DispatchCandidate[] = [];

    for (const cand of nearby) {
      // 2. Filter Freshness: HANYA FRESH (< 10 detik) yang diizinkan!
      if (cand.locationFreshness !== 'FRESH') {
        rejectedReasons.push(`Driver ${cand.driverId} dilewati: GPS berstatus ${cand.locationFreshness} (wajib FRESH < 10 detik).`);
        continue;
      }

      // 3. Filter Concurrency: Driver tidak boleh sedang dalam order aktif lain
      if (activeDriverIdsInTrip.has(cand.driverId)) {
        rejectedReasons.push(`Driver ${cand.driverId} dilewati: Sedang melayani order lain.`);
        continue;
      }

      // 4. Verifikasi Phase 3: Status verifikasi KYC, operasional ONLINE, dan kelayakan kendaraan
      const isEligible = this.driverEligibilityService.isDriverEligible(cand.driverId);
      if (!isEligible) {
        rejectedReasons.push(`Driver ${cand.driverId} dilewati: Persyaratan KYC/kendaraan belum lengkap atau status OFFLINE.`);
        continue;
      }

      const etaMinutes = Math.max(1, Math.round(cand.distanceMeters / (25 * 1000 / 60))); // ~25 km/jam

      eligibleCandidates.push({
        driverId: cand.driverId,
        distanceMeters: cand.distanceMeters,
        estimatedEtaMinutes: etaMinutes,
        locationFreshness: cand.locationFreshness,
        isEligible: true,
      });
    }

    if (eligibleCandidates.length === 0) {
      return {
        matched: false,
        candidatesCount: 0,
        rejectedReasons,
      };
    }

    // 5. Urutkan berdasarkan jarak terdekat (jarak terpendek / ETA tercepat)
    eligibleCandidates.sort((a, b) => a.distanceMeters - b.distanceMeters);
    const selectedDriver = eligibleCandidates[0];

    return {
      matched: true,
      selectedDriver,
      candidatesCount: eligibleCandidates.length,
      rejectedReasons,
    };
  }
}
