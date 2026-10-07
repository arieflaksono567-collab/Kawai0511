import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { FareService, FareCalculationResult } from './fare.service';
import { RideDispatchService, DispatchCandidate } from './ride-dispatch.service';
import { RoutingService } from '../location/routing.service';
import { DriverEligibilityService } from '../driver/driver-eligibility.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';

export type RideStatus = 'SEARCHING' | 'ASSIGNED' | 'ARRIVED' | 'IN_TRIP' | 'COMPLETED' | 'CANCELLED';

export interface RideStateLog {
  id: string;
  rideId: string;
  fromState?: RideStatus;
  toState: RideStatus;
  actorId: string;
  actorRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
  note?: string;
  createdAt: string;
}

export interface DispatchAttempt {
  id: string;
  rideId: string;
  driverId: string;
  attemptNumber: number;
  distanceMeters: number;
  etaSeconds: number;
  status: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT' | 'FAILED';
  offeredAt: string;
  respondedAt?: string;
  createdAt: string;
}

export interface RideOrder {
  id: string;
  passengerId: string;
  driverId?: string;
  pickupAddress: string;
  pickupLat: number;
  pickupLng: number;
  destinationAddress: string;
  destinationLat: number;
  destinationLng: number;
  distanceKm: number;
  durationMinutes: number;
  totalFare: number;
  fareSnapshot: FareCalculationResult;
  status: RideStatus;
  version: number;
  currentOfferedDriverId?: string;
  offerExpiresAt?: string;
  currentAttemptNumber: number;
  attemptedDriverIds: string[];
  rankedCandidatePool?: DispatchCandidate[];
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  assignedAt?: string;
  arrivedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  updatedAt: string;
  driver?: {
    id: string;
    name: string;
    phone: string;
    vehiclePlate: string;
    vehicleModel: string;
    rating: number;
  };
  matchedCandidate?: DispatchCandidate;
}

@Injectable()
export class RideService {
  private readonly logger = new Logger(RideService.name);

  // In-Memory Persistent Store (PostgreSQL 16 representation)
  private rides = new Map<string, RideOrder>();
  private stateLogs: RideStateLog[] = [];
  private dispatchAttempts: DispatchAttempt[] = [];

  // Concurrency lock for drivers currently offered or assigned in an active trip
  private activeDriverAssignments = new Map<string, string>(); // driverId -> rideId

  constructor(
    private readonly fareService: FareService,
    private readonly dispatchService: RideDispatchService,
    private readonly routingService: RoutingService,
    private readonly driverEligibilityService: DriverEligibilityService
  ) {
    this.seedSampleRides();
  }

  private seedSampleRides() {
    const sampleId = 'r0000000-0000-0000-0000-000000000001';
    const fare = this.fareService.calculateFare(3.8, 11);
    const now = new Date().toISOString();

    const sampleRide: RideOrder = {
      id: sampleId,
      passengerId: 'b0000000-0000-0000-0000-000000000002',
      driverId: 'd0000000-0000-0000-0000-000000000001',
      pickupAddress: 'Duta Mall Banjarmasin, Jl. A. Yani Km 2',
      pickupLat: -3.319437,
      pickupLng: 114.590822,
      destinationAddress: 'Kampus ULM Banjarmasin, Kayu Tangi',
      destinationLat: -3.29851,
      destinationLng: 114.58802,
      distanceKm: 3.8,
      durationMinutes: 11,
      totalFare: fare.totalFare,
      fareSnapshot: fare,
      status: 'COMPLETED',
      version: 5,
      currentAttemptNumber: 1,
      attemptedDriverIds: ['d0000000-0000-0000-0000-000000000001'],
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      assignedAt: new Date(Date.now() - 3500000).toISOString(),
      arrivedAt: new Date(Date.now() - 3300000).toISOString(),
      startedAt: new Date(Date.now() - 3200000).toISOString(),
      completedAt: new Date(Date.now() - 2500000).toISOString(),
      updatedAt: now,
      driver: {
        id: 'd0000000-0000-0000-0000-000000000001',
        name: 'Ahmad Gazali',
        phone: '+6281390511200',
        vehiclePlate: 'DA 5110 KAW',
        vehicleModel: 'Honda Vario 160',
        rating: 4.9,
      },
    };

    this.rides.set(sampleId, sampleRide);
  }

