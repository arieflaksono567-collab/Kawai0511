import React from 'react';
import { MapPin, Navigation, Bike, Compass, Crosshair } from 'lucide-react';
import { LocationPoint } from '../types';

interface BanjarmasinMapProps {
  pickup: LocationPoint;
  destination: LocationPoint;
  driverPosition?: { x: number; y: number; heading?: number; name?: string };
  landmarks: LocationPoint[];
  onSelectLocation?: (loc: LocationPoint, type: 'pickup' | 'destination') => void;
  status?: string;
  isDriverView?: boolean;
}

export const BanjarmasinMap: React.FC<BanjarmasinMapProps> = ({
  pickup,
  destination,
  driverPosition,
  landmarks,
  onSelectLocation,
  status = 'idle',
  isDriverView = false,
}) => {
  // SVG viewBox is 0 0 1000 600
  const toSvgX = (xPct: number) => (xPct / 100) * 1000;
  const toSvgY = (yPct: number) => (yPct / 100) * 600;

  const pickupSvg = { x: toSvgX(pickup.x), y: toSvgY(pickup.y) };
  const destSvg = { x: toSvgX(destination.x), y: toSvgY(destination.y) };
  const driverSvg = driverPosition
    ? { x: toSvgX(driverPosition.x), y: toSvgY(driverPosition.y) }
    : { x: pickupSvg.x - 60, y: pickupSvg.y + 40 };

  // Calculate mid-curve control point for realistic road routing
  const midX = (pickupSvg.x + destSvg.x) / 2 + (pickupSvg.y > destSvg.y ? 30 : -30);
  const midY = (pickupSvg.y + destSvg.y) / 2 - 25;
  const routePathD = `M ${pickupSvg.x} ${pickupSvg.y} Q ${midX} ${midY} ${destSvg.x} ${destSvg.y}`;

  // Driver to pickup path when searching or assigned
  const driverToPickupD = `M ${driverSvg.x} ${driverSvg.y} Q ${(driverSvg.x + pickupSvg.x) / 2} ${(driverSvg.y + pickupSvg.y) / 2 - 15} ${pickupSvg.x} ${pickupSvg.y}`;

  return (
    <div className="relative w-full h-[260px] sm:h-[320px] bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-inner select-none">
      {/* Map Background SVG */}
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Street pattern grid */}
          <pattern id="street-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#1e293b" strokeWidth="0.8" opacity="0.6" />
          </pattern>
          {/* River gradient */}
          <linearGradient id="river-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0369a1" stopOpacity="0.55" />
          </linearGradient>
          {/* Radar ripple gradient */}
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base ground & Grid */}
        <rect width="1000" height="600" fill="#0f172a" />
        <rect width="1000" height="600" fill="url(#street-grid)" />

        {/* Sungai Barito (Barat) */}
        <path
          d="M 60 0 Q 75 180 50 340 T 40 600"
          fill="none"
          stroke="url(#river-grad)"
          strokeWidth="48"
          strokeLinecap="round"
        />

        {/* Sungai Martapura (Menyusuri Banjarmasin Tengah & Utara) */}
        <path
          d="M 280 0 Q 320 140 370 240 T 440 360 Q 510 460 590 600"
          fill="none"
          stroke="url(#river-grad)"
          strokeWidth="32"
          strokeLinecap="round"
        />

        {/* Anak Sungai Martapura / Banua Anyar */}
        <path
          d="M 370 240 Q 480 210 650 250"
          fill="none"
          stroke="url(#river-grad)"
          strokeWidth="16"
          strokeLinecap="round"
        />

        {/* Jembatan Merdeka & Jembatan Banua Anyar (Bridges) */}
        <line x1="355" y1="230" x2="385" y2="250" stroke="#64748b" strokeWidth="4" />
        <line x1="425" y1="350" x2="455" y2="370" stroke="#64748b" strokeWidth="4" />

        {/* Jalan Utama: Jl. A. Yani (Arteri Banjarmasin) */}
        <path
          d="M 360 380 L 520 440 L 720 520 L 980 590"
          fill="none"
          stroke="#334155"
          strokeWidth="10"
        />
        <path
          d="M 360 380 L 520 440 L 720 520 L 980 590"
          fill="none"
          stroke="#475569"
          strokeWidth="4"
          strokeDasharray="12,8"
        />

        {/* Jalan Utama: Jl. Hasan Basry (Kayutangi / ULM) */}
        <path
          d="M 350 220 L 350 40"
          fill="none"
          stroke="#334155"
          strokeWidth="8"
        />

        {/* Jalan Utama: Jl. Pierre Tendean (Siring) */}
        <path
          d="M 360 220 L 440 340"
          fill="none"
          stroke="#334155"
          strokeWidth="8"
        />

        {/* Area Hijau Taman Siring & Kamboja */}
        <ellipse cx="390" cy="270" rx="35" ry="20" fill="#065f46" opacity="0.25" />
        <ellipse cx="480" cy="410" rx="40" ry="25" fill="#065f46" opacity="0.25" />

        {/* ROUTE LINE (Jika bukan cancelled/idle) */}
        {pickupSvg.x !== destSvg.x && (
          <>
            {/* Route Outer Shadow */}
            <path
              d={routePathD}
              fill="none"
              stroke="#059669"
              strokeWidth="6"
              strokeLinecap="round"
              opacity="0.3"
            />
            {/* Animated Active Route */}
            <path
              d={routePathD}
              fill="none"
              stroke="#10b981"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="8,6"
              className="animate-pulse"
            />
          </>
        )}

        {/* DRIVER HEADING TO PICKUP (Saat ASSIGNED atau ARRIVED) */}
        {(status === 'ASSIGNED' || status === 'assigned') && (
          <path
            d={driverToPickupD}
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.5"
            strokeDasharray="6,4"
            className="animate-pulse"
          />
        )}

        {/* RADAR WAVE AROUND PICKUP (Saat SEARCHING) */}
        {(status === 'SEARCHING' || status === 'searching') && (
          <g>
            <circle cx={pickupSvg.x} cy={pickupSvg.y} r="85" fill="url(#radar-glow)">
              <animate attributeName="r" values="30;120" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={pickupSvg.x} cy={pickupSvg.y} r="50" fill="none" stroke="#10b981" strokeWidth="1.5" opacity="0.4">
              <animate attributeName="r" values="10;80" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>
          </g>
        )}
      </svg>

      {/* HTML OVERLAY FOR INTERACTIVE PINS */}
      <div className="absolute inset-0 pointer-events-none">
        {/* LANDMARK PINS */}
        {landmarks.slice(0, 7).map((lm) => {
          const isPickup = lm.id === pickup.id;
          const isDest = lm.id === destination.id;
          if (isPickup || isDest) return null; // handled separately

          return (
            <button
              key={lm.id}
              onClick={() => onSelectLocation && onSelectLocation(lm, 'destination')}
              title={`Klik untuk pilih: ${lm.name}`}
              className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 group transition-transform hover:scale-110 focus:outline-none"
              style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-slate-600 border border-slate-400 group-hover:bg-amber-400 group-hover:border-amber-200 transition-colors shadow-sm" />
              <span className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap bg-slate-950/95 text-slate-200 text-[10px] px-2 py-0.5 rounded border border-slate-700 shadow-lg z-30 font-medium">
                {lm.name}
              </span>
            </button>
          );
        })}

        {/* PICKUP PIN */}
        <div
          className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full z-20 transition-all duration-500 ease-out"
          style={{ left: `${pickup.x}%`, top: `${pickup.y}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-emerald-400 whitespace-nowrap mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Pickup: {pickup.name.length > 18 ? pickup.name.slice(0, 16) + '..' : pickup.name}
            </span>
            <div className="w-5 h-5 rounded-full bg-emerald-500 border-2 border-white shadow-xl flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <div className="w-1 h-2 bg-emerald-600" />
          </div>
        </div>

        {/* DESTINATION PIN */}
        <div
          className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full z-20 transition-all duration-500 ease-out"
          style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="bg-rose-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg border border-rose-400 whitespace-nowrap mb-0.5 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              Tujuan: {destination.name.length > 18 ? destination.name.slice(0, 16) + '..' : destination.name}
            </span>
            <div className="w-5 h-5 rounded-full bg-rose-500 border-2 border-white shadow-xl flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <div className="w-1 h-2 bg-rose-600" />
          </div>
        </div>

        {/* DRIVER POSITION PIN */}
        {driverPosition && (
          <div
            className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 z-25 transition-all duration-700 ease-out"
            style={{ left: `${driverPosition.x}%`, top: `${driverPosition.y}%` }}
          >
            <div className="relative flex items-center justify-center group">
              {/* Radar pulse around driver */}
              <div className="absolute w-9 h-9 rounded-full bg-sky-500/20 animate-ping" />
              <div className="w-8 h-8 rounded-full bg-slate-900 border-2 border-sky-400 shadow-xl flex items-center justify-center text-sky-300">
                <Bike className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/90 text-[9px] font-mono font-bold text-sky-300 px-1.5 py-0.2 rounded border border-sky-500/40 shadow">
                DA 5110 KAW
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MAP CONTROLS OVERLAY */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 text-[11px] text-slate-300">
        <Compass className="w-3.5 h-3.5 text-emerald-400 animate-spin-slow" />
        <span className="font-semibold text-white">Banjarmasin</span>
        <span className="text-slate-500">•</span>
        <span className="text-emerald-400 font-mono text-[10px]">Kota Seribu Sungai</span>
      </div>

      <div className="absolute top-3 right-3 z-30 flex items-center gap-1 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-800 text-[10px] text-slate-400">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Radius 1.5 km</span>
      </div>

      <div className="absolute bottom-2 left-3 z-30 text-[10px] text-slate-500 bg-slate-950/70 px-2 py-0.5 rounded backdrop-blur border border-slate-800/60 hidden sm:block">
        Sungai Martapura & Siring • Jl. A. Yani • ULM Kayutangi
      </div>
    </div>
  );
};
