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
