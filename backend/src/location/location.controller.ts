import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { LocationService, NearbyDriverResult, RouteResult } from './location.service';
import { DriverLocationUpdateDto } from './dto/location-update.dto';
import { RouteCalcDto } from './dto/route-calc.dto';

@Controller('location')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Post('driver-update')
  async updateDriverLocation(@Body() dto: DriverLocationUpdateDto) {
    return this.locationService.updateDriverLocation(dto);
  }

  @Get('nearby')
  async getNearbyDrivers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string,
  ): Promise<NearbyDriverResult[]> {
    const latitude = parseFloat(lat) || -3.3194;
    const longitude = parseFloat(lng) || 114.5908;
    const radiusKm = radius ? parseFloat(radius) : 3.0;
    return this.locationService.findNearbyDrivers(latitude, longitude, radiusKm);
  }

  @Post('route')
  async calculateRoute(@Body() dto: RouteCalcDto): Promise<RouteResult> {
    return this.locationService.calculateRoute(dto);
  }
}
