import { Injectable } from '@nestjs/common';
import { UpdateTariffDto } from './dto/update-tariff.dto';

export interface PendingDriver {
  id: string;
  name: string;
  phone: string;
  email: string;
  vehiclePlate: string;
  vehicleModel: string;
  registeredAt: string;
  ktpVerified: boolean;
  simVerified: boolean;
  skckVerified: boolean;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface LiveOrder {
  id: string;
  type: 'RIDE' | 'FOOD' | 'DELIVERY';
  customerName: string;
  driverName?: string;
  fromAddress: string;
  toAddress: string;
  fare: number;
  status: string;
  createdAt: string;
}

export interface SosIncident {
  id: string;
  userName: string;
  userPhone: string;
  role: 'PASSENGER' | 'DRIVER';
  location: string;
  lat: number;
  lng: number;
  status: 'TRIGGERED' | 'DISPATCHED' | 'RESOLVED';
  time: string;
  notes: string;
}

@Injectable()
export class AdminService {
  private pendingDrivers: PendingDriver[] = [
    {
      id: 'drv-pen-001',
      name: 'Rahmat Hidayatullah',
      phone: '081255443322',
      email: 'rahmat.hidayat@gmail.com',
      vehiclePlate: 'DA 5110 KAW',
      vehicleModel: 'Yamaha NMAX 155',
      registeredAt: 'Hari ini, 08:15 WITA',
      ktpVerified: true,
      simVerified: true,
      skckVerified: true,
      status: 'PENDING',
    },
    {
      id: 'drv-pen-002',
      name: 'Dedy Kurniawan',
      phone: '081399778855',
      email: 'dedy.kurnia@gmail.com',
      vehiclePlate: 'DA 4820 BJM',
      vehicleModel: 'Honda Beat Street',
      registeredAt: 'Kemarin, 19:40 WITA',
      ktpVerified: true,
      simVerified: true,
      skckVerified: false,
      status: 'PENDING',
    },
  ];

  private liveOrders: LiveOrder[] = [
    {
      id: 'RIDE-0511-ACTIVE',
      type: 'RIDE',
      customerName: 'Arief Laksono',
      driverName: 'Ahmad Gazali',
      fromAddress: 'Duta Mall Banjarmasin',
      toAddress: 'Kampus ULM Banjarmasin',
      fare: 18600,
      status: 'IN_TRIP',
      createdAt: '11:40 WITA',
    },
    {
      id: 'KFD-0511-01',
      type: 'FOOD',
      customerName: 'Siti Rahmah',
      driverName: 'Muhammad Rizky',
      fromAddress: 'Soto Banjar Bang Amat',
      toAddress: 'Komplek Bumi Indah Km 5',
      fare: 70000,
      status: 'COOKING',
      createdAt: '11:42 WITA',
    },
    {
      id: 'KSND-0511-99',
      type: 'DELIVERY',
      customerName: 'Fahmi Reza',
      driverName: 'Budi Santoso',
      fromAddress: 'Jl. Banua Anyar No. 24',
      toAddress: 'Gedung Rektorat ULM',
      fare: 17750,
      status: 'SEARCHING',
      createdAt: '11:44 WITA',
    },
  ];

  private tariffs = {
    RIDE: {
      serviceType: 'RIDE',
      baseFare: 7000,
      perKmRate: 2200,
      perMinuteRate: 200,
      minimumFare: 10000,
      platformCommissionPercent: 15,
      surgeMultiplier: 1.0,
    },
    FOOD: {
      serviceType: 'FOOD',
      baseFare: 8000,
      perKmRate: 2000,
      perMinuteRate: 0,
      minimumFare: 10000,
      platformCommissionPercent: 15,
      surgeMultiplier: 1.0,
    },
    DELIVERY: {
      serviceType: 'DELIVERY',
      baseFare: 9000,
      perKmRate: 2500,
      perMinuteRate: 0,
      minimumFare: 12000,
      platformCommissionPercent: 15,
      surgeMultiplier: 1.0,
    },
  };

  private sosIncidents: SosIncident[] = [
    {
      id: 'SOS-0511-01',
      userName: 'Arief Laksono',
      userPhone: '081255110987',
      role: 'PASSENGER',
      location: 'Dekat Menara Pandang Siring, Jl. Piere Tendean',
      lat: -3.3228,
      lng: 114.5935,
      status: 'TRIGGERED',
      time: '11:45 WITA',
      notes: 'Tombol SOS ditekan penumpang selama perjalanan aktif',
    },
  ];

  async getOverview() {
    return {
      totalTrips: 1482,
      activeDrivers: 48,
      todayRevenue: 28450000,
      platformCommission: 4267500, // 15% dari total
      pendingVerificationCount: this.pendingDrivers.filter((d) => d.status === 'PENDING').length,
      activeSosCount: this.sosIncidents.filter((s) => s.status !== 'RESOLVED').length,
    };
  }

  async getPendingDrivers() {
    return this.pendingDrivers;
  }

  async approveDriver(id: string) {
    const driver = this.pendingDrivers.find((d) => d.id === id);
    if (driver) {
      driver.status = 'APPROVED';
    }
    return { success: true, message: `Mitra driver ${driver?.name || id} berhasil disetujui` };
  }

  async getLiveOrders() {
    return this.liveOrders;
  }

  async getTariffs() {
    return this.tariffs;
  }

  async updateTariff(dto: UpdateTariffDto) {
    this.tariffs[dto.serviceType] = {
      ...this.tariffs[dto.serviceType],
      ...dto,
    };
    return { success: true, message: `Tarif layanan ${dto.serviceType} berhasil diperbarui`, tariff: this.tariffs[dto.serviceType] };
  }

  async getSosIncidents() {
    return this.sosIncidents;
  }

  async resolveSos(id: string, notes?: string) {
    const sos = this.sosIncidents.find((s) => s.id === id);
    if (sos) {
      sos.status = 'RESOLVED';
      if (notes) sos.notes = notes;
    }
    return { success: true, message: `Insiden darurat ${id} telah ditangani dan diselesaikan` };
  }
}
