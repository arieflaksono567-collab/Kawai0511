import { Injectable, BadRequestException } from '@nestjs/common';
import { calculateDistanceMeters } from '../common/utils/haversine.util';

export interface RouteResult {
  distanceMeters: number;
  durationSeconds: number;
  geometry: string; // encoded polyline representation
  origin: { latitude: number; longitude: number };
  destination: { latitude: number; longitude: number };
}

@Injectable()
export class RoutingService {
  async getRoute(
    originLat: number,
    originLng: number,
    destLat: number,
    destLng: number
  ): Promise<RouteResult> {
    if (
      isNaN(originLat) || isNaN(originLng) ||
      isNaN(destLat) || isNaN(destLng)
    ) {
      throw new BadRequestException('Koordinat asal dan tujuan harus berupa angka yang valid');
    }

    // Hitung jarak garis lurus (haversine) dan kalikan dengan koefisien jalan perkotaan (~1.25)
    const straightDistance = calculateDistanceMeters(originLat, originLng, destLat, destLng);
    const roadDistanceMeters = Math.round(straightDistance * 1.25);

    // Kecepatan rata-rata motor di Banjarmasin: ~25 km/jam (~6.94 m/detik)
    const averageSpeedMps = 6.94;
    const durationSeconds = Math.max(60, Math.round(roadDistanceMeters / averageSpeedMps));

    // Sample polyline encoding representation
    const geometry = `_p~iF~ps|U_ulLnnqC_g~NpjvC`;

    return {
      distanceMeters: roadDistanceMeters,
      durationSeconds,
      geometry,
      origin: { latitude: originLat, longitude: originLng },
      destination: { latitude: destLat, longitude: destLng },
    };
  }
}
