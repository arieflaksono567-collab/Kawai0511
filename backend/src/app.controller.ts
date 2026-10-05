import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

export interface HealthCheckResponse {
  status: string;
  service: string;
}

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('health')
  getHealth(): HealthCheckResponse {
    return this.appService.getHealth();
  }
}
