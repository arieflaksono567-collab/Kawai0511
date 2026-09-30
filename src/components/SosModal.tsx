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

  if (!isOpen) return null;

  const triggerSosBroadcast = () => {
    setSosSent(true);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col border border-red-200 animate-in slide-in-from-bottom-4">
        {/* Header */}
        <div className="p-4 bg-red-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center animate-pulse">
              <Siren className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-sm tracking-tight flex items-center gap-1.5">
                <span>Pusat Bantuan & SOS Darurat</span>
                <span className="bg-white/25 text-[10px] px-1.5 py-0.2 rounded font-mono">24 JAM</span>
              </h3>
              <p className="text-[11px] text-white/90">Tim Reaksi Cepat Kawai 0511 Banjarmasin</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch between emergency & breakdown */}
        <div className="grid grid-cols-2 p-1.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab('darurat')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'darurat'
                ? 'bg-red-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>Keamanan & Medis</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('kendaraan')}
            className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'kendaraan'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>Mogok / Ban Bocor</span>
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Location info */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex items-start gap-2">
            <MapPin className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Koordinat GPS Driver Terdeteksi:</span>
              <p className="font-semibold text-slate-800">{currentLocationName}</p>
              <p className="text-[11px] text-slate-500 font-mono">Mitra: {driverName}</p>
            </div>
          </div>

          {activeTab === 'darurat' ? (
            <>
              {/* Panic Button */}
              {sosSent ? (
                <div className="bg-emerald-50 border border-emerald-300 p-4 rounded-2xl text-center space-y-2">
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto shadow-md">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-sm text-emerald-950">Sinyal Bahaya Terkirim!</h4>
                  <p className="text-xs text-emerald-800">
                    Satgas Keamanan Kawai 0511 dan Polresta Banjarmasin telah menerima sinyal lokasi darurat kamu. Petugas sedang menghubungi nomor kamu.
                  </p>
                  <p className="text-[11px] font-mono text-emerald-700 bg-emerald-100/60 py-1 px-2 rounded">
                    Tiket Kasus: #SOS-0511-{Math.floor(1000 + Math.random() * 9000)}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <button
                    type="button"
                    onClick={triggerSosBroadcast}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-black text-sm shadow-xl shadow-red-600/30 flex items-center justify-center gap-2 active:scale-[0.98] transition-all"
                  >
                    <Siren className="w-5 h-5 animate-bounce" />
                    <span>TEKAN UNTUK SEBAR SINYAL SOS DARURAT</span>
                  </button>
                  <p className="text-[11px] text-slate-400">
                    Sinyal akan membunyikan alarm di Command Center Kawai 0511 dan membagikan titik koordinat GPS langsung.
                  </p>
                </div>
              )}

              {/* Emergency Contacts */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-800">Panggilan Cepat Darurat Banjarmasin:</span>

                <a
                  href="tel:0511-770-0511"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-red-100 text-red-600 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Satgas Siaga Kawai 0511</p>
                      <p className="text-[10px] text-slate-400">0511-770-0511 (Bebas Pulsa)</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-red-600 font-mono">Panggil →</span>
                </a>

                <a
                  href="tel:112"
                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Layanan Darurat Kota Banjarmasin (112)</p>
                      <p className="text-[10px] text-slate-400">Polisi, Damkar, & Ambulans RSUD Ulin</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-sky-600 font-mono">112 →</span>
                </a>
              </div>
            </>
          ) : (
            /* Vehicle breakdown assistance */
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-xs text-amber-900">
                <p className="font-bold mb-0.5">Bantuan Kendaraan Mitra Kawai</p>
                <p className="text-[11px] text-amber-800">
                  Mengalami ban bocor, rantai putus, atau motor mogok di jalan? Tim kawan bengkel siap datang ke lokasi kamu.
                </p>
              </div>

              <div className="space-y-2 text-xs">
                <button
                  type="button"
                  onClick={() => alert('Permintaan Tambal Ban Keliling telah dikirim ke mitra bengkel terdekat di Jl. A. Yani.')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left font-semibold text-slate-800"
                >
                  <span>1. Panggil Tambal Ban Keliling</span>
                  <span className="text-[11px] text-amber-600 font-bold">Pesan Bantuan</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Permintaan Antar Bensin Darurat telah dikirim ke kordinator zona.')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left font-semibold text-slate-800"
                >
                  <span>2. Bensin Habis / Darurat Pertalite</span>
                  <span className="text-[11px] text-amber-600 font-bold">Pesan Bantuan</span>
                </button>

                <button
                  type="button"
                  onClick={() => alert('Mobil Storing / Derek Motor telah disiagakan ke lokasi kamu.')}
                  className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-left font-semibold text-slate-800"
                >
                  <span>3. Motor Mati Total (Towing / Storing)</span>
                  <span className="text-[11px] text-amber-600 font-bold">Pesan Bantuan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
