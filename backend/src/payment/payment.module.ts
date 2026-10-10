import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';
import { SettlementService } from './settlement.service';
import { DriverEarningsLedgerRepository } from './driver-earnings-ledger.repository';
import { DriverEarningsService } from './driver-earnings.service';
import { PaymentController, LedgerController } from './payment.controller';
import { RideModule } from '../ride/ride.module';

@Module({
  imports: [RideModule],
  controllers: [PaymentController, LedgerController],
  providers: [
    PaymentService,
    LedgerService,
    SettlementService,
    DriverEarningsLedgerRepository,
    DriverEarningsService,
  ],
  exports: [
    PaymentService,
    LedgerService,
    SettlementService,
    DriverEarningsLedgerRepository,
    DriverEarningsService,
  ],
})
export class PaymentModule {}
