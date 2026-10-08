import React, { useState } from 'react';
import { ShieldAlert, PhoneCall, AlertTriangle, MapPin, CheckCircle2, X, Wrench, Siren } from 'lucide-react';

interface SosModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverName?: string;
  currentLocationName?: string;
}

export const SosModal: React.FC<SosModalProps> = ({
  isOpen,
  onClose,
  driverName = 'Pak Ridho Saputra (DA 4511 AB)',
  currentLocationName = 'Sekitar Jl. A. Yani Km 2, Banjarmasin',
}) => {
  const [sosSent, setSosSent] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'darurat' | 'kendaraan'>('darurat');
  const [bantuanMsg, setBantuanMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerSosBroadcast = () => {
    setSosSent(true);
  };

  const handleRequestBengkel = (serviceName: string) => {
    setBantuanMsg(`Permintaan "${serviceName}" telah dikirim ke tim terdekat di sekitar lokasi kamu.`);
    setTimeout(() => {
      setBantuanMsg(null);
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col border border-[#E4ECE7] animate-in slide-in-from-bottom-4 text-[#17211B]">
        {/* Header - Danger Red for SOS Center */}
        <div className="p-4 bg-[#E5484D] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
              <Siren className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-tight flex items-center gap-1.5">
                <span>Pusat Bantuan & SOS Darurat</span>
                <span className="bg-white/25 text-[10px] px-1.5 py-0.2 rounded font-mono">24 JAM</span>
              </h3>
              <p className="text-[11px] text-white/90">Tim Reaksi Cepat Kawai 0511 Banjarmasin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch between emergency & breakdown */}
        <div className="grid grid-cols-2 p-1.5 bg-[#F0F5F2] border-b border-[#E4ECE7]">
          <button
            type="button"
            onClick={() => setActiveTab('darurat')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'darurat'
                ? 'bg-[#E5484D] text-white shadow-xs'
                : 'text-[#66736B] hover:text-[#17211B]'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Keamanan & Medis</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kendaraan')}
            className={`py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'kendaraan'
                ? 'bg-[#F5A623] text-white shadow-xs'
                : 'text-[#66736B] hover:text-[#17211B]'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Mogok / Ban Bocor</span>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Location info */}
          <div className="bg-[#F0F5F2] p-3 rounded-2xl border border-[#E4ECE7] text-xs flex items-start gap-2.5">
            <MapPin className="w-4 h-4 text-[#E5484D] shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold text-[#66736B]">Koordinat GPS Terdeteksi:</span>
              <p className="font-semibold text-[#17211B]">{currentLocationName}</p>
              <p className="text-[11px] text-[#66736B] font-mono">Mitra / Pengguna: {driverName}</p>
            </div>
          </div>

          {bantuanMsg && (
            <div className="bg-[#DDF8EA] border border-[#18B86A]/40 text-[#0E8F52] p-3 rounded-2xl text-xs flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-[#18B86A] shrink-0" />
              <span className="font-medium">{bantuanMsg}</span>
            </div>
          )}

          {activeTab === 'darurat' ? (
            <>
              {sosSent ? (
                <div className="bg-[#DDF8EA] border border-[#18B86A]/30 p-4 rounded-2xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-[#18B86A] text-white flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-[#0E8F52]">Sinyal Bahaya Terkirim!</h4>
                  <p className="text-xs text-[#17211B]">
                    Satgas Keamanan Kawai 0511 dan Polresta Banjarmasin telah menerima sinyal lokasi darurat kamu. Petugas sedang menghubungi nomor kamu.
                  </p>
                  <p className="text-[11px] font-mono text-[#0E8F52] bg-white py-1 px-2 rounded-xl border border-[#18B86A]/20">
                    Tiket Kasus: #SOS-0511-{Math.floor(1000 + Math.random() * 9000)}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <button
                    type="button"
                    onClick={triggerSosBroadcast}
                    className="w-full py-4 rounded-2xl bg-[#E5484D] hover:bg-rose-700 text-white font-black text-sm shadow-md shadow-red-500/20 flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <Siren className="w-5 h-5 animate-bounce" />
                    <span>TEKAN UNTUK SEBAR SINYAL SOS DARURAT</span>
                  </button>
                  <p className="text-[11px] text-[#66736B]">
                    Sinyal akan membunyikan alarm di Command Center Kawai 0511 dan membagikan titik koordinat GPS langsung.
                  </p>
                </div>
              )}

              {/* Emergency Contacts */}
              <div className="space-y-2 pt-1 border-t border-[#E4ECE7]">
                <span className="text-xs font-bold text-[#17211B]">Panggilan Cepat Darurat Banjarmasin:</span>

                <a
                  href="tel:0511-770-0511"
                  className="flex items-center justify-between p-3 rounded-2xl border border-[#E4ECE7] hover:bg-[#F0F5F2] transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-[#E5484D] flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#17211B]">Satgas Siaga Kawai 0511</p>
                      <p className="text-[10px] text-[#66736B]">0511-770-0511 (Bebas Pulsa)</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#E5484D] font-mono">Panggil →</span>
                </a>

                <a
                  href="tel:112"
                  className="flex items-center justify-between p-3 rounded-2xl border border-[#E4ECE7] hover:bg-[#F0F5F2] transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-sky-50 text-[#2F80ED] flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-[#17211B]">Layanan Darurat Kota Banjarmasin (112)</p>
                      <p className="text-[10px] text-[#66736B]">Polisi, Damkar, & Ambulans RSUD Ulin</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#2F80ED] font-mono">112 →</span>
                </a>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <div className="bg-[#DDF8EA] border border-[#18B86A]/20 p-3 rounded-2xl text-xs text-[#0E8F52]">
                <p className="font-bold mb-0.5">Bantuan Kendaraan Mitra Kawai</p>
                <p className="text-[11px] text-[#17211B]/80">
                  Mengalami ban bocor, rantai putus, atau motor mogok di jalan? Tim kawan bengkel siap datang ke lokasi kamu.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleRequestBengkel('Tambal Ban Keliling')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#E4ECE7] bg-white hover:bg-[#F0F5F2] text-left font-semibold text-[#17211B] transition-colors cursor-pointer"
                >
                  <span>1. Panggil Tambal Ban Keliling</span>
                  <span className="text-[11px] text-[#18B86A] font-bold">Pesan Bantuan</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestBengkel('Antar Bensin Darurat')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#E4ECE7] bg-white hover:bg-[#F0F5F2] text-left font-semibold text-[#17211B] transition-colors cursor-pointer"
                >
                  <span>2. Bensin Habis / Darurat Pertalite</span>
                  <span className="text-[11px] text-[#18B86A] font-bold">Pesan Bantuan</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleRequestBengkel('Storing / Derek Motor')}
                  className="w-full flex items-center justify-between p-3 rounded-2xl border border-[#E4ECE7] bg-white hover:bg-[#F0F5F2] text-left font-semibold text-[#17211B] transition-colors cursor-pointer"
                >
                  <span>3. Motor Mati Total (Towing / Storing)</span>
                  <span className="text-[11px] text-[#18B86A] font-bold">Pesan Bantuan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
