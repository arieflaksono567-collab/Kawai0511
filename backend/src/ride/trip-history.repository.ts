import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import {
  TripHistoryDetail,
  TripHistoryFilter,
  TripHistoryResponseDto,
  SafePassengerSummary,
  SafeDriverSummary,
  TripPaymentSummary,
} from './trip-history.types';
import { RideService, RideOrder } from './ride.service';
import { RatingRepository } from '../rating/rating.repository';
import { DriverEarningsLedgerRepository } from '../payment/driver-earnings-ledger.repository';
import { PaymentService } from '../payment/payment.service';
import { AuthService } from '../auth/auth.service';
import { DriverService } from '../driver/driver.service';

function maskPhone(phone?: string): string | undefined {
  if (!phone) return undefined;
  if (phone.length <= 6) return phone;
  const start = phone.slice(0, 5);
  const end = phone.slice(-3);
  return `${start}****${end}`;
}

@Injectable()
export class TripHistoryRepository {
  constructor(
    private readonly rideService: RideService,
    private readonly ratingRepository?: RatingRepository,
    private readonly earningsRepository?: DriverEarningsLedgerRepository,
    private readonly paymentService?: PaymentService,
    private readonly authService?: AuthService,
    private readonly driverService?: DriverService
  ) {}

  /**
   * Query composite trip history with strict authorization scoping,
   * pagination, sorting newest first, and safe user summaries.
   */
  async getTripHistory(filter: TripHistoryFilter): Promise<TripHistoryResponseDto> {
    const driverId = filter.role === 'DRIVER' && filter.driverId ? filter.driverId : undefined;
    
    // 1. Ambil order perjalanan dari RideService
    const rides = await this.rideService.getUserRides(
      filter.role === 'DRIVER' && filter.driverId ? filter.driverId : filter.userId,
      filter.role,
      driverId
    );

    let filtered = [...rides];

    // 2. Strict Role Scoping / Isolation
    if (filter.role === 'CUSTOMER') {
      filtered = filtered.filter((r) => r.passengerId === filter.userId);
    } else if (filter.role === 'DRIVER') {
      const allowedDriverId = filter.driverId || filter.userId;
      filtered = filtered.filter(
        (r) => r.driverId === allowedDriverId || r.driverId === filter.userId
      );
    }

    // 3. Filter berdasarkan status jika ditentukan
    if (filter.status) {
      filtered = filtered.filter((r) => r.status === filter.status);
    }

    // 4. Filter berdasarkan rentang tanggal jika ditentukan
    if (filter.startDate) {
      const start = new Date(filter.startDate).getTime();
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() >= start);
    }
    if (filter.endDate) {
      const end = new Date(filter.endDate).getTime();
      filtered = filtered.filter((r) => new Date(r.createdAt).getTime() <= end);
    }

    // 5. Sorting (Default: Newest First by createdAt DESC)
    const sortBy = filter.sortBy || 'createdAt';
    const sortOrder = filter.sortOrder || 'desc';

    filtered.sort((a, b) => {
      let valA: any;
      let valB: any;

      if (sortBy === 'completedAt') {
        valA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
        valB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
      } else if (sortBy === 'totalFare') {
        valA = a.totalFare || 0;
        valB = b.totalFare || 0;
      } else if (sortBy === 'distanceKm') {
        valA = a.distanceKm || 0;
        valB = b.distanceKm || 0;
      } else {
        // Default createdAt
        valA = new Date(a.createdAt).getTime();
        valB = new Date(b.createdAt).getTime();
      }

      if (sortOrder === 'asc') {
        return valA > valB ? 1 : valA < valB ? -1 : 0;
      } else {
        return valB > valA ? 1 : valB < valA ? -1 : 0;
      }
    });

    // 6. Pagination Calculation
    const limit = filter.limit !== undefined ? Math.max(1, filter.limit) : 20;
    let offset = filter.offset !== undefined ? Math.max(0, filter.offset) : 0;
    if (filter.page !== undefined && filter.offset === undefined) {
      offset = Math.max(0, (filter.page - 1) * limit);
    }
    const page = Math.floor(offset / limit) + 1;
    const total = filtered.length;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const paged = filtered.slice(offset, offset + limit);

    // 7. Join dengan Rating, Payment, Earnings Ledger, dan Safe Summaries
    const items: TripHistoryDetail[] = [];
    for (const r of paged) {
      const detail = await this.mapToTripHistoryDetail(r, filter.role);
      items.push(detail);
    }

