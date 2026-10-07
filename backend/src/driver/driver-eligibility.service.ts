import { Injectable } from '@nestjs/common';

export interface RequirementItem {
  type: 'KTP' | 'SIM_C' | 'STNK' | 'SKCK' | 'VEHICLE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED' | 'MISSING';
  reason?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  status: 'ELIGIBLE' | 'INCOMPLETE' | 'UNDER_REVIEW' | 'REJECTED' | 'SUSPENDED';
  message: string;
  requirements: RequirementItem[];
}

@Injectable()
export class DriverEligibilityService {
  private driverRegistry = new Map<
    string,
    {
      driver: any;
      documents: any[];
      vehicles: any[];
      userRole?: string;
      idleSince?: string;
    }
  >();

  constructor() {
    this.seedDefaultDriver();
  }

  private seedDefaultDriver() {
    const defaultId = 'd0000000-0000-0000-0000-000000000001';
    this.driverRegistry.set(defaultId, {
      driver: {
        id: defaultId,
        userId: 'c0000000-0000-0000-0000-000000000003',
        verificationStatus: 'APPROVED',
        operationalStatus: 'ONLINE',
        displayName: 'Ahmad Gazali',
        ratingAverage: 4.9,
      },
      userRole: 'DRIVER',
      documents: [
        { documentType: 'KTP', verificationStatus: 'APPROVED', expiresAt: '2030-12-31' },
        { documentType: 'SIM_C', verificationStatus: 'APPROVED', expiresAt: '2028-12-31' },
        { documentType: 'STNK', verificationStatus: 'APPROVED', expiresAt: '2027-12-31' },
        { documentType: 'SKCK', verificationStatus: 'APPROVED', expiresAt: '2027-12-31' },
      ],
      vehicles: [
        {
          id: 'v0000000-0000-0000-0000-000000000001',
          licensePlate: 'DA 5110 KAW',
          model: 'Honda Vario 160',
          isActive: true,
          verificationStatus: 'APPROVED',
        },
      ],
      idleSince: new Date(Date.now() - 3600000).toISOString(),
    });
  }

  setDriverRecord(
    driverId: string,
    record: {
      driver: any;
      documents: any[];
      vehicles: any[];
      userRole?: string;
      idleSince?: string;
    }
  ) {
    this.driverRegistry.set(driverId, record);
  }

  getDriverRecord(driverId: string) {
    return this.driverRegistry.get(driverId);
  }

  isDriverEligible(driverId: string): boolean {
    const record = this.driverRegistry.get(driverId);
    if (!record) {
      // Default to true for pre-approved test driver id
      if (driverId === 'd0000000-0000-0000-0000-000000000001') return true;
      return false;
    }

    if (record.userRole && record.userRole !== 'DRIVER') {
      return false;
    }

    const res = this.checkEligibility(record.driver, record.documents, record.vehicles);
    return res.eligible;
  }

  isDriverOnline(driverId: string): boolean {
    const record = this.driverRegistry.get(driverId);
    if (!record) {
      return driverId === 'd0000000-0000-0000-0000-000000000001';
    }
    return record.driver.operationalStatus === 'ONLINE';
  }

