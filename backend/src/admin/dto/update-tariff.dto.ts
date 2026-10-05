export class UpdateTariffDto {
  serviceType: 'RIDE' | 'FOOD' | 'DELIVERY';
  baseFare: number;
  perKmRate: number;
  perMinuteRate?: number;
  minimumFare: number;
  platformCommissionPercent?: number;
  surgeMultiplier?: number;
}
