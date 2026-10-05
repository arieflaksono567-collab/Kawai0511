import { RolesGuard } from '../src/auth/guards/roles.guard';
import { Reflector } from '@nestjs/core';
import { Role } from '../src/auth/roles.enum';
import { ForbiddenException, ExecutionContext } from '@nestjs/common';

describe('RbacUnitTests', () => {
  let rolesGuard: RolesGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    rolesGuard = new RolesGuard(reflector);
  });

  function createMockContext(userRole: Role, requiredRoles?: Role[]): ExecutionContext {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(requiredRoles);

    return {
      switchToHttp: () => ({
        getRequest: () => ({
          user: { id: 'usr-test-01', role: userRole },
        }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  }

  test('should throw ForbiddenException (403) when CUSTOMER accesses ADMIN endpoint', () => {
    const ctx = createMockContext(Role.CUSTOMER, [Role.ADMIN]);
    expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  test('should throw ForbiddenException (403) when DRIVER accesses ADMIN endpoint', () => {
    const ctx = createMockContext(Role.DRIVER, [Role.ADMIN]);
    expect(() => rolesGuard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  test('should allow access (200) when ADMIN accesses ADMIN endpoint', () => {
    const ctx = createMockContext(Role.ADMIN, [Role.ADMIN]);
    expect(rolesGuard.canActivate(ctx)).toBe(true);
  });

  test('should allow public access when no role is required', () => {
    const ctx = createMockContext(Role.CUSTOMER, undefined);
    expect(rolesGuard.canActivate(ctx)).toBe(true);
  });
});
