import {
  Injectable,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  DriverEarningsLedgerRecord,
  CreateDriverEarningsInput,
  DriverEarningsQueryFilter,
} from './driver-earnings-ledger.types';

@Injectable()
export class DriverEarningsLedgerRepository {
  // Primary Store (UUID -> DriverEarningsLedgerRecord)
  private records = new Map<string, DriverEarningsLedgerRecord>();

  // Unique Constraint Index (driverId:rideId -> recordId)
  private uniqueDriverRideIndex = new Map<string, string>();

  // Secondary Query Indexes
  private recordsByDriver = new Map<string, Set<string>>(); // driverId -> Set<recordId>
  private recordsByRide = new Map<string, string>(); // rideId -> recordId

  /**
   * Insert driver earnings ledger record with strict integrity validation
   */
  async recordEarnings(input: CreateDriverEarningsInput): Promise<DriverEarningsLedgerRecord> {
    // 1. Validasi nilai moneter (harus bilangan bulat/desimal presisi, non-negatif)
    if (
      typeof input.grossAmount !== 'number' ||
      typeof input.platformFee !== 'number' ||
      typeof input.netAmount !== 'number'
    ) {
      throw new BadRequestException('Nilai moneter perolehan pendapatan wajib berupa angka');
    }

    const gross = Math.round(input.grossAmount);
    const fee = Math.round(input.platformFee);
    const net = Math.round(input.netAmount);
    const tip = input.tipAmount !== undefined ? Math.round(input.tipAmount) : 0;

    if (gross < 0 || fee < 0 || net < 0 || tip < 0) {
      throw new BadRequestException('Nilai moneter tidak boleh bernilai negatif');
    }

    // 2. Integritas Matematika Finansial: net + fee === gross
    if (net + fee !== gross) {
      throw new BadRequestException(
        `Ketidaksesuaian pembagian komisi: Net (${net}) + Fee (${fee}) !== Gross (${gross})`
      );
    }

    // 3. Unique Constraint: Cegah pencatatan pendapatan duplikat untuk 1 driver dan 1 ride
    const uniqueKey = `${input.driverId}:${input.rideId}`;
    if (this.uniqueDriverRideIndex.has(uniqueKey)) {
      throw new ConflictException(
        `Pendapatan driver ${input.driverId} untuk perjalanan ${input.rideId} sudah pernah dicatat di buku besar`
      );
    }

    const now = new Date();
    const nowIso = input.createdAt || now.toISOString();
    const periodDate = input.periodDate || nowIso.slice(0, 10);
    const id = crypto.randomUUID();

    const record: DriverEarningsLedgerRecord = {
      id,
      driverId: input.driverId,
      rideId: input.rideId,
      paymentId: input.paymentId,
      grossAmount: gross,
      platformFee: fee,
      netAmount: net,
      tipAmount: tip,
      currency: 'IDR',
      status: input.status || 'SETTLED',
      ledgerTransactionId: input.ledgerTransactionId,
      periodDate,
      createdAt: nowIso,
      settledAt: input.settledAt || (input.status === 'SETTLED' ? nowIso : undefined),
      updatedAt: nowIso,
    };

    // Commit ke Store
    this.records.set(id, record);
    this.uniqueDriverRideIndex.set(uniqueKey, id);

    // Update Indexes
    this.addToDriverIndex(record.driverId, id);
    this.recordsByRide.set(record.rideId, id);

    return record;
  }

  /**
   * Find by ID with authorization scoping
   */
  async findById(
    id: string,
    currentUser?: { id: string; role: string; driverId?: string }
  ): Promise<DriverEarningsLedgerRecord | null> {
    const record = this.records.get(id) || null;
    if (!record) return null;

    if (currentUser) {
      this.enforceDriverAuthorization(record.driverId, currentUser);
    }

    return record;
  }

