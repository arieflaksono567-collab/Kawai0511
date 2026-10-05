import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DriverService } from './driver.service';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { AdminRejectDto, AdminSuspendDto } from './dto/admin-reject.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('drivers')
export class DriverController {
  constructor(private readonly driverService: DriverService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getMyProfile(@Req() req: any) {
    const user = req.user;
    return this.driverService.getOrCreateDriverProfile(user.id, user.role);
  }

  @Patch('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async updateMyProfile(@Req() req: any, @Body() dto: UpdateDriverProfileDto) {
    return this.driverService.updateProfile(req.user.id, dto);
  }

  @Get('me/verification')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getVerification(@Req() req: any) {
    return this.driverService.getDriverStatus(req.user.id);
  }

  @Get('me/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getMyDocuments(@Req() req: any) {
    return this.driverService.getDocuments(req.user.id);
  }

  @Post('me/documents')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async uploadMyDocument(@Req() req: any, @Body() dto: UploadDocumentDto) {
    return this.driverService.uploadDocument(req.user.id, dto);
  }

  @Get('me/vehicles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getMyVehicles(@Req() req: any) {
    return this.driverService.getVehicles(req.user.id);
  }

  @Post('me/vehicles')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async createMyVehicle(@Req() req: any, @Body() dto: CreateVehicleDto) {
    return this.driverService.createVehicle(req.user.id, dto);
  }

  @Get('me/eligibility')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getMyEligibility(@Req() req: any) {
    return this.driverService.getEligibility(req.user.id);
  }

  @Get('me/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  async getMyStatus(@Req() req: any) {
    return this.driverService.getDriverStatus(req.user.id);
  }

  @Post('me/status/online')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async goOnline(@Req() req: any) {
    return this.driverService.goOnline(req.user.id);
  }

  @Post('me/status/offline')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async goOffline(@Req() req: any) {
    return this.driverService.goOffline(req.user.id);
  }
}

// Controller terpisah khusus Admin Operasional Driver KYC
@Controller('admin/drivers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class DriverAdminController {
  constructor(private readonly driverService: DriverService) {}

  @Get()
  async listDrivers() {
    return this.driverService.adminListDrivers();
  }

  @Get(':id')
  async getDriverDetails(@Param('id') id: string) {
    return this.driverService.adminGetDriverDetails(id);
  }

  @Get(':id/documents')
  async getDriverDocuments(@Param('id') id: string) {
    const details = await this.driverService.adminGetDriverDetails(id);
    return details.documents;
  }

  @Get(':id/vehicles')
  async getDriverVehicles(@Param('id') id: string) {
    const details = await this.driverService.adminGetDriverDetails(id);
    return details.vehicles;
  }

  @Post(':id/documents/:documentId/approve')
  async approveDocument(
    @Req() req: any,
    @Param('id') driverId: string,
    @Param('documentId') documentId: string
  ) {
    return this.driverService.adminApproveDocument(req.user.id, driverId, documentId);
  }

  @Post(':id/documents/:documentId/reject')
  async rejectDocument(
    @Req() req: any,
    @Param('id') driverId: string,
    @Param('documentId') documentId: string,
    @Body() dto: AdminRejectDto
  ) {
    return this.driverService.adminRejectDocument(req.user.id, driverId, documentId, dto.reason);
  }

  @Post(':id/vehicles/:vehicleId/approve')
  async approveVehicle(
    @Req() req: any,
    @Param('id') driverId: string,
    @Param('vehicleId') vehicleId: string
  ) {
    return this.driverService.adminApproveVehicle(req.user.id, driverId, vehicleId);
  }

  @Post(':id/vehicles/:vehicleId/reject')
  async rejectVehicle(
    @Req() req: any,
    @Param('id') driverId: string,
    @Param('vehicleId') vehicleId: string,
    @Body() dto: AdminRejectDto
  ) {
    return this.driverService.adminRejectVehicle(req.user.id, driverId, vehicleId, dto.reason);
  }

  @Post(':id/approve')
  async approveDriver(@Req() req: any, @Param('id') driverId: string) {
    return this.driverService.adminApproveDriver(req.user.id, driverId);
  }

  @Post(':id/reject')
  async rejectDriver(@Req() req: any, @Param('id') driverId: string, @Body() dto: AdminRejectDto) {
    return this.driverService.adminRejectDriver(req.user.id, driverId, dto.reason);
  }

  @Post(':id/suspend')
  async suspendDriver(@Req() req: any, @Param('id') driverId: string, @Body() dto: AdminSuspendDto) {
    return this.driverService.adminSuspendDriver(req.user.id, driverId, dto.reason);
  }

  @Post(':id/unsuspend')
  async unsuspendDriver(@Req() req: any, @Param('id') driverId: string) {
    return this.driverService.adminUnsuspendDriver(req.user.id, driverId);
  }
}
