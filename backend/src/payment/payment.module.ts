import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { LedgerService } from './ledger.service';
import { SettlementService } from './settlement.service';
import { PaymentController, LedgerController } from './payment.controller';
import { RideModule } from '../ride/ride.module';

@Module({
  imports: [RideModule],
  controllers: [PaymentController, LedgerController],
  providers: [PaymentService, LedgerService, SettlementService],
  exports: [PaymentService, LedgerService, SettlementService],
})
export class PaymentModule {}
