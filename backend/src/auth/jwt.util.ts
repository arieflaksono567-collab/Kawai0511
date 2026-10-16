import * as crypto from 'crypto';

export function encodeBase64Url(value: string | Buffer): string {
  const buffer = Buffer.isBuffer(value) ? value : Buffer.from(value);
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

export function decodeBase64Url(value: string): Buffer {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad = normalized.length % 4;
  const padded = pad === 0 ? normalized : normalized + '='.repeat(4 - pad);
  return Buffer.from(padded, 'base64');
}

export function getJwtParts(token: string): [string, string, string] {
  const parts = token.split('.');
  if (parts.length !== 3 || !parts[0] || !parts[1] || !parts[2]) {
    throw new Error('Format token JWT tidak valid');
  }

  return [parts[0], parts[1], parts[2]];
}

export function verifyJwtSignature(token: string, secret: string): boolean {
  if (!secret) {
    throw new Error('JWT access secret belum dikonfigurasi');
  }

  const [headerPart, payloadPart, signaturePart] = getJwtParts(token);
  const signingInput = `${headerPart}.${payloadPart}`;

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest();

  const providedSignature = decodeBase64Url(signaturePart);

  if (expectedSignature.length !== providedSignature.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedSignature, providedSignature);
}

export function parseJwtPayload(token: string): Record<string, any> {
  const [, payloadPart] = getJwtParts(token);
  const payloadJson = decodeBase64Url(payloadPart).toString('utf-8');
  return JSON.parse(payloadJson);
}
