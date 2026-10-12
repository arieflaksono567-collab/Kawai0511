import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TripHistoryRepository } from './trip-history.repository';
import {
  TripHistoryDetail,
  TripHistoryResponseDto,
  TripHistoryFilter,
} from './trip-history.types';
import { TripHistoryQueryDto } from './dto/trip-history-query.dto';

export interface AuthenticatedUserContext {
  id: string;
  role: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  driverId?: string;
  phoneNumber?: string;
}

@Injectable()
export class TripHistoryService {
  constructor(private readonly tripHistoryRepository: TripHistoryRepository) {}

  /**
   * Mengambil daftar riwayat perjalanan terisolasi sesuai hak akses pengguna
   */
  async getTripHistory(
    currentUser: AuthenticatedUserContext,
    query: TripHistoryQueryDto = {}
  ): Promise<TripHistoryResponseDto> {
    if (!currentUser || !currentUser.id || !currentUser.role) {
      throw new UnauthorizedException('Autentikasi diperlukan untuk mengakses riwayat perjalanan');
    }

    const page = query.page ? Math.max(1, Number(query.page)) : 1;
    const limit = query.limit ? Math.max(1, Math.min(100, Number(query.limit))) : 20;
    const offset = query.offset !== undefined ? Math.max(0, Number(query.offset)) : (page - 1) * limit;

    const filter: TripHistoryFilter = {
      userId: currentUser.id,
      role: currentUser.role,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
      sortBy: query.sortBy || 'createdAt',
      sortOrder: query.sortOrder || 'desc',
      limit,
      offset,
      page,
    };

    // Strict role scoping
    if (currentUser.role === 'DRIVER') {
      filter.driverId = currentUser.driverId || currentUser.id;
    } else if (currentUser.role === 'CUSTOMER') {
      filter.driverId = undefined;
    }

    return this.tripHistoryRepository.getTripHistory(filter);
  }

  /**
   * Mengambil rincian riwayat satu perjalanan dengan verifikasi kepemilikan
   */
  async getTripDetail(
    rideId: string,
    currentUser: AuthenticatedUserContext
  ): Promise<TripHistoryDetail> {
    if (!currentUser || !currentUser.id || !currentUser.role) {
      throw new UnauthorizedException('Autentikasi diperlukan untuk mengakses rincian riwayat perjalanan');
    }

    if (!rideId) {
      throw new NotFoundException('ID perjalanan wajib disertakan');
    }

    return this.tripHistoryRepository.getTripDetailById(rideId, currentUser);
  }
}
