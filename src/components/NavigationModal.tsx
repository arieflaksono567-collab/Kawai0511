import React, { useState } from 'react';
import {
  Navigation,
  Compass,
  MapPin,
  ExternalLink,
  Volume2,
  VolumeX,
  X,
  CornerUpRight,
  ShieldCheck
} from 'lucide-react';
import { KAWAI_COLORS } from '../constants/theme';

interface NavigationModalProps {
  isOpen: boolean;
  onClose: () => void;
  destinationName?: string;
  destinationAddress?: string;
  destinationLat?: number;
  destinationLng?: number;
  currentInstruction?: string;
  distanceRemaining?: number;
  etaMinutes?: number;
  speed?: number;
}

export const NavigationModal: React.FC<NavigationModalProps> = ({
  isOpen,
  onClose,
  destinationName = 'Universitas Lambung Mangkurat (ULM)',
  destinationAddress = 'Jl. Brigjend H. Hasan Basri, Banjarmasin Utara',
  destinationLat = -3.298510,
  destinationLng = 114.588020,
  currentInstruction = 'Belok Kanan ke Jl. Hasan Basry',
  distanceRemaining = 2.4,
  etaMinutes = 7,
  speed = 34,
}) => {
  const [isVoiceActive, setIsVoiceActive] = useState<boolean>(true);

  if (!isOpen) return null;

  const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLng}&travelmode=driving`;

  const handleOpenGoogleMaps = () => {
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white text-[#17211B] w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[92vh] overflow-hidden shadow-xl flex flex-col border border-[#E4ECE7]">
        {/* Top Turn Maneuver Header */}
        <div className="bg-[#18B86A] p-4 text-white flex items-start justify-between shadow-xs">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shrink-0 border border-white/30">
              <CornerUpRight className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-[11px] uppercase tracking-wider font-bold text-white/90">
                Instruksi Berikutnya:
              </span>
              <h3 className="text-lg font-bold leading-tight mt-0.5">{currentInstruction}</h3>
              <p className="text-xs text-white/80 mt-1">Lalu lurus 600m menuju tujuan</p>
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

        {/* Live GPS Visual Canvas - Light & Clean */}
        <div className="relative h-64 w-full bg-[#F0F5F2] overflow-hidden flex items-center justify-center border-b border-[#E4ECE7]">
          <div className="absolute inset-0 flex justify-center">
            <div className="w-48 h-full bg-white relative border-x-4 border-[#D7E2DB]">
              <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1.5 border-r-4 border-dashed border-[#F5A623] opacity-80" />

              <div className="absolute top-10 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-[#E5484D]/20 animate-ping absolute" />
                <div className="w-8 h-8 rounded-full bg-[#E5484D] border-2 border-white flex items-center justify-center text-white shadow-md z-10">
                  <MapPin className="w-4 h-4 fill-white" />
                </div>
                <span className="bg-white text-[#17211B] text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-sm border border-[#E4ECE7] mt-1 whitespace-nowrap">
                  {destinationName}
                </span>
              </div>

              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20">
                <div className="w-12 h-12 rounded-full bg-[#18B86A]/20 flex items-center justify-center animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-[#18B86A] border-2 border-white flex items-center justify-center text-white shadow-md">
                    <Navigation className="w-5 h-5 fill-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-[#E4ECE7] text-center shadow-xs">
            <span className="text-[10px] text-[#66736B] uppercase font-bold">Kecepatan</span>
            <p className="text-xl font-black font-mono text-[#18B86A]">{speed}</p>
            <span className="text-[9px] text-[#66736B]">km/jam</span>
          </div>

          <button
            type="button"
            onClick={() => setIsVoiceActive(!isVoiceActive)}
            className="absolute top-3 right-3 w-10 h-10 rounded-xl bg-white/95 backdrop-blur-md border border-[#E4ECE7] flex items-center justify-center text-[#17211B] hover:bg-[#F0F5F2] shadow-xs"
            title="Suara Panduan Belokan"
          >
            {isVoiceActive ? (
              <Volume2 className="w-5 h-5 text-[#18B86A]" />
            ) : (
              <VolumeX className="w-5 h-5 text-[#A8B2AC]" />
            )}
          </button>
        </div>

        <div className="p-4 bg-white space-y-3">
          <div className="flex items-center justify-between text-xs">
            <div>
              <span className="text-[#66736B] text-[10px] uppercase font-bold">Tujuan Navigasi:</span>
              <h4 className="font-bold text-[#17211B] text-sm truncate max-w-[240px]">
                {destinationName}
              </h4>
              <p className="text-[11px] text-[#66736B] truncate max-w-[240px]">
                {destinationAddress}
              </p>
            </div>
            <div className="text-right">
              <p className="text-lg font-black font-mono text-[#18B86A]">{distanceRemaining} km</p>
              <p className="text-[11px] text-[#66736B]">± {etaMinutes} menit lagi</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="py-3 px-3 rounded-2xl bg-white hover:bg-[#F0F5F2] text-[#18B86A] text-xs font-bold transition flex items-center justify-center gap-1.5 border border-[#D7E2DB] cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-[#18B86A]" />
              <span>Google Maps</span>
            </a>

            <button
              type="button"
              onClick={onClose}
              className="py-3 px-3 rounded-2xl bg-[#18B86A] hover:bg-[#0E8F52] text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
            >
              <span>Lanjut di Aplikasi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
