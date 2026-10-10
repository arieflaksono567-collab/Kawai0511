import { Module, forwardRef } from '@nestjs/common';
import { DriverController, DriverAdminController } from './driver.controller';
import { DriverService } from './driver.service';
import { DriverEligibilityService } from './driver-eligibility.service';
import { LocalDocumentStorageProvider } from './storage/local-document-storage.provider';
import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../payment/ledger.module';
import { PaymentModule } from '../payment/payment.module';

@Module({
  imports: [AuthModule, LedgerModule, forwardRef(() => PaymentModule)],
  controllers: [DriverController, DriverAdminController],
  providers: [DriverService, DriverEligibilityService, LocalDocumentStorageProvider],
  exports: [DriverService, DriverEligibilityService],
})
export class DriverModule {}
