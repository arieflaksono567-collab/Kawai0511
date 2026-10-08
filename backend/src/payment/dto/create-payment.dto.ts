import { PaymentMethod } from '../payment.types';

export class CreatePaymentDto {
  rideId!: string;
  payerId!: string;
  payeeDriverId!: string;
  amount!: number;
  currency?: 'IDR';
  method!: PaymentMethod;
  provider?: string;
  idempotencyKey!: string;
  asyncWebhook?: boolean;
}

export class CancelPaymentDto {
  reason?: string;
}

export class RefundPaymentDto {
  amount?: number;
  reason?: string;
}

export class UpdateSplitConfigDto {
  driverSharePercent!: number;
  platformSharePercent!: number;
}
