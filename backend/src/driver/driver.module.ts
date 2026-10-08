import { Module } from '@nestjs/common';
import { DriverController, DriverAdminController } from './driver.controller';
import { DriverService } from './driver.service';
import { DriverEligibilityService } from './driver-eligibility.service';
import { LocalDocumentStorageProvider } from './storage/local-document-storage.provider';
import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../payment/ledger.module';

@Module({
  imports: [AuthModule, LedgerModule],
  controllers: [DriverController, DriverAdminController],
  providers: [DriverService, DriverEligibilityService, LocalDocumentStorageProvider],
  exports: [DriverService, DriverEligibilityService],
})
export class DriverModule {}
