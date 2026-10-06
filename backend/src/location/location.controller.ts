import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { LocationService } from './location.service';
import { GeocodingService } from './geocoding.service';
import { RoutingService } from './routing.service';
import { GeospatialService } from './geospatial.service';
import { UpdateLocationDto } from './dto/update-location.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller()
export class LocationController {
  constructor(
    private readonly locationService: LocationService,
    private readonly geocodingService: GeocodingService,
    private readonly routingService: RoutingService,
    private readonly geospatialService: GeospatialService
  ) {}

  // 1. DRIVER SENDS REAL-TIME GPS COORDINATES
  @Post('drivers/me/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async updateMyLocation(@Req() req: any, @Body() dto: UpdateLocationDto) {
    const driverId = req.user.driverId || req.user.id || 'd0000000-0000-0000-0000-000000000001';
    return this.locationService.updateDriverLocation(driverId, dto);
  }

  // 2. DRIVER RETRIEVES OWN LATEST LOCATION
  @Get('drivers/me/location')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getMyLocation(@Req() req: any) {
    const driverId = req.user.driverId || req.user.id || 'd0000000-0000-0000-0000-000000000001';
    return this.locationService.getDriverLatestLocation(driverId);
  }

  // 3. DRIVER CHECKS LOCATION FRESHNESS & ACCURACY STATUS
  @Get('drivers/me/location/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getMyLocationStatus(@Req() req: any) {
    const driverId = req.user.driverId || req.user.id || 'd0000000-0000-0000-0000-000000000001';
    return this.locationService.getDriverLocationStatus(driverId);
  }

  // 4. REVERSE GEOCODING (LAT/LNG -> ADDRESS)
  @Get('locations/reverse-geocode')
  async reverseGeocode(
    @Query('lat') lat: string,
    @Query('lng') lng: string
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Parameter lat dan lng wajib diisi dengan angka');
    }

    return this.geocodingService.reverseGeocode(latitude, longitude);
  }

  // 5. SEARCH PLACES & LANDMARKS
  @Get('locations/search')
  async searchPlaces(@Query('q') query: string) {
    const results = await this.geocodingService.searchPlaces(query || '');
    return { results };
  }

  // 6. ROUTE CALCULATION (DISTANCE & DURATION)
  @Get('locations/route')
  async getRoute(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destLat') destLat: string,
    @Query('destLng') destLng: string
  ) {
    const oLat = parseFloat(originLat);
    const oLng = parseFloat(originLng);
    const dLat = parseFloat(destLat);
    const dLng = parseFloat(destLng);

    return this.routingService.getRoute(oLat, oLng, dLat, dLng);
  }

  // 7. NEARBY DRIVERS SEARCH (GEOSPATIAL INFRASTRUCTURE ONLY)
  @Get('locations/nearby-drivers')
  async getNearbyDrivers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string
  ) {
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusMeters = radius ? parseFloat(radius) : undefined;

    if (isNaN(latitude) || isNaN(longitude)) {
      throw new BadRequestException('Parameter lat dan lng wajib diisi dengan angka');
    }

    const persistedLocations = this.locationService.getAllLatestLocationsList();
    const drivers = await this.geospatialService.findNearbyDrivers(
      latitude,
      longitude,
      radiusMeters,
      persistedLocations
    );

    return { drivers, count: drivers.length };
  }

  // 8. ADMIN OPERATIONAL DRIVER LOCATIONS VIEW
  @Get('admin/drivers/locations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  async getAdminLocations() {
    return this.locationService.getAdminDriverLocations();
  }
}
