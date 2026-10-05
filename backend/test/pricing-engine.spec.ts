/**
 * KAWAI 0511 - Unit Test: Pricing & Fare Calculation Engine
 * Blueprint Section 8 & Section 15
 */

describe('PricingEngineUnitTests', () => {
  const BASE_FARE = 7000;
  const PER_KM = 2200;
  const PER_MINUTE = 200;
  const MINIMUM_FARE = 10000;
  const COMMISSION_RATE = 0.15; // 15% Platform
  const DRIVER_RATE = 0.85; // 85% Driver

  function calculateFare(distanceKm: number, durationMinutes: number, surgeMultiplier: number = 1.0) {
    const rawFare = BASE_FARE + distanceKm * PER_KM + durationMinutes * PER_MINUTE;
    const baseWithMin = Math.max(rawFare, MINIMUM_FARE);
    const totalFare = Math.round(baseWithMin * surgeMultiplier);
    const driverShare = Math.round(totalFare * DRIVER_RATE);
    const platformFee = totalFare - driverShare;

    return { totalFare, driverShare, platformFee };
  }

  test('should enforce minimum fare for short trips under threshold', () => {
    // 0.5 km & 2 minutes = 7000 + 1100 + 400 = 8500 -> Enforced to 10000
    const fare = calculateFare(0.5, 2);
    expect(fare.totalFare).toBe(MINIMUM_FARE);
    expect(fare.driverShare).toBe(8500);
    expect(fare.platformFee).toBe(1500);
  });

  test('should correctly compute fare for standard trip Duta Mall -> ULM', () => {
    // 4.2 km & 12 minutes = 7000 + (4.2 * 2200) + (12 * 200) = 7000 + 9240 + 2400 = 18640
    const fare = calculateFare(4.2, 12);
    expect(fare.totalFare).toBe(18640);
    expect(fare.driverShare).toBe(Math.round(18640 * 0.85)); // 15844
    expect(fare.platformFee).toBe(18640 - fare.driverShare); // 2796
    expect(fare.driverShare + fare.platformFee).toBe(18640);
  });

  test('should apply surge pricing multiplier during peak hours or heavy rain in Banjarmasin', () => {
    const normalFare = calculateFare(4.2, 12, 1.0);
    const surgeFare = calculateFare(4.2, 12, 1.5);
    expect(surgeFare.totalFare).toBe(Math.round(normalFare.totalFare * 1.5));
    expect(surgeFare.driverShare).toBe(Math.round(surgeFare.totalFare * 0.85));
  });
});
