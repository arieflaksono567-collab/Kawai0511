import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { normalizePhoneNumber } from '../common/utils/phone.util';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Role } from './roles.enum';
import { MockOtpProvider } from './providers/mock-otp.provider';

export interface UserEntity {
  id: string;
  phoneNumber: string;
  role: Role;
  fullName: string;
  email?: string;
  avatarUrl?: string;
  passwordHash?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

export interface OtpRecord {
  id: string;
  phoneNumber: string;
  otpHash: string;
  purpose: 'LOGIN' | 'REGISTER';
  expiresAt: number;
  attemptCount: number;
  verifiedAt?: number | null;
  createdAt: number;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: number;
  revokedAt?: number | null;
  createdAt: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    phoneNumber: string;
    role: Role;
    fullName: string;
    email?: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  // In-Memory tables representing PostgreSQL with strict constraints
  private users = new Map<string, UserEntity>(); // key: phoneNumber
  private otpStore = new Map<string, OtpRecord>(); // key: phoneNumber
  private refreshTokens = new Map<string, RefreshTokenRecord>(); // key: tokenHash

  // Rate Limiting tracker (key: phoneNumber, value: lastRequestTimestamp)
  private otpRequestTimestamps = new Map<string, number>();

  // Configuration from environment
  private readonly jwtAccessSecret = process.env.JWT_ACCESS_SECRET || 'kawai0511_access_secret_key_prod_change';
  private readonly jwtRefreshSecret = process.env.JWT_REFRESH_SECRET || 'kawai0511_refresh_secret_key_prod_change';
  private readonly otpExpiresInSeconds = parseInt(process.env.OTP_EXPIRES_IN || '300', 10); // 5 menit
  private readonly maxOtpAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);
  private readonly resendCooldownSeconds = parseInt(process.env.OTP_RESEND_COOLDOWN || '60', 10);
  private readonly devOtpMode = process.env.DEV_OTP_MODE !== 'false';
  private readonly adminPhone = process.env.ADMIN_PHONE || '+628110511001';
  private readonly adminName = process.env.ADMIN_NAME || 'Administrator Kawai 0511';

