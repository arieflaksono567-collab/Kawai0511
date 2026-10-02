import React, { useState, useEffect } from 'react';
import { Compass, Navigation, Volume2, VolumeX, ExternalLink, X, MapPin, ArrowUp, ArrowRight, CornerUpRight, CheckCircle2 } from 'lucide-react';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationName: string;
  destinationAddress: string;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  onClose,
  destinationName,
  destinationAddress,
}) => {
  const [speed, setSpeed] = useState<number>(36);
  const [distanceRemaining, setDistanceRemaining] = useState<number>(1.8);
  const [etaMinutes, setEtaMinutes] = useState<number>(5);
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);
  const [currentInstruction, setCurrentInstruction] = useState<string>(
    '250 meter lagi belok kiri ke Jl. A. Yani'
  );

  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setSpeed((s) => Math.max(25, Math.min(48, Math.round(s + (Math.random() - 0.5) * 6))));
    }, 2000);

    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(
    destinationName + ', ' + destinationAddress + ', Banjarmasin'
  )}`;

  const handleOpenGoogleMaps = () => {
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-slate-900 text-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-hidden shadow-2xl flex flex-col border border-slate-700">
        {/* Top Turn Maneuver Header */}
        <div className="bg-emerald-600 p-4 text-white flex items-start justify-between shadow-md">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <CornerUpRight className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-100">
                Instruksi Berikutnya:
              </span>
              <h3 className="text-lg font-black leading-tight mt-0.5">{currentInstruction}</h3>
              <p className="text-xs text-emerald-100 mt-1">Lalu lurus 600m menuju tujuan</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live GPS Visual Canvas */}
        <div className="relative h-64 w-full bg-slate-950 overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0 flex justify-center">
            <div className="w-48 h-full bg-[#1e293b] relative border-x-4 border-slate-700">
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 border-r-4 border-dashed border-amber-400 opacity-80" />

              <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-red-600/30 animate-ping absolute" />
                <div className="w-8 h-8 rounded-full bg-red-600 border-2 border-white flex items-center justify-center text-white shadow-lg z-10">
                  <MapPin className="w-4 h-4 fill-white" />
                </div>
                <span className="bg-slate-900/90 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow mt-1 whitespace-nowrap">
                  {destinationName}
                </span>
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-emerald-500/50">
                    <Navigation className="w-5 h-5 fill-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-700 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-bold">Kecepatan</span>
            <p className="text-xl font-black font-mono text-emerald-400">{speed}</p>
            <span className="text-[9px] text-slate-400">km/jam</span>
          </div>

          <button
            type="button"
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700 flex items-center justify-center text-white hover:bg-slate-800"
            title="Suara Panduan Belokan"
          >
            {isVoiceActive ? (
              <Volume2 className="w-5 h-5 text-emerald-400" />
            ) : (
              <VolumeX className="w-5 h-5 text-slate-400" />
            )}
          </button>
        </div>

        <div className="p-4 bg-slate-900 space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold">Tujuan Navigasi:</span>
              <h4 className="font-bold text-white text-sm truncate max-w-[240px]">
                {destinationName}
              </h4>
              <p className="text-[11px] text-slate-400 truncate max-w-[240px]">
                {destinationAddress}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black font-mono text-emerald-400">{distanceRemaining} km</p>
              <p className="text-[11px] text-slate-400">± {etaMinutes} menit lagi</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleOpenGoogleMaps}
            className="w-full h-12 rounded-xl bg-[#4285F4] hover:bg-[#3367D6] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-colors"
          >
            <svg className="w-4 h-4 fill-white" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
            </svg>
            <span>Buka Navigasi Langsung di Google Maps HP</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