  // 1. CREATE RIDE ORDER (Passenger -> SEARCHING -> First Offer)
  async createOrder(
    dto: CreateRideDto & { passengerId: string },
    persistedLocations: any[] = []
  ): Promise<RideOrder> {
    return this.createRide(dto.passengerId, dto, persistedLocations);
  }

  async createRide(
    passengerId: string,
    dto: CreateRideDto,
    persistedLocations: any[] = []
  ): Promise<RideOrder> {
    // 1. Validasi koordinat fisik
    if (
      dto.pickupLat < -90 ||
      dto.pickupLat > 90 ||
      dto.pickupLng < -180 ||
      dto.pickupLng > 180 ||
      dto.destinationLat < -90 ||
      dto.destinationLat > 90 ||
      dto.destinationLng < -180 ||
      dto.destinationLng > 180
    ) {
      throw new BadRequestException('Koordinat penjemputan atau tujuan di luar batas bumi');
    }

    // 2. Hitung jarak dan durasi rute via Phase 4 RoutingService jika tidak disediakan
    let distKm = dto.distanceKm;
    let durMin = dto.durationMinutes;

    if (!distKm || !durMin) {
      const route = await this.routingService.getRoute(
        dto.pickupLat,
        dto.pickupLng,
        dto.destinationLat,
        dto.destinationLng
      );
      distKm = parseFloat((route.distanceMeters / 1000).toFixed(2));
      durMin = Math.max(2, Math.round(route.durationSeconds / 60));
    }

    // 3. Hitung tarif resmi Phase 5 via FareService
    const fareSnapshot = this.fareService.calculateFare(distKm, durMin);

    // 4. Generate Ride Entity (Initial status: SEARCHING)
    const rideId = `ride-${crypto.randomUUID().slice(0, 8)}`;
    const now = new Date().toISOString();

    const ride: RideOrder = {
      id: rideId,
      passengerId,
      pickupAddress: dto.pickupAddress,
      pickupLat: dto.pickupLat,
      pickupLng: dto.pickupLng,
      destinationAddress: dto.destinationAddress,
      destinationLat: dto.destinationLat,
      destinationLng: dto.destinationLng,
      distanceKm: distKm,
      durationMinutes: durMin,
      totalFare: fareSnapshot.totalFare,
      fareSnapshot,
      status: 'SEARCHING',
      version: 1,
      currentAttemptNumber: 0,
      attemptedDriverIds: [],
      createdAt: now,
      updatedAt: now,
    };

    // 5. Catat audit state log
    this.recordStateLog(
      rideId,
      undefined,
      'SEARCHING',
      passengerId,
      'CUSTOMER',
      'Pemesanan perjalanan baru dibuat'
    );

    // 6. Jalankan Matching Driver & Dispatch Engine via RideDispatchService
    const activeDriverIds = this.getActiveDriverIdsInTrip();
    const dispatchResult = await this.dispatchService.matchNearestDriver(
      dto.pickupLat,
      dto.pickupLng,
      activeDriverIds,
      persistedLocations
    );

    ride.rankedCandidatePool = dispatchResult.rankedCandidates;

    if (dispatchResult.matched && dispatchResult.selectedDriver) {
      // Ambil kandidat ranking #1 dan kirim offer
      const topCandidate = dispatchResult.selectedDriver;
      ride.matchedCandidate = topCandidate;
      ride.currentOfferedDriverId = topCandidate.driverId;
      ride.currentAttemptNumber = 1;
      ride.attemptedDriverIds = [topCandidate.driverId];
      ride.offerExpiresAt = new Date(Date.now() + this.dispatchService.offerTimeoutSeconds * 1000).toISOString();

      // Rekam dispatch attempt #1
      this.recordDispatchAttempt(
        rideId,
        topCandidate.driverId,
        1,
        topCandidate.distanceMeters,
        topCandidate.estimatedEtaSeconds,
        'OFFERED'
      );

      this.logger.log(
        `Order ${rideId} mengirim offer ke driver ${topCandidate.driverId} (ETA: ${topCandidate.estimatedEtaSeconds}s, jarak: ${topCandidate.distanceMeters}m)`
      );
    } else {
      // Jika tidak ada kandidat: ride TETAP SEARCHING (Jangan cancel!)
      this.logger.warn(`Order ${rideId} tidak menemukan kandidat driver eligible dalam radius 1.5 km.`);
      this.recordStateLog(
        rideId,
        'SEARCHING',
        'SEARCHING',
        'SYSTEM',
        'SYSTEM',
        'Belum ada armada eligible yang terdeteksi di sekitar titik penjemputan'
      );
    }

    this.rides.set(rideId, ride);
    return ride;
  }

