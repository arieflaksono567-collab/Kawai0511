import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { RatingRepository } from './rating.repository';
import { CreateRatingDto } from './dto/create-rating.dto';
import { RideRatingEntity, DriverRatingSummary } from './rating.types';
import { RideService } from '../ride/ride.service';
import { DriverService } from '../driver/driver.service';

export interface RatingResult {
  rating: RideRatingEntity;
  driverSummary?: {
    ratingAverage: number;
    ratingCount: number;
  };
  message: string;
}

@Injectable()
export class RatingService {
  private readonly logger = new Logger(RatingService.name);

  constructor(
    private readonly ratingRepository: RatingRepository,
    private readonly rideService: RideService,
    private readonly driverService?: DriverService
  ) {}

  /**
   * Submit Rating untuk Ride yang telah selesai (COMPLETED)
   * Mendukung Passenger memberi rating ke Driver dan Driver memberi rating ke Passenger.
   * Reviewer dan Reviewed User divalidasi dari identitas terautentikasi dan relasi pada Ride.
   */
  async submitRating(
    rideId: string,
    authenticatedUser: { id: string; role: string; driverId?: string },
    dto: CreateRatingDto
  ): Promise<RatingResult> {
    // 1. Validasi Skor Penilaian (Rule 1: Score hanya 1 - 5)
    if (typeof dto.score !== 'number' || isNaN(dto.score)) {
      throw new BadRequestException('Skor penilaian wajib berupa angka yang valid');
    }

    if (dto.score < 1.0 || dto.score > 5.0) {
      throw new BadRequestException(
        `Skor penilaian harus berada di antara 1 dan 5 (diterima: ${dto.score})`
      );
    }

    // 2. Ambil data perjalanan
    const ride = await this.rideService.getRide(rideId);
    if (!ride) {
      throw new NotFoundException(`Order perjalanan dengan ID ${rideId} tidak ditemukan`);
    }

    // 3. Rule 3 & 10: Rating HANYA diperbolehkan untuk ride COMPLETED
    if (ride.status !== 'COMPLETED') {
      throw new BadRequestException(
        `Penilaian hanya diperbolehkan untuk perjalanan yang telah selesai (COMPLETED). Status saat ini: ${ride.status}`
      );
    }

    // 4. Rule 4 & 8: Validasi hubungan reviewer dengan Ride berdasarkan identitas terautentikasi
    // Dapatkan data profil driver untuk pemetaan userId vs driverId
    const driverRecord = this.driverService
      ? this.driverService.getDriverById(ride.driverId)
      : undefined;

    const driverUserId = driverRecord?.userId || ride.driverId;

    // Periksa apakah user adalah penumpang pada ride ini
    const isPassenger = authenticatedUser.id === ride.passengerId;

    // Periksa apakah user adalah driver pada ride ini
    const isDriver =
      (authenticatedUser.driverId && authenticatedUser.driverId === ride.driverId) ||
      authenticatedUser.id === ride.driverId ||
      (driverRecord && driverRecord.userId === authenticatedUser.id) ||
      (authenticatedUser.driverId && driverRecord && driverRecord.id === authenticatedUser.driverId);

    if (!isPassenger && !isDriver) {
      throw new ForbiddenException(
        'Akses ditolak: Hanya penumpang atau mitra driver yang terkait dengan perjalanan ini yang dapat memberikan penilaian'
      );
    }

    // 5. Tentukan Reviewer dan Reviewed User secara server-side
    let reviewerId: string;
    let reviewedUserId: string;
    let driverProfileId: string | undefined = ride.driverId;

    if (isPassenger) {
      // Penumpang memberi rating kepada Driver
      reviewerId = ride.passengerId;
      reviewedUserId = driverUserId!;
      driverProfileId = ride.driverId;
    } else {
      // Driver memberi rating kepada Penumpang
      reviewerId = driverUserId!;
      reviewedUserId = ride.passengerId;
      driverProfileId = ride.driverId;
    }

    // 6. Rule 7: User tidak boleh memberi rating kepada dirinya sendiri
    if (reviewerId === reviewedUserId) {
      throw new BadRequestException('Pengguna tidak dapat memberikan penilaian kepada diri sendiri');
    }

    // 7. Rule 5 & 6: Satu reviewer hanya dapat memberikan satu rating untuk satu ride (Cegah duplicate)
    const alreadyRated = await this.ratingRepository.hasRated(ride.id, reviewerId);
    if (alreadyRated) {
      throw new ConflictException(
        'Penilaian sudah pernah diberikan untuk perjalanan ini. Rating ganda tidak diizinkan.'
      );
    }

    // 8. Rule 9: Commit atomik ke database repository
    const rating = await this.ratingRepository.create({
      rideId: ride.id,
      reviewerId,
      reviewedUserId,
      driverId: driverProfileId,
      score: dto.score,
      comment: dto.comment,
      tags: dto.tags,
      tipAmount: dto.tipAmount,
    });

    let driverSummary: { ratingAverage: number; ratingCount: number } | undefined;

    // 9. Jika Penumpang menilai Driver -> update aggregasi rating driver
    if (isPassenger && driverProfileId && this.driverService) {
      driverSummary = this.driverService.updateDriverRatingAggregation(
        driverProfileId,
        dto.score
      );

      // Sinkronkan juga pada snapshot ride order jika tersedia
      if (ride.driver) {
        ride.driver.rating = driverSummary.ratingAverage;
      }

      this.logger.log(
        `Driver ${driverProfileId} menerima rating ${dto.score}. Rata-rata baru: ${driverSummary.ratingAverage} (${driverSummary.ratingCount} ulasan)`
      );
    }

    return {
      rating,
      driverSummary,
      message: isPassenger
        ? 'Penilaian untuk mitra driver berhasil dikirim. Terima kasih!'
        : 'Penilaian untuk penumpang berhasil dikirim. Terima kasih!',
    };
  }

