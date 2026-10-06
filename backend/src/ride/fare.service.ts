import { Injectable } from '@nestjs/common';

export interface FareCalculationResult {
  baseFare: number;
  distanceKm: number;
  perKmRate: number;
  distanceFare: number;
  durationMinutes: number;
  perMinuteRate: number;
  durationFare: number;
  rawFare: number;
  minimumFare: number;
  totalFare: number;
  calculatedAt: string;
}

@Injectable()
export class FareService {
  private readonly baseFare: number = parseInt(process.env.FARE_BASE_IDR || '7000', 10);
  private readonly perKmRate: number = parseInt(process.env.FARE_PER_KM_IDR || '2200', 10);
  private readonly perMinuteRate: number = parseInt(process.env.FARE_PER_MINUTE_IDR || '200', 10);
  private readonly minimumFare: number = parseInt(process.env.FARE_MINIMUM_IDR || '10000', 10);

  calculateFare(distanceKm: number, durationMinutes: number): FareCalculationResult {
    const validDistanceKm = Math.max(0, parseFloat(distanceKm.toFixed(2)));
    const validDurationMinutes = Math.max(1, Math.round(durationMinutes));

    const distanceFare = Math.round(validDistanceKm * this.perKmRate);
    const durationFare = Math.round(validDurationMinutes * this.perMinuteRate);
    const rawFare = this.baseFare + distanceFare + durationFare;
    const totalFare = Math.round(Math.max(rawFare, this.minimumFare));

    return {
      baseFare: this.baseFare,
      distanceKm: validDistanceKm,
      perKmRate: this.perKmRate,
      distanceFare,
      durationMinutes: validDurationMinutes,
      perMinuteRate: this.perMinuteRate,
      durationFare,
      rawFare,
      minimumFare: this.minimumFare,
      totalFare,
      calculatedAt: new Date().toISOString(),
    };
  }

  getConfig() {
    return {
      baseFare: this.baseFare,
      perKmRate: this.perKmRate,
      perMinuteRate: this.perMinuteRate,
      minimumFare: this.minimumFare,
    };
  }
}
