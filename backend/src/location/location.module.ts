import { Module } from '@nestjs/common';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationFreshnessService } from './location-freshness.service';
import { RedisGeoService } from './redis-geo.service';
import { GeocodingService } from './geocoding.service';
import { RoutingService } from './routing.service';
import { GeospatialService } from './geospatial.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [LocationController],
  providers: [
    LocationService,
    LocationFreshnessService,
    RedisGeoService,
    GeocodingService,
    RoutingService,
    GeospatialService,
  ],
  exports: [
    LocationService,
    LocationFreshnessService,
    RedisGeoService,
    GeocodingService,
    RoutingService,
    GeospatialService,
  ],
})
export class LocationModule {}
