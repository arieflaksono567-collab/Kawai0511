import { Controller, Post, Get, Body } from '@nestjs/common';
import { SimulationService } from './simulation.service';

@Controller('testing')
export class TestingController {
  constructor(private readonly simulationService: SimulationService) {}

  @Post('stress-simulation')
  runStress(@Body('driverCount') drivers?: number, @Body('orderCount') orders?: number) {
    return this.simulationService.runStressSimulation(drivers || 100, orders || 50);
  }

  @Post('security-audit')
  runSecurityAudit() {
    return this.simulationService.runSecurityAudit();
  }

  @Get('results')
  getResults() {
    return {
      stress: this.simulationService.runStressSimulation(100, 50),
      security: this.simulationService.runSecurityAudit(),
    };
  }
}
