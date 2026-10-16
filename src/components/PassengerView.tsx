import React, { useState } from 'react';
import {
  MapPin,
  Navigation,
  Compass,
  Bike,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  Phone,
  CreditCard,
  Banknote,
  Search,
  ChevronDown,
  Info,
  Star,
} from 'lucide-react';
import { LocationPoint } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';
import { PassengerPaymentCard } from './PassengerPaymentCard';
import { TripHistoryModal } from './TripHistoryModal';
import { TripDetailModal } from './TripDetailModal';

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

  const dx = pickup.x - destination.x;
  const dy = pickup.y - destination.y;
  const rawDist = Math.sqrt(dx * dx + dy * dy);
  const distanceKm = Math.max(1.2, parseFloat((rawDist * 0.12).toFixed(1)));
  const durationMinutes = Math.max(4, Math.round(distanceKm * 3.2));

  const baseFare = 7000;
  const kmFare = Math.round(distanceKm * 2200);
  const timeFare = Math.round(durationMinutes * 200);
  const rawFare = baseFare + kmFare + timeFare;
  const estimatedFare = Math.max(rawFare, 10000);

  const isRideActive =
    activeRide && ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'IN_TRIP', 'COMPLETED', 'CANCELLED'].includes(activeRide.status);

  const buttonBase = 'w-full rounded-2xl font-bold transition-all duration-200 flex items-center justify-center gap-2';

  return (
    <div className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-[#E8ECF3] bg-white text-[#111827] shadow-sm">
      <header className="flex items-center justify-between border-b border-[#E8ECF3] bg-white px-5 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#E31E24] text-sm font-black text-white shadow-sm">
            0511
          </div>
          <div>
            <h1 className="flex items-center gap-1.5 text-base font-black tracking-tight text-[#111827]">
              KAWAI 0511
              <span className="rounded-full border border-[#E31E24]/25 bg-[#FEE5E6] px-1.5 py-0.2 text-[10px] font-semibold text-[#11274A]">
                Ojek Banjar
              </span>
            </h1>
            <p className="text-[11px] text-[#5B6475]">Banjarmasin & Sekitarnya</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 rounded-full border border-[#E8ECF3] bg-[#F3F5F9] px-2.5 py-1 text-[11px] font-semibold text-[#111827] transition hover:bg-[#EAF1FF]"
            title="Buka Riwayat Perjalanan Penumpang"
          >
            <Clock className="h-3.5 w-3.5 text-[#E31E24]" />
            <span>Riwayat</span>
          </button>

          <div className="flex items-center gap-1 rounded-full border border-[#E31E24]/20 bg-[#FEE5E6] px-2.5 py-1 text-[11px] font-medium text-[#11274A]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[#E31E24]" />
            <span>Online</span>
          </div>
        </div>
      </header>

      <div className="bg-[#F7F7F8] p-3">
        <div className="mb-1.5 flex items-center justify-between px-1 text-[11px] text-[#5B6475]">
          <span className="flex items-center gap-1 font-semibold text-[#111827]">
            <Compass className="h-3.5 w-3.5 text-[#E31E24]" />
            Peta Banjarmasin
          </span>
          <div className="flex items-center gap-1.5">
            {onOpenLiveMap && (
              <button
                type="button"
                onClick={onOpenLiveMap}
                className="flex items-center gap-1 rounded-md border border-[#E31E24]/30 bg-[#FEE5E6] px-2 py-0.5 text-[10px] font-bold text-[#11274A] transition hover:bg-[#E31E24] hover:text-white"
                title="Buka Peta Interaktif & Simulator Perjalanan KAWAI 0511"
              >
                <Navigation className="h-2.5 w-2.5" />
                <span>Peta & Simulator</span>
              </button>
            )}
            <span className="text-[10px] text-[#A3ABBA]">Sentuh pin</span>
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

      {!isRideActive || activeRide?.status === 'COMPLETED' || activeRide?.status === 'CANCELLED' ? (
        <div className="space-y-4 p-5">
          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#E31E24]">
              <span className="h-2 w-2 rounded-full bg-[#E31E24]" />
              Pickup
            </label>
            <button
              type="button"
              onClick={() => {
                setShowPickupPicker(true);
                setShowDestPicker(false);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-[#E8ECF3] bg-[#F3F5F9] px-3.5 py-2.5 text-left text-xs text-[#111827] transition hover:bg-[#EAF1FF]"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#FEE5E6] text-[#11274A]">
                  <Navigation className="h-3.5 w-3.5" />
                </div>
                <div className="truncate">
                  <div className="truncate font-semibold">{pickup.name}</div>
                  <div className="truncate text-[10px] text-[#5B6475]">{pickup.address}</div>
                </div>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-[#5B6475]" />
            </button>
          </div>

          <div className="space-y-1.5">
            <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-[#11274A]">
              <span className="h-2 w-2 rounded-full bg-[#11274A]" />
              Tujuan
            </label>
            <button
              type="button"
              onClick={() => {
                setShowDestPicker(true);
                setShowPickupPicker(false);
              }}
              className="flex w-full items-center justify-between rounded-xl border border-[#E8ECF3] bg-[#F3F5F9] px-3.5 py-2.5 text-left text-xs text-[#111827] transition hover:bg-[#EAF1FF]"
            >
              <div className="flex items-center gap-2.5 truncate">
                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-[#EAF1FF] text-[#11274A]">
                  <MapPin className="h-3.5 w-3.5" />
                </div>
                <div className="truncate">
                  <div className="truncate font-semibold">{destination.name || 'Mau ke mana?'}</div>
                  <div className="truncate text-[10px] text-[#5B6475]">{destination.address}</div>
                </div>
              </div>
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 text-[#5B6475]" />
            </button>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px]">
            <span className="shrink-0 text-[10px] font-medium text-[#5B6475]">Cepat:</span>
            {landmarks.slice(0, 4).map((lm) => (
              <button
                key={lm.id}
                onClick={() => onDestinationChange(lm)}
                className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-[11px] transition ${
                  destination.id === lm.id
                    ? 'border-[#E31E24]/40 bg-[#FEE5E6] font-semibold text-[#11274A]'
                    : 'border-[#E8ECF3] bg-[#F3F5F9] text-[#5B6475] hover:bg-[#EAF1FF] hover:text-[#111827]'
                }`}
              >
                {lm.name.split(' ')[0]}
              </button>
            ))}
          </div>

          <div className="space-y-2 rounded-2xl border border-[#E8ECF3] bg-[#F7F7F8] p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="block text-xs font-medium text-[#5B6475]">Estimasi Tarif</span>
                <span className="font-mono text-xl font-black tracking-tight text-[#E31E24]">
                  Rp {estimatedFare.toLocaleString('id-ID')}
                </span>
              </div>
              <div className="text-right">
                <span className="block text-xs font-semibold text-[#111827]">
                  {distanceKm} km • {durationMinutes} menit
                </span>
                <button
                  type="button"
                  onClick={() => setShowFareDetail(!showFareDetail)}
                  className="ml-auto mt-0.5 flex items-center gap-0.5 text-[10px] text-[#5B6475] hover:text-[#11274A]"
                >
                  <Info className="h-3 w-3" />
                  <span>{showFareDetail ? 'Sembunyikan' : 'Rincian'}</span>
                </button>
              </div>
            </div>

            {showFareDetail && (
              <div className="mt-2 space-y-1 border-t border-[#E8ECF3] pt-2.5 text-[11px] text-[#5B6475]">
                <div className="flex justify-between"><span>Tarif Dasar</span><span className="font-mono text-[#111827]">Rp 7.000</span></div>
                <div className="flex justify-between"><span>Jarak ({distanceKm} km × Rp 2.200)</span><span className="font-mono text-[#111827]">Rp {kmFare.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between"><span>Waktu ({durationMinutes} mnt × Rp 200)</span><span className="font-mono text-[#111827]">Rp {timeFare.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[10px] text-[#A3ABBA]"><span>Tarif Minimum</span><span className="font-mono">Rp 10.000</span></div>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-[#E8ECF3] pt-2 text-xs">
              <span className="text-[11px] text-[#5B6475]">Metode Bayar:</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('CASH')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] transition ${
                    paymentMethod === 'CASH'
                      ? 'border border-[#E31E24]/40 bg-[#FEE5E6] font-semibold text-[#11274A]'
                      : 'text-[#5B6475] hover:text-[#111827]'
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" />
                  <span>Tunai</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('DIGITAL')}
                  className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] transition ${
                    paymentMethod === 'DIGITAL'
                      ? 'border border-[#E31E24]/40 bg-[#FEE5E6] font-semibold text-[#11274A]'
                      : 'text-[#5B6475] hover:text-[#111827]'
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" />
                  <span>KawaiPay</span>
                </button>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onOrderRide}
            className={`${buttonBase} bg-[#E31E24] py-4 text-base text-white shadow-sm hover:bg-[#B0101A] active:bg-[#B0101A]`}
          >
            <Bike className="h-5 w-5 stroke-[2.5]" />
            <span>PESAN OJEK</span>
          </button>
        </div>
      ) : (
        <div className="space-y-4 p-5">
          {activeRide.status === 'SEARCHING' && (
            <div className="space-y-4 rounded-2xl border border-[#E8ECF3] bg-[#F7F7F8] p-5 text-center">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-[#E31E24]/20" />
                <div className="relative flex h-14 w-14 items-center justify-center rounded-full border-2 border-[#E31E24] bg-[#FEE5E6] text-[#E31E24]">
                  <Bike className="h-7 w-7 animate-bounce" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-bold text-[#111827]">Mencari Driver Terdekat...</h3>
                <p className="mt-1 text-xs text-[#5B6475]">Radar radius 1.5 km • Mengirim offer dispatch (30 detik timeout)</p>
              </div>

              <div className="space-y-1.5 rounded-xl border border-[#E8ECF3] bg-white p-3 text-left text-xs">
                <div className="flex justify-between text-[#5B6475]"><span>Rute:</span><span className="font-semibold text-[#111827]">{distanceKm} km</span></div>
                <div className="flex justify-between text-[#5B6475]"><span>Tarif:</span><span className="font-mono font-bold text-[#E31E24]">Rp {estimatedFare.toLocaleString('id-ID')}</span></div>
                <div className="flex justify-between text-[#5B6475]"><span>Kandidat:</span><span className="font-semibold text-[#111827]">Ahmad Gazali (DA 5110 KAW)</span></div>
              </div>

              <button
                onClick={onCancelRide}
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white py-2.5 text-xs font-bold text-[#E31E24] transition hover:bg-rose-50"
              >
                <X className="h-4 w-4" />
                <span>Batalkan Pencarian</span>
              </button>
            </div>
          )}

          {activeRide.status === 'ASSIGNED' && (
            <div className="space-y-3 rounded-2xl border border-[#E8ECF3] bg-[#F7F7F8] p-4">
              <div className="flex items-center justify-between border-b border-[#E8ECF3] pb-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#11274A]">
                  <CheckCircle2 className="h-4 w-4 text-[#E31E24]" />
                  <span>Driver Ditemukan!</span>
                </div>
                <span className="rounded-full bg-[#FEE5E6] px-2 py-0.5 text-[11px] font-mono font-semibold text-[#11274A]">
                  ETA ~3 Menit
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-xl border border-[#E8ECF3] bg-[#F3F5F9] text-[#5B6475] shadow-sm">
                    <img src="/src/assets/images/driver_portrait_ridho_1790780315040.jpg" alt="Driver" className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#111827]">{activeRide.driver?.name || 'Ahmad Gazali'}</h4>
                    <p className="text-xs text-[#5B6475]">{activeRide.driver?.vehicleModel || 'Honda Vario 160'} • ★ {activeRide.driver?.rating || '4.9'}</p>
                    <span className="mt-0.5 inline-block rounded border border-[#E8ECF3] bg-[#F3F5F9] px-1.5 py-0.2 text-[10px] font-mono font-bold text-[#111827]">
                      {activeRide.driver?.vehiclePlate || 'DA 5110 KAW'}
                    </span>
                  </div>
                </div>

                <a
                  href={`tel:${activeRide.driver?.phone || '+6281390511200'}`}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-[#E31E24]/30 bg-[#FEE5E6] text-[#11274A] transition hover:bg-[#E31E24] hover:text-white"
                  title="Telepon Driver"
                >
                  <Phone className="h-4 w-4" />
                </a>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-[#E8ECF3] bg-white p-2.5 text-xs text-[#5B6475]">
                <span>Driver sedang menuju titik jemput</span>
                <span className="font-mono font-bold text-[#E31E24]">Rp {estimatedFare.toLocaleString('id-ID')}</span>
              </div>

              <button onClick={onCancelRide} className="w-full rounded-xl border border-rose-200 bg-white py-2 text-xs font-semibold text-[#E31E24] transition hover:bg-rose-50">
                Batalkan Order
              </button>
            </div>
          )}

          {activeRide.status === 'ARRIVED' && (
            <div className="space-y-3 rounded-2xl border border-[#E31E24]/30 bg-[#FEE5E6]/70 p-4">
              <div className="flex items-center gap-2 rounded-xl border border-[#E31E24]/30 bg-[#FEE5E6] p-3 text-xs font-bold text-[#11274A]">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-[#E31E24]" />
                <span>Driver telah tiba di lokasi penjemputan! Harap temui driver Anda.</span>
              </div>

              <div className="flex items-center justify-between px-1 text-xs text-[#111827]">
                <div>
                  <span className="block text-[10px] text-[#5B6475]">Mitra:</span>
                  <span className="font-bold text-[#111827]">{activeRide.driver?.name || 'Ahmad Gazali'}</span>
                  <span className="ml-1 text-[11px] font-mono text-[#5B6475]">({activeRide.driver?.vehiclePlate || 'DA 5110 KAW'})</span>
                </div>
                <div className="text-right">
                  <span className="block text-[10px] text-[#5B6475]">Total Tarif:</span>
                  <span className="font-mono text-sm font-bold text-[#E31E24]">Rp {estimatedFare.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>
          )}

          {activeRide.status === 'IN_TRIP' && (
            <div className="space-y-3 rounded-2xl border border-[#E8ECF3] bg-[#F7F7F8] p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-[#11274A]">
                <Navigation className="h-4 w-4 animate-pulse" />
                <span>Sedang dalam Perjalanan ke Destinasi</span>
              </div>

              <div className="space-y-2 rounded-xl border border-[#E8ECF3] bg-white p-3 text-xs">
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#11274A]" />
                  <div>
                    <span className="block text-[10px] text-[#5B6475]">Menuju ke:</span>
                    <span className="font-bold text-[#111827]">{destination.name}</span>
                    <p className="text-[10px] text-[#5B6475]">{destination.address}</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between px-1 text-xs text-[#5B6475]">
                <span>Kecepatan ~35 km/jam</span>
                <span className="font-mono font-bold text-[#E31E24]">Rp {estimatedFare.toLocaleString('id-ID')}</span>
              </div>
            </div>
          )}

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
                className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-[#E31E24]/40 bg-white py-2.5 text-xs font-bold text-[#11274A] transition hover:bg-[#F3F5F9]"
              >
                <Star className="h-3.5 w-3.5 fill-[#E31E24] text-[#E31E24]" />
                <span>Lihat Detail Perjalanan & Beri Rating</span>
              </button>
            </div>
          )}

          {activeRide.status === 'CANCELLED' && (
            <div className="space-y-3 rounded-2xl border border-rose-200 bg-[#F7F7F8] p-4 text-center">
              <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-[#E31E24]">
                <AlertCircle className="h-6 w-6" />
              </div>
              <h4 className="text-sm font-bold text-[#111827]">Pesanan Dibatalkan</h4>
              <p className="text-xs text-[#5B6475]">{activeRide.cancellationReason || 'Pesanan dibatalkan oleh pengguna'}</p>
              <button onClick={onCancelRide} className="w-full rounded-xl border border-[#E8ECF3] bg-white py-2.5 text-xs font-semibold text-[#111827] transition hover:bg-[#F3F5F9]">
                Buat Pesanan Baru
              </button>
            </div>
          )}
        </div>
      )}

      {(showPickupPicker || showDestPicker) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-[#E8ECF3] bg-white text-[#111827] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#E8ECF3] bg-[#F7F7F8] p-4">
              <div className="flex items-center gap-2">
                <MapPin className={`h-4 w-4 ${showPickupPicker ? 'text-[#E31E24]' : 'text-[#11274A]'}`} />
                <h3 className="text-sm font-bold text-[#111827]">
                  {showPickupPicker ? 'Pilih Titik Penjemputan' : 'Pilih Destinasi Tujuan'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowPickupPicker(false);
                  setShowDestPicker(false);
                  setSearchQuery('');
                }}
                className="rounded-lg p-1 text-[#5B6475] hover:bg-[#F3F5F9] hover:text-[#111827]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="border-b border-[#E8ECF3] bg-white p-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5B6475]" />
                <input
                  type="text"
                  placeholder="Cari jalan, mall, kampus, pasar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-[#E8ECF3] bg-[#F3F5F9] py-2 pl-9 pr-3 text-xs text-[#111827] placeholder-[#A3ABBA] focus:border-[#E31E24] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 space-y-1 overflow-y-auto p-2">
              {landmarks
                .filter((lm) =>
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
                    className="group flex w-full items-center justify-between rounded-xl p-2.5 text-left transition hover:bg-[#F3F5F9]"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FEE5E6] text-[#11274A]">
                        <MapPin className="h-3.5 w-3.5 text-[#E31E24]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#111827] group-hover:text-[#E31E24]">{lm.name}</div>
                        <div className="text-[10px] text-[#5B6475]">{lm.address}</div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      <TripHistoryModal role="CUSTOMER" isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />

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
