import { Controller, Get, Post, Body, Param, UseGuards } from '@nestjs/common';
import { AdminService } from './admin.service';
import { UpdateTariffDto } from './dto/update-tariff.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../auth/roles.enum';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('overview')
  getOverview() {
    return this.adminService.getOverview();
  }

  @Get('drivers/pending')
  getPendingDrivers() {
    return this.adminService.getPendingDrivers();
  }

  @Post('drivers/:id/approve')
  approveDriver(@Param('id') id: string) {
    return this.adminService.approveDriver(id);
  }

  @Get('orders/live')
  getLiveOrders() {
    return this.adminService.getLiveOrders();
  }

  @Get('tariff')
  getTariffs() {
    return this.adminService.getTariffs();
  }

  @Post('tariff')
  updateTariff(@Body() dto: UpdateTariffDto) {
    return this.adminService.updateTariff(dto);
  }

  @Get('sos')
  getSosIncidents() {
    return this.adminService.getSosIncidents();
  }

  @Post('sos/:id/resolve')
  resolveSos(@Param('id') id: string, @Body('notes') notes?: string) {
    return this.adminService.resolveSos(id, notes);
  }
}
