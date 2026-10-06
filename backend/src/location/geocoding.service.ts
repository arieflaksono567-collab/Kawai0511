import { Injectable } from '@nestjs/common';
import { calculateDistanceMeters } from '../common/utils/haversine.util';

export interface ReverseGeocodeResult {
  formattedAddress: string;
  street?: string;
  neighborhood?: string;
  district?: string;
  city: string;
  province: string;
  postalCode?: string;
  country: string;
  latitude: number;
  longitude: number;
}

export interface PlaceSearchResult {
  name: string;
  formattedAddress: string;
  category: string;
  latitude: number;
  longitude: number;
  distanceMeters?: number;
}

@Injectable()
export class GeocodingService {
  // Verified Landmarks in Banjarmasin Area (0511)
  private readonly landmarks = [
    {
      id: 'l-01',
      name: 'Duta Mall Banjarmasin',
      category: 'MALL',
      latitude: -3.319437,
      longitude: 114.590822,
      street: 'Jl. A. Yani Km 2',
      district: 'Banjarmasin Tengah',
      city: 'Kota Banjarmasin',
      province: 'Kalimantan Selatan',
      postalCode: '70233',
    },
    {
      id: 'l-02',
      name: 'Menara Pandang Siring Martapura',
      category: 'TOURIST',
      latitude: -3.322841,
      longitude: 114.59351,
      street: 'Jl. Piere Tendean',
      district: 'Banjarmasin Tengah',
      city: 'Kota Banjarmasin',
      province: 'Kalimantan Selatan',
      postalCode: '70122',
    },
    {
      id: 'l-03',
      name: 'RSUD Ulin Banjarmasin',
      category: 'HOSPITAL',
      latitude: -3.32651,
      longitude: 114.5962,
      street: 'Jl. Jen. A. Yani No.43',
      district: 'Banjarmasin Tengah',
      city: 'Kota Banjarmasin',
      province: 'Kalimantan Selatan',
      postalCode: '70233',
    },
    {
      id: 'l-04',
      name: 'Universitas Lambung Mangkurat (ULM)',
      category: 'CAMPUS',
      latitude: -3.29851,
      longitude: 114.58802,
      street: 'Jl. Brigjend H. Hasan Basry, Kayu Tangi',
      district: 'Banjarmasin Utara',
      city: 'Kota Banjarmasin',
      province: 'Kalimantan Selatan',
      postalCode: '70123',
    },
    {
      id: 'l-05',
      name: 'Pelabuhan Trisakti Banjarmasin',
      category: 'PORT',
      latitude: -3.33201,
      longitude: 114.56502,
      street: 'Jl. Barito Hilir',
      district: 'Banjarmasin Barat',
      city: 'Kota Banjarmasin',
      province: 'Kalimantan Selatan',
      postalCode: '70119',
    },
    {
      id: 'l-06',
      name: 'Masjid Raya Sabilal Muhtadin',
      category: 'RELIGIOUS',
      latitude: -3.3182,
      longitude: 114.5921,
      street: 'Jl. Jenderal Sudirman No.1',
      district: 'Banjarmasin Tengah',
      city: 'Kota Banjarmasin',
      province: 'Kalimantan Selatan',
      postalCode: '70114',
    },
  ];

  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult> {
    // Find closest landmark
    let closest = this.landmarks[0];
    let minDistance = Infinity;

    for (const lm of this.landmarks) {
      const dist = calculateDistanceMeters(latitude, longitude, lm.latitude, lm.longitude);
      if (dist < minDistance) {
        minDistance = dist;
        closest = lm;
      }
    }

    const formatted = minDistance < 100
      ? `${closest.name}, ${closest.street}, ${closest.district}, ${closest.city}`
      : `Sekitar ${closest.street}, ${closest.district}, ${closest.city}, ${closest.province}`;

    return {
      formattedAddress: formatted,
      street: closest.street,
      district: closest.district,
      city: closest.city,
      province: closest.province,
      postalCode: closest.postalCode,
      country: 'Indonesia',
      latitude,
      longitude,
    };
  }

  async searchPlaces(query: string): Promise<PlaceSearchResult[]> {
    if (!query || query.trim() === '') {
      return this.landmarks.map((l) => ({
        name: l.name,
        formattedAddress: `${l.street}, ${l.district}, ${l.city}`,
        category: l.category,
        latitude: l.latitude,
        longitude: l.longitude,
      }));
    }

    const qLower = query.toLowerCase().trim();
    const matched = this.landmarks.filter(
      (l) =>
        l.name.toLowerCase().includes(qLower) ||
        l.street.toLowerCase().includes(qLower) ||
        l.district.toLowerCase().includes(qLower) ||
        l.category.toLowerCase().includes(qLower)
    );

    return matched.map((l) => ({
      name: l.name,
      formattedAddress: `${l.street}, ${l.district}, ${l.city}`,
      category: l.category,
      latitude: l.latitude,
      longitude: l.longitude,
    }));
  }
}