  checkDispatchEligibility(driverId: string): { eligible: boolean; reason?: string } {
    const record = this.driverRegistry.get(driverId);
    if (!record) {
      if (driverId === 'd0000000-0000-0000-0000-000000000001') {
        return { eligible: true };
      }
      return { eligible: false, reason: 'Driver tidak terdaftar dalam sistem.' };
    }

    // 1. Role must be DRIVER
    if (record.userRole && record.userRole !== 'DRIVER') {
      return { eligible: false, reason: 'Akun bukan berstatus role DRIVER.' };
    }

    // 2. Driver verification must be APPROVED
    if (record.driver.verificationStatus !== 'APPROVED') {
      return {
        eligible: false,
        reason: `Status verifikasi driver bukan APPROVED (saat ini ${record.driver.verificationStatus}).`,
      };
    }

    // 3. Operational status must be ONLINE
    if (record.driver.operationalStatus !== 'ONLINE') {
      return { eligible: false, reason: 'Status operasional driver sedang OFFLINE.' };
    }

    // 4. Documents check (KTP, SIM_C, STNK, SKCK) must all be APPROVED and NOT EXPIRED
    const docTypes = ['KTP', 'SIM_C', 'STNK', 'SKCK'];
    const now = new Date();
    for (const dt of docTypes) {
      const doc = record.documents.find((d: any) => d.documentType === dt);
      if (!doc) {
        return { eligible: false, reason: `Dokumen wajib ${dt} belum diunggah.` };
      }
      if (doc.verificationStatus !== 'APPROVED') {
        return { eligible: false, reason: `Dokumen ${dt} belum disetujui (status: ${doc.verificationStatus}).` };
      }
      if (doc.expiresAt && new Date(doc.expiresAt) < now) {
        return { eligible: false, reason: `Dokumen ${dt} telah kedaluwarsa (expired).` };
      }
    }

    // 5. Active vehicle must be present, active, and APPROVED
    const activeVehicle = record.vehicles.find((v: any) => v.isActive);
    if (!activeVehicle) {
      return { eligible: false, reason: 'Tidak ada kendaraan aktif yang terdaftar.' };
    }
    if (activeVehicle.verificationStatus !== 'APPROVED') {
      return {
        eligible: false,
        reason: `Kendaraan aktif belum disetujui (status: ${activeVehicle.verificationStatus}).`,
      };
    }

    return { eligible: true };
  }

  getIdleDurationSeconds(driverId: string): number {
    const record = this.driverRegistry.get(driverId);
    if (!record || !record.idleSince) return 0;
    const diff = (Date.now() - new Date(record.idleSince).getTime()) / 1000;
    return Math.max(0, Math.floor(diff));
  }

  checkEligibility(
    driver: any,
    documents: any[],
    vehicles: any[]
  ): EligibilityResult {
    const requirements: RequirementItem[] = [];

    // Helper document lookup
    const docTypes: ('KTP' | 'SIM_C' | 'STNK' | 'SKCK')[] = ['KTP', 'SIM_C', 'STNK', 'SKCK'];
    const now = new Date();

    for (const dt of docTypes) {
      const doc = documents.find((d) => d.documentType === dt);
      if (!doc) {
        requirements.push({ type: dt, status: 'MISSING' });
      } else if (doc.expiresAt && new Date(doc.expiresAt) < now) {
        requirements.push({ type: dt, status: 'EXPIRED', reason: 'Dokumen telah kedaluwarsa' });
      } else {
        requirements.push({
          type: dt,
          status: doc.verificationStatus,
          reason: doc.rejectionReason,
        });
      }
    }

    // Vehicle lookup
    const activeVehicle = vehicles.find((v) => v.isActive);
    if (!activeVehicle) {
      requirements.push({ type: 'VEHICLE', status: 'MISSING', reason: 'Belum ada kendaraan terdaftar' });
    } else {
      requirements.push({
        type: 'VEHICLE',
        status: activeVehicle.verificationStatus,
        reason: activeVehicle.rejectionReason,
      });
    }

    // Check Suspension
    if (driver.verificationStatus === 'SUSPENDED') {
      return {
        eligible: false,
        status: 'SUSPENDED',
        message: driver.suspensionReason || 'Akun mitra driver sedang disuspend oleh admin.',
        requirements,
      };
    }

    // Check Rejection
    if (driver.verificationStatus === 'REJECTED') {
      return {
        eligible: false,
        status: 'REJECTED',
        message: driver.rejectionReason || 'Pengajuan verifikasi driver ditolak.',
        requirements,
      };
    }

    // Check all requirements
    const allApproved = requirements.every((r) => r.status === 'APPROVED');
    const isDriverApproved = driver.verificationStatus === 'APPROVED';

    if (isDriverApproved && allApproved) {
      return {
        eligible: true,
        status: 'ELIGIBLE',
        message: 'Driver memenuhi seluruh kriteria operasional dan siap Online.',
        requirements,
      };
    }

    const hasUnderReview = requirements.some((r) => r.status === 'PENDING') || driver.verificationStatus === 'UNDER_REVIEW';

    return {
      eligible: false,
      status: hasUnderReview ? 'UNDER_REVIEW' : 'INCOMPLETE',
      message: 'Persyaratan verifikasi belum lengkap atau masih menunggu persetujuan admin.',
      requirements,
    };
  }
}
