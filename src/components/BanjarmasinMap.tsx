import React from 'react';
import { MapPin, Navigation, Bike, Compass, Crosshair } from 'lucide-react';
import { LocationPoint } from '../types';
import { KAWAI_COLORS } from '../constants/theme';

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
    <div className="relative w-full h-[260px] sm:h-[320px] bg-[#F0F5F2] rounded-2xl overflow-hidden border border-[#E4ECE7] shadow-sm select-none">
      {/* Map Background SVG (Bright Clean Mobility Style) */}
      <svg
        viewBox="0 0 1000 600"
        className="w-full h-full object-cover"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          {/* Subtle street grid pattern */}
          <pattern id="street-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E2EBE5" strokeWidth="0.8" />
          </pattern>
          {/* Clean River gradient */}
          <linearGradient id="river-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#C5E6F7" />
            <stop offset="100%" stopColor="#A8DAF5" />
          </linearGradient>
          {/* Green Radar ripple */}
          <radialGradient id="radar-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#18B86A" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#18B86A" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Base ground & Grid */}
        <rect width="1000" height="600" fill="#F0F5F2" />
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

        {/* Area Hijau Taman Siring & Kamboja */}
        <ellipse cx="390" cy="270" rx="40" ry="24" fill="#DDF8EA" opacity="0.85" />
        <ellipse cx="480" cy="410" rx="45" ry="28" fill="#DDF8EA" opacity="0.85" />

        {/* Jembatan Merdeka & Jembatan Banua Anyar */}
        <line x1="355" y1="230" x2="385" y2="250" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />
        <line x1="425" y1="350" x2="455" y2="370" stroke="#94A3B8" strokeWidth="5" strokeLinecap="round" />

        {/* Jalan Utama: Jl. A. Yani (Arteri Banjarmasin) - Clean white with soft casing */}
        <path
          d="M 360 380 L 520 440 L 720 520 L 980 590"
          fill="none"
          stroke="#D7E2DB"
          strokeWidth="12"
          strokeLinecap="round"
        />
        <path
          d="M 360 380 L 520 440 L 720 520 L 980 590"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="8"
          strokeLinecap="round"
        />

        {/* Jalan Utama: Jl. Hasan Basry (Kayutangi / ULM) */}
        <path
          d="M 350 220 L 350 40"
          fill="none"
          stroke="#D7E2DB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 350 220 L 350 40"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Jalan Utama: Jl. Pierre Tendean (Siring) */}
        <path
          d="M 360 220 L 440 340"
          fill="none"
          stroke="#D7E2DB"
          strokeWidth="10"
          strokeLinecap="round"
        />
        <path
          d="M 360 220 L 440 340"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="6"
          strokeLinecap="round"
        />

        {/* Jalan Lingkar Lainnya */}
        <path
          d="M 120 420 L 360 380 L 360 220 L 220 180"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="5"
          strokeLinecap="round"
        />

        {/* ROUTE LINE (KAWAI Green #18B86A) */}
        {pickupSvg.x !== destSvg.x && (
          <>
            {/* Soft Glow */}
            <path
              d={routePathD}
              fill="none"
              stroke="#DDF8EA"
              strokeWidth="8"
              strokeLinecap="round"
            />
            {/* Primary KAWAI Green Solid Route */}
            <path
              d={routePathD}
              fill="none"
              stroke="#18B86A"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Animated Dashed Tracker */}
            <path
              d={routePathD}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="6,8"
              className="animate-pulse"
            />
          </>
        )}

        {/* DRIVER HEADING TO PICKUP (Saat ASSIGNED atau ARRIVED) */}
        {(status === 'ASSIGNED' || status === 'assigned') && (
          <path
            d={driverToPickupD}
            fill="none"
            stroke="#0E8F52"
            strokeWidth="3"
            strokeDasharray="6,4"
            className="animate-pulse"
          />
        )}

        {/* RADAR WAVE AROUND PICKUP (Saat SEARCHING) */}
        {(status === 'SEARCHING' || status === 'searching') && (
          <g>
            <circle cx={pickupSvg.x} cy={pickupSvg.y} r="85" fill="url(#radar-glow)">
              <animate attributeName="r" values="30;120" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
            </circle>
            <circle cx={pickupSvg.x} cy={pickupSvg.y} r="50" fill="none" stroke="#18B86A" strokeWidth="2" opacity="0.6">
              <animate attributeName="r" values="10;80" dur="2s" repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.9;0" dur="2s" repeatCount="indefinite" />
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
          if (isPickup || isDest) return null;

          return (
            <button
              key={lm.id}
              onClick={() => onSelectLocation && onSelectLocation(lm, 'destination')}
              title={`Klik untuk pilih: ${lm.name}`}
              className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 group transition-transform hover:scale-110 focus:outline-none"
              style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-[#A8B2AC] border border-white group-hover:bg-[#18B86A] transition-colors shadow-sm" />
              <span className="hidden group-hover:block absolute left-1/2 -translate-x-1/2 -top-7 whitespace-nowrap bg-white text-[#17211B] text-[10px] px-2 py-0.5 rounded-lg border border-[#E4ECE7] shadow-md z-30 font-medium">
                {lm.name}
              </span>
            </button>
          );
        })}

        {/* PICKUP PIN (KAWAI Green #18B86A) */}
        <div
          className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full z-20 transition-all duration-500 ease-out"
          style={{ left: `${pickup.x}%`, top: `${pickup.y}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="bg-[#18B86A] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
              Pickup: {pickup.name.length > 18 ? pickup.name.slice(0, 16) + '..' : pickup.name}
            </span>
            <div className="w-5 h-5 rounded-full bg-[#18B86A] border-2 border-white shadow-md flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <div className="w-1 h-2 bg-[#18B86A]" />
          </div>
        </div>

        {/* DESTINATION PIN (Status Danger / Destination Red #E5484D) */}
        <div
          className="absolute pointer-events-auto -translate-x-1/2 -translate-y-full z-20 transition-all duration-500 ease-out"
          style={{ left: `${destination.x}%`, top: `${destination.y}%` }}
        >
          <div className="flex flex-col items-center">
            <span className="bg-[#E5484D] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md border border-white whitespace-nowrap mb-0.5 flex items-center gap-1">
              <MapPin className="w-2.5 h-2.5" />
              Tujuan: {destination.name.length > 18 ? destination.name.slice(0, 16) + '..' : destination.name}
            </span>
            <div className="w-5 h-5 rounded-full bg-[#E5484D] border-2 border-white shadow-md flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
            <div className="w-1 h-2 bg-[#E5484D]" />
          </div>
        </div>

        {/* DRIVER POSITION PIN (KAWAI Brand Driver #18B86A) */}
        {driverPosition && (
          <div
            className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 z-25 transition-all duration-700 ease-out"
            style={{ left: `${driverPosition.x}%`, top: `${driverPosition.y}%` }}
          >
            <div className="relative flex items-center justify-center group">
              <div className="absolute w-9 h-9 rounded-full bg-[#18B86A]/20 animate-ping" />
              <div className="w-8 h-8 rounded-full bg-white border-2 border-[#18B86A] shadow-md flex items-center justify-center text-[#18B86A]">
                <Bike className="w-4 h-4" />
              </div>
              <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-white text-[9px] font-mono font-bold text-[#17211B] px-1.5 py-0.2 rounded border border-[#E4ECE7] shadow-sm">
                DA 5110 KAW
              </span>
            </div>
          </div>
        )}
      </div>

      {/* MAP CONTROLS OVERLAY - Light & Clean */}
      <div className="absolute top-3 left-3 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2.5 py-1 rounded-xl border border-[#E4ECE7] text-[11px] text-[#17211B] shadow-sm">
        <Compass className="w-3.5 h-3.5 text-[#18B86A]" />
        <span className="font-semibold text-[#17211B]">Banjarmasin</span>
        <span className="text-[#A8B2AC]">•</span>
        <span className="text-[#0E8F52] font-medium text-[10px]">Kota Seribu Sungai</span>
      </div>

      <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 bg-white/95 backdrop-blur-md px-2 py-1 rounded-xl border border-[#E4ECE7] text-[10px] text-[#66736B] shadow-sm">
        <span className="w-2 h-2 rounded-full bg-[#18B86A] animate-pulse" />
        <span>Radius 1.5 km</span>
      </div>

      <div className="absolute bottom-2 left-3 z-30 text-[10px] text-[#66736B] bg-white/90 px-2 py-0.5 rounded-lg backdrop-blur border border-[#E4ECE7] shadow-xs hidden sm:block">
        Sungai Martapura & Siring • Jl. A. Yani • ULM Kayutangi
      </div>
    </div>
  );
};
