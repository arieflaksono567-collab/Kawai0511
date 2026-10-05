import { AuthService } from '../src/auth/auth.service';
import { MockOtpProvider } from '../src/auth/providers/mock-otp.provider';
import { UnauthorizedException } from '@nestjs/common';

describe('RefreshTokenUnitTests', () => {
  let authService: AuthService;
  let mockOtpProvider: MockOtpProvider;

  beforeEach(() => {
    mockOtpProvider = new MockOtpProvider();
    authService = new AuthService(mockOtpProvider);
  });

  test('should rotate refresh token and issue new token pair', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    const initialTokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100' });

    // Rotate refresh token
    const rotatedTokens = await authService.refresh({ refreshToken: initialTokens.refreshToken });
    expect(rotatedTokens.accessToken).toBeDefined();
    expect(rotatedTokens.refreshToken).toBeDefined();
    expect(rotatedTokens.refreshToken).not.toBe(initialTokens.refreshToken);

    // Old refresh token must now be revoked and rejected if used again!
    await expect(
      authService.refresh({ refreshToken: initialTokens.refreshToken })
    ).rejects.toThrow(UnauthorizedException);
  });

  test('should revoke token on logout and prevent subsequent refresh', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    const tokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100' });

    // Logout
    await authService.logout(tokens.refreshToken, tokens.user.id);

    // Attempting to refresh using logged-out token must fail
    await expect(
      authService.refresh({ refreshToken: tokens.refreshToken })
    ).rejects.toThrow(UnauthorizedException);
  });
});
