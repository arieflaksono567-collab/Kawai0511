import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { RideService, RideOrder } from './ride.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { TripHistoryQueryDto } from './dto/trip-history-query.dto';
import { TripHistoryResponseDto, TripHistoryDetail } from './trip-history.types';
import { TripHistoryService } from './trip-history.service';
import { TripDetailService } from './trip-detail.service';
import { TripDetailResponseDto } from './trip-detail.types';
import { CreateRatingDto } from '../rating/dto/create-rating.dto';
import { RatingService } from '../rating/rating.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('rides')
export class RideController {
  constructor(
    private readonly rideService: RideService,
    private readonly ratingService?: RatingService,
    private readonly tripHistoryService?: TripHistoryService,
    private readonly tripDetailService?: TripDetailService
  ) {}

  // 1. PASSENGER CREATES RIDE ORDER (SEARCHING)
  @Post('order')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @HttpCode(HttpStatus.CREATED)
  async createRide(@Req() req: any, @Body() dto: CreateRideDto): Promise<RideOrder> {
    const passengerId = req.user?.id || 'b0000000-0000-0000-0000-000000000002';
    return this.rideService.createRide(passengerId, dto);
  }

  // 2. GET USER'S RIDES (Passenger or Driver active & history)
  @Get('my')
  @UseGuards(JwtAuthGuard)
  async getMyRides(@Req() req: any): Promise<RideOrder[]> {
    const userId = req.user?.id || 'b0000000-0000-0000-0000-000000000002';
    const role = req.user?.role || 'CUSTOMER';
    return this.rideService.getUserRides(userId, role);
  }

