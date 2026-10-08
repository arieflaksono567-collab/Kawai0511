import { Injectable, Logger } from '@nestjs/common';
import { GeospatialService } from '../location/geospatial.service';
import { LocationFreshnessService } from '../location/location-freshness.service';
import { DriverEligibilityService } from '../driver/driver-eligibility.service';

export interface DispatchCandidate {
  driverId: string;
  driverName?: string;
  vehiclePlate?: string;
  distanceMeters: number;
  estimatedEtaSeconds: number;
  estimatedEtaMinutes: number;
  locationFreshness: string;
  gpsAgeSeconds: number;
  idleDurationSeconds: number;
  isEligible: boolean;
}

export interface DispatchResult {
  matched: boolean;
  selectedDriver?: DispatchCandidate;
  rankedCandidates: DispatchCandidate[];
  candidatesCount: number;
  rejectedReasons: string[];
}

@Injectable()
export class RideDispatchService {
  private readonly logger = new Logger(RideDispatchService.name);
  public readonly defaultRadiusMeters = 1500; // 1500 meter (Kota Banjarmasin)
  public readonly offerTimeoutSeconds = 30; // 30 detik batas waktu menerima order

  constructor(
    private readonly geospatialService: GeospatialService,
    private readonly freshnessService: LocationFreshnessService,
    private readonly driverEligibilityService: DriverEligibilityService
  ) {}

  /**
   * Menemukan dan mengurutkan seluruh kandidat mitra driver yang memenuhi syarat
   * berdasarkan ranking deterministik:
   * 1. ETA pickup (tercepat)
   * 2. distance pickup (terdekat)
   * 3. GPS freshness (paling baru / gpsAgeSeconds terendah)
   * 4. idle duration (driver yang idle lebih lama menang)
   */
  async matchNearestDriver(
    pickupLat: number,
    pickupLng: number,
    activeDriverIdsInTrip: Set<string>,
    persistedLocations: any[] = []
  ): Promise<DispatchResult> {
    const rejectedReasons: string[] = [];

    // 1. Kueri radius 1500 meter melalui GeospatialService (Redis GEO didahulukan, PostGIS fallback)
    const nearby = await this.geospatialService.findNearbyDrivers(
      pickupLat,
      pickupLng,
      this.defaultRadiusMeters,
      persistedLocations
    );

    if (nearby.length === 0) {
      return {
        matched: false,
        rankedCandidates: [],
        candidatesCount: 0,
        rejectedReasons: ['Tidak ada mitra driver terdeteksi dalam radius 1.5 km.'],
      };
    }

    const eligibleCandidates: DispatchCandidate[] = [];

    for (const cand of nearby) {
      // 2. Filter Radius (Ketat 1500 meter)
      if (cand.distanceMeters > this.defaultRadiusMeters) {
        rejectedReasons.push(
          `Driver ${cand.driverId} dilewati: Berada di luar batas radius (${cand.distanceMeters}m > ${this.defaultRadiusMeters}m).`
        );
        continue;
      }

      // 3. Filter GPS Freshness: WAJIB FRESH (< 10 detik). STALE & EXPIRED DITOLAK!
      if (cand.locationFreshness !== 'FRESH') {
        const displayFreshness = cand.locationFreshness === 'DEGRADED' ? 'EXPIRED' : cand.locationFreshness;
        rejectedReasons.push(
          `Driver ${cand.driverId} dilewati: GPS berstatus ${displayFreshness} (wajib FRESH < 10 detik).`
        );
        continue;
      }

      // 4. Filter Concurrency: Driver tidak boleh sedang dalam order aktif lain
      if (activeDriverIdsInTrip.has(cand.driverId)) {
        rejectedReasons.push(`Driver ${cand.driverId} dilewati: Sedang melayani order lain.`);
        continue;
      }

      // 5. Verifikasi Kelayakan Lengkap Driver (Phase 3 Integration)
      // Wajib: role DRIVER, verification APPROVED, 4 dokumen APPROVED & belum expired, vehicle APPROVED, operational ONLINE
      const dispatchCheck = this.driverEligibilityService.checkDispatchEligibility(cand.driverId);
      if (!dispatchCheck.eligible) {
        rejectedReasons.push(`Driver ${cand.driverId} dilewati: ${dispatchCheck.reason}`);
        continue;
      }

      // Hitung metrik estimasi (kecepatan motor kota Banjarmasin ~25 km/jam = ~6.94 m/s)
      const etaSeconds = Math.max(30, Math.round(cand.distanceMeters / 6.94));
      const etaMinutes = Math.max(1, Math.round(etaSeconds / 60));

      // Hitung umur sinyal GPS
      const now = Date.now();
      const recordedTime = cand.recordedAt ? new Date(cand.recordedAt).getTime() : now;
      const gpsAgeSeconds = Math.max(0, Math.floor((now - recordedTime) / 1000));

      // Dapatkan durasi idle driver
      const idleDurationSeconds = this.driverEligibilityService.getIdleDurationSeconds(cand.driverId);

      const driverRecord = this.driverEligibilityService.getDriverRecord(cand.driverId);
      const activeVehicle = driverRecord?.vehicles?.find((v: any) => v.isActive);

      eligibleCandidates.push({
        driverId: cand.driverId,
        driverName: driverRecord?.driver?.displayName || 'Mitra Driver',
        vehiclePlate: activeVehicle?.licensePlate || 'DA 5110 KAW',
        distanceMeters: Math.round(cand.distanceMeters),
        estimatedEtaSeconds: etaSeconds,
        estimatedEtaMinutes: etaMinutes,
        locationFreshness: cand.locationFreshness,
        gpsAgeSeconds,
        idleDurationSeconds,
        isEligible: true,
      });
    }

    if (eligibleCandidates.length === 0) {
      return {
        matched: false,
        rankedCandidates: [],
        candidatesCount: 0,
        rejectedReasons,
      };
    }

    // 6. RANKING DETERMINISTIK
    // Aturan deterministik KAWAI 0511 Phase 5B:
    // 1. ETA pickup (terkecil lebih dulu)
    // 2. distance pickup (jarak terdekat lebih dulu jika ETA sama)
    // 3. GPS freshness (sinyal paling segar / gpsAgeSeconds lebih kecil jika jarak sama)
    // 4. idle duration (driver yang idle lebih lama menang jika GPS age sama)
    // 5. driverId tie-breaker (stabilitas sort)
    eligibleCandidates.sort((a, b) => {
      // 1. ETA pickup
      if (a.estimatedEtaSeconds !== b.estimatedEtaSeconds) {
        return a.estimatedEtaSeconds - b.estimatedEtaSeconds;
      }
      // 2. distance pickup
      if (a.distanceMeters !== b.distanceMeters) {
        return a.distanceMeters - b.distanceMeters;
      }
      // 3. GPS freshness
      if (a.gpsAgeSeconds !== b.gpsAgeSeconds) {
        return a.gpsAgeSeconds - b.gpsAgeSeconds;
      }
      // 4. idle duration
      if (a.idleDurationSeconds !== b.idleDurationSeconds) {
        return b.idleDurationSeconds - a.idleDurationSeconds;
      }
      // 5. deterministic tie-breaker
      return a.driverId.localeCompare(b.driverId);
    });

    const selectedDriver = eligibleCandidates[0];

    return {
      matched: true,
      selectedDriver,
      rankedCandidates: eligibleCandidates,
      candidatesCount: eligibleCandidates.length,
      rejectedReasons,
    };
  }
}
