export class VerifyOtpDto {
  phoneNumber: string;
  otp: string;
  purpose?: 'LOGIN' | 'REGISTER';
  fullName?: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
}
