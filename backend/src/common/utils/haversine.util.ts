/**
 * KAWAI 0511 - Haversine Distance Formula Utility
 * Menghitung jarak lingkaran besar (great-circle distance) antara dua koordinat geografis dalam satuan meter.
 */
export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (
    lat1 < -90 || lat1 > 90 ||
    lat2 < -90 || lat2 > 90 ||
    lon1 < -180 || lon1 > 180 ||
    lon2 < -180 || lon2 > 180
  ) {
    throw new Error('Koordinat di luar batas valid bumi (-90 s/d 90, -180 s/d 180)');
  }

  const R = 6371000; // Radius rata-rata bumi dalam meter
  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return Math.round(distance);
}