  /**
   * Find by Ride ID
   */
  async findByRideId(rideId: string): Promise<DriverEarningsLedgerRecord | null> {
    const id = this.recordsByRide.get(rideId);
    if (!id) return null;
    return this.records.get(id) || null;
  }

  /**
   * Query driver earnings with period filtering & authorization
   */
  async queryDriverEarnings(
    filter: DriverEarningsQueryFilter,
    currentUser?: { id: string; role: string; driverId?: string }
  ): Promise<{
    items: DriverEarningsLedgerRecord[];
    totalGross: number;
    totalPlatformFee: number;
    totalNet: number;
    totalTips: number;
    count: number;
  }> {
    if (currentUser) {
      this.enforceDriverAuthorization(filter.driverId, currentUser);
    }

    const ids = this.recordsByDriver.get(filter.driverId);
    if (!ids) {
      return {
        items: [],
        totalGross: 0,
        totalPlatformFee: 0,
        totalNet: 0,
        totalTips: 0,
        count: 0,
      };
    }

    let records = Array.from(ids)
      .map((id) => this.records.get(id)!)
      .filter(Boolean);

    // Filter by status
    if (filter.status) {
      records = records.filter((r) => r.status === filter.status);
    }

    // Filter by period (mendukung 'today'/'hari ini', 'week'/'minggu ini', 'month'/'bulan ini')
    const now = new Date();
    const normalizedPeriod = filter.period ? filter.period.toLowerCase().trim() : undefined;
    const getRecordDate = (r: DriverEarningsLedgerRecord) => r.periodDate || r.createdAt.slice(0, 10);

    if (normalizedPeriod === 'today' || normalizedPeriod === 'hari ini') {
      const todayStr = now.toISOString().slice(0, 10);
      records = records.filter((r) => getRecordDate(r) === todayStr);
    } else if (normalizedPeriod === 'week' || normalizedPeriod === 'minggu ini') {
      const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      records = records.filter((r) => new Date(getRecordDate(r)) >= oneWeekAgo);
    } else if (normalizedPeriod === 'month' || normalizedPeriod === 'bulan ini') {
      const monthPrefix = now.toISOString().slice(0, 7);
      records = records.filter((r) => getRecordDate(r).startsWith(monthPrefix));
    }

    // Sort descending by creation time
    records.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Agregasi Finansial
    const totalGross = records.reduce((sum, r) => sum + r.grossAmount, 0);
    const totalPlatformFee = records.reduce((sum, r) => sum + r.platformFee, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netAmount, 0);
    const totalTips = records.reduce((sum, r) => sum + r.tipAmount, 0);

    // Pagination
    const offset = filter.offset || 0;
    const limit = filter.limit !== undefined ? filter.limit : records.length;
    const pagedItems = records.slice(offset, offset + limit);

    return {
      items: pagedItems,
      totalGross,
      totalPlatformFee,
      totalNet,
      totalTips,
      count: records.length,
    };
  }

  /**
   * Count total earnings records
   */
  count(): number {
    return this.records.size;
  }

  /**
   * Reset store (for testing isolation)
   */
  clear() {
    this.records.clear();
    this.uniqueDriverRideIndex.clear();
    this.recordsByDriver.clear();
    this.recordsByRide.clear();
  }

  // Private helpers
  private addToDriverIndex(driverId: string, recordId: string) {
    let set = this.recordsByDriver.get(driverId);
    if (!set) {
      set = new Set<string>();
      this.recordsByDriver.set(driverId, set);
    }
    set.add(recordId);
  }

  private enforceDriverAuthorization(
    targetDriverId: string,
    user: { id: string; role: string; driverId?: string }
  ) {
    if (user.role === 'ADMIN') return;

    const isAuthorized =
      user.role === 'DRIVER' &&
      (user.driverId === targetDriverId || user.id === targetDriverId);

    if (!isAuthorized) {
      throw new ForbiddenException(
        'Akses ditolak: Anda tidak memiliki akses untuk melihat catatan pendapatan pengemudi ini'
      );
    }
  }
}
