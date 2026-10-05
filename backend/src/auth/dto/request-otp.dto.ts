export class RequestOtpDto {
  phoneNumber: string;
  purpose?: 'LOGIN' | 'REGISTER';
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
}
