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
} from 'lucide-react';
import { LocationPoint } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';
import { DriverEarningsCard } from './DriverEarningsCard';
import { TripHistoryModal } from './TripHistoryModal';
import { TripDetailModal } from './TripDetailModal';
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
  const [completedTrips, setCompletedTrips] = useState(12);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDetailRideId, setSelectedDetailRideId] = useState<string | null>(null);

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
    <div className="w-full max-w-md mx-auto bg-white border border-[#E4ECE7] rounded-3xl shadow-sm overflow-hidden flex flex-col font-sans text-[#17211B]">
      {/* 1. DRIVER HEADER (Bright & Clean) */}
      <header className="px-5 py-4 bg-white border-b border-[#E4ECE7] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-xl bg-[#F0F5F2] border border-[#D7E2DB] overflow-hidden shadow-xs">
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
              className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white ${
                isOnline ? 'bg-[#18B86A]' : 'bg-[#66736B]'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-[#17211B]">Ahmad Gazali</h2>
              <span className="text-[10px] bg-[#F0F5F2] text-[#17211B] font-mono font-bold px-1.5 py-0.2 rounded border border-[#D7E2DB]">
                DA 5110 KAW
              </span>
            </div>
            <p className="text-[11px] text-[#66736B]">Honda Vario 160 • ★ 4.9</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#F0F5F2] hover:bg-[#E4ECE7] text-[#17211B] border border-[#D7E2DB] transition cursor-pointer"
            title="Riwayat Trip Driver"
          >
            <Clock className="w-3.5 h-3.5 text-[#18B86A]" />
            <span>Riwayat</span>
          </button>

          {/* ONLINE / OFFLINE TOGGLE */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition shadow-xs ${
              isOnline
                ? 'bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/40 hover:bg-[#DDF8EA]'
                : 'bg-[#F0F5F2] text-[#66736B] border border-[#D7E2DB] hover:text-[#17211B]'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </header>

      {/* GPS STATUS BAR */}
      <div className="px-4 py-2 bg-[#F0F5F2] border-b border-[#E4ECE7] flex items-center justify-between text-[11px]">
        <div className="flex items-center gap-1.5 text-[#0E8F52] font-medium">
          <Radio className="w-3 h-3 text-[#18B86A] animate-pulse" />
          <span>GPS FRESH (&lt; 10s)</span>
          <span className="text-[#A8B2AC]">•</span>
          <span className="text-[#66736B]">Akurasi ~5m</span>
        </div>
        <div className="text-[#66736B] font-mono text-[10px]">
          Redis GEO • PostGIS Aktif
        </div>
      </div>

      {/* 2. DRIVER MAP VIEW */}
      <div className="p-3 bg-[#F7FAF8]">
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
        {/* CASE A: INCOMING OFFER (ORDER MASUK) */}
        {isOfferPending && (
          <div className="bg-white rounded-2xl border-2 border-[#18B86A] p-5 shadow-md space-y-4 relative overflow-hidden animate-pulse-slow">
            {/* Top alert bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#18B86A] animate-ping" />
                <span className="text-xs font-bold text-[#18B86A] uppercase tracking-wider">
                  Order Masuk Baru!
                </span>
              </div>
              <div className="text-xs font-bold font-mono px-2 py-0.5 rounded-full bg-amber-50 text-[#F5A623] border border-[#F5A623]/30 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{countdown}s</span>
              </div>
            </div>

            {/* Countdown Progress Bar */}
            <div className="w-full h-1.5 bg-[#F0F5F2] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#18B86A] transition-all duration-1000 ease-linear rounded-full"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>

            {/* Trip Details */}
            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center shrink-0 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-[#18B86A]" />
                </div>
                <div>
                  <span className="text-[10px] text-[#66736B] uppercase font-semibold block">
                    Titik Jemput:
                  </span>
                  <span className="font-bold text-[#17211B] text-sm">{pickup.name}</span>
                  <p className="text-[10px] text-[#66736B] truncate">{pickup.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-md bg-rose-50 text-[#E5484D] flex items-center justify-center shrink-0 mt-0.5">
                  <Navigation className="w-3.5 h-3.5" />
                </div>
                <div>
                  <span className="text-[10px] text-[#66736B] uppercase font-semibold block">
                    Tujuan Penumpang:
                  </span>
                  <span className="font-bold text-[#17211B] text-sm">{destination.name}</span>
                  <p className="text-[10px] text-[#66736B] truncate">{destination.address}</p>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="p-3 bg-[#F7FAF8] rounded-xl border border-[#E4ECE7] flex items-center justify-between text-xs">
              <div>
                <span className="text-[10px] text-[#66736B] block">Pendapatan Mitra (85%):</span>
                <span className="text-base font-black text-[#18B86A] font-mono">
                  Rp {driverNetShare.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-[#66736B] block">Total Tarif:</span>
                <span className="text-xs font-bold text-[#17211B] font-mono">
                  Rp {totalFare.toLocaleString('id-ID')}
                </span>
              </div>
            </div>

            {/* Action Buttons: ACCEPT vs REJECT */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={onRejectRide}
                className="py-3 bg-white hover:bg-rose-50 text-[#E5484D] border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <XCircle className="w-4 h-4" />
                <span>Tolak (Reject)</span>
              </button>

              <button
                onClick={onAcceptRide}
                className="py-3 bg-[#18B86A] hover:bg-[#0E8F52] text-white rounded-xl text-xs font-bold shadow-xs transition flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider"
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
            <div className="bg-[#F7FAF8] rounded-2xl border border-[#E4ECE7] p-4 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E4ECE7]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#18B86A] animate-pulse" />
                  <span className="text-xs font-bold text-[#17211B]">
                    Trip Sedang Berjalan (Order #{activeRide.id ? activeRide.id.slice(-6) : '0511'})
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/20">
                  {activeRide.status}
                </span>
              </div>

              {/* Passenger Info Card */}
              <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-[#E4ECE7]">
                <div>
                  <span className="text-[10px] text-[#66736B] uppercase font-semibold block">
                    Penumpang:
                  </span>
                  <span className="font-bold text-[#17211B] text-sm">
                    {activeRide.passengerName || 'Arief Laksono'}
                  </span>
                  <p className="text-[10px] text-[#66736B]">Pembayaran Tunai (Cash)</p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href="tel:+6281255110987"
                    className="w-9 h-9 rounded-lg bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center hover:bg-[#18B86A] hover:text-white border border-[#18B86A]/30 transition"
                    title="Hubungi Penumpang"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                </div>
              </div>

              {/* Progress Stepper & Contextual Button */}
              {activeRide.status === 'ASSIGNED' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#66736B]">
                    Menuju lokasi penjemputan penumpang di <strong className="text-[#17211B]">{pickup.name}</strong>.
                  </p>
                  <button
                    onClick={onArrivedRide}
                    className="w-full py-3.5 bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold rounded-xl text-xs transition uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>SAYA SUDAH TIBA DI LOKASI PENJEMPUTAN</span>
                  </button>
                </div>
              )}

              {activeRide.status === 'ARRIVED' && (
                <div className="space-y-3">
                  <div className="p-2.5 bg-[#DDF8EA] border border-[#18B86A]/30 rounded-xl text-[#0E8F52] text-xs">
                    Driver sudah tiba di titik jemput. Pastikan penumpang sudah naik kendaraan.
                  </div>
                  <button
                    onClick={onStartRide}
                    className="w-full py-3.5 bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold rounded-xl text-xs transition uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
                  >
                    <Navigation className="w-4 h-4" />
                    <span>MULAI PERJALANAN (START TRIP)</span>
                  </button>
                </div>
              )}

              {activeRide.status === 'IN_TRIP' && (
                <div className="space-y-3">
                  <p className="text-xs text-[#66736B]">
                    Dalam perjalanan menuju <strong className="text-[#17211B]">{destination.name}</strong>.
                  </p>
                  <button
                    onClick={onCompleteRide}
                    className="w-full py-3.5 bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold rounded-xl text-xs transition uppercase tracking-wider shadow-sm flex items-center justify-center gap-2"
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
              {/* COMPLETED TRIP ACTION CARD FOR DRIVER */}
              {activeRide && activeRide.status === 'COMPLETED' && (
                <div className="bg-[#DDF8EA] border-2 border-[#18B86A] rounded-2xl p-4 shadow-sm space-y-3 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-[#18B86A]" />
                      <span className="text-xs font-bold text-[#0E8F52] uppercase tracking-wider">
                        Perjalanan Selesai
                      </span>
                    </div>
                    <span className="text-[10px] font-mono font-bold bg-white text-[#0E8F52] border border-[#18B86A]/20 px-2 py-0.5 rounded-full">
                      Bagi Hasil 85%
                    </span>
                  </div>

                  <div className="bg-white rounded-xl p-3 border border-[#18B86A]/20 space-y-1.5 text-xs">
                    <div className="flex justify-between text-[#66736B]">
                      <span>Pendapatan Bersih Masuk Saldo:</span>
                      <strong className="text-sm font-extrabold text-[#0E8F52]">
                        Rp {driverNetShare.toLocaleString('id-ID')}
                      </strong>
                    </div>
                    <div className="flex justify-between text-[#66736B] text-[11px]">
                      <span>Rute:</span>
                      <span className="font-semibold text-[#17211B] line-clamp-1">
                        {pickup.name} → {destination.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-[#66736B] text-[11px]">
                      <span>Pelanggan:</span>
                      <span className="font-semibold text-[#17211B]">
                        {activeRide.passengerName || 'Arief Laksono'}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setSelectedDetailRideId(activeRide.id || 'ride-0511-102')}
                      className="py-2.5 px-2 bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Star className="w-3.5 h-3.5 fill-white" />
                      <span>Detail & Rating</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowHistoryModal(true)}
                      className="py-2.5 px-2 bg-white hover:bg-[#F0F5F2] text-[#17211B] border border-[#D7E2DB] font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Clock className="w-3.5 h-3.5 text-[#18B86A]" />
                      <span>Riwayat Trip</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Standby Status Banner (Requirement 10: ONLINE — SIAP MENERIMA ORDER) */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isOnline
                    ? 'bg-[#DDF8EA] border-[#18B86A]/30 text-[#0E8F52]'
                    : 'bg-[#F0F5F2] border-[#D7E2DB] text-[#66736B]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      isOnline ? 'bg-[#18B86A] animate-ping' : 'bg-[#66736B]'
                    }`}
                  />
                  <div>
                    <span className="text-xs font-bold block">
                      {isOnline
                        ? 'ONLINE — SIAP MENERIMA ORDER'
                        : 'OFFLINE — Driver Sedang Istirahat'}
                    </span>
                    <span className="text-[10px] opacity-80">
                      {isOnline
                        ? 'Standby di sekitar Duta Mall Banjarmasin'
                        : 'Aktifkan status untuk mulai menerima order'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Phase 6C Authoritative Driver Earnings Card */}
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

      {/* TRIP HISTORY MODAL (DRIVER) */}
      <TripHistoryModal
        role="DRIVER"
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* SINGLE TRIP DETAIL MODAL (DRIVER) */}
      {selectedDetailRideId && (
        <TripDetailModal
          rideId={selectedDetailRideId}
          role="DRIVER"
          isOpen={Boolean(selectedDetailRideId)}
          onClose={() => setSelectedDetailRideId(null)}
        />
      )}
    </div>
  );
};
