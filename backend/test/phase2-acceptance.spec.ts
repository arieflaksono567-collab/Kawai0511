import { AuthService } from '../src/auth/auth.service';
import { UsersService } from '../src/users/users.service';
import { MockOtpProvider } from '../src/auth/providers/mock-otp.provider';
import { Role } from '../src/auth/roles.enum';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { Reflector } from '@nestjs/core';
import { UnauthorizedException, ForbiddenException } from '@nestjs/common';

describe('Phase2AcceptanceTests', () => {
  let authService: AuthService;
  let usersService: UsersService;
  let mockOtpProvider: MockOtpProvider;
  let rolesGuard: RolesGuard;
  let jwtGuard: JwtAuthGuard;

  beforeEach(() => {
    mockOtpProvider = new MockOtpProvider();
    authService = new AuthService(mockOtpProvider);
    usersService = new UsersService(authService);
    rolesGuard = new RolesGuard(new Reflector());
    jwtGuard = new JwtAuthGuard();
  });

  // TEST 1: Customer request OTP -> success
  test('TEST 1: Customer request OTP -> success', async () => {
    const res = await authService.requestOtp({ phoneNumber: '081255110001', purpose: 'LOGIN' });
    expect(res.success).toBe(true);
    expect(res.message).toBe('OTP sent');
  });

  // TEST 2: Customer verify OTP -> access token + refresh token
  test('TEST 2: Customer verify OTP -> access token + refresh token', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    const authTokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100', role: Role.CUSTOMER });
    expect(authTokens.accessToken).toBeDefined();
    expect(authTokens.refreshToken).toBeDefined();
    expect(authTokens.user.role).toBe(Role.CUSTOMER);
  });

  // TEST 3: Customer: GET /auth/me -> 200
  test('TEST 3: Customer: GET /auth/me -> 200', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    const authTokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100', role: Role.CUSTOMER });
    const profile = await authService.getMe(authTokens.user.id);
    expect(profile.id).toBe(authTokens.user.id);
    expect(profile.role).toBe(Role.CUSTOMER);
  });

  // TEST 4: Customer update profile -> 200
  test('TEST 4: Customer update profile -> 200', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    const authTokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100', role: Role.CUSTOMER });
    const updated = await usersService.updateProfile(authTokens.user.id, {
      fullName: 'Arief Laksono Updated',
      email: 'arief.updated@kawai0511.id',
    });
    expect(updated.fullName).toBe('Arief Laksono Updated');
    expect(updated.email).toBe('arief.updated@kawai0511.id');
  });

  // TEST 5: Customer logout -> refresh token revoked
  test('TEST 5: Customer logout -> refresh token revoked', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    const authTokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100', role: Role.CUSTOMER });
    const logoutRes = await authService.logout(authTokens.refreshToken, authTokens.user.id);
    expect(logoutRes.success).toBe(true);
  });

  // TEST 6: Revoked refresh token used again -> rejected
  test('TEST 6: Revoked refresh token used again -> rejected', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    const authTokens = await authService.verifyOtp({ phoneNumber: phone, otp: '051100', role: Role.CUSTOMER });
    // Revoke by logging out
    await authService.logout(authTokens.refreshToken, authTokens.user.id);
    // Reuse attempt must throw UnauthorizedException
    await expect(authService.refresh({ refreshToken: authTokens.refreshToken })).rejects.toThrow(UnauthorizedException);
  });

  // TEST 7: Driver login -> role DRIVER
  test('TEST 7: Driver login -> role DRIVER', async () => {
    const phone = '081390511511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN', role: Role.DRIVER });
    const driverTokens = await authService.verifyOtp({
      phoneNumber: phone,
      otp: '051100',
      role: Role.DRIVER,
      fullName: 'Mitra Ahmad Gazali',
    });
    expect(driverTokens.user.role).toBe(Role.DRIVER);
  });

  // TEST 8: Admin login -> role ADMIN
  test('TEST 8: Admin login -> role ADMIN', async () => {
    const adminTokens = await authService.adminLogin({
      email: 'admin@kawai0511.id',
      password: 'admin0511',
    });
    expect(adminTokens.user.role).toBe(Role.ADMIN);
  });

  // TEST 9: Customer tries ADMIN endpoint -> 403 Forbidden
  test('TEST 9: Customer tries ADMIN endpoint -> 403', () => {
    const reflector = new Reflector();
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([Role.ADMIN]);
    const guard = new RolesGuard(reflector);

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'usr-customer', role: Role.CUSTOMER },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    };

    expect(() => guard.canActivate(mockContext)).toThrow(ForbiddenException);
  });

  // TEST 10: Expired access token -> 401
  test('TEST 10: Expired access token -> 401', () => {
    const expiredHeader = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const expiredPayload = Buffer.from(
      JSON.stringify({
        sub: 'usr-123',
        role: Role.CUSTOMER,
        exp: Math.floor(Date.now() / 1000) - 3600, // Expired 1 hour ago
      })
    ).toString('base64');
    const expiredToken = `${expiredHeader}.${expiredPayload}.dummy_sig`;

    const mockContext: any = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: `Bearer ${expiredToken}` },
        }),
      }),
    };

    expect(() => jwtGuard.canActivate(mockContext)).toThrow('Access token telah kedaluwarsa');
  });

  // TEST 11: Expired OTP -> rejected
  test('TEST 11: Expired OTP -> rejected', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });
    // Simulate time forward by tampering expiresAt in private store
    const store = (authService as any).otpStore.get('+6281255110511');
    if (store) store.expiresAt = Date.now() - 1000; // expired

    await expect(authService.verifyOtp({ phoneNumber: phone, otp: '051100' })).rejects.toThrow('Kode OTP telah kedaluwarsa');
  });

  // TEST 12: OTP used twice -> second attempt rejected
  test('TEST 12: OTP used twice -> second attempt rejected', async () => {
    const phone = '081255110511';
    await authService.requestOtp({ phoneNumber: phone, purpose: 'LOGIN' });

    // 1st verify succeeds
    await authService.verifyOtp({ phoneNumber: phone, otp: '051100' });

    // 2nd verify with exact same OTP must fail
    await expect(authService.verifyOtp({ phoneNumber: phone, otp: '051100' })).rejects.toThrow('Kode OTP sudah pernah digunakan');
  });
});
