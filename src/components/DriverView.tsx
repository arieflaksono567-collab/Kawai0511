import React, { useState, useEffect } from 'react';
import {
  Bike,
  Power,
  Navigation,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Radio,
  Compass,
  DollarSign,
  Phone,
  ShieldCheck,
  ChevronRight,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { LocationPoint } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';

interface DriverViewProps {
  activeRide: any;
  onAcceptRide: () => void;
  onRejectRide: () => void;
  onTimeoutRide: () => void;
  onArrivedRide: () => void;
  onStartRide: () => void;
  onCompleteRide: () => void;
  driverPosition: { x: number; y: number; heading?: number; name?: string };
  landmarks: LocationPoint[];
  pickup: LocationPoint;
  destination: LocationPoint;
}

export const DriverView: React.FC<DriverViewProps> = ({
  activeRide,
  onAcceptRide,
  onRejectRide,
  onTimeoutRide,
  onArrivedRide,
  onStartRide,
  onCompleteRide,
  driverPosition,
  landmarks,
  pickup,
  destination,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [todayEarnings, setTodayEarnings] = useState(168000);
  const [completedTrips, setCompletedTrips] = useState(12);

  const isOfferPending = activeRide && activeRide.status === 'SEARCHING' && isOnline;

  // 30-second countdown timer for incoming dispatch offer
  useEffect(() => {
    let timer: any = null;
    if (isOfferPending) {
      setCountdown(30);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeoutRide();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(30);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOfferPending]);

  // When trip completes, increment daily earnings
  useEffect(() => {
    if (activeRide && activeRide.status === 'COMPLETED') {
      const driverShare = Math.round((activeRide.totalFare || 12400) * 0.85);
      setTodayEarnings((prev) => prev + driverShare);
      setCompletedTrips((prev) => prev + 1);
    }
  }, [activeRide?.status]);

  const totalFare = activeRide?.totalFare || 12400;
  const driverNetShare = Math.round(totalFare * 0.85); // 85% driver take

  return (
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
      {/* 1. DRIVER HEADER */}
      <header className="px-5 py-4 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shadow">
              <img
                src="/src/assets/images/driver_portrait_ridho_1790780315040.jpg"
                alt="Ahmad Gazali"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
                isOnline ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-extrabold text-white">Ahmad Gazali</h2>
              <span className="text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-1.5 py-0.2 rounded border border-slate-700">
                DA 5110 KAW
              </span>
            </div>
            <p className="text-[11px] text-slate-400">Honda Vario 160 • ★ 4.9</p>
          </div>
        </div>

        {/* ONLINE / OFFLINE TOGGLE */}
        <button
          onClick={() => setIsOnline(!isOnline)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow ${
            isOnline
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-slate-800 text-slate-400 border border-slate-700 hover:text-white'
          }`}
        >
          <Power className="w-3.5 h-3.5" />
          <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
        </button>
      </header>

      {/* GPS STATUS BAR */}
      <div className="px-4 py-2 bg-slate-950/60 border-b border-slate-800/80 flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>GPS FRESH (&lt; 10s)</span>
          <span className="text-slate-500">•</span>
          <span className="text-slate-400">Akurasi ~5m</span>
        </div>
        <div className="text-slate-400 font-mono text-[10px]">
          Redis GEO • PostGIS Aktif
        </div>
      </div>

      {/* 2. DRIVER MAP VIEW */}
      <div className="p-3 bg-slate-950/40">
        <BanjarmasinMap
          pickup={pickup}
          destination={destination}
          driverPosition={driverPosition}
          landmarks={landmarks}
          status={activeRide?.status || 'idle'}
          isDriverView={true}
        />
      </div>

      {/* 3. DRIVER DISPATCH OR TRIP CONTROLS */}
      <div className="p-5 space-y-4">
        {/* CASE A: INCOMING OFFER MODAL / CARD (30s TIMER) */}
        {isOfferPending && (
          <div className="bg-slate-950 rounded-2xl border-2 border-emerald-500/60 p-5 shadow-2xl space-y-4 relative overflow-hidden animate-pulse-slow">
            {/* Top alert bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                  Order Masuk Baru!
                </span>
              </div>
              <div className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{countdown}s</span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-400 transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>

            {/* Trip Details */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Titik Jemput:
                  </span>
                  <span className="font-bold text-white text-sm">{pickup.name}</span>
                  <p className="text-[10px] text-slate-400 truncate">{pickup.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Tujuan Penumpang:
                  </span>
                  <span className="font-bold text-white text-sm">{destination.name}</span>
                  <p className="text-[10px] text-slate-400 truncate">{destination.address}</p>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block">Pendapatan Mitra (85%):</span>
                <span className="text-base font-black text-emerald-400 font-mono">
                  Rp {driverNetShare.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total Tarif:</span>
                <span className="text-xs font-bold text-slate-300 font-mono">
                  Rp {totalFare.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Action Buttons: ACCEPT vs REJECT */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={onRejectRide}
                className="py-3 bg-slate-800 hover:bg-rose-500/20 text-rose-400 border border-slate-700 hover:border-rose-500/40 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak (Reject)</span>
              </button>

              <button
                onClick={onAcceptRide}
                className="py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-black shadow-lg shadow-emerald-500/30 transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Terima Order</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE B: ACTIVE TRIP LIFECYCLE (ASSIGNED -> ARRIVED -> IN_TRIP -> COMPLETED) */}
        {activeRide &&
          ['ASSIGNED', 'ARRIVED', 'IN_TRIP'].includes(activeRide.status) && (
            <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-xs font-bold text-white">
                    Trip Sedang Berjalan (Order #{activeRide.id ? activeRide.id.slice(-6) : '0511'})
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {activeRide.status}
                </span>
              </div>

              {/* Passenger Info Card */}
              <div className="flex items-center justify-between p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                    Penumpang:
                  </span>
                  <span className="font-bold text-white text-sm">
                    {activeRide.passengerName || 'Arief Laksono'}
                  </span>
                  <p className="text-[10px] text-slate-400">Pembayaran Tunai (Cash)</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:+6281255110987"
                    className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 border border-emerald-500/30"
                    title="Hubungi Penumpang"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Progress Stepper & Contextual Button */}
              {activeRide.status === 'ASSIGNED' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    Menuju lokasi penjemputan penumpang di <strong>{pickup.name}</strong>.
                  </p>
                  <button
                    onClick={onArrivedRide}
                    className="w-full py-3.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs transition uppercase tracking-wider shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>SAYA SUDAH TIBA DI LOKASI PENJEMPUTAN</span>
                  </button>
                </div>
              )}

              {activeRide.status === 'ARRIVED' && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs">
                    Driver sudah tiba di titik jemput. Pastikan penumpang sudah naik kendaraan.
                  </div>
                  <button
                    onClick={onStartRide}
                    className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-xl text-xs transition uppercase tracking-wider shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>MULAI PERJALANAN (START TRIP)</span>
                  </button>
                </div>
              )}

              {activeRide.status === 'IN_TRIP' && (
                <div className="space-y-3">
                  <p className="text-xs text-slate-300">
                    Dalam perjalanan menuju <strong>{destination.name}</strong>.
                  </p>
                  <button
                    onClick={onCompleteRide}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs transition uppercase tracking-wider shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>SELESAIKAN PERJALANAN (COMPLETE)</span>
                  </button>
                </div>
              )}
            </div>
          )}

        {/* CASE C: IDLE & DRIVER SUMMARY WIDGET */}
        {(!activeRide ||
          activeRide.status === 'idle' ||
          activeRide.status === 'COMPLETED' ||
          activeRide.status === 'CANCELLED') &&
          !isOfferPending && (
            <div className="space-y-4">
              {/* Standby Status Banner */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isOnline ? 'bg-emerald-400 animate-ping' : 'bg-slate-500'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold text-white block">
                      {isOnline ? 'Siap Menerima Order Ojek' : 'Driver Sedang Istirahat (Offline)'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {isOnline ? 'Standby di sekitar Duta Mall Banjarmasin' : 'Aktifkan status untuk mulai'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Daily Performance & Earnings */}
              <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                    Kinerja Hari Ini
                  </span>
                  <span className="text-[10px] text-slate-400">Update real-time</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Pendapatan Bersih (85%):</span>
                    <span className="text-sm font-black text-emerald-400 font-mono mt-0.5 block">
                      Rp {todayEarnings.toLocaleString('id-ID')}
                    </span>
                  </div>

                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 block">Trip Selesai:</span>
                    <span className="text-sm font-black text-white font-mono mt-0.5 block">
                      {completedTrips} Perjalanan
                    </span>
                  </div>
                </div>

                {/* Driver Document / Verification Badge */}
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 text-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Verifikasi KYC: <strong>APPROVED</strong></span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">SIM C • STNK Aktif</span>
                </div>
              </div>
            </div>
          )}
      </div>
    </div>
  );
};