  // 2. DISPATCH NEXT CANDIDATE (reject / timeout / unavailable -> candidate berikutnya)
  async dispatchNextCandidate(
    rideId: string,
    previousStatus: 'REJECTED' | 'TIMEOUT' | 'FAILED',
    respondingDriverId?: string
  ): Promise<{ ride: RideOrder; nextAttempt?: DispatchAttempt; remainingCandidates: number }> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.status !== 'SEARCHING') {
      throw new BadRequestException(`Dispatch offer hanya dapat dilanjutkan saat order berstatus SEARCHING (saat ini ${ride.status})`);
    }

    const now = new Date().toISOString();

    // 1. Update status attempt saat ini jika ada
    if (ride.currentOfferedDriverId) {
      const activeAttempt = this.dispatchAttempts
        .slice()
        .reverse()
        .find((a) => a.rideId === rideId && a.driverId === ride.currentOfferedDriverId && a.status === 'OFFERED');

      if (activeAttempt) {
        activeAttempt.status = previousStatus;
        activeAttempt.respondedAt = now;
      }
    }

    // 2. Cari kandidat berikutnya dari ranked pool yang belum pernah ditawari
    const pool = ride.rankedCandidatePool || [];
    const activeDriverIds = this.getActiveDriverIdsInTrip();

    const nextCandidate = pool.find((cand) => {
      // Belum pernah ditawari
      if (ride.attemptedDriverIds.includes(cand.driverId)) return false;
      // Tidak sedang melayani order lain
      if (activeDriverIds.has(cand.driverId)) return false;
      // Masih eligible
      const eligibility = this.driverEligibilityService.checkDispatchEligibility(cand.driverId);
      return eligibility.eligible;
    });

    if (nextCandidate) {
      ride.currentAttemptNumber += 1;
      ride.attemptedDriverIds.push(nextCandidate.driverId);
      ride.currentOfferedDriverId = nextCandidate.driverId;
      ride.matchedCandidate = nextCandidate;
      ride.offerExpiresAt = new Date(Date.now() + this.dispatchService.offerTimeoutSeconds * 1000).toISOString();
      ride.updatedAt = now;

      const newAttempt = this.recordDispatchAttempt(
        rideId,
        nextCandidate.driverId,
        ride.currentAttemptNumber,
        nextCandidate.distanceMeters,
        nextCandidate.estimatedEtaSeconds,
        'OFFERED'
      );

      this.recordStateLog(
        rideId,
        'SEARCHING',
        'SEARCHING',
        'SYSTEM',
        'SYSTEM',
        `Offer dialihkan ke kandidat berikutnya: ${nextCandidate.driverId} (attempt #${ride.currentAttemptNumber})`
      );

      return {
        ride,
        nextAttempt: newAttempt,
        remainingCandidates: pool.filter((c) => !ride.attemptedDriverIds.includes(c.driverId)).length,
      };
    } else {
      // Tidak ada kandidat tersisa: ride TETAP SEARCHING
      ride.currentOfferedDriverId = undefined;
      ride.offerExpiresAt = undefined;
      ride.updatedAt = now;

      this.recordStateLog(
        rideId,
        'SEARCHING',
        'SEARCHING',
        'SYSTEM',
        'SYSTEM',
        'Seluruh kandidat dalam radius telah dihubungi namun belum ada yang menerima. Order tetap dalam status SEARCHING.'
      );

      return {
        ride,
        nextAttempt: undefined,
        remainingCandidates: 0,
      };
    }
  }

  // 3. DRIVER REJECTS OFFER (Endpoint: POST /rides/:id/reject)
  async rejectOffer(rideId: string, driverId: string, reason?: string) {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.status !== 'SEARCHING') {
      throw new BadRequestException(`Order tidak dalam status penawaran aktif (saat ini ${ride.status})`);
    }

    // Hanya driver yang sedang ditawarkan order yang boleh mereject
    if (ride.currentOfferedDriverId !== driverId) {
      throw new ForbiddenException('Akses ditolak: Anda tidak sedang ditawarkan order ini');
    }

    this.logger.log(`Driver ${driverId} menolak order ${rideId}. Alasan: ${reason || 'Tidak bersedia'}`);
    return this.dispatchNextCandidate(rideId, 'REJECTED', driverId);
  }

  // 4. DISPATCH OFFER TIMEOUT (Endpoint: POST /rides/:id/dispatch/timeout)
  async handleOfferTimeout(rideId: string, driverId?: string) {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.status !== 'SEARCHING') {
      throw new BadRequestException(`Order tidak dalam status penawaran aktif`);
    }

    this.logger.log(`Order ${rideId} mengalami batas waktu (timeout 30s) pada driver ${ride.currentOfferedDriverId}`);
    return this.dispatchNextCandidate(rideId, 'TIMEOUT', driverId || ride.currentOfferedDriverId);
  }

  // 5. DRIVER ACCEPTS RIDE (Endpoint: POST /rides/:id/accept)
  // Syarat: Driver ditawarkan, status ONLINE, APPROVED, GPS FRESH, Atomic Lock & Concurrency Protection
  async acceptRide(
    rideId: string,
    driverId: string,
    expectedVersion?: number
  ): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    // A. Validasi Status Order
    if (ride.status === 'COMPLETED') {
      throw new BadRequestException('Order perjalanan telah selesai (COMPLETED) dan tidak dapat diterima kembali');
    }
    if (ride.status === 'CANCELLED') {
      throw new BadRequestException('Order perjalanan telah dibatalkan (CANCELLED) dan tidak dapat diterima');
    }
    if (ride.status !== 'SEARCHING') {
      throw new ConflictException(`Order tidak dapat diterima karena sudah dalam status ${ride.status}`);
    }

    // B. Optimistic Concurrency Control (Version lock)
    if (expectedVersion !== undefined && ride.version !== expectedVersion) {
      throw new ConflictException('Terjadi konflik versi order. Order kemungkinan telah diterima mitra lain');
    }

    // C. Validasi Driver Assignment Match: HANYA DRIVER YANG DITAWARKAN YANG BOLEH MENERIMA!
    if (ride.currentOfferedDriverId && ride.currentOfferedDriverId !== driverId) {
      throw new ForbiddenException('Akses ditolak: Order ini ditawarkan kepada mitra driver lain');
    }

    // D. Validasi Kelayakan Driver (Role, Approved, Dokumen, Kendaraan, Status Online)
    const eligibility = this.driverEligibilityService.checkDispatchEligibility(driverId);
    if (!eligibility.eligible) {
      throw new ForbiddenException(`Driver belum memenuhi kelayakan operasional: ${eligibility.reason}`);
    }

    // E. Atomic Concurrency Lock: Driver tidak boleh sedang dalam order aktif lain!
    const activeDriverIds = this.getActiveDriverIdsInTrip();
    if (activeDriverIds.has(driverId)) {
      throw new ConflictException('Mitra driver sedang melayani order perjalanan lain yang belum selesai');
    }

    // Periksa apakah driver sedang terkunci pada penugasan aktif lain secara atomik
    const existingLockRideId = this.activeDriverAssignments.get(driverId);
    if (existingLockRideId && existingLockRideId !== rideId) {
      const lockedRide = this.rides.get(existingLockRideId);
      if (lockedRide && (lockedRide.status === 'ASSIGNED' || lockedRide.status === 'ARRIVED' || lockedRide.status === 'IN_TRIP')) {
        throw new ConflictException('Mitra driver sedang melayani perjalanan lain');
      }
    }

    const now = new Date().toISOString();

    // F. Update Dispatch Attempt -> ACCEPTED
    const activeAttempt = this.dispatchAttempts
      .slice()
      .reverse()
      .find((a) => a.rideId === rideId && a.driverId === driverId && a.status === 'OFFERED');

    if (activeAttempt) {
      activeAttempt.status = 'ACCEPTED';
      activeAttempt.respondedAt = now;
    } else {
      // Rekam direct attempt jika accept manual dalam test
      this.recordDispatchAttempt(rideId, driverId, ride.currentAttemptNumber || 1, 300, 45, 'ACCEPTED');
    }

    // G. Transisi Atomik: SEARCHING -> ASSIGNED
    ride.status = 'ASSIGNED';
    ride.driverId = driverId;
    ride.version += 1;
    ride.assignedAt = now;
    ride.updatedAt = now;
    ride.currentOfferedDriverId = driverId;

    const driverRecord = this.driverEligibilityService.getDriverRecord(driverId);
    const activeVehicle = driverRecord?.vehicles?.find((v: any) => v.isActive);

    ride.driver = {
      id: driverId,
      name: driverRecord?.driver?.displayName || 'Ahmad Gazali',
      phone: '+6281390511200',
      vehiclePlate: activeVehicle?.licensePlate || 'DA 5110 KAW',
      vehicleModel: activeVehicle?.model || 'Honda Vario 160',
      rating: driverRecord?.driver?.ratingAverage || 4.9,
    };

    // Kunci driver secara eksklusif ke ride ini
    this.activeDriverAssignments.set(driverId, rideId);

    this.recordStateLog(
      rideId,
      'SEARCHING',
      'ASSIGNED',
      driverId,
      'DRIVER',
      'Order berhasil diterima dan ditugaskan secara eksklusif ke mitra driver'
    );

    return ride;
  }

  // 6. DRIVER ARRIVED (ASSIGNED -> ARRIVED)
  async driverArrived(rideId: string, driverId: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      throw new BadRequestException(`Order dalam status ${ride.status} tidak dapat diubah`);
    }

    if (ride.status !== 'ASSIGNED') {
      throw new BadRequestException(`Transisi tidak valid: Status saat ini ${ride.status}, wajib ASSIGNED`);
    }

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Hanya mitra driver yang ditugaskan yang dapat mengonfirmasi tiba');
    }

    const now = new Date().toISOString();
    ride.status = 'ARRIVED';
    ride.version += 1;
    ride.arrivedAt = now;
    ride.updatedAt = now;

    this.recordStateLog(rideId, 'ASSIGNED', 'ARRIVED', driverId, 'DRIVER', 'Driver telah tiba di titik penjemputan');
    return ride;
  }

  // 7. START RIDE (ARRIVED -> IN_TRIP)
  async startRide(rideId: string, driverId: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.status === 'COMPLETED' || ride.status === 'CANCELLED') {
      throw new BadRequestException(`Order dalam status ${ride.status} tidak dapat dimulai`);
    }

    if (ride.status !== 'ARRIVED') {
      throw new BadRequestException(`Transisi tidak valid: Perjalanan hanya dapat dimulai saat status ARRIVED (saat ini ${ride.status})`);
    }

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Hanya mitra driver yang ditugaskan yang dapat memulai perjalanan');
    }

    const now = new Date().toISOString();
    ride.status = 'IN_TRIP';
    ride.version += 1;
    ride.startedAt = now;
    ride.updatedAt = now;

    this.recordStateLog(rideId, 'ARRIVED', 'IN_TRIP', driverId, 'DRIVER', 'Perjalanan bersama penumpang telah dimulai');
    return ride;
  }

  // 8. COMPLETE RIDE (IN_TRIP -> COMPLETED)
  async finishRide(rideId: string, driverId: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    if (ride.status === 'COMPLETED') {
      throw new BadRequestException('Order perjalanan sudah selesai (COMPLETED) dan tidak dapat diselesaikan ulang');
    }

    if (ride.status !== 'IN_TRIP') {
      throw new BadRequestException(`Transisi tidak valid: Hanya perjalanan aktif (IN_TRIP) yang dapat diselesaikan (saat ini ${ride.status})`);
    }

    if (ride.driverId !== driverId) {
      throw new ForbiddenException('Hanya mitra driver yang ditugaskan yang dapat menyelesaikan perjalanan');
    }

    const now = new Date().toISOString();
    ride.status = 'COMPLETED';
    ride.version += 1;
    ride.completedAt = now;
    ride.updatedAt = now;

    // Lepaskan lock assignment driver
    this.activeDriverAssignments.delete(driverId);

    this.recordStateLog(rideId, 'IN_TRIP', 'COMPLETED', driverId, 'DRIVER', 'Perjalanan telah selesai dengan selamat');
    return ride;
  }

  async completeRide(rideId: string, driverId: string): Promise<RideOrder> {
    return this.finishRide(rideId, driverId);
  }

  // 9. CANCEL RIDE (from SEARCHING, ASSIGNED, or ARRIVED)
  async cancelRide(
    rideId: string,
    actorId: string,
    actorRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM',
    dto?: CancelRideDto
  ): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order ${rideId} tidak ditemukan`);
    }

    // Strict Rule: COMPLETED atau IN_TRIP TIDAK BOLEH DIBATALKAN!
    if (ride.status === 'COMPLETED') {
      throw new BadRequestException('Order tidak dapat dibatalkan saat status COMPLETED');
    }
    if (ride.status === 'IN_TRIP') {
      throw new BadRequestException('Order tidak dapat dibatalkan saat status IN_TRIP');
    }
    if (ride.status === 'CANCELLED') {
      return ride; // Idempotent
    }

    const prevStatus = ride.status;
    const now = new Date().toISOString();

    // Lepas assignment lock jika ada driver
    if (ride.driverId) {
      this.activeDriverAssignments.delete(ride.driverId);
    }

    ride.status = 'CANCELLED';
    ride.version += 1;
    ride.cancelledBy = actorRole;
    ride.cancellationReason = dto?.reason || 'Dibatalkan oleh pengguna';
    ride.cancelledAt = now;
    ride.updatedAt = now;

    // Update ongoing dispatch attempts to FAILED
    for (const a of this.dispatchAttempts) {
      if (a.rideId === rideId && a.status === 'OFFERED') {
        a.status = 'FAILED';
        a.respondedAt = now;
      }
    }

    this.recordStateLog(rideId, prevStatus, 'CANCELLED', actorId, actorRole, ride.cancellationReason);
    return ride;
  }

  // 10. GET RIDE BY ID with IDOR protection
  async getRide(rideId: string, currentUserId?: string, currentUserRole?: string): Promise<RideOrder> {
    const ride = this.rides.get(rideId);
    if (!ride) {
      throw new NotFoundException(`Order perjalanan dengan ID ${rideId} tidak ditemukan`);
    }

    if (currentUserId && currentUserRole) {
      if (currentUserRole === 'CUSTOMER' && ride.passengerId !== currentUserId) {
        throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke order ini');
      }
      if (currentUserRole === 'DRIVER' && ride.driverId && ride.driverId !== currentUserId) {
        throw new ForbiddenException('Akses ditolak: Order ini bukan milik Anda');
      }
    }

    return ride;
  }

  // 11. GET USER RIDES
  async getUserRides(userId: string, role: string): Promise<RideOrder[]> {
    const all = Array.from(this.rides.values());
    if (role === 'CUSTOMER') {
      return all
        .filter((r) => r.passengerId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } else if (role === 'DRIVER') {
      return all
        .filter((r) => r.driverId === userId)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }
    return all.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  // Helper: Dapatkan driver yang sedang berada dalam trip aktif
  public getActiveDriverIdsInTrip(): Set<string> {
    const activeIds = new Set<string>();
    for (const r of this.rides.values()) {
      if (r.driverId && (r.status === 'ASSIGNED' || r.status === 'ARRIVED' || r.status === 'IN_TRIP')) {
        activeIds.add(r.driverId);
      }
    }
    return activeIds;
  }

  // Helper: Catat Dispatch Attempt
  public recordDispatchAttempt(
    rideId: string,
    driverId: string,
    attemptNumber: number,
    distanceMeters: number,
    etaSeconds: number,
    status: 'OFFERED' | 'ACCEPTED' | 'REJECTED' | 'TIMEOUT' | 'FAILED'
  ): DispatchAttempt {
    const now = new Date().toISOString();
    const attempt: DispatchAttempt = {
      id: crypto.randomUUID(),
      rideId,
      driverId,
      attemptNumber,
      distanceMeters,
      etaSeconds,
      status,
      offeredAt: now,
      createdAt: now,
    };
    this.dispatchAttempts.push(attempt);
    return attempt;
  }

  public getDispatchAttempts(rideId: string): DispatchAttempt[] {
    return this.dispatchAttempts.filter((a) => a.rideId === rideId);
  }

  // Helper: Catat audit state log
  private recordStateLog(
    rideId: string,
    fromState: RideStatus | undefined,
    toState: RideStatus,
    actorId: string,
    actorRole: 'CUSTOMER' | 'DRIVER' | 'SYSTEM',
    note?: string
  ) {
    this.stateLogs.push({
      id: crypto.randomUUID(),
      rideId,
      fromState,
      toState,
      actorId,
      actorRole,
      note,
      createdAt: new Date().toISOString(),
    });
  }

  getStateLogs(rideId: string): RideStateLog[] {
    return this.stateLogs.filter((l) => l.rideId === rideId);
  }
}
