import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly accessSecret = process.env.JWT_ACCESS_SECRET;

  private fromBase64Url(value: string): Buffer {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const pad = normalized.length % 4;
    const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad);
    return Buffer.from(padded, 'base64');
  }

  private getTokenParts(token: string): [string, string, string] {
    const parts = token.split('.');
    if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
      throw new UnauthorizedException('Format token JWT tidak valid');
    }
    return [parts[0], parts[1], parts[2]];
  }

  private verifySignature(token: string): boolean {
    if (!this.accessSecret) {
      throw new UnauthorizedException('JWT access secret belum dikonfigurasi');
    }

    const [headerPart, payloadPart, signaturePart] = this.getTokenParts(token);
    const signingInput = `${headerPart}.${payloadPart}`;

    // expected signature (raw bytes)
    const expectedSignature = crypto
      .createHmac('sha256', this.accessSecret)
      .update(signingInput)
      .digest();

    // provided signature (base64url -> raw bytes)
    const providedSignature = this.fromBase64Url(signaturePart);

    // lengths must match for timingSafeEqual
    if (expectedSignature.length !== providedSignature.length) {
      return false;
    }

    return crypto.timingSafeEqual(expectedSignature, providedSignature);
  }

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token tidak ditemukan atau tidak valid');
    }

    const token = authHeader.split(' ')[1];

    try {
      if (!token || !this.verifySignature(token)) {
        throw new UnauthorizedException('Token verifikasi gagal atau signature tidak sah');
      }

      const [, payloadPart] = this.getTokenParts(token);
      const payloadJson = this.fromBase64Url(payloadPart).toString('utf-8');
      const payload = JSON.parse(payloadJson);

      if (!payload || typeof payload !== 'object') {
        throw new UnauthorizedException('Payload token tidak valid');
      }

      // Require standard claims
      if (!payload.sub) {
        throw new UnauthorizedException('Payload token tidak lengkap: sub diperlukan');
      }
      if (!payload.role) {
        throw new UnauthorizedException('Payload token tidak lengkap: role diperlukan');
      }
      if (!payload.phoneNumber && !payload.phone) {
        throw new UnauthorizedException('Payload token tidak lengkap: phoneNumber diperlukan');
      }

      // Require and validate expiry
      if (!payload.exp || Number(payload.exp) <= Math.floor(Date.now() / 1000)) {
        throw new UnauthorizedException('Access token telah kedaluwarsa atau tidak memiliki exp');
      }

      request.user = {
        id: payload.sub,
        role: payload.role,
        phoneNumber: payload.phoneNumber || payload.phone,
      };

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      if (err instanceof SyntaxError) {
        throw new UnauthorizedException('Payload token tidak valid');
      }
      throw new UnauthorizedException('Token verifikasi gagal atau signature tidak sah');
    }
  }
}
