import { Module } from '@nestjs/common';
import { RideController } from './ride.controller';
import { RideService } from './ride.service';
import { FareService } from './fare.service';
import { RideDispatchService } from './ride-dispatch.service';
import { AuthModule } from '../auth/auth.module';
import { DriverModule } from '../driver/driver.module';
import { LocationModule } from '../location/location.module';

@Module({
  imports: [AuthModule, DriverModule, LocationModule],
  controllers: [RideController],
  providers: [RideService, FareService, RideDispatchService],
  exports: [RideService, FareService, RideDispatchService],
})
export class RideModule {}
