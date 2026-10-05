/**
 * KAWAI 0511 - Unit Test: Strict Order State Machine
 * Blueprint Section 9 & Section 15
 */

describe('OrderStateMachineUnitTests', () => {
  const VALID_TRANSITIONS: Record<string, string[]> = {
    SEARCHING: ['ASSIGNED', 'CANCELLED'],
    ASSIGNED: ['ARRIVED', 'CANCELLED'],
    ARRIVED: ['IN_TRIP', 'CANCELLED'],
    IN_TRIP: ['COMPLETED'],
    COMPLETED: [],
    CANCELLED: [],
  };

  function canTransition(current: string, next: string): boolean {
    const allowed = VALID_TRANSITIONS[current] || [];
    return allowed.includes(next);
  }

  test('should allow sequential legal transitions', () => {
    expect(canTransition('SEARCHING', 'ASSIGNED')).toBe(true);
    expect(canTransition('ASSIGNED', 'ARRIVED')).toBe(true);
    expect(canTransition('ARRIVED', 'IN_TRIP')).toBe(true);
    expect(canTransition('IN_TRIP', 'COMPLETED')).toBe(true);
  });

  test('should strictly reject illegal transition skips', () => {
    // Cannot skip directly from SEARCHING to COMPLETED
    expect(canTransition('SEARCHING', 'COMPLETED')).toBe(false);
    // Cannot skip from ASSIGNED directly to COMPLETED without IN_TRIP
    expect(canTransition('ASSIGNED', 'COMPLETED')).toBe(false);
    // Completed orders cannot transition to any other state
    expect(canTransition('COMPLETED', 'SEARCHING')).toBe(false);
    expect(canTransition('COMPLETED', 'IN_TRIP')).toBe(false);
  });
});
