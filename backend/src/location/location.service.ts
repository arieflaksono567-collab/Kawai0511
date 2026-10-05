import { Injectable } from '@nestjs/common';
import { DriverLocationUpdateDto } from './dto/location-update.dto';
import { RouteCalcDto } from './dto/route-calc.dto';

export interface NearbyDriverResult {
  driverId: string;
  name: string;
  latitude: number;
  longitude: number;
  distanceKm: number;
  estimatedEtaMinutes: number;
  heading: number;
  rating: number;
  vehiclePlate: string;
}

export interface RouteResult {
  distanceKm: number;
  durationMinutes: number;
  pickupAddress: string;
  destinationAddress: string;
  summary: string;
}

@Injectable()
export class LocationService {
  // Simulasi Redis in-memory store untuk driver live locations
  private driverLocations = new Map<string, DriverLocationUpdateDto>([
    [
      'drv-001',
      {
        driverId: 'drv-001',
        latitude: -3.3185,
        longitude: 114.592,
        speed: 24,
        heading: 180,
        accuracy: 6,
        battery: 85,
        ping: 38,
        timestamp: new Date().toISOString(),
      },
    ],
    [
      'drv-002',
      {
        driverId: 'drv-002',
        latitude: -3.324,
        longitude: 114.595,
        speed: 15,
        heading: 90,
        accuracy: 8,
        battery: 74,
        ping: 45,
        timestamp: new Date().toISOString(),
      },
    ],
    [
      'drv-003',
      {
        driverId: 'drv-003',
        latitude: -3.312,
        longitude: 114.588,
        speed: 30,
        heading: 45,
        accuracy: 5,
        battery: 91,
        ping: 40,
        timestamp: new Date().toISOString(),
      },
    ],
  ]);

  async updateDriverLocation(dto: DriverLocationUpdateDto) {
    this.driverLocations.set(dto.driverId, {
      ...dto,
      timestamp: new Date().toISOString(),
    });
    return {
      success: true,
      message: 'Lokasi dan telemetry GPS berhasil dicatat di Redis cache',
      storedAt: new Date().toISOString(),
    };
  }

  async findNearbyDrivers(lat: number, lng: number, radiusKm: number = 3.0): Promise<NearbyDriverResult[]> {
    const results: NearbyDriverResult[] = [];

    for (const [id, loc] of this.driverLocations.entries()) {
      const distance = this.calculateDistance(lat, lng, loc.latitude, loc.longitude);
      if (distance <= radiusKm) {
        const speed = loc.speed > 10 ? loc.speed : 25; // Asumsi kecepatan rata-rata ojek
        const etaMinutes = Math.max(1, Math.round((distance / speed) * 60));

        results.push({
          driverId: id,
          name: id === 'drv-001' ? 'Ahmad Gazali' : id === 'drv-002' ? 'Muhammad Rizky' : 'Budi Santoso',
          latitude: loc.latitude,
          longitude: loc.longitude,
          distanceKm: parseFloat(distance.toFixed(2)),
          estimatedEtaMinutes: etaMinutes,
          heading: loc.heading,
          rating: 4.9,
          vehiclePlate: id === 'drv-001' ? 'DA 4511 KW' : 'DA 5110 AB',
        });
      }
    }

    return results.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  async calculateRoute(dto: RouteCalcDto): Promise<RouteResult> {
    const rawDist = this.calculateDistance(dto.pickupLat, dto.pickupLng, dto.destinationLat, dto.destinationLng);
    // Tambah faktor jalan (road network factor ~ 1.25x dari garis lurus)
    const distanceKm = parseFloat(Math.max(0.8, rawDist * 1.25).toFixed(1));
    const durationMinutes = Math.max(3, Math.round(distanceKm * 2.8)); // Rata-rata 2.8 menit per km di Banjarmasin

    return {
      distanceKm,
      durationMinutes,
      pickupAddress: 'Titik Jemput Terpilih (Banjarmasin)',
      destinationAddress: 'Titik Tujuan Terpilih (Banjarmasin)',
      summary: `Rute optimal via jalan utama kota, jarak ${distanceKm} km (~${durationMinutes} menit).`,
    };
  }

  // Haversine formula (Perhitungan jarak dua koordinat bola bumi)
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius bumi dalam km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }
}
