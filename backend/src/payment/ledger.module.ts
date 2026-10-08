import { Module } from '@nestjs/common';
import { LedgerService } from './ledger.service';
import { SettlementService } from './settlement.service';

@Module({
  providers: [LedgerService, SettlementService],
  exports: [LedgerService, SettlementService],
})
export class LedgerModule {}
