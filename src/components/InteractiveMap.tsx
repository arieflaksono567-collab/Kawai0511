import React, { useState, useEffect } from 'react';
import { LocationPoint, Driver } from '../types';
import {
  MapPin,
  Navigation,
  Compass,
  Layers,
  ShieldCheck,
  Loader2,
  Crosshair,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import {
  detailKoordinatKeAlamat,
  dapatkanLokasiGpsSaatIni,
  koordinatKePersenPeta,
  persenPetaKeKoordinat
} from '../utils/geocoding';

interface InteractiveMapProps {
  pickup: LocationPoint | null;
  destination: LocationPoint | null;
  onSelectPickup?: (point: LocationPoint) => void;
  onSelectDestination?: (point: LocationPoint) => void;
  mode?: 'pick_pickup' | 'pick_destination' | 'view';
  activeDriver?: Driver | null;
  drivers: Driver[];
  showRoute?: boolean;
}

export const InteractiveMap: React.FC<InteractiveMapProps> = ({
  pickup,
  destination,
  onSelectPickup,
  onSelectDestination,
  mode = 'view',
  activeDriver,
  drivers,
  showRoute = true,
}) => {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [simulatedDrivers, setSimulatedDrivers] = useState<Driver[]>(drivers);
  const [isGeocoding, setIsGeocoding] = useState<boolean>(false);
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);
  const [lastNotification, setLastNotification] = useState<{
    text: string;
    type: 'success' | 'error' | 'info';
  } | null>(null);

  // Slight gentle movement simulation for surrounding drivers
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedDrivers((prev) =>
        prev.map((drv) => {
          if (activeDriver && drv.id === activeDriver.id) {
            return drv;
          }
          const deltaX = (Math.random() - 0.5) * 0.4;
          const deltaY = (Math.random() - 0.5) * 0.4;
          return {
            ...drv,
            x: Math.min(92, Math.max(8, drv.x + deltaX)),
            y: Math.min(92, Math.max(8, drv.y + deltaY)),
          };
        })
      );
    }, 2400);

    return () => clearInterval(interval);
  }, [activeDriver]);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setLastNotification({ text, type });
    setTimeout(() => {
      setLastNotification((curr) => (curr?.text === text ? null : curr));
    }, 4500);
  };

  // 1. CLICK MAP HANDLER: Converts click point to Lat/Lng and reverse geocodes with Nominatim
  const handleMapClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    // Hitung koordinat Latitude & Longitude Banjarmasin dari posisi klik
    const { lat, lng } = persenPetaKeKoordinat(clickX, clickY);

    setIsGeocoding(true);
    try {
      const geoResult = await detailKoordinatKeAlamat(lat, lng);

      const clickedPoint: LocationPoint = {
        id: `map-${Date.now()}`,
        name: geoResult.title,
        address: geoResult.fullAddress,
        x: Math.round(clickX),
        y: Math.round(clickY),
        lat,
        lng,
      };

      if (mode === 'pick_destination') {
        if (onSelectDestination) onSelectDestination(clickedPoint);
        showToast(`Tujuan dipilih: ${geoResult.title}`, 'success');
      } else {
        if (onSelectPickup) onSelectPickup(clickedPoint);
        showToast(`Titik jemput dipilih: ${geoResult.title}`, 'success');
      }
    } catch (err) {
      console.error(err);
      showToast('Gagal memproses titik peta', 'error');
    } finally {
      setIsGeocoding(false);
    }
  };

  // 2. HTML5 GEOLOCATION API: Detects user's real GPS position & reverse geocodes via Nominatim
  const handleGetCurrentLocationGps = async () => {
    setIsGpsLoading(true);

    try {
      const gpsResult = await dapatkanLokasiGpsSaatIni();
      const geoResult = await detailKoordinatKeAlamat(gpsResult.lat, gpsResult.lng);
      const { x, y } = koordinatKePersenPeta(gpsResult.lat, gpsResult.lng);

      const gpsLocationPoint: LocationPoint = {
        id: `gps-${Date.now()}`,
        name: geoResult.title || 'Lokasi Saya',
        address: geoResult.fullAddress,
        x,
        y,
        lat: gpsResult.lat,
        lng: gpsResult.lng,
        isGpsDetected: !gpsResult.isFallback,
        landmark: gpsResult.isFallback ? 'Titik Acuan Pusat Banjarmasin' : 'Posisi GPS Real-Time Pengguna',
      };

      if (mode === 'pick_destination' && onSelectDestination) {
        onSelectDestination(gpsLocationPoint);
      } else if (onSelectPickup) {
        onSelectPickup(gpsLocationPoint);
      }

      if (gpsResult.isFallback) {
        showToast(gpsResult.message || 'Izin GPS tidak aktif. Menggunakan pusat kota Banjarmasin.', 'info');
      } else {
        showToast(`Lokasi GPS aktif: ${geoResult.title}`, 'success');
      }
    } catch {
      showToast('Menggunakan titik pusat Banjarmasin (Jl. A. Yani)', 'info');
    } finally {
      setIsGpsLoading(false);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[340px] overflow-hidden bg-[#eaf4fc] select-none rounded-2xl border border-slate-200 shadow-inner flex flex-col justify-between">
      {/* Map Background SVG Graphics: Banjarmasin Riverway & Main Avenues */}
      <div
        className="absolute inset-0 cursor-crosshair transition-transform duration-300"
        style={{ transform: `scale(${zoomLevel})`, transformOrigin: 'center center' }}
        onClick={handleMapClick}
      >
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* City District Blocks */}
          <rect x="5" y="5" width="28" height="26" rx="2" fill="#d9e9f5" />
          <rect x="36" y="8" width="58" height="24" rx="2" fill="#e2edf5" />
          <rect x="6" y="34" width="30" height="34" rx="2" fill="#e0ecf7" />
          <rect x="42" y="38" width="52" height="30" rx="2" fill="#dae8f3" />
          <rect x="10" y="72" width="40" height="24" rx="2" fill="#e5eff8" />
          <rect x="54" y="72" width="42" height="24" rx="2" fill="#dbeef8" />

          {/* Green City Parks & Siring Waterfront Gardens */}
          <ellipse cx="38" cy="42" rx="6" ry="4" fill="#cbebd3" />
          <ellipse cx="49" cy="53" rx="5" ry="3.5" fill="#d5f0dc" />
          <ellipse cx="35" cy="22" rx="4" ry="4" fill="#cbebd3" />

          {/* Sungai Martapura */}
          <path
            d="M 24 0 Q 30 18, 38 28 T 40 48 T 32 64 T 30 82 T 26 100"
            fill="none"
            stroke="#9ed0f5"
            strokeWidth="5.5"
            strokeLinecap="round"
          />
          <path
            d="M 40 48 Q 55 50, 70 46 T 100 42"
            fill="none"
            stroke="#b3dcfa"
            strokeWidth="3.2"
            strokeLinecap="round"
          />

          {/* Main Boulevards & Roads */}
          <line x1="0" y1="48" x2="100" y2="78" stroke="#ffffff" strokeWidth="3" />
          <line x1="0" y1="48" x2="100" y2="78" stroke="#f1c40f" strokeWidth="0.8" strokeDasharray="1.5,1.5" />
          <line x1="36" y1="0" x2="36" y2="48" stroke="#ffffff" strokeWidth="2.4" />
          <line x1="60" y1="36" x2="60" y2="90" stroke="#ffffff" strokeWidth="2" />
          <line x1="20" y1="40" x2="90" y2="40" stroke="#ffffff" strokeWidth="1.8" />
          <line x1="10" y1="70" x2="85" y2="70" stroke="#ffffff" strokeWidth="1.8" />

          {/* Siring Bridge */}
          <line x1="36" y1="42" x2="42" y2="44" stroke="#d97706" strokeWidth="1.4" strokeLinecap="square" />

          {/* Route path */}
          {showRoute && pickup && destination && (
            <>
              <path
                d={`M ${pickup.x} ${pickup.y} Q ${(pickup.x + destination.x) / 2 + 5} ${(pickup.y + destination.y) / 2 - 4}, ${destination.x} ${destination.y}`}
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeDasharray="2, 1"
                className="animate-pulse"
              />
              <path
                d={`M ${pickup.x} ${pickup.y} Q ${(pickup.x + destination.x) / 2 + 5} ${(pickup.y + destination.y) / 2 - 4}, ${destination.x} ${destination.y}`}
                fill="none"
                stroke="#38bdf8"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </>
          )}
        </svg>

        {/* Nearby Drivers on Map */}
        {simulatedDrivers.map((driver) => {
          const isActive = activeDriver && activeDriver.id === driver.id;
          return (
            <div
              key={driver.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out group pointer-events-auto"
              style={{ left: `${driver.x}%`, top: `${driver.y}%` }}
            >
              {isActive && (
                <div className="absolute -inset-2 rounded-full bg-red-500/25 animate-ping" />
              )}
              <div
                className={`relative flex items-center justify-center w-8 h-8 rounded-full shadow-md border-2 transition-transform hover:scale-110 ${
                  isActive
                    ? 'bg-red-600 border-white text-white z-20 scale-110 shadow-red-500/40'
                    : 'bg-white border-sky-600 text-sky-700 z-10'
                }`}
                title={`${driver.name} (${driver.vehicle})`}
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-4-4zm-12 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>

                <div className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-[#17211B] text-[9px] px-1.5 py-0.5 rounded-lg shadow-sm border border-[#E4ECE7] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {driver.name.split(' ')[0]} · ★{driver.rating}
                </div>
              </div>
            </div>
          );
        })}

        {/* Pickup Pin */}
        {pickup && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full z-20 animate-bounce pointer-events-none"
            style={{ left: `${pickup.x}%`, top: `${pickup.y}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>{pickup.isGpsDetected ? 'GPS Anda' : 'Jemput'}</span>
              </div>
              <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin className="w-4 h-4 fill-white" />
              </div>
              <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full shadow" />
            </div>
          </div>
        )}

        {/* Destination Pin */}
        {destination && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full z-20 animate-bounce pointer-events-none"
            style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                <span>Tujuan</span>
              </div>
              <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Navigation className="w-4 h-4 fill-white" />
              </div>
              <div className="w-1.5 h-1.5 bg-red-700 rounded-full shadow" />
            </div>
          </div>
        )}
      </div>

      {/* Map Control Floating Badges (Top Left) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5 max-w-xs sm:max-w-sm pointer-events-none">
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-sm flex items-center gap-2 text-xs font-medium text-slate-800 pointer-events-auto">
          <Compass className="w-3.5 h-3.5 text-sky-600" />
          <span>Banjarmasin (0511)</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-600 text-[11px] font-semibold">Nominatim Online</span>
        </div>

        {mode !== 'view' && (
          <div className="bg-amber-600 text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-md flex items-center gap-2 animate-pulse pointer-events-auto">
            <MapPin className="w-3.5 h-3.5 shrink-0" />
            <span>
              Klik peta untuk memilih titik <strong>{mode === 'pick_pickup' ? 'Penjemputan' : 'Tujuan'}</strong>
            </span>
          </div>
        )}

        {isGeocoding && (
          <div className="bg-white/95 text-[#17211B] text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-sm flex items-center gap-2 border border-[#E4ECE7] pointer-events-auto">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-[#18B86A] shrink-0" />
            <span>Mencari nama jalan via OpenStreetMap Nominatim...</span>
          </div>
        )}

        {lastNotification && (
          <div
            className={`px-3 py-1.5 rounded-lg text-xs font-medium shadow-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1 border pointer-events-auto ${
              lastNotification.type === 'success'
                ? 'bg-[#DDF8EA] text-[#0E8F52] border-[#18B86A]/30'
                : lastNotification.type === 'error'
                ? 'bg-rose-50 text-[#E5484D] border-rose-200'
                : 'bg-white text-[#17211B] border-[#E4ECE7]'
            }`}
          >
            {lastNotification.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-[#18B86A] shrink-0" />
            ) : lastNotification.type === 'error' ? (
              <AlertCircle className="w-3.5 h-3.5 text-[#E5484D] shrink-0" />
            ) : (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#18B86A] shrink-0" />
            )}
            <span className="truncate">{lastNotification.text}</span>
          </div>
        )}
      </div>

      {/* Floating Action Button: HTML5 GPS "Lokasi Saat Ini" (Top Right) */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-2">
        <button
          type="button"
          onClick={handleGetCurrentLocationGps}
          disabled={isGpsLoading}
          className="bg-white/95 hover:bg-white text-slate-800 hover:text-red-600 px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 group"
          title="Gunakan HTML5 Geolocation API untuk mendeteksi koordinat GPS saya sekarang"
        >
          {isGpsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-red-600" />
          ) : (
            <Crosshair className="w-4 h-4 text-red-600 group-hover:rotate-45 transition-transform" />
          )}
          <span>Lokasi Saat Ini</span>
        </button>
      </div>

      {/* Zoom controls (Bottom Right) */}
      <div className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 bg-white/95 backdrop-blur-md p-1 rounded-lg border border-slate-200 shadow-sm">
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.min(1.4, z + 0.1))}
          className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded text-sm font-bold active:scale-95 transition-transform"
          title="Perbesar Peta"
          aria-label="Perbesar Peta"
        >
          +
        </button>
        <span className="text-[10px] text-slate-400 font-mono">{(zoomLevel * 100).toFixed(0)}%</span>
        <button
          type="button"
          onClick={() => setZoomLevel((z) => Math.max(0.9, z - 0.1))}
          className="w-7 h-7 flex items-center justify-center text-slate-700 hover:bg-slate-100 rounded text-sm font-bold active:scale-95 transition-transform"
          title="Perkecil Peta"
          aria-label="Perkecil Peta"
        >
          −
        </button>
      </div>

      {/* Bottom Left GPS Indicator */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1 text-[11px] text-slate-600 bg-white/90 backdrop-blur-md px-2 py-1 rounded border border-slate-200 shadow-xs">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>OpenStreetMap & Geolocation API Terintegrasi</span>
      </div>
    </div>
  );
};
