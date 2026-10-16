import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import test from 'node:test';

import {
  decodeBase64Url,
  encodeBase64Url,
  getJwtParts,
  parseJwtPayload,
  verifyJwtSignature,
} from '../src/auth/jwt.util';

test('encodeBase64Url and decodeBase64Url should round-trip UTF-8 strings', () => {
  const original = '{"sub":"user-123","role":"CUSTOMER"}';
  const encoded = encodeBase64Url(original);

  assert.equal(typeof encoded, 'string');
  assert.equal(encoded.length > 0, true);
  assert.equal(decodeBase64Url(encoded).toString('utf-8'), original);
});

test('getJwtParts should reject malformed JWT strings', () => {
  assert.throws(() => getJwtParts('invalid-token'), /Format token JWT tidak valid/);
  assert.throws(() => getJwtParts('header.payload'), /Format token JWT tidak valid/);
});

test('verifyJwtSignature should accept valid JWT signature and reject tampered ones', () => {
  const secret = 'kawai0511_test_secret_1234567890';
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = encodeBase64Url(JSON.stringify({ sub: 'user-123', role: 'CUSTOMER', exp: 9999999999 }));
  const signingInput = `${header}.${payload}`;
  const validSignature = encodeBase64Url(
    crypto.createHmac('sha256', secret).update(signingInput).digest()
  );

  const validToken = `${header}.${payload}.${validSignature}`;
  assert.equal(verifyJwtSignature(validToken, secret), true);

  const tamperedToken = `${header}.${payload}.invalid-signature`;
  assert.equal(verifyJwtSignature(tamperedToken, secret), false);
});

test('parseJwtPayload should decode payload JSON from a valid JWT', () => {
  const payload = { sub: 'user-123', role: 'CUSTOMER', phoneNumber: '+6281234567890', exp: 9999999999 };
  const header = encodeBase64Url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = encodeBase64Url(
    crypto.createHmac('sha256', 'secret').update(`${header}.${encodedPayload}`).digest()
  );

  const token = `${header}.${encodedPayload}.${signature}`;
  assert.deepEqual(parseJwtPayload(token), payload);
});

