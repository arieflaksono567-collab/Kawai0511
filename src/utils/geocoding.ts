/**
 * Fungsi utilitas untuk Geolocation API dan Reverse Geocoding:
 * - Mendeteksi GPS pengguna via HTML5 Geolocation API (navigator.geolocation.getCurrentPosition)
 *   dengan penanganan izin (PERMISSION_DENIED) dan fallback otomatis ke pusat kota Banjarmasin.
 * - Mengubah koordinat (Latitude & Longitude) menjadi nama jalan / alamat asli di Indonesia via Nominatim OpenStreetMap.
 */

export interface GeocodedAddressResult {
  title: string;
  fullAddress: string;
  road: string;
  suburb: string;
  city: string;
  lat: number;
  lng: number;
}

export interface GpsLocationResult {
  lat: number;
  lng: number;
  isFallback: boolean;
  message?: string;
}

/**
 * Mengubah koordinat Latitude & Longitude menjadi nama jalan & alamat asli di Indonesia
 * menggunakan OpenStreetMap Nominatim Reverse Geocoding API secara gratis.
 */
export async function ubahKoordinatKeAlamat(lat: number, lng: number): Promise<string> {
  const result = await detailKoordinatKeAlamat(lat, lng);
  return result.fullAddress;
}

export async function detailKoordinatKeAlamat(lat: number, lng: number): Promise<GeocodedAddressResult> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&accept-language=id`;
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data && data.address) {
      const road =
        data.address.road ||
        data.address.pedestrian ||
        data.address.path ||
        data.address.neighbourhood ||
        data.address.suburb ||
        '';
      const suburb =
        data.address.suburb ||
        data.address.village ||
        data.address.residential ||
        data.address.hamlet ||
        '';
      const city =
        data.address.city ||
        data.address.town ||
        data.address.municipality ||
        data.address.county ||
        'Banjarmasin';
      const state = data.address.state || 'Kalimantan Selatan';

      let title = road || suburb || 'Titik Lokasi Terpilih';
      let parts = [];
      if (road) parts.push(road);
      if (suburb && suburb !== road) parts.push(suburb);
      if (city) parts.push(city);
      if (state && !city.includes(state)) parts.push(state);

      const fullAddress = parts.length > 0 ? parts.join(', ') : (data.display_name || `Area (${lat.toFixed(5)}, ${lng.toFixed(5)})`);

      return {
        title,
        fullAddress,
        road,
        suburb,
        city,
        lat,
        lng,
      };
    }

    const fallbackName = `Titik Koordinat: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return {
      title: fallbackName,
      fullAddress: fallbackName,
      road: '',
      suburb: '',
      city: 'Banjarmasin',
      lat,
      lng,
    };
  } catch (error) {
    console.warn('Gagal memanggil Nominatim OpenStreetMap, menggunakan fallback jalan lokal:', error);
    const jalanLokal = dapatkanNamaJalanBanjarmasin(lat, lng);
    return {
      title: jalanLokal.split(',')[0],
      fullAddress: jalanLokal,
      road: jalanLokal.split(',')[0],
      suburb: 'Banjarmasin Tengah',
      city: 'Kota Banjarmasin',
      lat,
      lng,
    };
  }
}

/**
 * Mendapatkan posisi GPS pengguna menggunakan HTML5 Geolocation API.
 * Jika izin ditolak (PERMISSION_DENIED) atau perangkat tidak mendukung GPS,
 * fungsi ini memberikan fallback cerdas ke pusat kota Banjarmasin tanpa memicu error fatal.
 */
export function dapatkanLokasiGpsSaatIni(): Promise<GpsLocationResult> {
  return new Promise((resolve) => {
    // Titik pusat acuan default: Jl. A. Yani Km 2 / Duta Mall Banjarmasin
    const defaultCenter: GpsLocationResult = {
      lat: -3.3194,
      lng: 114.5908,
      isFallback: true,
      message: 'Izin GPS tidak diberikan. Menggunakan titik pusat Banjarmasin (Jl. A. Yani).',
    };

    if (typeof window === 'undefined' || !navigator || !navigator.geolocation) {
      resolve({
        ...defaultCenter,
        message: 'Browser tidak mendukung Geolocation API. Menggunakan titik pusat Banjarmasin.',
      });
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          isFallback: false,
        });
      },
      (error) => {
        let pesanFallback = 'Lokasi GPS dialihkan ke titik pusat Banjarmasin (Jl. A. Yani).';
        if (error.code === error.PERMISSION_DENIED) {
          pesanFallback = 'Izin akses GPS belum diaktifkan. Dialihkan ke titik pusat Banjarmasin (Jl. A. Yani).';
        } else if (error.code === error.TIMEOUT) {
          pesanFallback = 'Waktu deteksi GPS habis. Dialihkan ke titik pusat Banjarmasin.';
        }
        console.warn('Geolocation notice:', pesanFallback);
        resolve({
          ...defaultCenter,
          message: pesanFallback,
        });
      },
      {
        enableHighAccuracy: true,
        timeout: 6000,
        maximumAge: 60000,
      }
    );
  });
}

/**
 * Konversi koordinat Latitude & Longitude ke persentase kanvas peta (0-100)
 */
export function koordinatKePersenPeta(lat: number, lng: number): { x: number; y: number } {
  // Bounding box area Banjarmasin
  const minLat = -3.3650;
  const maxLat = -3.2850;
  const minLng = 114.5450;
  const maxLng = 114.6450;

  // Jika di luar Banjarmasin (misal pengguna berada di kota lain), proyeksikan ke pusat area
  const clampedLat = Math.max(minLat, Math.min(maxLat, lat));
  const clampedLng = Math.max(minLng, Math.min(maxLng, lng));

  const x = ((clampedLng - minLng) / (maxLng - minLng)) * 100;
  const y = ((maxLat - clampedLat) / (maxLat - minLat)) * 100;

  return {
    x: Math.round(Math.max(6, Math.min(94, x))),
    y: Math.round(Math.max(6, Math.min(94, y))),
  };
}

/**
 * Konversi persentase klik kanvas peta (0-100) ke koordinat Latitude & Longitude Banjarmasin
 */
export function persenPetaKeKoordinat(x: number, y: number): { lat: number; lng: number } {
  const minLat = -3.3650;
  const maxLat = -3.2850;
  const minLng = 114.5450;
  const maxLng = 114.6450;

  const lng = minLng + (x / 100) * (maxLng - minLng);
  const lat = maxLat - (y / 100) * (maxLat - minLat);

  return {
    lat: parseFloat(lat.toFixed(6)),
    lng: parseFloat(lng.toFixed(6)),
  };
}

/**
 * Fallback lokal untuk mengenali nama jalan di Banjarmasin
 */
export function dapatkanNamaJalanBanjarmasin(lat: number, lng: number): string {
  if (lat > -3.31) {
    return 'Jl. Brigjend H. Hasan Basry (Kayutangi), Banjarmasin Utara, Kota Banjarmasin';
  } else if (lat < -3.33) {
    return 'Jl. Pangeran Antasari / Kelayan, Banjarmasin Selatan, Kota Banjarmasin';
  } else if (lng > 114.61) {
    return 'Jl. Pramuka / Veteran Km 6, Banjarmasin Timur, Kota Banjarmasin';
  } else if (lng < 114.58) {
    return 'Jl. Kuin Selatan / Belitung, Banjarmasin Barat, Kota Banjarmasin';
  }
  return 'Jl. Jenderal Ahmad Yani Km 1-2, Banjarmasin Tengah, Kota Banjarmasin';
}
