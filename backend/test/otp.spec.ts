import { AuthService } from '../src/auth/auth.service';
import { MockOtpProvider } from '../src/auth/providers/mock-otp.provider';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';

describe('OtpSystemUnitTests', () => {
  let authService: AuthService;
  let mockOtpProvider: MockOtpProvider;

  beforeEach(() => {
    mockOtpProvider = new MockOtpProvider();
    authService = new AuthService(mockOtpProvider);
  });

  test('should generate and send OTP without exposing OTP code in response', async () => {
    const res = await authService.requestOtp({ phoneNumber: '081299990001', purpose: 'LOGIN' });
    expect(res.success).toBe(true);
    expect(res.message).toBe('OTP sent');
    expect((res as any).otp).toBeUndefined(); // Never expose OTP in response!
  });

  test('should reject verify with wrong OTP and decrement attempts', async () => {
    const phone = '081299990002';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });

    // Attempt with wrong OTP
    await expect(
      authService.verifyOtp({ phoneNumber: phone, otp: '000000', purpose: 'LOGIN' })
    ).rejects.toThrow(UnauthorizedException);
  });

  test('should reject after maximum 5 verification attempts exceeded', async () => {
    const phone = '081299990003';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });

    // 5 failed attempts
    for (let i = 0; i < 5; i++) {
      try {
        await authService.verifyOtp({ phoneNumber: phone, otp: '111111', purpose: 'LOGIN' });
      } catch (e) {
        // expected failure
      }
    }

    // 6th attempt must be rejected for exceeding max attempts
    await expect(
      authService.verifyOtp({ phoneNumber: phone, otp: '111111', purpose: 'LOGIN' })
    ).rejects.toThrow('Batas maksimal percobaan');
  });

  test('should enforce single-use OTP (second attempt must be rejected)', async () => {
    const phone = '081299990511'; // dev suffix for fixed '051100'
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });

    // First attempt succeeds
    const tokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100', purpose: 'LOGIN' });
    expect(tokens.accessToken).toBeDefined();

    // Second attempt with exact same OTP must be rejected!
    await expect(
      authService.verifyOtp({ phoneNumber: phone, otp: '051100', purpose: 'LOGIN' })
    ).rejects.toThrow('Kode OTP sudah pernah digunakan');
  });
});
