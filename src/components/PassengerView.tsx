import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Car,
  Bike,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  Shield,
  CreditCard,
  Banknote,
  Search,
  Sparkles,
  ChevronDown,
  Info,
  Star,
} from 'lucide-react';
import { LocationPoint, Driver } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';
import { PassengerPaymentCard } from './PassengerPaymentCard';
import { TripHistoryModal } from './TripHistoryModal';
import { TripDetailModal } from './TripDetailModal';
import { KAWAI_COLORS } from '../constants/theme';

interface PassengerViewProps {
  pickup: LocationPoint;
  destination: LocationPoint;
  onPickupChange: (loc: LocationPoint) => void;
  onDestinationChange: (loc: LocationPoint) => void;
  landmarks: LocationPoint[];
  activeRide: any;
  onOrderRide: () => void;
  onCancelRide: () => void;
  driverPosition?: { x: number; y: number; heading?: number; name?: string };
  onOpenLiveMap?: () => void;
}

export const PassengerView: React.FC<PassengerViewProps> = ({
  pickup,
  destination,
  onPickupChange,
  onDestinationChange,
  landmarks,
  activeRide,
  onOrderRide,
  onCancelRide,
  driverPosition,
  onOpenLiveMap,
}) => {
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DIGITAL'>('CASH');
  const [showFareDetail, setShowFareDetail] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDetailRideId, setSelectedDetailRideId] = useState<string | null>(null);

  // Calculate distance based on landmark coordinates or default
  const dx = pickup.x - destination.x;
  const dy = pickup.y - destination.y;
  const rawDist = Math.sqrt(dx * dx + dy * dy);
  const distanceKm = Math.max(1.2, parseFloat((rawDist * 0.12).toFixed(1)));
  const durationMinutes = Math.max(4, Math.round(distanceKm * 3.2));

  // Phase 5 Fare Formula:
  // BASE_FARE = 7000, PER_KM = 2200, PER_MIN = 200, MINIMUM = 10000
  const baseFare = 7000;
  const kmFare = Math.round(distanceKm * 2200);
  const timeFare = Math.round(durationMinutes * 200);
  const rawFare = baseFare + kmFare + timeFare;
  const estimatedFare = Math.max(rawFare, 10000);

  const isRideActive =
    activeRide &&
    ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'].includes(activeRide.status);

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-[#E4ECE7] rounded-3xl shadow-sm overflow-hidden flex flex-col font-sans text-[#17211B]">
      {/* 1. HEADER (KAWAI 0511) - Bright & Clean */}
      <header className="px-5 py-4 bg-white border-b border-[#E4ECE7] flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#18B86A] flex items-center justify-center text-white font-black text-sm tracking-tight shadow-xs">
            0511
          </div>
          <div>
            <h1 className="text-base font-bold text-[#17211B] tracking-tight flex items-center gap-1.5">
              KAWAI 0511
              <span className="text-[10px] font-semibold text-[#0E8F52] bg-[#DDF8EA] border border-[#18B86A]/20 px-1.5 py-0.2 rounded-full">
                Ojek Banjar
              </span>
            </h1>
            <p className="text-[11px] text-[#66736B]">Banjarmasin & Sekitarnya</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 text-[11px] text-[#17211B] bg-[#F0F5F2] hover:bg-[#E4ECE7] px-2.5 py-1 rounded-full border border-[#D7E2DB] font-semibold transition cursor-pointer"
            title="Buka Riwayat Perjalanan Penumpang"
          >
            <Clock className="w-3.5 h-3.5 text-[#18B86A]" />
            <span>Riwayat</span>
          </button>

          <div className="flex items-center gap-1 text-[11px] text-[#0E8F52] bg-[#DDF8EA] px-2.5 py-1 rounded-full border border-[#18B86A]/20 font-medium">
            <span className="w-2 h-2 rounded-full bg-[#18B86A] animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </header>

      {/* 2. PETA BANJARMASIN (Bright Cartography) */}
      <div className="p-3 bg-[#F7FAF8]">
        <div className="text-[11px] text-[#66736B] mb-1.5 px-1 flex items-center justify-between">
          <span className="font-semibold text-[#17211B] flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-[#18B86A]" />
            Peta Banjarmasin
          </span>
          <div className="flex items-center gap-1.5">
            {onOpenLiveMap && (
              <button
                type="button"
                onClick={onOpenLiveMap}
                className="text-[10px] text-[#0E8F52] bg-[#DDF8EA] hover:bg-[#18B86A] hover:text-white border border-[#18B86A]/30 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                title="Buka Peta Interaktif & Simulator Perjalanan KAWAI 0511"
              >
                <Navigation className="w-2.5 h-2.5" />
                <span>Peta & Simulator Live</span>
              </button>
            )}
            <span className="text-[10px] text-[#A8B2AC]">Sentuh pin</span>
          </div>
        </div>

        <BanjarmasinMap
          pickup={pickup}
          destination={destination}
          driverPosition={driverPosition}
          landmarks={landmarks}
          status={activeRide?.status || 'idle'}
          onSelectLocation={(loc, type) => {
            if (type === 'destination') onDestinationChange(loc);
            else onPickupChange(loc);
          }}
        />
      </div>

      {/* 3. INPUT FORM & FARE CARD (Jika belum ada ride aktif / Completed / Cancelled) */}
      {!isRideActive || activeRide?.status === 'COMPLETED' || activeRide?.status === 'CANCELLED' ? (
        <div className="p-5 space-y-4">
          {/* PICKUP INPUT */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#18B86A] uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#18B86A]" />
              Pickup
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowPickupPicker(true);
                  setShowDestPicker(false);
                }}
                className="w-full bg-[#F0F5F2] hover:bg-[#EBF1ED] border border-[#D7E2DB] rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between text-xs text-[#17211B] transition focus:outline-none focus:border-[#18B86A]"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-6 h-6 rounded-lg bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center shrink-0">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold truncate text-[#17211B]">{pickup.name}</div>
                    <div className="text-[10px] text-[#66736B] truncate">{pickup.address}</div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#66736B] shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* DESTINATION INPUT */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-[#E5484D] uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-[#E5484D]" />
              Tujuan
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowDestPicker(true);
                  setShowPickupPicker(false);
                }}
                className="w-full bg-[#F0F5F2] hover:bg-[#EBF1ED] border border-[#D7E2DB] rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between text-xs text-[#17211B] transition focus:outline-none focus:border-[#E5484D]"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-6 h-6 rounded-lg bg-rose-50 text-[#E5484D] flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold truncate text-[#17211B]">
                      {destination.name || 'Mau ke mana?'}
                    </div>
                    <div className="text-[10px] text-[#66736B] truncate">{destination.address}</div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-[#66736B] shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* QUICK DESTINATION CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            <span className="text-[10px] text-[#66736B] shrink-0 font-medium">Cepat:</span>
            {landmarks.slice(0, 4).map((lm) => (
              <button
                key={lm.id}
                onClick={() => onDestinationChange(lm)}
                className={`px-2.5 py-1 rounded-full border whitespace-nowrap transition text-[11px] ${
                  destination.id === lm.id
                    ? 'bg-[#DDF8EA] text-[#0E8F52] border-[#18B86A]/40 font-semibold'
                    : 'bg-[#F0F5F2] text-[#66736B] border-[#D7E2DB] hover:bg-[#E4ECE7] hover:text-[#17211B]'
                }`}
              >
                {lm.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* 4. ESTIMASI FARE CARD */}
          <div className="bg-[#F7FAF8] rounded-2xl border border-[#E4ECE7] p-4 shadow-xs space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-[#66736B] block font-medium">Estimasi Tarif</span>
                <span className="text-xl font-black text-[#18B86A] tracking-tight font-mono">
                  Rp {estimatedFare.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-[#17211B] block">
                  {distanceKm} km • {durationMinutes} menit
                </span>
                <button
                  type="button"
                  onClick={() => setShowFareDetail(!showFareDetail)}
                  className="text-[10px] text-[#66736B] hover:text-[#18B86A] flex items-center gap-0.5 ml-auto mt-0.5"
                >
                  <Info className="w-3 h-3" />
                  <span>{showFareDetail ? 'Sembunyikan' : 'Rincian'}</span>
                </button>
              </div>
            </div>

            {/* DETAIL FARE FORMULA EXPANSION */}
            {showFareDetail && (
              <div className="pt-2.5 mt-2 border-t border-[#E4ECE7] text-[11px] text-[#66736B] space-y-1">
                <div className="flex justify-between">
                  <span>Tarif Dasar (Base Fare)</span>
                  <span className="text-[#17211B] font-mono">Rp 7.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Jarak ({distanceKm} km × Rp 2.200)</span>
                  <span className="text-[#17211B] font-mono">Rp {kmFare.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu ({durationMinutes} mnt × Rp 200)</span>
                  <span className="text-[#17211B] font-mono">Rp {timeFare.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-[#A8B2AC] text-[10px]">
                  <span>Tarif Minimum</span>
                  <span className="font-mono">Rp 10.000</span>
                </div>
              </div>
            )}

            {/* PAYMENT METHOD SELECTOR */}
            <div className="pt-2 border-t border-[#E4ECE7] flex items-center justify-between text-xs">
              <span className="text-[#66736B] text-[11px]">Metode Bayar:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/40 font-semibold'
                      : 'text-[#66736B] hover:text-[#17211B]'
                  }`}
                >
                  <Banknote className="w-3.5 h-3.5" />
                  <span>Tunai (Cash)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DIGITAL')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] transition ${
                    paymentMethod === 'DIGITAL'
                      ? 'bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/40 font-semibold'
                      : 'text-[#66736B] hover:text-[#17211B]'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>KawaiPay</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. ACTION BUTTON: [ PESAN OJEK ] (Primary Button: #18B86A, text white, rounded-2xl) */}
          <button
            onClick={onOrderRide}
            className="w-full py-4 bg-[#18B86A] hover:bg-[#0E8F52] active:bg-[#0E8F52] text-white font-bold rounded-2xl text-base shadow-sm transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
          >
            <Bike className="w-5 h-5 stroke-[2.5]" />
            <span>PESAN OJEK</span>
          </button>
        </div>
      ) : (
        /* ACTIVE RIDE LIFECYCLE STATES CARD */
        <div className="p-5 space-y-4">
          {/* SEARCHING STATE */}
          {activeRide.status === 'SEARCHING' && (
            <div className="bg-[#F7FAF8] rounded-2xl border border-[#E4ECE7] p-5 space-y-4 text-center">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#18B86A]/20 animate-ping" />
                <div className="relative w-14 h-14 rounded-full bg-[#DDF8EA] border-2 border-[#18B86A] flex items-center justify-center text-[#18B86A]">
                  <Bike className="w-7 h-7 animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#17211B]">Mencari Driver Terdekat...</h3>
                <p className="text-xs text-[#66736B] mt-1">
                  Radar radius 1.5 km • Mengirim offer dispatch (30 detik timeout)
                </p>
              </div>

              <div className="bg-white rounded-xl p-3 border border-[#E4ECE7] text-xs text-left space-y-1.5">
                <div className="flex justify-between text-[#66736B]">
                  <span>Rute:</span>
                  <span className="text-[#17211B] font-semibold">{distanceKm} km</span>
                </div>
                <div className="flex justify-between text-[#66736B]">
                  <span>Tarif:</span>
                  <span className="text-[#18B86A] font-bold font-mono">
                    Rp {estimatedFare.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-[#66736B]">
                  <span>Kandidat:</span>
                  <span className="text-[#17211B] font-semibold">Ahmad Gazali (DA 5110 KAW)</span>
                </div>
              </div>

              <button
                onClick={onCancelRide}
                className="w-full py-2.5 bg-white hover:bg-rose-50 border border-rose-200 text-[#E5484D] text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Batalkan Pencarian</span>
              </button>
            </div>
          )}

          {/* ASSIGNED STATE */}
          {activeRide.status === 'ASSIGNED' && (
            <div className="bg-[#F7FAF8] rounded-2xl border border-[#E4ECE7] p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E4ECE7]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#0E8F52]">
                  <CheckCircle2 className="w-4 h-4 text-[#18B86A]" />
                  <span>Driver Ditemukan!</span>
                </div>
                <span className="text-[11px] bg-[#DDF8EA] text-[#0E8F52] px-2 py-0.5 rounded-full font-mono font-semibold">
                  ETA ~3 Menit
                </span>
              </div>

              {/* Driver Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-[#F0F5F2] border border-[#D7E2DB] flex items-center justify-center text-[#66736B] overflow-hidden shadow-xs">
                    <img
                      src="/src/assets/images/driver_portrait_ridho_1790780315040.jpg"
                      alt="Driver"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  </div>
                  <div>
                    <h4 className="font-bold text-[#17211B] text-sm">
                      {activeRide.driver?.name || 'Ahmad Gazali'}
                    </h4>
                    <p className="text-xs text-[#66736B]">
                      {activeRide.driver?.vehicleModel || 'Honda Vario 160'} • ★{' '}
                      {activeRide.driver?.rating || '4.9'}
                    </p>
                    <span className="inline-block mt-0.5 text-[10px] bg-[#F0F5F2] text-[#17211B] font-mono font-bold px-1.5 py-0.2 rounded border border-[#D7E2DB]">
                      {activeRide.driver?.vehiclePlate || 'DA 5110 KAW'}
                    </span>
                  </div>
                </div>

                <a
                  href={`tel:${activeRide.driver?.phone || '+6281390511200'}`}
                  className="w-10 h-10 rounded-xl bg-[#DDF8EA] border border-[#18B86A]/30 text-[#0E8F52] flex items-center justify-center hover:bg-[#18B86A] hover:text-white transition shadow-xs"
                  title="Telepon Driver"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              <div className="p-2.5 bg-white rounded-xl text-xs text-[#66736B] flex items-center justify-between border border-[#E4ECE7]">
                <span>Driver sedang menuju titik jemput</span>
                <span className="font-mono text-[#18B86A] font-bold">
                  Rp {estimatedFare.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                onClick={onCancelRide}
                className="w-full py-2 bg-white hover:bg-rose-50 text-[#E5484D] text-xs font-semibold rounded-xl transition border border-rose-200"
              >
                Batalkan Order
              </button>
            </div>
          )}

          {/* ARRIVED STATE */}
          {activeRide.status === 'ARRIVED' && (
            <div className="bg-[#DDF8EA]/40 rounded-2xl border border-[#18B86A] p-4 space-y-3">
              <div className="p-3 bg-[#DDF8EA] border border-[#18B86A]/30 rounded-xl text-[#0E8F52] text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#18B86A] shrink-0" />
                <span>Driver telah tiba di lokasi penjemputan! Harap temui driver Anda.</span>
              </div>

              <div className="flex items-center justify-between text-xs text-[#17211B] px-1">
                <div>
                  <span className="text-[#66736B] block text-[10px]">Mitra:</span>
                  <span className="font-bold text-[#17211B]">
                    {activeRide.driver?.name || 'Ahmad Gazali'}
                  </span>
                  <span className="ml-1 text-[11px] font-mono text-[#66736B]">
                    ({activeRide.driver?.vehiclePlate || 'DA 5110 KAW'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[#66736B] block text-[10px]">Total Tarif:</span>
                  <span className="font-mono font-bold text-[#18B86A] text-sm">
                    Rp {estimatedFare.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* IN_TRIP STATE */}
          {activeRide.status === 'IN_TRIP' && (
            <div className="bg-[#F7FAF8] rounded-2xl border border-[#E4ECE7] p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-[#2F80ED]">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>Sedang dalam Perjalanan ke Destinasi</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-[#E4ECE7] space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-[#E5484D] shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-[#66736B] block">Menuju ke:</span>
                    <span className="font-bold text-[#17211B]">{destination.name}</span>
                    <p className="text-[10px] text-[#66736B]">{destination.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-[#66736B]">
                <span>Kecepatan ~35 km/jam</span>
                <span className="text-[#18B86A] font-mono font-bold">
                  Rp {estimatedFare.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          {/* COMPLETED STATE: PEMBAYARAN UI */}
          {activeRide.status === 'COMPLETED' && (
            <div className="space-y-4">
              <PassengerPaymentCard
                fareAmount={activeRide.totalFare || estimatedFare || 18400}
                rideId={activeRide.id || 'ride-0511-demo'}
                driverId={activeRide.driver?.id || 'd0000000-0000-0000-0000-000000000001'}
                driverName={activeRide.driver?.name || 'Ahmad Gazali'}
                onResetOrder={onCancelRide}
              />
              <button
                type="button"
                onClick={() => setSelectedDetailRideId(activeRide.id || 'ride-0511-102')}
                className="w-full py-2.5 bg-white hover:bg-[#F0F5F2] text-[#0E8F52] border border-[#18B86A]/40 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-[#18B86A]" />
                <span>Lihat Detail Perjalanan & Beri Rating</span>
              </button>
            </div>
          )}

          {/* CANCELLED STATE */}
          {activeRide.status === 'CANCELLED' && (
            <div className="bg-[#F7FAF8] rounded-2xl border border-rose-200 p-4 space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-50 text-[#E5484D] mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-[#17211B] text-sm">Pesanan Dibatalkan</h4>
              <p className="text-xs text-[#66736B]">
                {activeRide.cancellationReason || 'Pesanan dibatalkan oleh pengguna'}
              </p>
              <button
                onClick={onCancelRide}
                className="w-full py-2.5 bg-white hover:bg-[#F0F5F2] text-[#17211B] border border-[#D7E2DB] font-semibold rounded-xl text-xs transition"
              >
                Buat Pesanan Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL / DROPDOWN LOCATION PICKER */}
      {(showPickupPicker || showDestPicker) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E4ECE7] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl flex flex-col max-h-[80vh] text-[#17211B]">
            <div className="p-4 border-b border-[#E4ECE7] flex items-center justify-between bg-[#F7FAF8]">
              <div className="flex items-center gap-2">
                <MapPin
                  className={`w-4 h-4 ${showPickupPicker ? 'text-[#18B86A]' : 'text-[#E5484D]'}`}
                />
                <h3 className="font-bold text-[#17211B] text-sm">
                  {showPickupPicker ? 'Pilih Titik Penjemputan' : 'Pilih Destinasi Tujuan'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPickupPicker(false);
                  setShowDestPicker(false);
                  setSearchQuery('');
                }}
                className="text-[#66736B] hover:text-[#17211B] p-1 rounded-lg hover:bg-[#F0F5F2]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-[#E4ECE7] bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-[#66736B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari jalan, mall, kampus, pasar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F0F5F2] border border-[#D7E2DB] rounded-xl pl-9 pr-3 py-2 text-xs text-[#17211B] placeholder-[#A8B2AC] focus:outline-none focus:border-[#18B86A]"
                />
              </div>
            </div>

            {/* Landmarks List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {landmarks
                .filter(
                  (lm) =>
                    lm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    lm.address.toLowerCase().includes(searchQuery.toLowerCase())
                )
                .map((lm) => (
                  <button
                    key={lm.id}
                    onClick={() => {
                      if (showPickupPicker) onPickupChange(lm);
                      else onDestinationChange(lm);
                      setShowPickupPicker(false);
                      setShowDestPicker(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#F0F5F2] transition flex items-center justify-between group"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#18B86A]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#17211B] group-hover:text-[#18B86A]">
                          {lm.name}
                        </div>
                        <div className="text-[10px] text-[#66736B]">{lm.address}</div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* TRIP HISTORY MODAL (PASSENGER) */}
      <TripHistoryModal
        role="CUSTOMER"
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {/* SINGLE TRIP DETAIL MODAL (PASSENGER) */}
      {selectedDetailRideId && (
        <TripDetailModal
          rideId={selectedDetailRideId}
          role="CUSTOMER"
          isOpen={Boolean(selectedDetailRideId)}
          onClose={() => setSelectedDetailRideId(null)}
        />
      )}
    </div>
  );
};
