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
  AlertTriangle,
  Star,
  Siren,
  Wallet,
  LayoutDashboard,
  Award,
} from 'lucide-react';
import { LocationPoint } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';
import { DriverEarningsCard } from './DriverEarningsCard';
import { TripHistoryModal } from './TripHistoryModal';
import { TripDetailModal } from './TripDetailModal';
import { SosModal } from './SosModal';
import { KAWAI_COLORS } from '../constants/theme';

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
  const [todayEarnings, setTodayEarnings] = useState(185500);
  const [driverBalance, setDriverBalance] = useState(245000);
  const [completedTrips, setCompletedTrips] = useState(12);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDetailRideId, setSelectedDetailRideId] = useState<string | null>(null);
  const [isSosOpen, setIsSosOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'orders' | 'earnings' | 'history'>('dashboard');

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
      setDriverBalance((prev) => prev + driverShare);
      setCompletedTrips((prev) => prev + 1);
    }
  }, [activeRide?.status]);

  const totalFare = activeRide?.totalFare || 12400;
  const driverNetShare = Math.round(totalFare * 0.85); // 85% driver take

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden flex flex-col font-sans text-[#0F172A] relative">
      {/* 1. DRIVER HEADER - Mitra KAWAI Brand Navy Header */}
      <header className="px-4 py-3.5 bg-[#0F172A] text-white flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shadow-xs flex items-center justify-center">
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
              className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#0F172A] ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-white">Ahmad Gazali</h2>
              <span className="text-[9px] bg-slate-800 text-slate-200 font-mono font-bold px-1.5 py-0.2 rounded border border-slate-700">
                DA 5110 KAW
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-300">
              <span>Honda Vario 160</span>
              <span>•</span>
              <span className="flex items-center gap-0.5 text-amber-400 font-semibold">
                <Star className="w-3 h-3 fill-amber-400" />
                4.9
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* ONLINE / OFFLINE TOGGLE */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-xs cursor-pointer ${
              isOnline
                ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                : 'bg-slate-800 text-slate-300 border border-slate-700 hover:text-white'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </header>

      {/* 2. MITRA NAVY DASHBOARD CARDS (Saldo, Pendapatan, Trip Selesai) */}
      <div className="bg-[#0B192C] text-white px-4 py-3 border-b border-slate-800">
        <div className="grid grid-cols-3 gap-2 text-center">
          {/* Saldo Dompet */}
          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Saldo Dompet</span>
            <span className="text-xs font-black font-mono text-emerald-400">
              Rp {driverBalance.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Pendapatan Hari Ini */}
          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Hari Ini (85%)</span>
            <span className="text-xs font-black font-mono text-white">
              Rp {todayEarnings.toLocaleString('id-ID')}
            </span>
          </div>

          {/* Total Trip */}
          <div className="bg-slate-900/80 rounded-xl p-2.5 border border-slate-800">
            <span className="text-[10px] text-slate-400 block font-medium">Trip Selesai</span>
            <span className="text-xs font-black font-mono text-amber-400">
              {completedTrips} Trip
            </span>
          </div>
        </div>

        {/* GPS Live Telemetry */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
            <span>GPS FRESH (&lt; 10s)</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400">Banjarmasin Tengah</span>
          </div>
          <span className="font-mono text-slate-500">Radar 1500m</span>
        </div>
      </div>

      {/* 3. DRIVER MAP VIEW */}
      <div className="p-3 bg-[#F8FAFC]">
        <BanjarmasinMap
          pickup={pickup}
          destination={destination}
          driverPosition={driverPosition}
          landmarks={landmarks}
          status={activeRide?.status || 'idle'}
          isDriverView={true}
        />
      </div>

      {/* 4. DRIVER DISPATCH OR TRIP CONTROLS */}
      <div className="p-4 space-y-3.5 flex-1">
        {/* CASE A: INCOMING OFFER (ORDER MASUK) - KAWAI RED ACCEPT BUTTON */}
        {isOfferPending && (
          <div className="bg-white rounded-2xl border-2 border-[#E1192E] p-4 shadow-md space-y-3 relative overflow-hidden animate-pulse-slow">
            {/* Top alert bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E1192E] animate-ping" />
                <span className="text-xs font-bold text-[#E1192E] uppercase tracking-wider">
                  Pesanan Masuk!
                </span>
              </div>
              <div className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-[#FEE2E2] text-[#E1192E] border border-[#E1192E]/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{countdown}s</span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#E1192E] transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>

            {/* Trip Details */}
            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-[#0F172A] text-white flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold block">
                    Titik Jemput:
                  </span>
                  <span className="font-bold text-[#0F172A] text-xs">{pickup.name}</span>
                  <p className="text-[10px] text-[#64748B] truncate">{pickup.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="w-5 h-5 rounded-md bg-[#FEE2E2] text-[#E1192E] flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation className="w-3 h-3" />
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-semibold block">
                    Tujuan Penumpang:
                  </span>
                  <span className="font-bold text-[#0F172A] text-xs">{destination.name}</span>
                  <p className="text-[10px] text-[#64748B] truncate">{destination.address}</p>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#64748B] block">Pendapatan Bersih (85%):</span>
                <span className="text-base font-black text-[#E1192E] font-mono">
                  Rp {driverNetShare.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#64748B] block">Total Tarif:</span>
                <span className="text-xs font-bold text-[#0F172A] font-mono">
                  Rp {totalFare.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Action Buttons: ACCEPT (RED) vs REJECT (SLATE) */}
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={onRejectRide}
                className="py-3 bg-[#F1F5F9] hover:bg-[#E2E8F0] text-[#64748B] border border-[#CBD5E1]/60 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak</span>
              </button>

              <button
                type="button"
                onClick={onAcceptRide}
                className="py-3 bg-[#E1192E] hover:bg-[#C81023] active:bg-[#B91223] text-white rounded-xl text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>TERIMA ORDER</span>
              </button>
            </div>
          </div>
        )}

        {/* CASE B: ACTIVE TRIP LIFECYCLE (ASSIGNED -> ARRIVED -> IN_TRIP) */}
        {activeRide && ['ASSIGNED', 'ARRIVED', 'IN_TRIP'].includes(activeRide.status) && (
          <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-4 space-y-3.5 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E1192E] animate-pulse" />
                <span className="text-xs font-bold text-[#0F172A]">
                  Trip Aktif #{activeRide.id ? activeRide.id.slice(-6) : '0511'}
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0F172A] text-white">
                {activeRide.status}
              </span>
            </div>

            {/* Passenger Info Card */}
            <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E2E8F0]">
              <div>
                <span className="text-[10px] text-[#64748B] uppercase font-semibold block">
                  Penumpang:
                </span>
                <span className="font-bold text-[#0F172A] text-sm">
                  {activeRide.passengerName || 'Arief Laksono'}
                </span>
                <p className="text-[10px] text-[#64748B]">Metode: Tunai / KawaiPay</p>
              </div>
              <a
                href="tel:+6281255110987"
                className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center hover:bg-black transition shadow-xs"
                title="Hubungi Penumpang"
              >
                <Phone className="w-4 h-4 text-[#E1192E]" />
              </a>
            </div>

            {/* Progress Actions */}
            {activeRide.status === 'ASSIGNED' && (
              <div className="space-y-2.5">
                <p className="text-xs text-[#64748B]">
                  Menuju titik penjemputan di <strong className="text-[#0F172A]">{pickup.name}</strong>.
                </p>
                <button
                  type="button"
                  onClick={onArrivedRide}
                  className="w-full py-3.5 bg-[#0F172A] hover:bg-black text-white font-bold rounded-xl text-xs transition uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MapPin className="w-4 h-4 text-[#E1192E]" />
                  <span>SAYA SUDAH TIBA DI TITIK JEMPUT</span>
                </button>
              </div>
            )}

            {activeRide.status === 'ARRIVED' && (
              <div className="space-y-2.5">
                <div className="p-2.5 bg-[#FEE2E2] border border-[#E1192E]/20 rounded-xl text-[#E1192E] text-xs font-bold">
                  Driver sudah tiba di titik jemput. Sambut penumpang dengan ramah.
                </div>
                <button
                  type="button"
                  onClick={onStartRide}
                  className="w-full py-3.5 bg-[#E1192E] hover:bg-[#C81023] text-white font-bold rounded-xl text-xs transition uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Navigation className="w-4 h-4" />
                  <span>MULAI PERJALANAN (START TRIP)</span>
                </button>
              </div>
            )}

            {activeRide.status === 'IN_TRIP' && (
              <div className="space-y-2.5">
                <p className="text-xs text-[#64748B]">
                  Mengantar penumpang menuju <strong className="text-[#0F172A]">{destination.name}</strong>.
                </p>
                <button
                  type="button"
                  onClick={onCompleteRide}
                  className="w-full py-3.5 bg-[#E1192E] hover:bg-[#C81023] text-white font-bold rounded-xl text-xs transition uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SELESAIKAN PERJALANAN (COMPLETE)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* CASE C: IDLE & SUMMARY WIDGET */}
        {(!activeRide ||
          activeRide.status === 'idle' ||
          activeRide.status === 'COMPLETED' ||
          activeRide.status === 'CANCELLED') &&
          !isOfferPending && (
            <div className="space-y-3.5">
              {/* Standby Banner */}
              <div
                className={`p-3.5 rounded-2xl border flex items-center justify-between ${
                  isOnline
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-[#F1F5F9] border-[#CBD5E1]/60 text-[#64748B]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-2.5 h-2.5 rounded-full ${
                      isOnline ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold block">
                      {isOnline ? 'ONLINE — SIAP MENERIMA ORDER' : 'OFFLINE — Sedang Istirahat'}
                    </span>
                    <span className="text-[10px] opacity-80">
                      {isOnline
                        ? 'Standby di area Banjarmasin Kota & sekitarnya'
                        : 'Nyalakan status Online untuk mendapatkan orderan'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Driver Earnings Card */}
              <DriverEarningsCard
                driverId="d0000000-0000-0000-0000-000000000001"
                driverName="Ahmad Gazali"
                initialTodayEarnings={todayEarnings || 185500}
                initialTodayRides={completedTrips || 12}
                initialWeekEarnings={1240000}
                onViewHistory={() => setShowHistoryModal(true)}
              />
            </div>
          )}
      </div>

      {/* 5. FLOATING EMERGENCY SOS BUTTON */}
      <div className="px-4 py-2 flex justify-end">
        <button
          type="button"
          onClick={() => setIsSosOpen(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E1192E] hover:bg-[#C81023] text-white rounded-full text-xs font-bold shadow-md transition cursor-pointer"
          title="Tombol Darurat SOS Mitra Driver"
        >
          <Siren className="w-3.5 h-3.5 animate-pulse" />
          <span>SOS Darurat</span>
        </button>
      </div>

      {/* 6. MITRA BOTTOM NAVIGATION BAR */}
      <nav className="sticky bottom-0 z-30 bg-white border-t border-[#E2E8F0] px-4 py-2 flex items-center justify-around shadow-md">
        <button
          type="button"
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition cursor-pointer ${
            activeTab === 'dashboard' ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <LayoutDashboard className="w-4 h-4 text-[#E1192E]" />
          <span>Dashboard</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
        >
          <Clock className="w-4 h-4" />
          <span>Pesanan</span>
        </button>

        <button
          type="button"
          onClick={() => {
            setShowHistoryModal(true);
          }}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
        >
          <Wallet className="w-4 h-4" />
          <span>Pendapatan</span>
        </button>

        <button
          type="button"
          onClick={() => setIsSosOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-[#E1192E] hover:text-[#C81023] transition cursor-pointer"
        >
          <Siren className="w-4 h-4 text-[#E1192E]" />
          <span>SOS</span>
        </button>
      </nav>

      {/* MODALS */}
      <TripHistoryModal
        role="DRIVER"
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {selectedDetailRideId && (
        <TripDetailModal
          rideId={selectedDetailRideId}
          role="DRIVER"
          isOpen={Boolean(selectedDetailRideId)}
          onClose={() => setSelectedDetailRideId(null)}
        />
      )}

      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        driverName="Ahmad Gazali (DA 5110 KAW)"
        currentLocationName="Area Duta Mall / Jl. A. Yani Banjarmasin"
      />
    </div>
  );
};
