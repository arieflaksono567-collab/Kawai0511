/**
 * KAWAI 0511 - Centralized Color & Theme Design System (BRAND RED UPDATE)
 * Updated to use primary KAWAI red palette per design brief (Oct 2026)
 */

export const KAWAI_COLORS = {
  // Brand Reds (Primary identity)
  primary: '#E50914',      // Primary Red (KAWAI)
  primaryDark: '#C9151E',  // Deeper red for active / hover
  primaryLight: '#FFF0F0', // Light red surface accents

  // Neutral / Surfaces
  white: '#FFFFFF',
  background: '#FFFFFF',
  surface: '#FFFFFF',
  secondarySurface: '#F7FAF8',

  // Text
  textPrimary: '#202124', // darker text for accessibility
  textSecondary: '#6B7280',
  textDisabled: '#A8B2AC',

  // Borders
  border: '#E5E7EB',
  borderSecondary: '#EDEFF0',

  // Semantic
  success: '#15803D',
  warning: '#D97706',
  danger: '#B91C1C',
  info: '#2F80ED',

  // Interaction states (derived suggestions)
  action: {
    hover: '#C9151E',
    active: '#A30F15',
    disabled: '#F3B8B8',
    focusRing: 'rgba(229,9,20,0.16)',
  },

  // Map-specific colors (keep previous tokens but adjust route/pickup markers)
  map: {
    ground: '#F0F5F2',
    water: '#C5E6F7',
    waterDeep: '#98D1F2',
    streetArtery: '#FFFFFF',
    streetArteryBorder: '#D7E2DB',
    streetLocal: '#EBF1ED',
    bridge: '#94A3B8',
    routePath: '#E50914', // use brand red for route highlight
    pickupMarker: '#E50914',
    destMarker: '#B91C1C',
    driverMarker: '#15803D',
    grid: '#E2EBE5',
  },
} as const;

export type KawaiColorKey = keyof typeof KAWAI_COLORS;