  // 2b. GET TRIP HISTORY (Passenger & Driver with strict data isolation, pagination & sorting)
  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getTripHistory(
    @Req() req: any,
    @Query() query: TripHistoryQueryDto
  ): Promise<TripHistoryResponseDto> {
    if (!this.tripHistoryService) {
      throw new BadRequestException('Trip history service is not initialized');
    }
    const user = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };
    return this.tripHistoryService.getTripHistory(user, query);
  }

  // 2c. GET SINGLE TRIP HISTORY DETAIL BY ID
  @Get('history/:id')
  @UseGuards(JwtAuthGuard)
  async getTripHistoryDetail(
    @Req() req: any,
    @Param('id') id: string
  ): Promise<TripDetailResponseDto | TripHistoryDetail> {
    const user = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };
    if (this.tripDetailService) {
      return this.tripDetailService.getTripDetail(id, user);
    }
    if (this.tripHistoryService) {
      return this.tripHistoryService.getTripDetail(id, user);
    }
    throw new BadRequestException('Trip history service is not initialized');
  }

  // 2d. GET SINGLE TRIP DETAIL (PHASE 7.5: Endpoint detail satu perjalanan)
  @Get(':id/detail')
  @UseGuards(JwtAuthGuard)
  async getTripDetail(
    @Req() req: any,
    @Param('id') id: string
  ): Promise<TripDetailResponseDto> {
    const user = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };
    if (this.tripDetailService) {
      return this.tripDetailService.getTripDetail(id, user);
    }
    if (this.tripHistoryService) {
      return this.tripHistoryService.getTripDetail(id, user) as any;
    }
    throw new BadRequestException('Trip detail service is not initialized');
  }

  // 3. GET SPECIFIC RIDE BY ID
  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getRide(@Req() req: any, @Param('id') id: string): Promise<RideOrder> {
    const userId = req.user?.id;
    const role = req.user?.role;
    return this.rideService.getRide(id, userId, role);
  }

  // 4. DRIVER ACCEPTS RIDE (SEARCHING -> ASSIGNED)
  @Post(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async acceptRide(
    @Req() req: any,
    @Param('id') id: string,
    @Body('expectedVersion') expectedVersion?: number
  ): Promise<RideOrder> {
    const driverId = req.user?.driverId || req.user?.id || 'd0000000-0000-0000-0000-000000000001';
    return this.rideService.acceptRide(id, driverId, expectedVersion);
  }

  // 5. DRIVER ARRIVED AT PICKUP (ASSIGNED -> ARRIVED)
  @Post(':id/arrived')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async driverArrived(@Req() req: any, @Param('id') id: string): Promise<RideOrder> {
    const driverId = req.user?.driverId || req.user?.id || 'd0000000-0000-0000-0000-000000000001';
    return this.rideService.driverArrived(id, driverId);
  }

  // 6. RIDE STARTS (ARRIVED -> IN_TRIP)
  @Post(':id/start')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async startRide(@Req() req: any, @Param('id') id: string): Promise<RideOrder> {
    const driverId = req.user?.driverId || req.user?.id || 'd0000000-0000-0000-0000-000000000001';
    return this.rideService.startRide(id, driverId);
  }

  // 7. RIDE COMPLETES (IN_TRIP -> COMPLETED)
  @Post(':id/complete')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async completeRide(@Req() req: any, @Param('id') id: string): Promise<RideOrder> {
    const driverId = req.user?.driverId || req.user?.id || 'd0000000-0000-0000-0000-000000000001';
    return this.rideService.finishRide(id, driverId);
  }

  // 8. CANCEL RIDE (from SEARCHING, ASSIGNED, or ARRIVED)
  @Post(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async cancelRide(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto?: CancelRideDto
  ): Promise<RideOrder> {
    const actorId = req.user?.id || 'b0000000-0000-0000-0000-000000000002';
    const actorRole = (req.user?.role || 'CUSTOMER') as 'CUSTOMER' | 'DRIVER' | 'SYSTEM';
    return this.rideService.cancelRide(id, actorId, actorRole, dto);
  }

  // 9. DRIVER REJECTS OFFER (Endpoint: POST /rides/:id/reject)
  @Post(':id/reject')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async rejectOffer(
    @Req() req: any,
    @Param('id') id: string,
    @Body('reason') reason?: string
  ) {
    const driverId = req.user?.driverId || req.user?.id || 'd0000000-0000-0000-0000-000000000001';
    return this.rideService.rejectOffer(id, driverId, reason);
  }

  // 10. DISPATCH OFFER TIMEOUT (Endpoint: POST /rides/:id/dispatch/timeout)
  @Post(':id/dispatch/timeout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async dispatchTimeout(@Req() req: any, @Param('id') id: string) {
    const driverId = req.user?.driverId || req.user?.id;
    return this.rideService.handleOfferTimeout(id, driverId);
  }

  // 11. GET DISPATCH ATTEMPTS
  @Get(':id/dispatch-attempts')
  @UseGuards(JwtAuthGuard)
  async getDispatchAttempts(@Param('id') id: string) {
    return this.rideService.getDispatchAttempts(id);
  }

  // 12. AUDIT STATE LOGS
  @Get(':id/logs')
  @UseGuards(JwtAuthGuard)
  async getRideLogs(@Param('id') id: string) {
    return this.rideService.getStateLogs(id);
  }

  // 13. SUBMIT RIDE RATING (POST /rides/:id/rating)
  @Post(':id/rating')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.CREATED)
  async submitRating(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreateRatingDto
  ) {
    if (!this.ratingService) {
      throw new BadRequestException('Rating service is not initialized');
    }
    const authenticatedUser = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };
    return this.ratingService.submitRating(id, authenticatedUser, dto);
  }

  // 14. GET RIDE RATINGS (GET /rides/:id/ratings)
  @Get(':id/ratings')
  @UseGuards(JwtAuthGuard)
  async getRideRatings(@Req() req: any, @Param('id') id: string) {
    if (!this.ratingService) {
      throw new BadRequestException('Rating service is not initialized');
    }
    const authenticatedUser = req.user || {
      id: 'b0000000-0000-0000-0000-000000000002',
      role: 'CUSTOMER',
    };
    return this.ratingService.getRatingsForRide(id, authenticatedUser);
  }
}
