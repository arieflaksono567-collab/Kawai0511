import React, { useState, useEffect } from 'react';
import { LocationPoint, Driver } from '../types';
import { MapPin, Navigation, Compass, Layers, ShieldCheck } from 'lucide-react';

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
  const [trafficDensity, setTrafficDensity] = useState<'normal' | 'lancar'>('lancar');

  // Slight gentle movement simulation for surrounding drivers
  useEffect(() => {
    const interval = setInterval(() => {
      setSimulatedDrivers((prev) =>
        prev.map((drv) => {
          if (activeDriver && drv.id === activeDriver.id) {
            // Active driver is positioned relative to pickup/dropoff elsewhere
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

  const handleMapClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = ((e.clientX - rect.left) / rect.width) * 100;
    const clickY = ((e.clientY - rect.top) / rect.height) * 100;

    const clickedPoint: LocationPoint = {
      id: `custom-${Date.now()}`,
      name: `Titik Peta (${clickX.toFixed(1)}°, ${clickY.toFixed(1)}°)`,
      address: `Area Banjarmasin Tengah / Sekitar Jl. A. Yani`,
      x: Math.round(clickX),
      y: Math.round(clickY),
    };

    if (mode === 'pick_pickup' && onSelectPickup) {
      onSelectPickup(clickedPoint);
    } else if (mode === 'pick_destination' && onSelectDestination) {
      onSelectDestination(clickedPoint);
    }
  };

  return (
    <div className="relative w-full h-full min-h-[300px] overflow-hidden bg-[#eaf4fc] select-none rounded-2xl border border-slate-200 shadow-inner">
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

          {/* Sungai Martapura (Meandering Blue River of Banjarmasin) */}
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

          {/* Main Boulevards & Roads (Jl. A. Yani, Kayutangi, Kuripan) */}
          {/* Jl. A. Yani (Main arterial road to Banjarbaru) */}
          <line x1="0" y1="48" x2="100" y2="78" stroke="#ffffff" strokeWidth="3" />
          <line x1="0" y1="48" x2="100" y2="78" stroke="#f1c40f" strokeWidth="0.8" strokeDasharray="1.5,1.5" />

          {/* Jl. Brigjen Hasan Basry (Kayutangi to Marabahan) */}
          <line x1="36" y1="0" x2="36" y2="48" stroke="#ffffff" strokeWidth="2.4" />

          {/* Jl. Kuripan & Jl. Pramuka */}
          <line x1="60" y1="36" x2="60" y2="90" stroke="#ffffff" strokeWidth="2" />
          <line x1="20" y1="40" x2="90" y2="40" stroke="#ffffff" strokeWidth="1.8" />
          <line x1="10" y1="70" x2="85" y2="70" stroke="#ffffff" strokeWidth="1.8" />

          {/* Siring Bridge over Martapura River */}
          <line x1="36" y1="42" x2="42" y2="44" stroke="#d97706" strokeWidth="1.4" strokeLinecap="square" />

          {/* Route path between Pickup and Destination if both exist */}
          {showRoute && pickup && destination && (
            <>
              {/* Route Glow */}
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

        {/* Nearby Drivers on Map (Motorcycle Icons) */}
        {simulatedDrivers.map((driver) => {
          const isActive = activeDriver && activeDriver.id === driver.id;
          return (
            <div
              key={driver.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 transition-all duration-1000 ease-out group pointer-events-auto"
              style={{ left: `${driver.x}%`, top: `${driver.y}%` }}
            >
              {/* Pulse Ring for Active Driver */}
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
                {/* Custom Kawai 0511 Rider Icon */}
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M19 7c0-1.1-.9-2-2-2h-3v2h3v2.65L13.52 14H10V9H6c-2.21 0-4 1.79-4 4v3h2c0 1.66 1.34 3 3 3s3-1.34 3-3h4c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-4-4zm-12 9c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm10 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z" />
                </svg>

                {/* Driver Tag Badge */}
                <div className="absolute top-full mt-0.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-white text-[9px] px-1.5 py-0.5 rounded shadow pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity">
                  {driver.name.split(' ')[0]} · ★{driver.rating}
                </div>
              </div>
            </div>
          );
        })}

        {/* Pickup Pin (Green) */}
        {pickup && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full z-20 animate-bounce pointer-events-none"
            style={{ left: `${pickup.x}%`, top: `${pickup.y}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-emerald-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Jemput
              </div>
              <div className="w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <MapPin className="w-4 h-4 fill-white" />
              </div>
              <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full shadow" />
            </div>
          </div>
        )}

        {/* Destination Pin (Red) */}
        {destination && (
          <div
            className="absolute -translate-x-1/2 -translate-y-full z-20 animate-bounce pointer-events-none"
            style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
          >
            <div className="flex flex-col items-center">
              <div className="bg-red-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-md whitespace-nowrap mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                Tujuan
              </div>
              <div className="w-7 h-7 bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white">
                <Navigation className="w-4 h-4 fill-white" />
              </div>
              <div className="w-1.5 h-1.5 bg-red-700 rounded-full shadow" />
            </div>
          </div>
        )}
      </div>

      {/* Map Control Floating Badges (Top & Bottom Corners) */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        <div className="bg-white/95 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-sm flex items-center gap-2 text-xs font-medium text-slate-800">
          <Compass className="w-3.5 h-3.5 text-sky-600" />
          <span>Banjarmasin (0511)</span>
          <span className="text-slate-400">·</span>
          <span className="text-emerald-600 text-[11px] font-semibold">Trafik Lancar</span>
        </div>

        {mode !== 'view' && (
          <div className="bg-amber-500 text-white text-xs font-medium px-2.5 py-1 rounded-md shadow flex items-center gap-1.5 animate-pulse">
            <MapPin className="w-3.5 h-3.5" />
            <span>Klik peta untuk pilih titik {mode === 'pick_pickup' ? 'Penjemputan' : 'Tujuan'}</span>
          </div>
        )}
      </div>

      {/* Zoom and Traffic density buttons */}
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

      {/* Safe Badge */}
      <div className="absolute bottom-3 left-3 z-10 hidden sm:flex items-center gap-1 text-[11px] text-slate-600 bg-white/90 backdrop-blur-md px-2 py-1 rounded border border-slate-200">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>GPS Kawai 0511 Akurat</span>
      </div>
    </div>
  );
};
