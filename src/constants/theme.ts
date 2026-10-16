export const KAWAI_COLORS = {
  primary: '#E31E24',
  primaryDark: '#B0101A',
  primaryLight: '#FEE5E6',

  navy: '#11274A',
  navyDark: '#0C1D36',
  navySoft: '#EAF1FF',

  background: '#F7F7F8',
  surface: '#FFFFFF',
  secondarySurface: '#F3F5F9',

  textPrimary: '#111827',
  textSecondary: '#5B6475',
  textDisabled: '#A3ABBA',

  success: '#1FAE6C',
  warning: '#F5A623',
  danger: '#E31E24',
  info: '#2F80ED',

  border: '#E8ECF3',
  borderSecondary: '#D9DEE9',

  map: {
    ground: '#F3F5F9',
    water: '#DDEBFF',
    waterDeep: '#AFCBFF',
    streetArtery: '#FFFFFF',
    streetArteryBorder: '#D9DEE9',
    streetLocal: '#F7F9FC',
    bridge: '#9AAAC2',
    routePath: '#E31E24',
    pickupMarker: '#E31E24',
    destMarker: '#11274A',
    driverMarker: '#E31E24',
    grid: '#EEF2F7',
  },
} as const;

export type KawaiColorKey = keyof typeof KAWAI_COLORS;
