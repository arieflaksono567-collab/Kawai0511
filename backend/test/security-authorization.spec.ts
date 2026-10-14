import { test, describe } from 'node:test';
import * as assert from 'node:assert/strict';
import { ExecutionContext, UnauthorizedException, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from '../src/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Role } from '../src/auth/roles.enum';
import { ROLES_KEY } from '../src/auth/roles.decorator';
import { AdminController } from '../src/admin/admin.controller';
import { DriverController, DriverAdminController } from '../src/driver/driver.controller';
import { PaymentController, LedgerController } from '../src/payment/payment.controller';
import { RealtimeGateway } from '../src/chat/chat.gateway';
import { PaymentService } from '../src/payment/payment.service';
import { LedgerService } from '../src/payment/ledger.service';
import { SettlementService } from '../src/payment/settlement.service';

function createMockExecutionContext(headers: Record<string, string> = {}, user?: any): ExecutionContext {
  const req = {
    headers,
    user,
  };
  return {
    switchToHttp: () => ({
      getRequest: () => req,
      getResponse: () => ({}),
      getNext: () => ({}),
    }),
    getHandler: () => () => {},
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

const TEST_JWT_SECRET = 'kawai0511_super_secure_access_secret_min_32_chars_banjarmasin';
process.env.JWT_ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || TEST_JWT_SECRET;

import * as crypto from 'crypto';

function generateHS256Jwt(payload: Record<string, any>, secret: string = process.env.JWT_ACCESS_SECRET || TEST_JWT_SECRET): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${header}.${body}`)
    .digest('base64url');
  return `${header}.${body}.${signature}`;
}

describe('Security & Authorization Regression Suite', () => {
  const jwtGuard = new JwtAuthGuard();
  const reflector = new Reflector();
  const rolesGuard = new RolesGuard(reflector);

  // 1. JWT AUTHENTICATION GUARD
  test('1. JwtAuthGuard: rejects requests missing Authorization header with UnauthorizedException', () => {
    const context = createMockExecutionContext({});
    assert.throws(() => jwtGuard.canActivate(context), UnauthorizedException);
  });

  test('2. JwtAuthGuard: rejects requests with invalid or malformed Bearer tokens', () => {
    const context1 = createMockExecutionContext({ authorization: 'Basic dXNlcjpwYXNz' });
    assert.throws(() => jwtGuard.canActivate(context1), UnauthorizedException);

    const context2 = createMockExecutionContext({ authorization: 'Bearer not-a-valid-jwt' });
    assert.throws(() => jwtGuard.canActivate(context2), UnauthorizedException);

    const context3 = createMockExecutionContext({ authorization: 'Bearer one.two' });
    assert.throws(() => jwtGuard.canActivate(context3), UnauthorizedException);
  });

  test('3. JwtAuthGuard: rejects expired tokens', () => {
    const expiredToken = generateHS256Jwt({
      sub: 'usr-123',
      role: Role.CUSTOMER,
      phoneNumber: '+6281234567890',
      exp: Math.floor(Date.now() / 1000) - 3600, // expired 1 hour ago
    });
    const context = createMockExecutionContext({ authorization: `Bearer ${expiredToken}` });
    assert.throws(() => jwtGuard.canActivate(context), UnauthorizedException);
  });

  test('4. JwtAuthGuard: rejects tokens missing exp claim', () => {
    const noExpToken = generateHS256Jwt({
      sub: 'usr-123',
      role: Role.CUSTOMER,
      phoneNumber: '+6281234567890',
    });
    const context = createMockExecutionContext({ authorization: `Bearer ${noExpToken}` });
    assert.throws(() => jwtGuard.canActivate(context), UnauthorizedException);
  });

  test('5. JwtAuthGuard: rejects tokens missing required claims (sub, role, phoneNumber/phone)', () => {
    // Missing sub
    const noSub = generateHS256Jwt({
      role: Role.CUSTOMER,
      phoneNumber: '+6281234567890',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    assert.throws(() => jwtGuard.canActivate(createMockExecutionContext({ authorization: `Bearer ${noSub}` })), UnauthorizedException);

    // Missing role
    const noRole = generateHS256Jwt({
      sub: 'usr-1',
      phoneNumber: '+6281234567890',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    assert.throws(() => jwtGuard.canActivate(createMockExecutionContext({ authorization: `Bearer ${noRole}` })), UnauthorizedException);

    // Missing phoneNumber and phone
    const noPhone = generateHS256Jwt({
      sub: 'usr-1',
      role: Role.CUSTOMER,
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    assert.throws(() => jwtGuard.canActivate(createMockExecutionContext({ authorization: `Bearer ${noPhone}` })), UnauthorizedException);
  });

  test('6. JwtAuthGuard: rejects tampered token payload with signature mismatch', () => {
    const validToken = generateHS256Jwt({
      sub: 'usr-normal',
      role: Role.CUSTOMER,
      phoneNumber: '+6281234567890',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const [header, , sig] = validToken.split('.');
    // Tamper payload to escalate role to ADMIN without resigning
    const tamperedPayload = Buffer.from(
      JSON.stringify({
        sub: 'usr-normal',
        role: Role.ADMIN,
        phoneNumber: '+6281234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      })
    ).toString('base64url');

    const tamperedToken = `${header}.${tamperedPayload}.${sig}`;
    assert.throws(() => jwtGuard.canActivate(createMockExecutionContext({ authorization: `Bearer ${tamperedToken}` })), UnauthorizedException);
  });

  test('7. JwtAuthGuard: rejects tokens signed with wrong secret', () => {
    const wrongSecretToken = generateHS256Jwt(
      {
        sub: 'usr-456',
        role: Role.ADMIN,
        phoneNumber: '+6281234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      },
      'attacker_secret_different_from_server_secret'
    );
    assert.throws(() => jwtGuard.canActivate(createMockExecutionContext({ authorization: `Bearer ${wrongSecretToken}` })), UnauthorizedException);
  });

  test('8. JwtAuthGuard: authenticates valid HS256 token and injects user context into request', () => {
    const validToken = generateHS256Jwt({
      sub: 'usr-456',
      role: Role.ADMIN,
      phoneNumber: '+6281234567890',
      exp: Math.floor(Date.now() / 1000) + 3600,
    });
    const context = createMockExecutionContext({ authorization: `Bearer ${validToken}` });
    const canActivate = jwtGuard.canActivate(context);
    assert.equal(canActivate, true);

    const req = context.switchToHttp().getRequest();
    assert.equal(req.user.id, 'usr-456');
    assert.equal(req.user.role, Role.ADMIN);
    assert.equal(req.user.phoneNumber, '+6281234567890');
  });

  test('9. JwtAuthGuard: rejects with clear error when JWT_ACCESS_SECRET is unconfigured', () => {
    const originalSecret = process.env.JWT_ACCESS_SECRET;
    delete process.env.JWT_ACCESS_SECRET;
    try {
      const unconfiguredGuard = new JwtAuthGuard();
      const validToken = generateHS256Jwt({
        sub: 'usr-456',
        role: Role.ADMIN,
        phoneNumber: '+6281234567890',
        exp: Math.floor(Date.now() / 1000) + 3600,
      });
      assert.throws(
        () => unconfiguredGuard.canActivate(createMockExecutionContext({ authorization: `Bearer ${validToken}` })),
        (err: any) =>
          err instanceof UnauthorizedException &&
          err.message.includes('JWT access secret belum dikonfigurasi')
      );
    } finally {
      process.env.JWT_ACCESS_SECRET = originalSecret;
    }
  });



  // 2. ROLES AUTHORIZATION GUARD
  test('5. RolesGuard: blocks unauthorized roles and permits authorized roles', () => {
    class MockAdminEndpoint {
      execute() {}
    }

    const handler = MockAdminEndpoint.prototype.execute;
    Reflect.defineMetadata(ROLES_KEY, [Role.ADMIN], handler);

    const makeContext = (user: any) =>
      ({
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => handler,
        getClass: () => MockAdminEndpoint,
      } as unknown as ExecutionContext);

    // Customer -> 403 Forbidden
    assert.throws(() => rolesGuard.canActivate(makeContext({ id: 'u1', role: Role.CUSTOMER })), ForbiddenException);

    // Driver -> 403 Forbidden
    assert.throws(() => rolesGuard.canActivate(makeContext({ id: 'u2', role: Role.DRIVER })), ForbiddenException);

    // Anonymous -> 403 Forbidden
    assert.throws(() => rolesGuard.canActivate(makeContext(undefined)), ForbiddenException);

    // Admin -> 200 OK
    const adminAllowed = rolesGuard.canActivate(makeContext({ id: 'u3', role: Role.ADMIN }));
    assert.equal(adminAllowed, true);
  });

  // 3. ADMIN CONTROLLER DECORATORS VALIDATION
  test('6. AdminController: verifies class-level protection with JwtAuthGuard, RolesGuard and Role.ADMIN', () => {
    const guards = Reflect.getMetadata('__guards__', AdminController) || [];
    assert.ok(guards.length >= 2, 'AdminController must have guards applied');
    assert.ok(guards.includes(JwtAuthGuard), 'AdminController must include JwtAuthGuard');
    assert.ok(guards.includes(RolesGuard), 'AdminController must include RolesGuard');

    const roles = Reflect.getMetadata(ROLES_KEY, AdminController);
    assert.deepEqual(roles, [Role.ADMIN], 'AdminController must strictly require Role.ADMIN');
  });

  // 4. DRIVER ADMIN CONTROLLER SENSITIVE ENDPOINTS VALIDATION
  test('7. DriverAdminController: administrative endpoints are strictly protected with Role.ADMIN', () => {
    // Class-level validation
    const classGuards = Reflect.getMetadata('__guards__', DriverAdminController) || [];
    assert.ok(classGuards.includes(JwtAuthGuard), 'DriverAdminController must include JwtAuthGuard');
    assert.ok(classGuards.includes(RolesGuard), 'DriverAdminController must include RolesGuard');
    const classRoles = Reflect.getMetadata(ROLES_KEY, DriverAdminController);
    assert.deepEqual(classRoles, [Role.ADMIN], 'DriverAdminController must require Role.ADMIN');

    const adminMethods = [
      'listDrivers',
      'getDriverDetails',
      'getDriverDocuments',
      'getDriverVehicles',
      'approveDocument',
      'rejectDocument',
      'approveVehicle',
      'rejectVehicle',
      'approveDriver',
      'rejectDriver',
      'suspendDriver',
      'unsuspendDriver',
    ];

    for (const methodName of adminMethods) {
      const targetMethod = (DriverAdminController.prototype as any)[methodName];
      assert.ok(targetMethod, `Method ${methodName} must exist on DriverAdminController`);

      const guards = Reflect.getMetadata('__guards__', targetMethod) || [];
      assert.ok(guards.includes(JwtAuthGuard), `${methodName} must include JwtAuthGuard`);
      assert.ok(guards.includes(RolesGuard), `${methodName} must include RolesGuard`);

      const roles = Reflect.getMetadata(ROLES_KEY, targetMethod);
      assert.deepEqual(roles, [Role.ADMIN], `${methodName} must require Role.ADMIN`);
    }
  });

  // 5. PAYMENT & LEDGER ENDPOINTS VALIDATION
  test('8. PaymentController & LedgerController: financial and refund operations require ADMIN role', () => {
    // LedgerController class-level
    const ledgerGuards = Reflect.getMetadata('__guards__', LedgerController) || [];
    assert.ok(ledgerGuards.includes(JwtAuthGuard), 'LedgerController must include JwtAuthGuard');
    assert.ok(ledgerGuards.includes(RolesGuard), 'LedgerController must include RolesGuard');
    const ledgerRoles = Reflect.getMetadata(ROLES_KEY, LedgerController);
    assert.deepEqual(ledgerRoles, [Role.ADMIN], 'LedgerController must require Role.ADMIN');

    // PaymentController sensitive operations
    const refundGuards = Reflect.getMetadata('__guards__', PaymentController.prototype.refundPayment) || [];
    assert.ok(refundGuards.includes(JwtAuthGuard));
    assert.ok(refundGuards.includes(RolesGuard));
    assert.deepEqual(Reflect.getMetadata(ROLES_KEY, PaymentController.prototype.refundPayment), [Role.ADMIN]);

    const settleGuards = Reflect.getMetadata('__guards__', PaymentController.prototype.settlePayment) || [];
    assert.ok(settleGuards.includes(JwtAuthGuard));
    assert.ok(settleGuards.includes(RolesGuard));
    assert.deepEqual(Reflect.getMetadata(ROLES_KEY, PaymentController.prototype.settlePayment), [Role.ADMIN]);
  });

  // 6. PAYMENT SERVICE REFUND SECURITY
  test('9. PaymentService.refundPayment: strictly rejects unauthorized or non-admin callers', async () => {
    const ledgerService = new LedgerService();
    const settlementService = new SettlementService(ledgerService);
    const paymentService = new PaymentService(ledgerService, settlementService);

    // Seed dummy paid payment
    const dummyPayment = {
      id: 'pay-sec-01',
      rideId: 'ride-sec-01',
      payerPassengerId: 'p-01',
      payeeDriverId: 'd-01',
      amount: 25000,
      currency: 'IDR',
      method: 'DIGITAL' as any,
      status: 'PAID' as any,
      provider: 'MOCK_DIGITAL',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    (paymentService as any).payments.set('pay-sec-01', dummyPayment);

    // Call without user context -> UnauthorizedException
    await assert.rejects(
      async () => paymentService.refundPayment('pay-sec-01', 25000, 'Test reason', undefined),
      UnauthorizedException
    );

    // Call with Customer -> ForbiddenException
    await assert.rejects(
      async () =>
        paymentService.refundPayment('pay-sec-01', 25000, 'Test reason', {
          id: 'p-01',
          role: Role.CUSTOMER,
        }),
      ForbiddenException
    );

    // Call with Driver -> ForbiddenException
    await assert.rejects(
      async () =>
        paymentService.refundPayment('pay-sec-01', 25000, 'Test reason', {
          id: 'd-01',
          role: Role.DRIVER,
        }),
      ForbiddenException
    );

    // Call with Admin -> Success
    const refundResult = await paymentService.refundPayment('pay-sec-01', 25000, 'Admin authorized', {
      id: 'admin-01',
      role: Role.ADMIN,
    });
    assert.equal(refundResult.payment.status, 'REFUNDED');
  });

  // 7. WEBSOCKET REALTIME GATEWAY AUTHENTICATION
  test('10. RealtimeGateway: authenticates handshake token and validates chat permissions', () => {
    const gateway = new RealtimeGateway();

    // Connection without token -> rejected
    let disconnected = false;
    const unauthClient = {
      handshake: { auth: {} },
      disconnect: () => {
        disconnected = true;
      },
    };
    const connResult = gateway.handleConnection(unauthClient);
    assert.equal(connResult.event, 'error');
    assert.equal(connResult.code, 'UNAUTHORIZED');
    assert.equal(disconnected, true);

    // Connection with valid token -> accepted
    const validToken = generateHS256Jwt({ sub: 'user-chat-01', role: Role.CUSTOMER, phoneNumber: '+6281234567890', exp: Math.floor(Date.now() / 1000) + 3600 });
    const authClient = {
      handshake: { auth: { token: validToken } },
      disconnect: () => {},
    };
    const okConn = gateway.handleConnection(authClient);
    assert.equal(okConn.event, 'connected');
    assert.equal((okConn as any).user.id, 'user-chat-01');

    // Chat message spoofing role -> rejected
    const spoofedMsg = gateway.handleChatMessage(
      { orderId: 'ord-100', message: 'Hello', senderRole: 'DRIVER' },
      authClient // authClient has role CUSTOMER
    );
    assert.equal(spoofedMsg.event, 'error');
    assert.equal(spoofedMsg.code, 'FORBIDDEN');

    // Chat message matching role -> accepted
    const legitMsg = gateway.handleChatMessage(
      { orderId: 'ord-100', message: 'Halo mang, posisinya di mana?', senderRole: 'CUSTOMER' },
      authClient
    );
    assert.equal(legitMsg.event, 'chat:message');
    assert.equal((legitMsg as any).payload.message, 'Halo mang, posisinya di mana?');
  });

  // 8. CHAT CONTROLLER AUTHENTICATION & ROLE SPOOFING PREVENTION
  test('11. ChatController: class-level JwtAuthGuard and prevents sender role spoofing', async () => {
    const chatService = {
      sendMessage: async (dto: any) => ({ userMessage: { ...dto, id: 'msg-test', isRead: true } }),
      getMessages: async () => [],
    };
    const { ChatController } = await import('../src/chat/chat.controller');
    const controller = new ChatController(chatService as any);

    // Verify @UseGuards metadata on ChatController class
    const classGuards = Reflect.getMetadata('__guards__', ChatController);
    assert.ok(Array.isArray(classGuards) && classGuards.includes(JwtAuthGuard), 'ChatController must have JwtAuthGuard');

    // Customer trying to send as DRIVER -> ForbiddenException
    await assert.rejects(
      async () =>
        controller.sendMessage(
          { user: { id: 'cust-1', role: Role.CUSTOMER } },
          { orderId: 'ord-1', orderType: 'RIDE', senderRole: 'DRIVER', message: 'I am driver' }
        ),
      ForbiddenException
    );

    // Customer sending as CUSTOMER -> Allowed
    const res = await controller.sendMessage(
      { user: { id: 'cust-1', role: Role.CUSTOMER } },
      { orderId: 'ord-1', orderType: 'RIDE', senderRole: 'CUSTOMER', message: 'Halo driver' }
    );
    assert.equal(res.userMessage.senderRole, 'CUSTOMER');

    // Admin sending as either -> Allowed
    const adminRes = await controller.sendMessage(
      { user: { id: 'admin-1', role: Role.ADMIN } },
      { orderId: 'ord-1', orderType: 'RIDE', senderRole: 'DRIVER', message: 'System message' }
    );
    assert.equal(adminRes.userMessage.senderRole, 'DRIVER');
  });
});