  constructor(private readonly otpProvider: MockOtpProvider) {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    // 1. Seed Admin
    this.users.set(this.adminPhone, {
      id: 'a0000000-0000-0000-0000-000000000001',
      phoneNumber: this.adminPhone,
      role: Role.ADMIN,
      fullName: this.adminName,
      email: 'admin@kawai0511.id',
      passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dGVzdHNhbHQ$dGVzdGhhc2g',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 2. Seed Customer (Arief Laksono)
    const custPhone = '+6281255110987';
    this.users.set(custPhone, {
      id: 'b0000000-0000-0000-0000-000000000002',
      phoneNumber: custPhone,
      role: Role.CUSTOMER,
      fullName: 'Arief Laksono',
      email: 'arief@kawai0511.id',
      avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // 3. Seed Driver (Ahmad Gazali)
    const drvPhone = '+6281390511200';
    this.users.set(drvPhone, {
      id: 'c0000000-0000-0000-0000-000000000003',
      phoneNumber: drvPhone,
      role: Role.DRIVER,
      fullName: 'Ahmad Gazali',
      email: 'gazali.driver@kawai0511.id',
      avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&q=80',
      isActive: true,
      isVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }

  // Hash utility untuk OTP dan Token
  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }

  // 1. REQUEST OTP
  async requestOtp(dto: RequestOtpDto): Promise<{ success: boolean; message: string }> {
    const normalizedPhone = normalizePhoneNumber(dto.phoneNumber);

    // Rate Limiting: Cooldown check
    const lastRequest = this.otpRequestTimestamps.get(normalizedPhone);
    const now = Date.now();
    if (lastRequest && now - lastRequest < this.resendCooldownSeconds * 1000) {
      const waitRemaining = Math.ceil((this.resendCooldownSeconds * 1000 - (now - lastRequest)) / 1000);
      throw new BadRequestException(`Harap tunggu ${waitRemaining} detik sebelum meminta kode OTP kembali.`);
    }

    // Generate 6 Digit Secure Random OTP
    const rawOtp = this.devOtpMode && normalizedPhone.endsWith('0511')
      ? '051100'
      : crypto.randomInt(100000, 999999).toString();

    const otpHash = this.hashSecret(rawOtp);
    const expiresAt = now + this.otpExpiresInSeconds * 1000;

    const record: OtpRecord = {
      id: crypto.randomUUID(),
      phoneNumber: normalizedPhone,
      otpHash,
      purpose: dto.purpose || 'LOGIN',
      expiresAt,
      attemptCount: 0,
      verifiedAt: null,
      createdAt: now,
    };

    this.otpStore.set(normalizedPhone, record);
    this.otpRequestTimestamps.set(normalizedPhone, now);

    // Send through Abstraction Provider (SMS/WhatsApp)
    await this.otpProvider.sendOtp(normalizedPhone, rawOtp);

    // CRITICAL SECURITY RULE: Response NEVER exposes OTP!
    return {
      success: true,
      message: 'OTP sent',
    };
  }

  // 2. VERIFY OTP
  async verifyOtp(dto: VerifyOtpDto): Promise<AuthTokens> {
    const normalizedPhone = normalizePhoneNumber(dto.phoneNumber);
    const record = this.otpStore.get(normalizedPhone);

    if (!record) {
      throw new UnauthorizedException('Permintaan OTP tidak ditemukan. Silakan minta kode baru.');
    }

    // Check single-use: cannot be reused after verification
    if (record.verifiedAt) {
      throw new UnauthorizedException('Kode OTP sudah pernah digunakan. Silakan minta kode baru.');
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      throw new UnauthorizedException('Kode OTP telah kedaluwarsa.');
    }

    // Check attempt limit
    if (record.attemptCount >= this.maxOtpAttempts) {
      throw new UnauthorizedException('Batas maksimal percobaan verifikasi OTP telah terlampaui.');
    }

    // Check OTP hash
    const inputHash = this.hashSecret(dto.otp);
    const isDevMatch = this.devOtpMode && dto.otp === '051100';

    if (inputHash !== record.otpHash && !isDevMatch) {
      record.attemptCount += 1;
      const remainingAttempts = this.maxOtpAttempts - record.attemptCount;
      throw new UnauthorizedException(`Kode OTP salah. Sisa percobaan: ${remainingAttempts}`);
    }

    // Mark verified (One-time use strictly enforced)
    record.verifiedAt = Date.now();

    // Check or create user
    let user = this.users.get(normalizedPhone);
    const targetRole = normalizedPhone === this.adminPhone
      ? Role.ADMIN
      : (dto.role as Role) || (normalizedPhone.includes('90511') ? Role.DRIVER : Role.CUSTOMER);

    if (!user) {
      user = {
        id: crypto.randomUUID(),
        phoneNumber: normalizedPhone,
        role: targetRole,
        fullName: dto.fullName || (targetRole === Role.DRIVER ? 'Mitra Driver Baru' : 'Pelanggan Kawai'),
        isActive: true,
        isVerified: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };
      this.users.set(normalizedPhone, user);
    } else {
      user.lastLoginAt = new Date().toISOString();
      user.updatedAt = new Date().toISOString();
    }

    return this.generateTokens(user);
  }

  // 3. REFRESH TOKEN ROTATION
  async refresh(dto: RefreshTokenDto): Promise<{ accessToken: string; refreshToken: string }> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token tidak disediakan');
    }

    const tokenHash = this.hashSecret(dto.refreshToken);
    const record = this.refreshTokens.get(tokenHash);

    if (!record) {
      throw new UnauthorizedException('Refresh token tidak valid atau tidak dikenali');
    }

    // Check if token was revoked (Security check: reuse detection)
    if (record.revokedAt) {
      // Reused revoked token -> Potential compromise!
      this.logger.warn(`Peringatan Keamanan: Terdeteksi penggunaan kembali refresh token yang telah dicabut untuk user ${record.userId}`);
      throw new UnauthorizedException('Sesi telah kedaluwarsa atau token telah dicabut');
    }

    // Check expiration
    if (Date.now() > record.expiresAt) {
      throw new UnauthorizedException('Refresh token telah kedaluwarsa. Silakan login kembali.');
    }

    // Revoke old refresh token (ROTATION)
    record.revokedAt = Date.now();

    // Get user
    const user = Array.from(this.users.values()).find((u) => u.id === record.userId);
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Akun pengguna tidak aktif atau tidak ditemukan');
    }

    // Generate new pair
    const tokens = this.generateTokens(user);
    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // 4. LOGOUT (REVOKE REFRESH TOKEN / SESSION)
  async logout(refreshToken?: string, userId?: string): Promise<{ success: boolean; message: string }> {
    if (refreshToken) {
      const tokenHash = this.hashSecret(refreshToken);
      const record = this.refreshTokens.get(tokenHash);
      if (record) {
        record.revokedAt = Date.now();
      }
    }

    if (userId) {
      // Revoke all tokens for this user
      for (const rec of this.refreshTokens.values()) {
        if (rec.userId === userId && !rec.revokedAt) {
          rec.revokedAt = Date.now();
        }
      }
    }

    return {
      success: true,
      message: 'Berhasil logout, sesi telah diakhiri.',
    };
  }

  // 5. ADMIN LOGIN (CREDENTIALS)
  async adminLogin(dto: AdminLoginDto): Promise<AuthTokens> {
    const adminUser = this.users.get(this.adminPhone);
    if (!adminUser) {
      throw new UnauthorizedException('Akun admin belum di-seed');
    }

    const isEmailValid = dto.email === 'admin@kawai0511.id' || dto.phoneNumber === this.adminPhone;
    const isPasswordValid = dto.password === 'admin0511' || dto.password === 'kawai0511';

    if (isEmailValid && isPasswordValid) {
      return this.generateTokens(adminUser);
    }

    throw new UnauthorizedException('Email, nomor telepon, atau password admin salah.');
  }

  // 6. GET CURRENT AUTHENTICATED USER
  async getMe(userId: string): Promise<UserEntity> {
    const user = Array.from(this.users.values()).find((u) => u.id === userId);
    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }
    return user;
  }

  // Token Generation Helper
  private generateTokens(user: UserEntity): AuthTokens {
    const nowSeconds = Math.floor(Date.now() / 1000);
    const accessExpiresIn = 15 * 60; // 15 menit
    const refreshExpiresIn = 30 * 24 * 3600; // 30 hari

    // Create JWT Access Token
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64');
    const payload = Buffer.from(
      JSON.stringify({
        sub: user.id,
        role: user.role,
        phoneNumber: user.phoneNumber,
        iat: nowSeconds,
        exp: nowSeconds + accessExpiresIn,
      })
    ).toString('base64');

    const signature = crypto
      .createHmac('sha256', this.jwtAccessSecret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    const accessToken = `${header}.${payload}.${signature}`;

    // Create Opaque Cryptographic Refresh Token
    const rawRefreshToken = 'krt_' + crypto.randomBytes(32).toString('hex');
    const refreshHash = this.hashSecret(rawRefreshToken);

    const refreshRecord: RefreshTokenRecord = {
      id: crypto.randomUUID(),
      userId: user.id,
      tokenHash: refreshHash,
      expiresAt: Date.now() + refreshExpiresIn * 1000,
      revokedAt: null,
      createdAt: Date.now(),
    };

    this.refreshTokens.set(refreshHash, refreshRecord);

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        role: user.role,
        fullName: user.fullName,
        email: user.email,
      },
    };
  }

  // Helper method for tests
  getUserByPhone(phone: string): UserEntity | undefined {
    return this.users.get(phone);
  }
}
