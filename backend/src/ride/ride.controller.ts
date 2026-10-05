import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { RideService, RideOrder } from './ride.service';
import { EstimateFareDto } from './dto/estimate-fare.dto';
import { CreateRideDto } from './dto/create-ride.dto';

@Controller('rides')
export class RideController {
  constructor(private readonly rideService: RideService) {}

  @Post('estimate')
  estimateFare(@Body() dto: EstimateFareDto) {
    return this.rideService.calculateFare(dto);
  }

  @Post('order')
  async createRide(@Body() dto: CreateRideDto): Promise<RideOrder> {
    return this.rideService.createRide(dto);
  }

  @Get(':id')
  getRide(@Param('id') id: string): RideOrder | undefined {
    return this.rideService.getRide(id);
  }

  @Post(':id/accept')
  async acceptRide(@Param('id') id: string, @Body('driverId') driverId?: string): Promise<RideOrder> {
    return this.rideService.acceptRide(id, driverId);
  }

  @Post(':id/arrived')
  async driverArrived(@Param('id') id: string): Promise<RideOrder> {
    return this.rideService.driverArrived(id);
  }

  @Post(':id/start')
  async startRide(@Param('id') id: string): Promise<RideOrder> {
    return this.rideService.startRide(id);
  }

  @Post(':id/finish')
  async finishRide(@Param('id') id: string): Promise<RideOrder> {
    return this.rideService.finishRide(id);
  }

  @Post(':id/cancel')
  async cancelRide(@Param('id') id: string, @Body('reason') reason?: string): Promise<RideOrder> {
    return this.rideService.cancelRide(id, reason);
  }
}
