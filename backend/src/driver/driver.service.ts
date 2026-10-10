import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { UpdateDriverProfileDto } from './dto/update-driver-profile.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { DriverEligibilityService, EligibilityResult } from './driver-eligibility.service';
import { LocalDocumentStorageProvider } from './storage/local-document-storage.provider';
import { SettlementService } from '../payment/settlement.service';
import { DriverEarningsSummary } from '../payment/payment.types';
import { DriverEarningsService } from '../payment/driver-earnings.service';
import {
  DriverEarningsDashboardResponse,
  DriverEarningsMultiPeriodSummary,
} from '../payment/driver-earnings-ledger.types';

export interface DriverEntity {
  id: string;
  userId: string;
  verificationStatus: 'PENDING' | 'UNDER_REVIEW' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';
  operationalStatus: 'OFFLINE' | 'ONLINE' | 'SUSPENDED';
  displayName: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  province?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  ratingAverage: number;
  ratingCount: number;
  completedTripCount: number;
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectedAt?: string;
  rejectionReason?: string;
  suspendedAt?: string;
  suspensionReason?: string;
}

export interface DriverDocumentEntity {
  id: string;
  driverId: string;
  documentType: 'KTP' | 'SIM_C' | 'STNK' | 'SKCK';
  documentNumber: string;
  documentName: string;
  fileUrl: string;
  fileHash: string;
  issuedAt?: string;
  expiresAt?: string;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  rejectionReason?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface VehicleEntity {
  id: string;
  driverId: string;
  vehicleType: string;
  brand: string;
  model: string;
  productionYear: number;
  color: string;
  licensePlate: string;
  registrationNumber?: string;
  isActive: boolean;
  verificationStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface AuditLogEntity {
  id: string;
  actorUserId: string;
  action: string;
  entityType: 'DRIVER' | 'DOCUMENT' | 'VEHICLE';
  entityId: string;
  oldValue?: any;
  newValue?: any;
  reason?: string;
  createdAt: string;
}

@Injectable()
export class DriverService {
  // In-Memory Repository
  private drivers = new Map<string, DriverEntity>(); // key: driverId
  private driverUserIndex = new Map<string, string>(); // key: userId -> driverId
  private documents = new Map<string, DriverDocumentEntity>(); // key: documentId
  private vehicles = new Map<string, VehicleEntity>(); // key: vehicleId
  private auditLogs: AuditLogEntity[] = [];

  constructor(
    private readonly eligibilityService: DriverEligibilityService,
    private readonly storageProvider: LocalDocumentStorageProvider,
    private readonly settlementService?: SettlementService,
    private driverEarningsService?: DriverEarningsService
  ) {
    this.seedDefaultDriver();
  }

  setDriverEarningsService(service: DriverEarningsService) {
    this.driverEarningsService = service;
  }

  /**
   * Phase 6C Driver Earnings Query derived directly from Double-Entry Ledger
   */
  getDriverEarnings(userIdOrDriverId: string, period?: string): DriverEarningsSummary {
    const driverId = this.driverUserIndex.get(userIdOrDriverId) || userIdOrDriverId;
    if (this.settlementService) {
      return this.settlementService.getDriverEarnings(driverId, period);
    }
    return {
      driverId,
      totalCompletedRides: 0,
      grossFare: 0,
      driverEarnings: 0,
      platformFee: 0,
      period: period || 'all-time',
      currency: 'IDR',
      ledgerAccountId: `DRIVER_PAYABLE_${driverId}`,
      ledgerBalance: 0,
      authoritativeSource: 'LEDGER',
    };
  }

  /**
   * Phase 7.3 Driver Earnings Dashboard Query derived from Database Ledger
   */
  async getDriverEarningsDashboard(
    userIdOrDriverId: string,
    period?: string,
    currentUser?: any
  ): Promise<DriverEarningsDashboardResponse | DriverEarningsSummary> {
    const driverId = this.driverUserIndex.get(userIdOrDriverId) || userIdOrDriverId;
    if (this.driverEarningsService) {
      return this.driverEarningsService.getDriverEarningsDashboard(driverId, { period }, currentUser);
    }
    return this.getDriverEarnings(userIdOrDriverId, period);
  }

  /**
   * Phase 7.3 Driver Earnings Multi-Period Summary Query
   */
  async getDriverEarningsSummary(
    userIdOrDriverId: string,
    currentUser?: any
  ): Promise<DriverEarningsMultiPeriodSummary | DriverEarningsSummary> {
    const driverId = this.driverUserIndex.get(userIdOrDriverId) || userIdOrDriverId;
    if (this.driverEarningsService) {
      return this.driverEarningsService.getDriverEarningsMultiPeriodSummary(driverId, currentUser);
    }
    return this.getDriverEarnings(userIdOrDriverId, 'all-time');
  }

  /**
   * Phase 7.2 Driver Rating Aggregation Update
   */
  updateDriverRatingAggregation(
    driverIdOrUserId: string,
    newScore: number
  ): { ratingAverage: number; ratingCount: number } {
    const driverId = this.driverUserIndex.get(driverIdOrUserId) || driverIdOrUserId;
    const driver = this.drivers.get(driverId);
    if (!driver) {
      return { ratingAverage: 5.0, ratingCount: 0 };
    }

    const oldCount = driver.ratingCount || 0;
    const oldAvg = driver.ratingAverage || 5.0;

    let newCount: number;
    let newAvg: number;

    if (oldCount === 0) {
      newCount = 1;
      newAvg = Math.round(newScore * 100) / 100;
    } else {
      newCount = oldCount + 1;
      // Formula pembobotan rata-rata inkremental
      newAvg = Math.round(((oldAvg * oldCount + newScore) / newCount) * 100) / 100;
    }

    driver.ratingCount = newCount;
    driver.ratingAverage = newAvg;
    driver.updatedAt = new Date().toISOString();

    return {
      ratingAverage: driver.ratingAverage,
      ratingCount: driver.ratingCount,
    };
  }

  /**
   * Cari profil driver berdasarkan driverId atau userId
   */
  getDriverById(driverIdOrUserId?: string): DriverEntity | undefined {
    if (!driverIdOrUserId) return undefined;
    const driverId = this.driverUserIndex.get(driverIdOrUserId) || driverIdOrUserId;
    return this.drivers.get(driverId);
  }

  private seedDefaultDriver() {
    const driverId = 'd0000000-0000-0000-0000-000000000001';
    const userId = 'c0000000-0000-0000-0000-000000000003'; // Ahmad Gazali

    const driver: DriverEntity = {
      id: driverId,
      userId,
      verificationStatus: 'APPROVED',
      operationalStatus: 'OFFLINE',
      displayName: 'Ahmad Gazali',
      address: 'Jl. Banua Anyar No. 45',
      city: 'Banjarmasin',
      province: 'Kalimantan Selatan',
      emergencyContactName: 'Siti Rahmah',
      emergencyContactPhone: '+6281299887766',
      ratingAverage: 4.9,
      ratingCount: 342,
      completedTripCount: 342,
      createdAt: '2026-01-03T10:00:00Z',
      updatedAt: '2026-01-03T10:00:00Z',
      approvedAt: '2026-01-03T11:00:00Z',
    };

    this.drivers.set(driverId, driver);
    this.driverUserIndex.set(userId, driverId);

    // Seed Vehicle
    const vehicleId = 'v0000000-0000-0000-0000-000000000001';
    this.vehicles.set(vehicleId, {
      id: vehicleId,
      driverId,
      vehicleType: 'MOTORCYCLE',
      brand: 'Honda',
      model: 'Vario 160',
      productionYear: 2023,
      color: 'Hitam Matte',
      licensePlate: 'DA 5110 KAW',
      registrationNumber: 'STNK-6371-2023-0511',
      isActive: true,
      verificationStatus: 'APPROVED',
      createdAt: '2026-01-03T10:00:00Z',
      updatedAt: '2026-01-03T10:00:00Z',
    });

    // Seed Documents (KTP, SIM_C, STNK, SKCK)
    const docs: { type: 'KTP' | 'SIM_C' | 'STNK' | 'SKCK'; num: string; name: string }[] = [
      { type: 'KTP', num: '6371012304900001', name: 'KTP Ahmad Gazali' },
      { type: 'SIM_C', num: '900412345678', name: 'SIM C Ahmad Gazali' },
      { type: 'STNK', num: 'STNK-6371-2023-0511', name: 'STNK DA 5110 KAW' },
      { type: 'SKCK', num: 'SKCK-POLRESTA-BJM-2026', name: 'SKCK Polresta Banjarmasin' },
    ];

    for (const d of docs) {
      const docId = `doc-${crypto.randomUUID().slice(0, 8)}`;
      this.documents.set(docId, {
        id: docId,
        driverId,
        documentType: d.type,
        documentNumber: d.num,
        documentName: d.name,
        fileUrl: `/storage/kyc/${d.type.toLowerCase()}-seed.jpg`,
        fileHash: 'hash_' + d.num,
        verificationStatus: 'APPROVED',
        createdAt: '2026-01-03T10:00:00Z',
        updatedAt: '2026-01-03T10:00:00Z',
      });
    }
  }

  // 1. GET OR CREATE DRIVER PROFILE
  async getOrCreateDriverProfile(userId: string, userRole: string, defaultName?: string): Promise<DriverEntity> {
    if (userRole !== 'DRIVER') {
      throw new ForbiddenException('Akses ditolak: Hanya pengguna dengan peran DRIVER yang dapat memiliki profil driver');
    }

    let driverId = this.driverUserIndex.get(userId);
    if (!driverId) {
      driverId = crypto.randomUUID();
      const newDriver: DriverEntity = {
        id: driverId,
        userId,
        verificationStatus: 'PENDING',
        operationalStatus: 'OFFLINE',
        displayName: defaultName || 'Mitra Driver Baru',
        ratingAverage: 5.0,
        ratingCount: 0,
        completedTripCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.drivers.set(driverId, newDriver);
      this.driverUserIndex.set(userId, driverId);
      return newDriver;
    }

    return this.drivers.get(driverId)!;
  }

  // Helper resolve driver by userId
  async getDriverByUserId(userId: string): Promise<DriverEntity> {
    const driverId = this.driverUserIndex.get(userId);
    if (!driverId) {
      throw new NotFoundException('Profil driver belum dibuat. Silakan inisialisasi terlebih dahulu.');
    }
    return this.drivers.get(driverId)!;
  }

  // 2. UPDATE DRIVER PROFILE
  async updateProfile(userId: string, dto: UpdateDriverProfileDto): Promise<DriverEntity> {
    const driver = await this.getDriverByUserId(userId);

    if (dto.displayName) driver.displayName = dto.displayName;
    if (dto.address) driver.address = dto.address;
    if (dto.city) driver.city = dto.city;
    if (dto.province) driver.province = dto.province;
    if (dto.emergencyContactName) driver.emergencyContactName = dto.emergencyContactName;
    if (dto.emergencyContactPhone) driver.emergencyContactPhone = dto.emergencyContactPhone;
    if (dto.gender) driver.gender = dto.gender;
    if (dto.dateOfBirth) driver.dateOfBirth = dto.dateOfBirth;

    driver.updatedAt = new Date().toISOString();
    return driver;
  }

  // 3. GET DRIVER DOCUMENTS
  async getDocuments(userId: string): Promise<any[]> {
    const driver = await this.getDriverByUserId(userId);
    const docs = Array.from(this.documents.values()).filter((d) => d.driverId === driver.id);

    // Mask sensitive document numbers for privacy
    return docs.map((d) => ({
      ...d,
      documentNumberMasked: this.maskDocNumber(d.documentNumber),
    }));
  }

  private maskDocNumber(num: string): string {
    if (!num || num.length < 5) return '****';
    return '*'.repeat(num.length - 4) + num.slice(-4);
  }

  // 4. UPLOAD DOCUMENT
  async uploadDocument(userId: string, dto: UploadDocumentDto): Promise<DriverDocumentEntity> {
    const driver = await this.getDriverByUserId(userId);

    if (!dto.documentNumber || !dto.documentType) {
      throw new BadRequestException('Jenis dokumen dan nomor dokumen wajib diisi');
    }

    const { fileUrl, fileHash } = await this.storageProvider.uploadFile(
      dto.file || 'dummy_file_buffer',
      `${dto.documentType}.jpg`,
      'image/jpeg'
    );

    // Existing check: replace or version
    const existing = Array.from(this.documents.values()).find(
      (d) => d.driverId === driver.id && d.documentType === dto.documentType
    );

    const docId = existing ? existing.id : crypto.randomUUID();
    const docRecord: DriverDocumentEntity = {
      id: docId,
      driverId: driver.id,
      documentType: dto.documentType,
      documentNumber: dto.documentNumber,
      documentName: dto.documentName || `Dokumen ${dto.documentType}`,
      fileUrl,
      fileHash,
      issuedAt: dto.issuedAt,
      expiresAt: dto.expiresAt,
      verificationStatus: 'PENDING',
      createdAt: existing ? existing.createdAt : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.documents.set(docId, docRecord);

    // Update driver state to UNDER_REVIEW
    if (driver.verificationStatus !== 'SUSPENDED') {
      driver.verificationStatus = 'UNDER_REVIEW';
      driver.updatedAt = new Date().toISOString();
    }

    return docRecord;
  }

  // 5. GET DRIVER VEHICLES
  async getVehicles(userId: string): Promise<VehicleEntity[]> {
    const driver = await this.getDriverByUserId(userId);
    return Array.from(this.vehicles.values()).filter((v) => v.driverId === driver.id);
  }

  // 6. CREATE VEHICLE
  async createVehicle(userId: string, dto: CreateVehicleDto): Promise<VehicleEntity> {
    const driver = await this.getDriverByUserId(userId);

    // Normalize license plate: DA 1234 XX format
    const normalizedPlate = dto.licensePlate.trim().toUpperCase().replace(/\s+/g, ' ');

    const vehicleId = crypto.randomUUID();
    const vehicle: VehicleEntity = {
      id: vehicleId,
      driverId: driver.id,
      vehicleType: dto.vehicleType || 'MOTORCYCLE',
      brand: dto.brand,
      model: dto.model,
      productionYear: dto.productionYear,
      color: dto.color,
      licensePlate: normalizedPlate,
      registrationNumber: dto.registrationNumber,
      isActive: true,
      verificationStatus: 'PENDING',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    this.vehicles.set(vehicleId, vehicle);

    // Update driver state to UNDER_REVIEW
    if (driver.verificationStatus !== 'SUSPENDED') {
      driver.verificationStatus = 'UNDER_REVIEW';
      driver.updatedAt = new Date().toISOString();
    }

    return vehicle;
  }

  // 7. GET ELIGIBILITY
  async getEligibility(userId: string): Promise<EligibilityResult> {
    const driver = await this.getDriverByUserId(userId);
    const docs = Array.from(this.documents.values()).filter((d) => d.driverId === driver.id);
    const vechs = Array.from(this.vehicles.values()).filter((v) => v.driverId === driver.id);

    return this.eligibilityService.checkEligibility(driver, docs, vechs);
  }

  // 8. GO ONLINE
  async goOnline(userId: string): Promise<{ success: boolean; operationalStatus: string }> {
    const driver = await this.getDriverByUserId(userId);
    const eligibility = await this.getEligibility(userId);

    if (!eligibility.eligible) {
      throw new ConflictException({
        statusCode: 409,
        error: 'DRIVER_NOT_ELIGIBLE',
        message: 'Driver belum memenuhi syarat verifikasi untuk online',
        details: eligibility,
      });
    }

    driver.operationalStatus = 'ONLINE';
    driver.updatedAt = new Date().toISOString();

    return { success: true, operationalStatus: 'ONLINE' };
  }

  // 9. GO OFFLINE
  async goOffline(userId: string): Promise<{ success: boolean; operationalStatus: string }> {
    const driver = await this.getDriverByUserId(userId);
    driver.operationalStatus = 'OFFLINE';
    driver.updatedAt = new Date().toISOString();

    return { success: true, operationalStatus: 'OFFLINE' };
  }

  // 10. GET STATUS
  async getDriverStatus(userId: string) {
    const driver = await this.getDriverByUserId(userId);
    const eligibility = await this.getEligibility(userId);

    return {
      verificationStatus: driver.verificationStatus,
      operationalStatus: driver.operationalStatus,
      eligible: eligibility.eligible,
      statusMessage: eligibility.message,
    };
  }

  // --- ADMIN ACTIONS ---

  async adminListDrivers(statusFilter?: string): Promise<DriverEntity[]> {
    const all = Array.from(this.drivers.values());
    if (!statusFilter) return all;
    return all.filter((d) => d.verificationStatus === statusFilter);
  }

  async adminGetDriverDetails(driverId: string) {
    const driver = this.drivers.get(driverId);
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    const docs = Array.from(this.documents.values()).filter((d) => d.driverId === driver.id);
    const vechs = Array.from(this.vehicles.values()).filter((v) => v.driverId === driver.id);
    const eligibility = this.eligibilityService.checkEligibility(driver, docs, vechs);

    return { driver, documents: docs, vehicles: vechs, eligibility };
  }

  async adminApproveDocument(adminUserId: string, driverId: string, documentId: string) {
    const doc = this.documents.get(documentId);
    if (!doc || doc.driverId !== driverId) {
      throw new NotFoundException('Dokumen tidak ditemukan untuk driver ini');
    }

    const oldValue = { ...doc };
    doc.verificationStatus = 'APPROVED';
    doc.verifiedAt = new Date().toISOString();
    doc.verifiedBy = adminUserId;
    doc.rejectionReason = undefined;
    doc.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'DOCUMENT_APPROVED', 'DOCUMENT', documentId, oldValue, doc);
    return { success: true, message: `Dokumen ${doc.documentType} disetujui`, document: doc };
  }

  async adminRejectDocument(adminUserId: string, driverId: string, documentId: string, reason: string) {
    if (!reason) throw new BadRequestException('Alasan penolakan dokumen wajib diisi');

    const doc = this.documents.get(documentId);
    if (!doc || doc.driverId !== driverId) {
      throw new NotFoundException('Dokumen tidak ditemukan untuk driver ini');
    }

    const oldValue = { ...doc };
    doc.verificationStatus = 'REJECTED';
    doc.rejectionReason = reason;
    doc.verifiedAt = new Date().toISOString();
    doc.verifiedBy = adminUserId;
    doc.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'DOCUMENT_REJECTED', 'DOCUMENT', documentId, oldValue, doc, reason);
    return { success: true, message: `Dokumen ${doc.documentType} ditolak`, document: doc };
  }

  async adminApproveVehicle(adminUserId: string, driverId: string, vehicleId: string) {
    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.driverId !== driverId) {
      throw new NotFoundException('Kendaraan tidak ditemukan');
    }

    const oldValue = { ...vehicle };
    vehicle.verificationStatus = 'APPROVED';
    vehicle.approvedAt = new Date().toISOString();
    vehicle.approvedBy = adminUserId;
    vehicle.rejectionReason = undefined;
    vehicle.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'VEHICLE_APPROVED', 'VEHICLE', vehicleId, oldValue, vehicle);
    return { success: true, message: 'Kendaraan disetujui', vehicle };
  }

  async adminRejectVehicle(adminUserId: string, driverId: string, vehicleId: string, reason: string) {
    if (!reason) throw new BadRequestException('Alasan penolakan kendaraan wajib diisi');

    const vehicle = this.vehicles.get(vehicleId);
    if (!vehicle || vehicle.driverId !== driverId) {
      throw new NotFoundException('Kendaraan tidak ditemukan');
    }

    const oldValue = { ...vehicle };
    vehicle.verificationStatus = 'REJECTED';
    vehicle.rejectionReason = reason;
    vehicle.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'VEHICLE_REJECTED', 'VEHICLE', vehicleId, oldValue, vehicle, reason);
    return { success: true, message: 'Kendaraan ditolak', vehicle };
  }

