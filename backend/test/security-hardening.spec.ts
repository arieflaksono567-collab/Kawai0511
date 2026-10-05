/**
 * KAWAI 0511 - Unit Test: Security Hardening & Anti-Fraud
 * Blueprint Section 14 & Section 15
 */

describe('SecurityHardeningUnitTests', () => {
  // 1. Fake GPS / Impossible Speed Detector
  function isSpeedPlausible(
    prevLat: number,
    prevLng: number,
    prevTime: number,
    currLat: number,
    currLng: number,
    currTime: number
  ): { isFraud: boolean; speedKmh: number } {
    // Haversine formula calculation
    const R = 6371; // Earth radius in km
    const dLat = ((currLat - prevLat) * Math.PI) / 180;
    const dLng = ((currLng - prevLng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((prevLat * Math.PI) / 180) *
        Math.cos((currLat * Math.PI) / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distanceKm = R * c;

    const timeDiffHours = (currTime - prevTime) / 3600000;
    if (timeDiffHours <= 0) return { isFraud: true, speedKmh: Infinity };

    const speedKmh = distanceKm / timeDiffHours;
    // Motor speed in Banjarmasin exceeding 120 km/h or instant teleportation flagged as Fake GPS
    return { isFraud: speedKmh > 120, speedKmh: Math.round(speedKmh) };
  }

  test('should detect fake GPS teleportation spoofing', () => {
    const t0 = 1000000;
    const t1 = t0 + 5000; // 5 seconds later
    // Teleporting 10 km in 5 seconds = 7,200 km/h (impossible!)
    const result = isSpeedPlausible(-3.3194, 114.5908, t0, -3.4200, 114.6500, t1);
    expect(result.isFraud).toBe(true);
    expect(result.speedKmh).toBeGreaterThan(120);
  });

  test('should accept legitimate vehicle speed within city limits', () => {
    const t0 = 1000000;
    const t1 = t0 + 60000; // 1 minute later
    // Traveling ~400 meters in 1 minute = ~24 km/h
    const result = isSpeedPlausible(-3.3194, 114.5908, t0, -3.3228, 114.5935, t1);
    expect(result.isFraud).toBe(false);
    expect(result.speedKmh).toBeLessThan(60);
  });

  // 2. Concurrency Race-Condition Order Claim (Atomic Mutex Simulation)
  test('should ensure only one driver wins in concurrent order claim', async () => {
    let orderAssignedTo: string | null = null;
    let lockAcquired = false;

    async function claimOrder(driverId: string): Promise<boolean> {
      if (lockAcquired || orderAssignedTo !== null) {
        return false; // Rejected
      }
      lockAcquired = true;
      // simulate atomic database update
      await new Promise((r) => setTimeout(r, 10));
      orderAssignedTo = driverId;
      lockAcquired = false;
      return true;
    }

    // Two drivers tap accept at the exact same millisecond
    const [res1, res2] = await Promise.all([claimOrder('driver-001'), claimOrder('driver-002')]);

    // Exactly one must succeed, one must fail
    expect(res1 !== res2).toBe(true);
    expect(orderAssignedTo).not.toBeNull();
  });
});
