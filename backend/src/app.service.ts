import { Injectable } from '@nestjs/common';
import { HealthCheckResponse } from './app.controller';

@Injectable()
export class AppService {
  getHealth(): HealthCheckResponse {
    return {
      status: 'ok',
      service: 'kawai0511',
    };
  }
}
