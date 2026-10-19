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
  Package,
  Utensils,
  ShoppingBag,
  Wallet,
  Home,
  Tag,
  Siren,
  Plus,
} from 'lucide-react';
import { LocationPoint } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';
import { PassengerPaymentCard } from './PassengerPaymentCard';
import { TripHistoryModal } from './TripHistoryModal';
import { TripDetailModal } from './TripDetailModal';
import { KawaiLogo, KawaiBadge } from './KawaiLogo';
import { WalletModal } from './WalletModal';
import { SosModal } from './SosModal';
import { PromoModal } from './PromoModal';
import { ServiceDelivery } from './ServiceDelivery';
import { ServiceFood } from './ServiceFood';
import { ServiceMart } from './ServiceMart';
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
  // Service mode: 'ride' | 'delivery' | 'food' | 'mart'
  const [activeService, setActiveService] = useState<'ride' | 'delivery' | 'food' | 'mart'>('ride');
  const [walletBalance, setWalletBalance] = useState<number>(125000);
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [isPromoOpen, setIsPromoOpen] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<string>('HEMAT0511');

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
    ['SEARCHING', 'ASSIGNED', 'ARRIVED', 'IN_TRIP', 'COMPLETED'].includes(activeRide.status);

  return (
    <div className="w-full max-w-md mx-auto bg-white border border-[#E2E8F0] rounded-3xl shadow-sm overflow-hidden flex flex-col font-sans text-[#0F172A] relative">
      {/* 1. HEADER (KAWAI 0511) - Official Logo, Tagline, & Status */}
      <header className="px-4 py-3.5 bg-white border-b border-[#E2E8F0] flex items-center justify-between">
        <KawaiLogo size="sm" showTagline={false} />

        <div className="flex items-center gap-2">
        {/* Online status badge */}
          <div className="flex items-center gap-1.5 text-[11px] text-[#E1192E] bg-[#FEE2E2] px-2.5 py-1 rounded-full border border-[#FECACA] font-semibold">
            <span className="w-2 h-2 rounded-full bg-[#E1192E] animate-pulse" />
            <span>Online</span>
          </div>

          {/* Riwayat Pesanan Quick Link */}
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1 text-[11px] text-[#0F172A] bg-[#F1F5F9] hover:bg-[#E2E8F0] px-2.5 py-1 rounded-full border border-[#CBD5E1]/60 font-medium transition cursor-pointer"
            title="Riwayat Pesanan"
          >
            <Clock className="w-3.5 h-3.5 text-[#E1192E]" />
            <span>Riwayat</span>
          </button>
        </div>
      </header>

      {/* 2. KAWAI DOMPET & PROMO QUICK CARD */}
      <div className="px-4 py-2.5 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between text-xs">
        {/* KawaiPay Balance */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FEE2E2] text-[#E1192E] flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-[#64748B] font-medium leading-none">Dompet KawaiPay</div>
            <div className="text-xs font-black text-[#0F172A] font-mono">
              Rp {walletBalance.toLocaleString('id-ID')}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsWalletOpen(true)}
            className="ml-1 text-[10px] text-[#E1192E] hover:text-[#C81023] bg-[#FEE2E2] px-2 py-0.5 rounded-md font-bold transition flex items-center gap-0.5 cursor-pointer"
          >
            <Plus className="w-2.5 h-2.5" />
            <span>Isi</span>
          </button>
        </div>

        {/* Promo Voucher */}
        <button
          type="button"
          onClick={() => setIsPromoOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 bg-white hover:bg-slate-50 border border-[#CBD5E1]/70 rounded-full text-[11px] font-medium text-[#0F172A] transition cursor-pointer shadow-2xs"
        >
          <Tag className="w-3 h-3 text-[#E1192E]" />
          <span>Voucher: <strong className="text-[#E1192E]">{appliedPromo}</strong></span>
        </button>
      </div>

      {/* 3. 4 MAIN SERVICES MENU GRID (Ride, Delivery, KawaiFood, Titip Belanja) */}
      <div className="px-4 py-3 bg-white border-b border-[#E2E8F0]">
        <div className="grid grid-cols-4 gap-2">
          {/* Ride (Motor & Mobil) */}
          <button
            type="button"
            onClick={() => setActiveService('ride')}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition cursor-pointer ${
              activeService === 'ride'
                ? 'bg-[#FEE2E2] border-2 border-[#E1192E] shadow-2xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#E1192E] text-white flex items-center justify-center shadow-xs mb-1">
              <Bike className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#0F172A]">Ride</span>
            <span className="text-[9px] text-[#64748B]">Ojek Banjar</span>
          </button>

          {/* Delivery (Kurir Kilat) */}
          <button
            type="button"
            onClick={() => setActiveService('delivery')}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition cursor-pointer ${
              activeService === 'delivery'
                ? 'bg-amber-50 border-2 border-[#F59E0B] shadow-2xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#F59E0B] text-white flex items-center justify-center shadow-xs mb-1">
              <Package className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#0F172A]">Delivery</span>
            <span className="text-[9px] text-[#64748B]">Kirim Paket</span>
          </button>

          {/* KawaiFood (Kuliner Banjar) */}
          <button
            type="button"
            onClick={() => setActiveService('food')}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition cursor-pointer ${
              activeService === 'food'
                ? 'bg-yellow-50 border-2 border-[#EAB308] shadow-2xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#EAB308] text-white flex items-center justify-center shadow-xs mb-1">
              <Utensils className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#0F172A]">KawaiFood</span>
            <span className="text-[9px] text-[#64748B]">Kuliner Banjar</span>
          </button>

          {/* Titip Belanja (Pasar Mart) */}
          <button
            type="button"
            onClick={() => setActiveService('mart')}
            className={`flex flex-col items-center justify-center p-2 rounded-2xl transition cursor-pointer ${
              activeService === 'mart'
                ? 'bg-emerald-50 border-2 border-[#10B981] shadow-2xs'
                : 'bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-slate-100'
            }`}
          >
            <div className="w-10 h-10 rounded-xl bg-[#10B981] text-white flex items-center justify-center shadow-xs mb-1">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-bold text-[#0F172A]">Titip Belanja</span>
            <span className="text-[9px] text-[#64748B]">Pasar Banjar</span>
          </button>
        </div>
      </div>

      {/* 4. ACTIVE ORDER / IN-TRIP TRACKER (Jika Ada Pesanan Berjalan) */}
      {isRideActive && activeRide.status !== 'COMPLETED' && (
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E2E8F0] space-y-3">
          {/* SEARCHING */}
          {activeRide.status === 'SEARCHING' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 text-center space-y-3 shadow-xs">
              <div className="relative mx-auto w-14 h-14 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-[#E1192E]/20 animate-ping" />
                <div className="relative w-12 h-12 rounded-full bg-[#FEE2E2] border-2 border-[#E1192E] flex items-center justify-center text-[#E1192E]">
                  <Bike className="w-6 h-6 animate-bounce" />
                </div>
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#0F172A]">Mencari Driver Terdekat...</h4>
                <p className="text-[11px] text-[#64748B]">Radar radius 1.5 km di Banjarmasin</p>
              </div>
              <button
                type="button"
                onClick={onCancelRide}
                className="w-full py-2 bg-[#F1F5F9] hover:bg-[#FEE2E2] text-[#E1192E] text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Batalkan Pencarian
              </button>
            </div>
          )}

          {/* ASSIGNED / ARRIVED */}
          {(activeRide.status === 'ASSIGNED' || activeRide.status === 'ARRIVED') && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0]">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#E1192E]">
                  <CheckCircle2 className="w-4 h-4 text-[#E1192E]" />
                  <span>{activeRide.status === 'ARRIVED' ? 'Driver Tiba di Titik Jemput!' : 'Driver Ditemukan!'}</span>
                </div>
                <span className="text-[10px] bg-[#0F172A] text-white px-2 py-0.5 rounded-full font-mono font-bold">
                  {activeRide.status === 'ARRIVED' ? 'Sudah Tiba' : 'ETA ~3 Menit'}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-white flex items-center justify-center font-bold text-sm">
                    <Bike className="w-6 h-6 text-[#E1192E]" />
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-[#0F172A]">{activeRide.driver?.name || 'Ahmad Gazali'}</h5>
                    <p className="text-[11px] text-[#64748B]">{activeRide.driver?.vehicleModel || 'Honda Vario 160'} • ★ {activeRide.driver?.rating || '4.9'}</p>
                    <span className="inline-block mt-0.5 text-[9px] bg-[#F1F5F9] text-[#0F172A] font-mono font-bold px-1.5 py-0.2 rounded border border-[#CBD5E1]">
                      {activeRide.driver?.vehiclePlate || 'DA 5110 KAW'}
                    </span>
                  </div>
                </div>

                <a
                  href={`tel:${activeRide.driver?.phone || '+6281390511200'}`}
                  className="w-9 h-9 rounded-xl bg-[#0F172A] text-white flex items-center justify-center hover:bg-black transition shadow-xs"
                  title="Hubungi Driver"
                >
                  <Phone className="w-4 h-4 text-[#E1192E]" />
                </a>
              </div>

              <div className="flex justify-between items-center text-xs pt-1 border-t border-[#E2E8F0]">
                <span className="text-[#64748B]">Total Tarif:</span>
                <span className="font-mono font-black text-[#E1192E]">
                  Rp {(activeRide.totalFare || estimatedFare).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}

          {/* IN_TRIP */}
          {activeRide.status === 'IN_TRIP' && (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-4 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0E45C9]">
                <Navigation className="w-4 h-4 animate-pulse" />
                <span>Sedang dalam Perjalanan Menuju Destinasi</span>
              </div>
              <p className="text-xs text-[#0F172A] font-semibold">{destination.name}</p>
              <div className="flex justify-between items-center text-xs text-[#64748B]">
                <span>Kecepatan ~35 km/jam</span>
                <span className="font-mono font-black text-[#E1192E]">
                  Rp {(activeRide.totalFare || estimatedFare).toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 5. SERVICE CONTENT ROUTER */}
      {/* SERVICE 1: RIDE */}
      {activeService === 'ride' && (
        <div className="flex-1 flex flex-col">
          {/* MAP BANJARMASIN */}
          <div className="p-3 bg-[#F8FAFC]">
            <div className="text-[11px] text-[#64748B] mb-1.5 px-1 flex items-center justify-between">
              <span className="font-bold text-[#0F172A] flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-[#E1192E]" />
                Peta Kota Banjarmasin
              </span>
              {onOpenLiveMap && (
                <button
                  type="button"
                  onClick={onOpenLiveMap}
                  className="text-[10px] text-[#E1192E] bg-[#FEE2E2] hover:bg-[#E1192E] hover:text-white border border-[#E1192E]/30 px-2 py-0.5 rounded-md font-bold transition flex items-center gap-1 cursor-pointer"
                >
                  <Navigation className="w-2.5 h-2.5" />
                  <span>Peta & Simulator Live</span>
                </button>
              )}
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

          {/* PICKUP & DESTINATION SEARCH FORM */}
          {(!isRideActive || activeRide?.status === 'COMPLETED' || activeRide?.status === 'CANCELLED') && (
            <div className="p-4 space-y-3.5">
              {/* Pickup location */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#0F172A] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#0F172A]" />
                  Lokasi Jemput
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowPickupPicker(true);
                    setShowDestPicker(false);
                  }}
                  className="w-full bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1]/70 rounded-xl px-3 py-2 text-left flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Navigation className="w-3.5 h-3.5 text-[#0F172A] shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-[#0F172A] truncate">{pickup.name}</div>
                      <div className="text-[10px] text-[#64748B] truncate">{pickup.address}</div>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                </button>
              </div>

              {/* Destination location */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-[#E1192E] uppercase tracking-wider flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-[#E1192E]" />
                  Lokasi Tujuan
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowDestPicker(true);
                    setShowPickupPicker(false);
                  }}
                  className="w-full bg-[#F8FAFC] hover:bg-slate-100 border border-[#CBD5E1]/70 rounded-xl px-3 py-2 text-left flex items-center justify-between text-xs transition"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MapPin className="w-3.5 h-3.5 text-[#E1192E] shrink-0" />
                    <div className="truncate">
                      <div className="font-bold text-[#0F172A] truncate">{destination.name || 'Mau ke mana?'}</div>
                      <div className="text-[10px] text-[#64748B] truncate">{destination.address}</div>
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-[#64748B] shrink-0" />
                </button>
              </div>

              {/* Quick Destination Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <span className="text-[10px] text-[#64748B] shrink-0 font-medium">Cepat:</span>
                {landmarks.slice(0, 4).map((lm) => (
                  <button
                    key={lm.id}
                    onClick={() => onDestinationChange(lm)}
                    className={`px-2.5 py-1 rounded-full border whitespace-nowrap transition text-[11px] cursor-pointer ${
                      destination.id === lm.id
                        ? 'bg-[#FEE2E2] text-[#E1192E] border-[#E1192E]/40 font-bold'
                        : 'bg-[#F1F5F9] text-[#64748B] border-[#CBD5E1]/60 hover:text-[#0F172A]'
                    }`}
                  >
                    {lm.name.split(' ')[0]}
                  </button>
                ))}
              </div>

              {/* Estimasi Tarif Card */}
              <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[11px] text-[#64748B] block font-medium">Estimasi Tarif Ojek</span>
                    <span className="text-xl font-black text-[#E1192E] font-mono tracking-tight">
                      Rp {estimatedFare.toLocaleString('id-ID')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-bold text-[#0F172A] block">
                      {distanceKm} km • ~{durationMinutes} menit
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowFareDetail(!showFareDetail)}
                      className="text-[10px] text-[#E1192E] hover:underline flex items-center gap-0.5 ml-auto mt-0.5 cursor-pointer"
                    >
                      <Info className="w-3 h-3" />
                      <span>{showFareDetail ? 'Tutup Rincian' : 'Rincian'}</span>
                    </button>
                  </div>
                </div>

                {showFareDetail && (
                  <div className="pt-2 border-t border-[#E2E8F0] text-[11px] text-[#64748B] space-y-1">
                    <div className="flex justify-between">
                      <span>Tarif Dasar</span>
                      <span className="font-mono text-[#0F172A]">Rp 7.000</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Jarak ({distanceKm} km × Rp 2.200)</span>
                      <span className="font-mono text-[#0F172A]">Rp {kmFare.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Waktu ({durationMinutes} mnt × Rp 200)</span>
                      <span className="font-mono text-[#0F172A]">Rp {timeFare.toLocaleString('id-ID')}</span>
                    </div>
                    <div className="flex justify-between text-[#94A3B8] text-[10px]">
                      <span>Tarif Minimum</span>
                      <span className="font-mono">Rp 10.000</span>
                    </div>
                  </div>
                )}

                {/* Metode Pembayaran */}
                <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
                  <span className="text-[#64748B] text-[11px]">Metode Bayar:</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('CASH')}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] transition cursor-pointer ${
                        paymentMethod === 'CASH'
                          ? 'bg-[#0F172A] text-white font-bold'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      <span>Tunai</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentMethod('DIGITAL')}
                      className={`px-2.5 py-1 rounded-lg flex items-center gap-1 text-[11px] transition cursor-pointer ${
                        paymentMethod === 'DIGITAL'
                          ? 'bg-[#E1192E] text-white font-bold'
                          : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span>KawaiPay</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* PRIMARY ACTION BUTTON: MERAH KAWAI */}
              <button
                type="button"
                onClick={onOrderRide}
                className="w-full py-4 bg-[#E1192E] hover:bg-[#C81023] active:bg-[#B91223] text-white font-bold rounded-2xl text-base shadow-sm transition flex items-center justify-center gap-2 cursor-pointer uppercase tracking-wider"
              >
                <Bike className="w-5 h-5 stroke-[2.5]" />
                <span>PESAN OJEK SEKARANG</span>
              </button>
            </div>
          )}

          {/* COMPLETED STATE: PEMBAYARAN */}
          {activeRide?.status === 'COMPLETED' && (
            <div className="p-4 space-y-4">
              <PassengerPaymentCard
                fareAmount={activeRide.totalFare || estimatedFare || 12400}
                rideId={activeRide.id || 'ride-0511-demo'}
                driverId={activeRide.driver?.id || 'd0000000-0000-0000-0000-000000000001'}
                driverName={activeRide.driver?.name || 'Ahmad Gazali'}
                onResetOrder={onCancelRide}
              />
              <button
                type="button"
                onClick={() => setSelectedDetailRideId(activeRide.id || 'ride-0511-102')}
                className="w-full py-2.5 bg-white hover:bg-[#F8FAFC] text-[#E1192E] border border-[#E1192E]/40 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <Star className="w-3.5 h-3.5 fill-[#E1192E]" />
                <span>Lihat Detail Perjalanan & Beri Rating</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* SERVICE 2: DELIVERY */}
      {activeService === 'delivery' && (
        <div className="p-4">
          <ServiceDelivery
            pickup={pickup}
            destination={destination}
            onSetPickup={onPickupChange}
            onSetDestination={onDestinationChange}
            onOpenMapPicker={(target) => {
              if (target === 'pickup') setShowPickupPicker(true);
              else setShowDestPicker(true);
            }}
            onBookDelivery={(order) => {
              onOrderRide();
            }}
            walletBalance={walletBalance}
          />
        </div>
      )}

      {/* SERVICE 3: KAWAI FOOD */}
      {activeService === 'food' && (
        <div className="p-4">
          <ServiceFood
            userLocation={pickup}
            onBookFood={(order) => {
              onOrderRide();
            }}
            walletBalance={walletBalance}
          />
        </div>
      )}

      {/* SERVICE 4: TITIP BELANJA */}
      {activeService === 'mart' && (
        <div className="p-4">
          <ServiceMart
            userLocation={pickup}
            onBookMart={(order) => {
              onOrderRide();
            }}
            walletBalance={walletBalance}
          />
        </div>
      )}

      {/* 6. SIMPLE BOTTOM NAVIGATION BAR (ANDROID MOBILE SPEC) */}
      <nav className="sticky bottom-0 z-30 bg-white border-t border-[#E2E8F0] px-4 py-2 flex items-center justify-around shadow-md">
        <button
          type="button"
          onClick={() => setActiveService('ride')}
          className={`flex flex-col items-center gap-0.5 text-[10px] font-bold transition cursor-pointer ${
            activeService === 'ride' ? 'text-[#E1192E]' : 'text-[#64748B] hover:text-[#0F172A]'
          }`}
        >
          <Home className="w-4 h-4" />
          <span>Beranda</span>
        </button>

        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
        >
          <Clock className="w-4 h-4" />
          <span>Aktivitas</span>
        </button>

        <button
          type="button"
          onClick={() => setIsWalletOpen(true)}
          className="flex flex-col items-center gap-0.5 text-[10px] font-bold text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
        >
          <Wallet className="w-4 h-4" />
          <span>KawaiPay</span>
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

      {/* LOCATION PICKER MODAL */}
      {(showPickupPicker || showDestPicker) && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-sm overflow-hidden shadow-xl flex flex-col max-h-[80vh] text-[#0F172A]">
            <div className="p-4 border-b border-[#E2E8F0] flex items-center justify-between bg-[#F8FAFC]">
              <div className="flex items-center gap-2">
                <MapPin className={`w-4 h-4 ${showPickupPicker ? 'text-[#0F172A]' : 'text-[#E1192E]'}`} />
                <h4 className="font-bold text-xs">
                  {showPickupPicker ? 'Pilih Lokasi Penjemputan' : 'Pilih Lokasi Tujuan'}
                </h4>
              </div>
              <button
                onClick={() => {
                  setShowPickupPicker(false);
                  setShowDestPicker(false);
                }}
                className="text-[#64748B] hover:text-[#0F172A] p-1 rounded-lg hover:bg-[#F1F5F9]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 border-b border-[#E2E8F0] bg-white">
              <div className="relative">
                <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari jalan, mall, kampus, pasar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-[#CBD5E1]/70 rounded-xl pl-9 pr-3 py-2 text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:border-[#E1192E]"
                />
              </div>
            </div>

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
                    className="w-full text-left p-2.5 rounded-xl hover:bg-[#F8FAFC] transition flex items-center justify-between group cursor-pointer"
                  >
                    <div className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-[#FEE2E2] text-[#E1192E] flex items-center justify-center shrink-0 mt-0.5">
                        <MapPin className="w-3.5 h-3.5 text-[#E1192E]" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-[#0F172A] group-hover:text-[#E1192E]">
                          {lm.name}
                        </div>
                        <div className="text-[10px] text-[#64748B]">{lm.address}</div>
                      </div>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <TripHistoryModal
        role="CUSTOMER"
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
      />

      {selectedDetailRideId && (
        <TripDetailModal
          rideId={selectedDetailRideId}
          role="CUSTOMER"
          isOpen={Boolean(selectedDetailRideId)}
          onClose={() => setSelectedDetailRideId(null)}
        />
      )}

      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        balance={walletBalance}
        onTopUp={(amount) => {
          setWalletBalance((prev) => prev + amount);
        }}
      />

      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
      />

      <PromoModal
        isOpen={isPromoOpen}
        onClose={() => setIsPromoOpen(false)}
        onApplyCode={(code) => {
          setAppliedPromo(code);
        }}
      />
    </div>
  );
};
