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
  Info
} from 'lucide-react';
import { LocationPoint, Driver } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';

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
}) => {
  const [showPickupPicker, setShowPickupPicker] = useState(false);
  const [showDestPicker, setShowDestPicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'DIGITAL'>('CASH');
  const [showFareDetail, setShowFareDetail] = useState(false);

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
    <div className="w-full max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col font-sans">
      {/* 1. HEADER (KAWAI 0511) */}
      <header className="px-5 py-4 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm tracking-tight shadow-lg shadow-emerald-500/20">
            0511
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-wider flex items-center gap-1.5">
              KAWAI 0511
              <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.2 rounded-full">
                Ojek Banjar
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Banjarmasin & Sekitarnya</p>
          </div>
        </div>

        <div className="flex items-center gap-1 text-[11px] text-slate-300 bg-slate-900 px-2.5 py-1 rounded-full border border-slate-800">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>Online</span>
        </div>
      </header>

      {/* 2. PETA BANJARMASIN */}
      <div className="p-3 bg-slate-950/40">
        <div className="text-[11px] text-slate-400 mb-1.5 px-1 flex items-center justify-between">
          <span className="font-semibold text-slate-300 flex items-center gap-1">
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            Peta Banjarmasin
          </span>
          <span className="text-[10px] text-slate-500">Sentuh pin untuk ganti rute</span>
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
          {/* PICKUP INPUT: [ Lokasi saya ] */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              Pickup
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowPickupPicker(true);
                  setShowDestPicker(false);
                }}
                className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between text-xs text-white transition focus:outline-none focus:border-emerald-500"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                    <Navigation className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold truncate">{pickup.name}</div>
                    <div className="text-[10px] text-slate-400 truncate">{pickup.address}</div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* DESTINATION INPUT: [ Mau ke mana? ] */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-400" />
              Tujuan
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowDestPicker(true);
                  setShowPickupPicker(false);
                }}
                className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between text-xs text-white transition focus:outline-none focus:border-rose-500"
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="w-6 h-6 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center shrink-0">
                    <MapPin className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <div className="font-semibold truncate">
                      {destination.name || 'Mau ke mana?'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">{destination.address}</div>
                  </div>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </button>
            </div>
          </div>

          {/* QUICK DESTINATION CHIPS */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            <span className="text-[10px] text-slate-500 shrink-0 font-medium">Cepat:</span>
            {landmarks.slice(0, 4).map((lm) => (
              <button
                key={lm.id}
                onClick={() => onDestinationChange(lm)}
                className={`px-2.5 py-1 rounded-full border whitespace-nowrap transition text-[11px] ${
                  destination.id === lm.id
                    ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 font-semibold'
                    : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-800'
                }`}
              >
                {lm.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* 4. ESTIMASI FARE CARD */}
          {/* ┌──────────────────────┐ */}
          {/* │ Estimasi Rp 12.400   │ */}
          {/* │ 4.2 km • 14 menit    │ */}
          {/* └──────────────────────┘ */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 shadow-md space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block font-medium">Estimasi Tarif</span>
                <span className="text-xl font-black text-emerald-400 tracking-tight font-mono">
                  Rp {estimatedFare.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs font-semibold text-slate-200 block">
                  {distanceKm} km • {durationMinutes} menit
                </span>
                <button
                  type="button"
                  onClick={() => setShowFareDetail(!showFareDetail)}
                  className="text-[10px] text-slate-400 hover:text-emerald-400 flex items-center gap-0.5 ml-auto mt-0.5"
                >
                  <Info className="w-3 h-3" />
                  <span>{showFareDetail ? 'Sembunyikan' : 'Rincian'}</span>
                </button>
              </div>
            </div>

            {/* DETAIL FARE FORMULA EXPANSION */}
            {showFareDetail && (
              <div className="pt-2.5 mt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>Tarif Dasar (Base Fare)</span>
                  <span className="text-slate-300 font-mono">Rp 7.000</span>
                </div>
                <div className="flex justify-between">
                  <span>Jarak ({distanceKm} km × Rp 2.200)</span>
                  <span className="text-slate-300 font-mono">Rp {kmFare.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between">
                  <span>Waktu ({durationMinutes} mnt × Rp 200)</span>
                  <span className="text-slate-300 font-mono">Rp {timeFare.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-500 text-[10px]">
                  <span>Tarif Minimum</span>
                  <span className="font-mono">Rp 10.000</span>
                </div>
              </div>
            )}

            {/* PAYMENT METHOD SELECTOR */}
            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Metode Bayar:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] transition ${
                    paymentMethod === 'CASH'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
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
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 font-semibold'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  <span>KawaiPay</span>
                </button>
              </div>
            </div>
          </div>

          {/* 5. ACTION BUTTON: [ PESAN OJEK ] */}
          <button
            onClick={onOrderRide}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.98] text-slate-950 font-black rounded-2xl text-base shadow-xl shadow-emerald-500/25 transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
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
            <div className="bg-slate-950 rounded-2xl border border-amber-500/30 p-5 space-y-4 text-center">
              <div className="relative mx-auto w-16 h-16 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
                <div className="relative w-14 h-14 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center text-emerald-400">
                  <Bike className="w-7 h-7 animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">Mencari Driver Terdekat...</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Radar radius 1.5 km • Mengirim offer dispatch (30 detik timeout)
                </p>
              </div>

              <div className="bg-slate-900 rounded-xl p-3 border border-slate-800 text-xs text-left space-y-1.5">
                <div className="flex justify-between text-slate-400">
                  <span>Rute:</span>
                  <span className="text-slate-200 font-semibold">{distanceKm} km</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Tarif:</span>
                  <span className="text-emerald-400 font-bold font-mono">
                    Rp {estimatedFare.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Kandidat:</span>
                  <span className="text-sky-300 font-semibold">Ahmad Gazali (DA 5110 KAW)</span>
                </div>
              </div>

              <button
                onClick={onCancelRide}
                className="w-full py-2.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 text-xs font-bold rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <X className="w-4 h-4" />
                <span>Batalkan Pencarian</span>
              </button>
            </div>
          )}

          {/* ASSIGNED STATE */}
          {activeRide.status === 'ASSIGNED' && (
            <div className="bg-slate-950 rounded-2xl border border-sky-500/30 p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Driver Ditemukan!</span>
                </div>
                <span className="text-[11px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-mono font-semibold">
                  ETA ~3 Menit
                </span>
              </div>

              {/* Driver Info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 overflow-hidden shadow">
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
                    <h4 className="font-bold text-white text-sm">
                      {activeRide.driver?.name || 'Ahmad Gazali'}
                    </h4>
                    <p className="text-xs text-slate-400">
                      {activeRide.driver?.vehicleModel || 'Honda Vario 160'} • ★{' '}
                      {activeRide.driver?.rating || '4.9'}
                    </p>
                    <span className="inline-block mt-0.5 text-[10px] bg-slate-800 text-slate-300 font-mono font-bold px-1.5 py-0.2 rounded border border-slate-700">
                      {activeRide.driver?.vehiclePlate || 'DA 5110 KAW'}
                    </span>
                  </div>
                </div>

                <a
                  href={`tel:${activeRide.driver?.phone || '+6281390511200'}`}
                  className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center hover:bg-emerald-500/30 transition shadow"
                  title="Telepon Driver"
                >
                  <Phone className="w-4 h-4" />
                </a>
              </div>

              <div className="p-2.5 bg-slate-900 rounded-xl text-xs text-slate-300 flex items-center justify-between">
                <span>Driver sedang menuju titik jemput</span>
                <span className="font-mono text-emerald-400 font-bold">
                  Rp {estimatedFare.toLocaleString('id-ID')}
                </span>
              </div>

              <button
                onClick={onCancelRide}
                className="w-full py-2 bg-slate-900 hover:bg-rose-500/10 text-slate-400 hover:text-rose-400 text-xs font-semibold rounded-xl transition border border-slate-800 hover:border-rose-500/30"
              >
                Batalkan Order
              </button>
            </div>
          )}

          {/* ARRIVED STATE */}
          {activeRide.status === 'ARRIVED' && (
            <div className="bg-slate-950 rounded-2xl border border-emerald-500/40 p-4 space-y-3">
              <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <span>Driver telah tiba di lokasi penjemputan! Harap temui driver Anda.</span>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-300 px-1">
                <div>
                  <span className="text-slate-400 block text-[10px]">Mitra:</span>
                  <span className="font-bold text-white">
                    {activeRide.driver?.name || 'Ahmad Gazali'}
                  </span>
                  <span className="ml-1 text-[11px] font-mono text-slate-400">
                    ({activeRide.driver?.vehiclePlate || 'DA 5110 KAW'})
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-slate-400 block text-[10px]">Total Tarif:</span>
                  <span className="font-mono font-bold text-emerald-400 text-sm">
                    Rp {estimatedFare.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* IN_TRIP STATE */}
          {activeRide.status === 'IN_TRIP' && (
            <div className="bg-slate-950 rounded-2xl border border-blue-500/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>Sedang dalam Perjalanan ke Destinasi</span>
              </div>

              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] text-slate-400 block">Menuju ke:</span>
                    <span className="font-bold text-white">{destination.name}</span>
                    <p className="text-[10px] text-slate-400">{destination.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs px-1 text-slate-400">
                <span>Kecepatan ~35 km/jam</span>
                <span className="text-emerald-400 font-mono font-bold">
                  Rp {estimatedFare.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          {/* COMPLETED STATE */}
          {activeRide.status === 'COMPLETED' && (
            <div className="bg-slate-950 rounded-2xl border border-emerald-500/50 p-5 space-y-4 text-center">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-black text-white">Perjalanan Selesai!</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Terima kasih telah menggunakan Kawai 0511 Banjarmasin.
                </p>
              </div>

              <div className="bg-slate-900 p-3.5 rounded-xl border border-slate-800 text-xs space-y-2 text-left">
                <div className="flex justify-between text-slate-400">
                  <span>Titik Tujuan:</span>
                  <span className="text-slate-200 font-semibold">{destination.name}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Jarak & Waktu:</span>
                  <span className="text-slate-200 font-mono">
                    {distanceKm} km • {durationMinutes} mnt
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 pt-1.5 border-t border-slate-800">
                  <span className="font-bold text-white">Total Tagihan:</span>
                  <span className="font-mono font-black text-emerald-400 text-sm">
                    Rp {estimatedFare.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              <button
                onClick={onCancelRide}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition uppercase tracking-wider"
              >
                Pesan Ojek Lagi
              </button>
            </div>
          )}

          {/* CANCELLED STATE */}
          {activeRide.status === 'CANCELLED' && (
            <div className="bg-slate-950 rounded-2xl border border-rose-500/40 p-4 space-y-3 text-center">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-white text-sm">Pesanan Dibatalkan</h4>
              <p className="text-xs text-slate-400">
                {activeRide.cancellationReason || 'Pesanan dibatalkan oleh pengguna'}
              </p>
              <button
                onClick={onCancelRide}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl text-xs transition"
              >
                Buat Pesanan Baru
              </button>
            </div>
          )}
        </div>
      )}

      {/* MODAL / DROPDOWN LOCATION PICKER */}
      {(showPickupPicker || showDestPicker) && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin
                  className={`w-4 h-4 ${showPickupPicker ? 'text-emerald-400' : 'text-rose-400'}`}
                />
                <h3 className="font-bold text-white text-sm">
                  {showPickupPicker ? 'Pilih Titik Penjemputan' : 'Pilih Destinasi Tujuan'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPickupPicker(false);
                  setShowDestPicker(false);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="p-3 border-b border-slate-800 bg-slate-950/50">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari lokasi di Banjarmasin..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Landmark List */}
            <div className="overflow-y-auto divide-y divide-slate-800/60 p-2">
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
                    className="w-full p-2.5 text-left rounded-xl hover:bg-slate-800/80 transition flex items-start gap-2.5 group"
                  >
                    <div className="p-2 bg-slate-800 group-hover:bg-slate-700 rounded-lg text-slate-300 shrink-0 mt-0.5">
                      <MapPin className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="font-semibold text-xs text-slate-200 group-hover:text-emerald-400">
                        {lm.name}
                      </div>
                      <div className="text-[10px] text-slate-400 leading-tight mt-0.5">
                        {lm.address}
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
