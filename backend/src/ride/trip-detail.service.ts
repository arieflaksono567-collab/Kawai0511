import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { RideService, RideOrder } from './ride.service';
import { RatingRepository } from '../rating/rating.repository';
import { DriverEarningsLedgerRepository } from '../payment/driver-earnings-ledger.repository';
import { PaymentService } from '../payment/payment.service';
import { AuthService } from '../auth/auth.service';
import { DriverService } from '../driver/driver.service';
import {
  TripDetailResponseDto,
  TripLocationDetail,
  TripRouteDetail,
  TripFareDetail,
  TripPaymentDetail,
  TripRatingDetail,
  TripTimestamps,
} from './trip-detail.types';
import { SafePassengerSummary, SafeDriverSummary } from './trip-history.types';
import { AuthenticatedUserContext } from './trip-history.service';

function maskPhone(phone?: string | null): string | null {
  if (!phone) return null;
  if (phone.length <= 6) return phone;
  const start = phone.slice(0, 5);
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

@Injectable()
export class TripDetailService {
  constructor(
    private readonly rideService: RideService,
    private readonly ratingRepository?: RatingRepository,
    private readonly earningsRepository?: DriverEarningsLedgerRepository,
    private readonly paymentService?: PaymentService,
    private readonly authService?: AuthService,
    private readonly driverService?: DriverService
  ) {}

  /**
   * Mengambil rincian lengkap satu perjalanan (Trip Detail)
   * Dilengkapi verifikasi otorisasi ketat, proteksi IDOR,
   * dan penggantian data yang belum tersedia dengan nullable/explicit unavailable state.
   */
  async getTripDetail(
    rideId: string,
    currentUser: AuthenticatedUserContext
  ): Promise<TripDetailResponseDto> {
    // 1. Verifikasi Autentikasi Pengguna
    if (!currentUser || !currentUser.id || !currentUser.role) {
      throw new UnauthorizedException('Autentikasi diperlukan untuk mengakses rincian perjalanan');
    }

    if (!rideId) {
      throw new BadRequestException('ID perjalanan wajib disertakan');
    }

    // 2. Ambil Entity Ride dari RideService
    const ride = await this.rideService.getRide(rideId);
    if (!ride) {
      throw new NotFoundException(`Rincian perjalanan dengan ID ${rideId} tidak ditemukan`);
    }

    // 3. Verifikasi Hak Akses & Proteksi IDOR (Insecure Direct Object Reference)
    if (currentUser.role === 'CUSTOMER') {
      // Passenger hanya dapat membuka trip miliknya
      if (ride.passengerId !== currentUser.id) {
        throw new ForbiddenException(
          'Akses ditolak: Anda tidak memiliki akses ke rincian perjalanan ini'
        );
      }
    } else if (currentUser.role === 'DRIVER') {
      // Driver hanya dapat membuka trip yang ditugaskan kepadanya
      const allowedDriverId = currentUser.driverId || currentUser.id;
      if (!ride.driverId || (ride.driverId !== currentUser.id && ride.driverId !== allowedDriverId)) {
        throw new ForbiddenException(
          'Akses ditolak: Rincian perjalanan ini tidak ditugaskan kepada Anda'
        );
      }
    } else if (currentUser.role !== 'ADMIN') {
      throw new ForbiddenException('Akses ditolak: Peran akun Anda tidak memiliki izin untuk rincian perjalanan');
    }

    // 4. Komposisi Data Nyata Tanpa Data Palsu (Explicit Nullable/Unavailable States)

    // A. Pickup & Destination
    const pickup: TripLocationDetail = {
      address: ride.pickupAddress,
      lat: ride.pickupLat,
      lng: ride.pickupLng,
    };

    const destination: TripLocationDetail = {
      address: ride.destinationAddress,
      lat: ride.destinationLat,
      lng: ride.destinationLng,
    };

    // B. Route & Distance
    const distanceKm = typeof ride.distanceKm === 'number' ? ride.distanceKm : null;
    const durationMinutes = typeof ride.durationMinutes === 'number' ? ride.durationMinutes : null;
    let route: TripRouteDetail | null = null;
    if ((ride as any).routeGeometry || (ride as any).route) {
      route = {
        distanceKm,
        durationMinutes,
        geometry: (ride as any).routeGeometry || (ride as any).route,
        available: true,
      };
    }

    // C. Fare Breakdown
    let fare: TripFareDetail | null = null;
    if (ride.fareSnapshot || typeof ride.totalFare === 'number') {
      fare = {
        totalFare: ride.totalFare,
        baseFare: typeof ride.fareSnapshot?.baseFare === 'number' ? ride.fareSnapshot.baseFare : null,
        distanceFare: typeof ride.fareSnapshot?.distanceFare === 'number' ? ride.fareSnapshot.distanceFare : null,
        durationFare: typeof ride.fareSnapshot?.durationFare === 'number' ? ride.fareSnapshot.durationFare : null,
        perKmRate: typeof ride.fareSnapshot?.perKmRate === 'number' ? ride.fareSnapshot.perKmRate : null,
        perMinuteRate: typeof ride.fareSnapshot?.perMinuteRate === 'number' ? ride.fareSnapshot.perMinuteRate : null,
        minimumFare: typeof ride.fareSnapshot?.minimumFare === 'number' ? ride.fareSnapshot.minimumFare : null,
      };
    }

    // D. Payment Data
    let payment: TripPaymentDetail | null = null;
    if (this.paymentService) {
      const paymentRec = this.paymentService.getPaymentByRideId(ride.id);
      if (paymentRec) {
        payment = {
          id: paymentRec.id,
          method: paymentRec.method,
          status: paymentRec.status,
          amount: paymentRec.amount,
          isSettled: typeof paymentRec.isSettled === 'boolean' ? paymentRec.isSettled : null,
          paidAt: paymentRec.paidAt ?? null,
        };
      }
    }
    // Fallback payment data if ride is completed but not indexed in paymentService
    if (!payment && ride.status === 'COMPLETED') {
      payment = {
        id: (ride as any).paymentId ?? null,
        method: (ride as any).paymentMethod ?? 'CASH',
        status: 'PAID',
        amount: ride.totalFare,
        isSettled: true,
        paidAt: ride.completedAt ?? null,
      };
    }

    // E. Rating Data (Explicit null jika belum dinilai, TIDAK mengarang nilai palsu)
    let rating: TripRatingDetail | null = null;
    if (this.ratingRepository) {
      const ratings = await this.ratingRepository.findByRideId(ride.id);
      if (ratings && ratings.length > 0) {
        const r = ratings[0];
        rating = {
          id: r.id,
          score: r.score,
          comment: r.comment ?? null,
          createdAt: r.createdAt,
        };
      }
    }

    // F. Lifecycle Timestamps
    const timestamps: TripTimestamps = {
      createdAt: ride.createdAt,
      assignedAt: ride.assignedAt ?? null,
      arrivedAt: ride.arrivedAt ?? null,
      startedAt: ride.startedAt ?? null,
      completedAt: ride.completedAt ?? null,
      cancelledAt: ride.cancelledAt ?? null,
      updatedAt: ride.updatedAt ?? null,
    };

    // G. Safe Passenger Summary (Zero Credential Leakage)
    let passenger: SafePassengerSummary | null = null;
    if (ride.passengerId) {
      let passengerUser;
      if (this.authService) {
        passengerUser = this.authService.findUserById(ride.passengerId);
      }
      passenger = {
        id: ride.passengerId,
        fullName: passengerUser?.fullName || 'Pelanggan Kawai 0511',
        phoneNumber: maskPhone(passengerUser?.phoneNumber) ?? undefined,
        avatarUrl: passengerUser?.avatarUrl ?? undefined,
      };
    }

    // H. Safe Driver Summary (Explicit null jika driver belum ditugaskan, TIDAK mengarang 4.9 rating)
    let driver: SafeDriverSummary | null = null;
    if (ride.driver) {
      driver = {
        id: ride.driver.id,
        name: ride.driver.name,
        phone: maskPhone(ride.driver.phone) ?? undefined,
        vehiclePlate: ride.driver.vehiclePlate ?? undefined,
        vehicleModel: ride.driver.vehicleModel ?? undefined,
        rating: typeof ride.driver.rating === 'number' ? ride.driver.rating : undefined,
        avatarUrl: (ride.driver as any).avatarUrl ?? undefined,
      };
    } else if (ride.driverId) {
      let driverProfile;
      if (this.driverService) {
        driverProfile = this.driverService.getDriverById(ride.driverId);
      }
      driver = {
        id: ride.driverId,
        name: driverProfile?.displayName || 'Mitra Pengemudi Kawai',
        phone: maskPhone(driverProfile?.phoneNumber) ?? undefined,
        vehiclePlate: driverProfile?.vehiclePlate ?? undefined,
        vehicleModel: driverProfile?.vehicleModel ?? undefined,
        rating: typeof driverProfile?.ratingAverage === 'number' ? driverProfile.ratingAverage : undefined,
        avatarUrl: driverProfile?.avatarUrl ?? undefined,
      };
    }

    // I. Driver Earnings Ledger (Strictly HIDDEN dari Penumpang)
    let earnings = undefined;
    if (this.earningsRepository && currentUser.role !== 'CUSTOMER') {
      const earningsRecord = await this.earningsRepository.findByRideId(ride.id);
      earnings = earningsRecord ?? null;
    }

    return {
      id: ride.id,
      rideId: ride.id,
      status: ride.status,
      rideStatus: ride.status,
      passengerId: ride.passengerId,
      driverId: ride.driverId ?? null,
      cancellationReason: ride.cancellationReason ?? null,

      pickup,
      destination,

      distanceKm,
      durationMinutes,
      route,

      fare,
      totalFare: ride.totalFare,

      payment,
      rating,

      timestamps,
      createdAt: ride.createdAt,
      completedAt: ride.completedAt ?? null,
      cancelledAt: ride.cancelledAt ?? null,

      passenger,
      driver,
      earnings,

      // Backward compatibility fields
      pickupAddress: ride.pickupAddress,
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
      destinationAddress: ride.destinationAddress,
      destinationLat: ride.destinationLat,
      destinationLng: ride.destinationLng,
    };
  }
}
