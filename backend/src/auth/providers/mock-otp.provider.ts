import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from './otp.provider.interface';

@Injectable()
export class MockOtpProvider implements OtpProvider {
  private readonly logger = new Logger(MockOtpProvider.name);
  public lastSentOtp: { [phoneNumber: string]: string } = {};

  async sendOtp(phoneNumber: string, otp: string): Promise<void> {
    // Di dev mode, simulasikan pengiriman SMS/WhatsApp tanpa mengekspos rahasia di return API
    this.lastSentOtp[phoneNumber] = otp;
    this.logger.log(`[DEV OTP PROVIDER] Mengirim OTP 6 digit ke ${phoneNumber} (Simulasi Provider Berhasil)`);
  }
}
