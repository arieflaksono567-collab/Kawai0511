export interface OtpProvider {
  sendOtp(phoneNumber: string, otp: string): Promise<void>;
}
