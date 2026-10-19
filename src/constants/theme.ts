/**
 * KAWAI 0511 - Centralized Color & Theme Design System
 * Berdasarkan Pedoman Gambar Referensi Resmi KAWAI 0511
 * 
 * Palet Warna Resmi:
 * 1. Merah KAWAI (Primary): #E1192E
 * 2. Biru Navy (Secondary / Mitra Accent): #0E45C9 / #0F172A
 * 3. Hijau (Online & Titip Belanja): #10B981
 * 4. Oranye (Delivery & Kirim Paket): #F59E0B
 * 5. Kuning/Amber (KawaiFood): #EAB308
 * 6. Abu/Slate: #64748B / #E2E8F0 / #F8FAFC
 * 7. Tipografi: Poppins
 */

export const KAWAI_COLORS = {
  // 1. Warna Utama Brand
  primary: '#E1192E',
  primaryHover: '#C81023',
  primaryDark: '#B91223',
  primaryLight: '#FEE2E2',

  // 2. Aksen Navy & Mitra
  navy: '#0E45C9',
  navyDark: '#0F172A',
  navyCard: '#0B192C',
  navyLight: '#EFF6FF',

  // 3. Layanan Kami (4 Menu Utama)
  serviceRide: '#E1192E',       // Merah KAWAI (Motor & Car)
  serviceDelivery: '#F59E0B',   // Oranye (Kirim Paket)
  serviceFood: '#EAB308',       // Kuning Emas (Pesan Makanan / KawaiFood)
  serviceMart: '#10B981',       // Hijau (Titip Belanja)

  // 4. Background & Surface
  background: '#F8FAFC',
  surface: '#FFFFFF',
  secondarySurface: '#F1F5F9',

  // 5. Typography Colors
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  // 6. Status Colors
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#E1192E',
  info: '#0E45C9',

  // 7. Borders & Dividers
  border: '#E2E8F0',
  borderSecondary: '#CBD5E1',

  // 8. Map Styling
  map: {
    ground: '#F8FAFC',
    water: '#C5E6F7',
    waterDeep: '#98D1F2',
    streetArtery: '#FFFFFF',
    streetArteryBorder: '#E2E8F0',
    streetLocal: '#F1F5F9',
    bridge: '#94A3B8',
    routePath: '#0E45C9',
    routePathAlt: '#E1192E',
    pickupMarker: '#10B981',
    destMarker: '#E1192E',
    driverMarker: '#E1192E',
    grid: '#E2E8F0',
  },
} as const;

export type KawaiColorKey = keyof typeof KAWAI_COLORS;
