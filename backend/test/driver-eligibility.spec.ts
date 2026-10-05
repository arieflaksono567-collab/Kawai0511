import { DriverEligibilityService } from '../src/driver/driver-eligibility.service';

describe('DriverEligibilityServiceUnitTests', () => {
  let eligibilityService: DriverEligibilityService;

  beforeEach(() => {
    eligibilityService = new DriverEligibilityService();
  });

  const validDriver = {
    id: 'drv-01',
    verificationStatus: 'APPROVED',
  };

  const validDocs = [
    { documentType: 'KTP', verificationStatus: 'APPROVED', expiresAt: null },
    { documentType: 'SIM_C', verificationStatus: 'APPROVED', expiresAt: '2028-12-31' },
    { documentType: 'STNK', verificationStatus: 'APPROVED', expiresAt: '2028-12-31' },
    { documentType: 'SKCK', verificationStatus: 'APPROVED', expiresAt: '2028-12-31' },
  ];

  const validVehicles = [
    { id: 'v-01', isActive: true, verificationStatus: 'APPROVED' },
  ];

  test('should return eligible = true when all documents and vehicle are approved', () => {
    const res = eligibilityService.checkEligibility(validDriver, validDocs, validVehicles);
    expect(res.eligible).toBe(true);
    expect(res.status).toBe('ELIGIBLE');
  });

  test('should reject if any document is missing', () => {
    const incompleteDocs = validDocs.filter((d) => d.documentType !== 'SKCK');
    const res = eligibilityService.checkEligibility(validDriver, incompleteDocs, validVehicles);
    expect(res.eligible).toBe(false);
    expect(res.status).toBe('INCOMPLETE');
    const skckReq = res.requirements.find((r) => r.type === 'SKCK');
    expect(skckReq?.status).toBe('MISSING');
  });

  test('should reject if document is expired', () => {
    const expiredDocs = validDocs.map((d) =>
      d.documentType === 'SIM_C' ? { ...d, expiresAt: '2020-01-01' } : d
    );
    const res = eligibilityService.checkEligibility(validDriver, expiredDocs, validVehicles);
    expect(res.eligible).toBe(false);
    const simReq = res.requirements.find((r) => r.type === 'SIM_C');
    expect(simReq?.status).toBe('EXPIRED');
  });

  test('should reject if driver is suspended', () => {
    const suspendedDriver = { ...validDriver, verificationStatus: 'SUSPENDED', suspensionReason: 'Pelanggaran etik' };
    const res = eligibilityService.checkEligibility(suspendedDriver, validDocs, validVehicles);
    expect(res.eligible).toBe(false);
    expect(res.status).toBe('SUSPENDED');
  });

  test('should reject if vehicle is not approved', () => {
    const unapprovedVehicles = [{ id: 'v-01', isActive: true, verificationStatus: 'PENDING' }];
    const res = eligibilityService.checkEligibility(validDriver, validDocs, unapprovedVehicles);
    expect(res.eligible).toBe(false);
  });
});
