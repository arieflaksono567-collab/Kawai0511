import { Injectable } from '@nestjs/common';

export type FreshnessStatus = 'FRESH' | 'STALE' | 'DEGRADED' | 'EXPIRED';

@Injectable()
export class LocationFreshnessService {
  private readonly freshSeconds = parseInt(process.env.LOCATION_FRESH_SECONDS || '15', 10);
  private readonly staleSeconds = parseInt(process.env.LOCATION_STALE_SECONDS || '30', 10);
  private readonly degradedSeconds = parseInt(process.env.LOCATION_DEGRADED_SECONDS || '120', 10);

  calculateFreshness(recordedAt: Date | string | number, serverNow: Date = new Date()): FreshnessStatus {
    const recordedTime = new Date(recordedAt).getTime();
    const nowTime = serverNow.getTime();
    const diffSeconds = Math.max(0, Math.floor((nowTime - recordedTime) / 1000));

    if (diffSeconds < this.freshSeconds) {
      return 'FRESH';
    } else if (diffSeconds <= this.staleSeconds) {
      return 'STALE';
    } else if (diffSeconds <= this.degradedSeconds) {
      return 'DEGRADED';
    } else {
      return 'EXPIRED';
    }
  }

  isOperationallyAvailable(status: FreshnessStatus): boolean {
    return status === 'FRESH' || status === 'STALE';
  }
}