    return {
      items,
      total,
      limit,
      offset,
      page,
      totalPages,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    };
  }

  /**
   * Get single trip detail by ID with strict authorization verification
   */
  async getTripDetailById(
    rideId: string,
    currentUser: { id: string; role: 'CUSTOMER' | 'DRIVER' | 'ADMIN'; driverId?: string }
  ): Promise<TripHistoryDetail> {
    const ride = await this.rideService.getRide(
      rideId,
      currentUser.role === 'DRIVER' && currentUser.driverId ? currentUser.driverId : currentUser.id,
      currentUser.role
    );

    if (!ride) {
      throw new NotFoundException(`Riwayat perjalanan ${rideId} tidak ditemukan`);
    }

    // Enforce strict authorization
    if (currentUser.role === 'CUSTOMER' && ride.passengerId !== currentUser.id) {
      throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke riwayat perjalanan ini');
    }

    if (
      currentUser.role === 'DRIVER' &&
      (!ride.driverId ||
        (ride.driverId !== currentUser.id && ride.driverId !== currentUser.driverId))
    ) {
      throw new ForbiddenException('Akses ditolak: Riwayat perjalanan ini bukan milik armada Anda');
    }

    return this.mapToTripHistoryDetail(ride, currentUser.role);
  }

  /**
   * Helper: Map RideOrder to TripHistoryDetail with safe summaries and sanitized fields
   */
  private async mapToTripHistoryDetail(
    ride: RideOrder,
    viewerRole: 'CUSTOMER' | 'DRIVER' | 'ADMIN'
  ): Promise<TripHistoryDetail> {
    // 1. Joined Rating Data
    let ratingDetail;
    if (this.ratingRepository) {
      const ratings = await this.ratingRepository.findByRideId(ride.id);
      ratingDetail = ratings.length > 0 ? ratings[0] : undefined;
    }

    // 2. Joined Payment Data
    let paymentDetail: TripPaymentSummary | undefined;
    if (this.paymentService) {
      const payment = this.paymentService.getPaymentByRideId(ride.id);
      if (payment) {
        paymentDetail = {
          id: payment.id,
          method: payment.method,
          status: payment.status,
          amount: payment.amount,
          isSettled: payment.isSettled,
          paidAt: payment.paidAt,
        };
      }
    }
    // Fallback payment data if ride is COMPLETED but payment record wasn't indexed in paymentService
    if (!paymentDetail && ride.status === 'COMPLETED') {
      paymentDetail = {
        method: 'CASH',
        status: 'PAID',
        amount: ride.totalFare,
        isSettled: true,
        paidAt: ride.completedAt,
      };
    }

    // 3. Joined Earnings Ledger (Strictly hidden for CUSTOMER; accessible to DRIVER & ADMIN)
    let earningsDetail;
    if (this.earningsRepository && viewerRole !== 'CUSTOMER') {
      const earnings = await this.earningsRepository.findByRideId(ride.id);
      earningsDetail = earnings || undefined;
    }

    // 4. Safe Passenger Summary (NEVER expose password, token, otp, secret, KTP)
    let safePassenger: SafePassengerSummary | undefined;
    if (ride.passengerId) {
      let passengerUser;
      if (this.authService) {
        passengerUser = this.authService.findUserById(ride.passengerId);
      }
      safePassenger = {
        id: ride.passengerId,
        fullName: passengerUser?.fullName || 'Pelanggan Kawai 0511',
        phoneNumber: passengerUser?.phoneNumber ? maskPhone(passengerUser.phoneNumber) : undefined,
        avatarUrl: passengerUser?.avatarUrl,
      };
    }

    // 5. Safe Driver Summary (NEVER expose credentials or documents)
    let safeDriver: SafeDriverSummary | undefined;
    if (ride.driver) {
      safeDriver = {
        id: ride.driver.id,
        name: ride.driver.name,
        phone: ride.driver.phone ? maskPhone(ride.driver.phone) : undefined,
        vehiclePlate: ride.driver.vehiclePlate,
        vehicleModel: ride.driver.vehicleModel,
        rating: ride.driver.rating,
      };
    } else if (ride.driverId) {
      let driverProfile;
      if (this.driverService) {
        driverProfile = this.driverService.getDriverById(ride.driverId);
      }
      safeDriver = {
        id: ride.driverId,
        name: driverProfile?.displayName || 'Mitra Pengemudi Kawai',
        rating: driverProfile?.ratingAverage,
      };
    }

    return {
      rideId: ride.id,
      passengerId: ride.passengerId,
      driverId: ride.driverId,
      createdAt: ride.createdAt,
      completedAt: ride.completedAt,
      cancelledAt: ride.cancelledAt,
      cancellationReason: ride.cancellationReason,

      pickup: {
        address: ride.pickupAddress,
        lat: ride.pickupLat,
        lng: ride.pickupLng,
      },
      destination: {
        address: ride.destinationAddress,
        lat: ride.destinationLat,
        lng: ride.destinationLng,
      },

      // Backward compatibility fields
      pickupAddress: ride.pickupAddress,
      pickupLat: ride.pickupLat,
      pickupLng: ride.pickupLng,
      destinationAddress: ride.destinationAddress,
      destinationLat: ride.destinationLat,
      destinationLng: ride.destinationLng,

      distanceKm: ride.distanceKm,
      durationMinutes: ride.durationMinutes,
      totalFare: ride.totalFare,
      fare: {
        totalFare: ride.totalFare,
        baseFare: ride.fareSnapshot?.baseFare,
        distanceFare: ride.fareSnapshot?.distanceFare,
        durationFare: ride.fareSnapshot?.durationFare,
      },

      status: ride.status,
      rideStatus: ride.status,

      passenger: safePassenger,
      driver: safeDriver,
      rating: ratingDetail,
      payment: paymentDetail,
      earnings: earningsDetail,
    };
  }
}
