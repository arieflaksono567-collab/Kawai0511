import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Access token tidak ditemukan atau tidak valid');
    }

    const token = authHeader.split(' ')[1];
    try {
      // Decode JWT token
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Malformed token');
      }

      // Check signature dummy for development or parse payload
      const payloadJson = Buffer.from(parts[1], 'base64').toString('utf-8');
      const payload = JSON.parse(payloadJson);

      // Check expiry
      if (payload.exp && Date.now() / 1000 > payload.exp) {
        throw new UnauthorizedException('Access token telah kedaluwarsa');
      }

      request.user = {
        id: payload.sub,
        role: payload.role,
        phoneNumber: payload.phoneNumber || payload.phone,
      };

      return true;
    } catch (err: any) {
      if (err instanceof UnauthorizedException) throw err;
      throw new UnauthorizedException('Token verifikasi gagal atau signature tidak sah');
    }
  }
}
