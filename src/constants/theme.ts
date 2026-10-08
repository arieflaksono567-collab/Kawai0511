/**
 * KAWAI 0511 - Centralized Color & Theme Design System
 * Bright Clean Mobility UI
 * 
 * Rules:
 * 1. Primary: KAWAI Green (#18B86A), Primary Dark (#0E8F52), Primary Light (#DDF8EA)
 * 2. Background: Main (#F7FAF8), Surface (#FFFFFF), Secondary Surface (#F0F5F2)
 * 3. Text: Primary (#17211B), Secondary (#66736B), Disabled (#A8B2AC)
 * 4. Status: Success (#18B86A), Warning (#F5A623), Danger/SOS (#E5484D), Info (#2F80ED)
 * 5. Borders: Card Border (#E4ECE7), Secondary Border (#D7E2DB)
 */

export const KAWAI_COLORS = {
  // 1. Warna Utama Brand
  primary: '#18B86A',
  primaryDark: '#0E8F52',
  primaryLight: '#DDF8EA',

  // 2. Background
  background: '#F7FAF8',
  surface: '#FFFFFF',
  secondarySurface: '#F0F5F2',

  // 3. Text
  textPrimary: '#17211B',
  textSecondary: '#66736B',
  textDisabled: '#A8B2AC',

  // 4. Status Colors
  success: '#18B86A',
  warning: '#F5A623',
  danger: '#E5484D',
  info: '#2F80ED',

  // 5. Borders & Dividers
  border: '#E4ECE7',
  borderSecondary: '#D7E2DB',

  // 6. Map Specific Colors (Light & Clean Cartography)
  map: {
    ground: '#F0F5F2',
    water: '#C5E6F7',
    waterDeep: '#98D1F2',
    streetArtery: '#FFFFFF',
    streetArteryBorder: '#D7E2DB',
    streetLocal: '#EBF1ED',
    bridge: '#94A3B8',
    routePath: '#18B86A',
    pickupMarker: '#18B86A',
    destMarker: '#E5484D',
    driverMarker: '#18B86A',
    grid: '#E2EBE5',
  },
} as const;

export type KawaiColorKey = keyof typeof KAWAI_COLORS;