  async adminApproveDriver(adminUserId: string, driverId: string) {
    const driver = this.drivers.get(driverId);
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    // Strict Backend Re-verification: All 4 documents + Vehicle MUST be APPROVED!
    const docs = Array.from(this.documents.values()).filter((d) => d.driverId === driver.id);
    const vechs = Array.from(this.vehicles.values()).filter((v) => v.driverId === driver.id);

    const docTypes: ('KTP' | 'SIM_C' | 'STNK' | 'SKCK')[] = ['KTP', 'SIM_C', 'STNK', 'SKCK'];
    const missingOrUnapproved = docTypes.filter((dt) => {
      const doc = docs.find((d) => d.documentType === dt);
      return !doc || doc.verificationStatus !== 'APPROVED';
    });

    const activeVehicle = vechs.find((v) => v.isActive && v.verificationStatus === 'APPROVED');

    if (missingOrUnapproved.length > 0 || !activeVehicle) {
      throw new BadRequestException({
        error: 'DRIVER_INCOMPLETE',
        message: 'Driver belum dapat disetujui karena berkas atau kendaraan belum lengkap disetujui.',
        unapprovedDocs: missingOrUnapproved,
        hasApprovedVehicle: !!activeVehicle,
      });
    }

    const oldValue = { ...driver };
    driver.verificationStatus = 'APPROVED';
    driver.approvedAt = new Date().toISOString();
    driver.approvedBy = adminUserId;
    driver.rejectedAt = undefined;
    driver.rejectionReason = undefined;
    driver.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'DRIVER_APPROVED', 'DRIVER', driverId, oldValue, driver);
    return { success: true, message: `Driver ${driver.displayName} berhasil disetujui (APPROVED)`, driver };
  }

  async adminRejectDriver(adminUserId: string, driverId: string, reason: string) {
    if (!reason) throw new BadRequestException('Alasan penolakan driver wajib diisi');

    const driver = this.drivers.get(driverId);
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    const oldValue = { ...driver };
    driver.verificationStatus = 'REJECTED';
    driver.operationalStatus = 'OFFLINE';
    driver.rejectedAt = new Date().toISOString();
    driver.rejectionReason = reason;
    driver.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'DRIVER_REJECTED', 'DRIVER', driverId, oldValue, driver, reason);
    return { success: true, message: `Driver ${driver.displayName} ditolak`, driver };
  }

  async adminSuspendDriver(adminUserId: string, driverId: string, reason: string) {
    if (!reason) throw new BadRequestException('Alasan suspend driver wajib diisi');

    const driver = this.drivers.get(driverId);
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    const oldValue = { ...driver };
    // Immediately force offline and set suspended
    driver.verificationStatus = 'SUSPENDED';
    driver.operationalStatus = 'OFFLINE';
    driver.suspendedAt = new Date().toISOString();
    driver.suspensionReason = reason;
    driver.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'DRIVER_SUSPENDED', 'DRIVER', driverId, oldValue, driver, reason);
    return { success: true, message: `Driver ${driver.displayName} telah disuspend`, driver };
  }

  async adminUnsuspendDriver(adminUserId: string, driverId: string) {
    const driver = this.drivers.get(driverId);
    if (!driver) throw new NotFoundException('Driver tidak ditemukan');

    const oldValue = { ...driver };
    driver.verificationStatus = 'APPROVED';
    driver.suspendedAt = undefined;
    driver.suspensionReason = undefined;
    driver.updatedAt = new Date().toISOString();

    this.createAuditLog(adminUserId, 'DRIVER_UNSUSPENDED', 'DRIVER', driverId, oldValue, driver);
    return { success: true, message: `Suspensi driver ${driver.displayName} dicabut`, driver };
  }

  private createAuditLog(
    actorUserId: string,
    action: string,
    entityType: 'DRIVER' | 'DOCUMENT' | 'VEHICLE',
    entityId: string,
    oldValue?: any,
    newValue?: any,
    reason?: string
  ) {
    this.auditLogs.push({
      id: crypto.randomUUID(),
      actorUserId,
      action,
      entityType,
      entityId,
      oldValue,
      newValue,
      reason,
      createdAt: new Date().toISOString(),
    });
  }

  getAuditLogs(): AuditLogEntity[] {
    return this.auditLogs;
  }
}
