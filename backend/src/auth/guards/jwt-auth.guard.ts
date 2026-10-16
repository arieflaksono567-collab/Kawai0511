import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { decodeBase64Url, getJwtParts, parseJwtPayload, verifyJwtSignature } from '../jwt.util';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly accessSecret = process.env.JWT_ACCESS_SECRET;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string' || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token tidak ditemukan atau tidak valid');
    }

    const token = authHeader.split(' ')[1];

    try {
      if (!token || !verifyJwtSignature(token, this.accessSecret ?? '')) {
        throw new UnauthorizedException('Token verifikasi gagal atau signature tidak sah');
      }

      const payload = parseJwtPayload(token);

      if (!payload || typeof payload !== 'object') {
        throw new UnauthorizedException('Payload token tidak valid');
      }

      if (!payload.sub) {
        throw new UnauthorizedException('Payload token tidak lengkap: sub diperlukan');
      }
      if (!payload.role) {
        throw new UnauthorizedException('Payload token tidak lengkap: role diperlukan');
      }
      if (!payload.phoneNumber && !payload.phone) {
        throw new UnauthorizedException('Payload token tidak lengkap: phoneNumber diperlukan');
      }

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
      if (err instanceof UnauthorizedException) {
        throw err;
      }

      if (err instanceof SyntaxError) {
        throw new UnauthorizedException('Payload token tidak valid');
      }

      throw new UnauthorizedException('Token verifikasi gagal atau signature tidak sah');
    }
  }
}
