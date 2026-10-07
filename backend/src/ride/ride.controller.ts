import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { RideService, RideOrder } from './ride.service';
import { CreateRideDto } from './dto/create-ride.dto';
import { CancelRideDto } from './dto/cancel-ride.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {}

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
}
