import { Module } from '@nestjs/common';
import { RatingService } from './rating.service';
import { RatingRepository } from './rating.repository';
import { RatingController } from './rating.controller';
import { RideModule } from '../ride/ride.module';
import { DriverModule } from '../driver/driver.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [RideModule, DriverModule, AuthModule],
  controllers: [RatingController],
  providers: [RatingService, RatingRepository],
  exports: [RatingService, RatingRepository],
})
export class RatingModule {}