  /**
   * Dapatkan seluruh penilaian untuk suatu order perjalanan
   */
  async getRatingsForRide(
    rideId: string,
    currentUser: { id: string; role: string; driverId?: string }
  ): Promise<RideRatingEntity[]> {
    const ride = await this.rideService.getRide(rideId);
    if (!ride) {
      throw new NotFoundException(`Order perjalanan dengan ID ${rideId} tidak ditemukan`);
    }

    // Enforce authorization: Hanya pihak terkait atau admin yang dapat melihat
    if (currentUser.role !== 'ADMIN') {
      const isPassenger = currentUser.id === ride.passengerId;
      const isDriver =
        currentUser.id === ride.driverId ||
        currentUser.driverId === ride.driverId;

      if (!isPassenger && !isDriver) {
        throw new ForbiddenException('Akses ditolak: Anda tidak memiliki akses ke penilaian perjalanan ini');
      }
    }

    return this.ratingRepository.findByRideId(rideId);
  }

  /**
   * Dapatkan ringkasan rating driver
   */
  async getDriverRatingSummary(driverId: string): Promise<DriverRatingSummary> {
    return this.ratingRepository.getDriverSummary(driverId);
  }

  /**
   * Dapatkan seluruh ulasan yang diterima driver
   */
  async getDriverRatings(
    driverId: string,
    currentUser: { id: string; role: string; driverId?: string }
  ): Promise<RideRatingEntity[]> {
    return this.ratingRepository.findByDriverId(driverId, currentUser);
  }

  /**
   * Dapatkan riwayat ulasan yang pernah diberikan oleh user saat ini
   */
  async getMyGivenRatings(
    currentUser: { id: string; role: string }
  ): Promise<RideRatingEntity[]> {
    return this.ratingRepository.findByReviewerId(currentUser.id, currentUser);
  }
}
