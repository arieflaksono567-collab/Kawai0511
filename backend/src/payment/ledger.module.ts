import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { SettlementService } from './settlement.service';
import { DriverEarningsLedgerRepository } from './driver-earnings-ledger.repository';

@Module({
  providers: [LedgerService, SettlementService, DriverEarningsLedgerRepository],
  exports: [LedgerService, SettlementService, DriverEarningsLedgerRepository],
})
export class LedgerModule {}
