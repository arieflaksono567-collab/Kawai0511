import * as crypto from 'crypto';
import * as nodeTest from 'node:test';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { encodeBase64Url } from '../src/auth/jwt.util';

// Fallback for runner environments (tsx / node:test) when Jest globals are not injected
const describe = (globalThis as any).describe || nodeTest.describe;
const test = (globalThis as any).test || nodeTest.it;
const beforeEach = (globalThis as any).beforeEach || nodeTest.beforeEach;
const afterEach = (globalThis as any).afterEach || nodeTest.afterEach;


const expect = (globalThis as any).expect || ((actual: any) => ({
  toBe: (expected: any) => {
    if (actual !== expected) {
      throw new Error(`Expected ${actual} to be ${expected}`);
    }
  },
  toMatchObject: (expected: Record<string, any>) => {
    for (const key of Object.keys(expected)) {
      if (actual[key] !== expected[key]) {
        throw new Error(`Expected property ${key} (${actual[key]}) to match ${expected[key]}`);
      }
    }
  },
  toThrow: (expectedMessage?: string) => {
    let threw = false;
    let thrownError: any;
    try {
      if (typeof actual === 'function') actual();
    } catch (err: any) {
      threw = true;
      thrownError = err;
    }
    if (!threw) {
      throw new Error('Expected function to throw, but it did not throw');
    }
    if (expectedMessage && !thrownError?.message?.includes(expectedMessage)) {
      throw new Error(`Expected error message to include "${expectedMessage}", but got "${thrownError?.message}"`);
    }
  },
}));

describe('JwtAuthGuard', () => {
  const originalSecret = process.env.JWT_ACCESS_SECRET;

  const buildToken = (payload: Record<string, any>, secret: string) => {
    const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payloadSegment = encodeBase64Url(JSON.stringify(payload));
    const signature = encodeBase64Url(
      crypto
        .createHmac('sha256', secret)
        .update(`${header}.${payloadSegment}`)
        .digest()
    );

    return `${header}.${payloadSegment}.${signature}`;
  };

  beforeEach(() => {
    process.env.JWT_ACCESS_SECRET = 'kawai0511_test_secret_1234567890';
  });

  afterEach(() => {
    if (originalSecret === undefined) {
      delete process.env.JWT_ACCESS_SECRET;
    } else {
      process.env.JWT_ACCESS_SECRET = originalSecret;
    }
  });

  test('should accept a valid signed token with exp in future', () => {
    const validToken = buildToken(
      {
        sub: 'user-123',
        role: 'CUSTOMER',
        phoneNumber: '+6281234567890',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      process.env.JWT_ACCESS_SECRET!
    );

    const request = {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    };

    const guard = new JwtAuthGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    expect(guard.canActivate(context)).toBe(true);
    expect(request.user).toMatchObject({
      id: 'user-123',
      role: 'CUSTOMER',
      phoneNumber: '+6281234567890',
    });
  });

  test('should reject a token with invalid signature', () => {
    const validToken = buildToken(
      {
        sub: 'user-123',
        role: 'CUSTOMER',
        phoneNumber: '+6281234567890',
        exp: Math.floor(Date.now() / 1000) + 60,
      },
      'other-secret'
    );

    const request = {
      headers: {
        authorization: `Bearer ${validToken}`,
      },
    };

    const guard = new JwtAuthGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow('Token verifikasi gagal atau signature tidak sah');
  });

  test('should reject a token without exp claim', () => {
    const payloadWithoutExp = buildToken(
      {
        sub: 'user-123',
        role: 'CUSTOMER',
        phoneNumber: '+6281234567890',
      },
      process.env.JWT_ACCESS_SECRET!
    );

    const request = {
      headers: {
        authorization: `Bearer ${payloadWithoutExp}`,
      },
    };

    const guard = new JwtAuthGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow('Access token telah kedaluwarsa atau tidak memiliki exp');
  });

  test('should reject an expired token', () => {
    const expiredToken = buildToken(
      {
        sub: 'user-123',
        role: 'CUSTOMER',
        phoneNumber: '+6281234567890',
        exp: Math.floor(Date.now() / 1000) - 1,
      },
      process.env.JWT_ACCESS_SECRET!
    );

    const request = {
      headers: {
        authorization: `Bearer ${expiredToken}`,
      },
    };

    const guard = new JwtAuthGuard();
    const context = {
      switchToHttp: () => ({ getRequest: () => request }),
    } as any;

    expect(() => guard.canActivate(context)).toThrow('Access token telah kedaluwarsa atau tidak memiliki exp');
  });
});
