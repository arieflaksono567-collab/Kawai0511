import React, { useState } from 'react';
import { LocationPoint, OrderDetails } from '../types';
import { BANJARMASIN_LOCATIONS, PROMO_VOUCHERS } from '../data/mockData';
import {
  MapPin,
  Navigation,
  Bike,
  Car,
  Tag,
  Shield,
  Clock,
  ChevronRight,
  Crosshair,
  Loader2,
  CheckCircle2,
  Search,
  Sparkles
} from 'lucide-react';
import {
  dapatkanLokasiGpsSaatIni,
  detailKoordinatKeAlamat,
  koordinatKePersenPeta
} from '../utils/geocoding';

interface ServiceRideProps {
  pickup: LocationPoint;
  destination: LocationPoint;
  onSetPickup: (loc: LocationPoint) => void;
  onSetDestination: (loc: LocationPoint) => void;
  onOpenMapPicker: (target: 'pickup' | 'destination') => void;
  onBookRide: (order: Partial<OrderDetails>) => void;
  walletBalance: number;
}

export const ServiceRide: React.FC<ServiceRideProps> = ({
  pickup,
  destination,
  onSetPickup,
  onSetDestination,
  onOpenMapPicker,
  onBookRide,
  walletBalance,
}) => {
  const [vehicleType, setVehicleType] = useState<'motor' | 'car'>('motor');
  const [appliedPromo, setAppliedPromo] = useState<string>('HEMAT0511');
  const [paymentMethod, setPaymentMethod] = useState<'kawaipay' | 'cash'>('kawaipay');
  const [needExtraHelmet, setNeedExtraHelmet] = useState<boolean>(false);
  const [tripNotes, setTripNotes] = useState<string>('');

  // GPS Loading states
  const [isPickupGpsLoading, setIsPickupGpsLoading] = useState<boolean>(false);
  const [isDestGpsLoading, setIsDestGpsLoading] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  const showFeedback = (msg: string) => {
    setFeedbackMsg(msg);
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // 1. Detect Current Location via HTML5 Geolocation API + Nominatim Reverse Geocoding
  const handleDetectCurrentLocation = async (target: 'pickup' | 'destination') => {
    if (target === 'pickup') {
      setIsPickupGpsLoading(true);
    } else {
      setIsDestGpsLoading(true);
    }

    try {
      // Step 1: HTML5 navigator.geolocation.getCurrentPosition (dengan fallback cerdas)
      const gpsResult = await dapatkanLokasiGpsSaatIni();

      // Step 2: OpenStreetMap Nominatim Reverse Geocoding
      const geoResult = await detailKoordinatKeAlamat(gpsResult.lat, gpsResult.lng);
      const { x, y } = koordinatKePersenPeta(gpsResult.lat, gpsResult.lng);

      const detectedLocation: LocationPoint = {
        id: `gps-${Date.now()}`,
        name: geoResult.title || 'Lokasi Saya',
        address: geoResult.fullAddress,
        x,
        y,
        lat: gpsResult.lat,
        lng: gpsResult.lng,
        isGpsDetected: !gpsResult.isFallback,
        landmark: gpsResult.isFallback ? 'Titik Acuan Pusat Banjarmasin' : 'Hasil GPS Real-Time Pengguna',
      };

      if (target === 'pickup') {
        onSetPickup(detectedLocation);
        if (gpsResult.isFallback) {
          showFeedback(gpsResult.message || 'Izin GPS tidak aktif. Dialihkan ke Jl. A. Yani Banjarmasin.');
        } else {
          showFeedback(`Lokasi jemput terdeteksi: ${geoResult.title}`);
        }
      } else {
        onSetDestination(detectedLocation);
        if (gpsResult.isFallback) {
          showFeedback(gpsResult.message || 'Izin GPS tidak aktif. Dialihkan ke Jl. A. Yani Banjarmasin.');
        } else {
          showFeedback(`Lokasi tujuan diset: ${geoResult.title}`);
        }
      }
    } catch {
      showFeedback('Lokasi diarahkan ke Jl. A. Yani, Banjarmasin Tengah.');
    } finally {
      setIsPickupGpsLoading(false);
      setIsDestGpsLoading(false);
    }
  };

  const dx = pickup.x - destination.x;
  const dy = pickup.y - destination.y;
  const rawDist = Math.sqrt(dx * dx + dy * dy) * 0.18;
  const distanceKm = Math.max(1.2, parseFloat(rawDist.toFixed(1)));
  const estimatedMins = Math.max(6, Math.round(distanceKm * (vehicleType === 'motor' ? 2.5 : 3.8)));

  const baseRate = vehicleType === 'motor' ? 9000 : 18000;
  const perKmRate = vehicleType === 'motor' ? 2500 : 4500;
  const baseFare = Math.round(baseRate + Math.max(0, distanceKm - 2) * perKmRate);

  const promoObj = PROMO_VOUCHERS.find((p) => p.code === appliedPromo);
  const discount = promoObj && baseFare >= promoObj.minSpend ? promoObj.discountAmount : 0;
  const totalPay = Math.max(2000, baseFare - discount);

  const handleBook = () => {
    onBookRide({
      service: 'ride',
      pickup,
      destination,
      distanceKm,
      fare: baseFare,
      discount,
      totalPay,
      paymentMethod,
      vehicleType,
    });
  };

  return (
    <div className="space-y-4">
      {/* Service Subhead & Intro */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Transportasi Kawai 0511</h2>
          <p className="text-xs text-slate-500">Antar jemput aman & tepat waktu di Banjarmasin</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-1 rounded border border-emerald-200">
          <Shield className="w-3.5 h-3.5" />
          <span>Driver Berlisensi & Vaksin</span>
        </div>
      </div>

      {/* Vehicle Type Tabs */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-[#F0F5F2] rounded-xl border border-[#E4ECE7]">
        <button
          type="button"
          onClick={() => setVehicleType('motor')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            vehicleType === 'motor'
              ? 'bg-white text-[#18B86A] shadow-xs font-bold'
              : 'text-[#66736B] hover:text-[#17211B]'
          }`}
        >
          <Bike className="w-4 h-4" />
          <span>Kawai Ride (Motor)</span>
        </button>
        <button
          type="button"
          onClick={() => setVehicleType('car')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            vehicleType === 'car'
              ? 'bg-white text-[#18B86A] shadow-xs font-bold'
              : 'text-[#66736B] hover:text-[#17211B]'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Kawai Car (Mobil AC)</span>
        </button>
      </div>

      {feedbackMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 p-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium truncate">{feedbackMsg}</span>
        </div>
      )}

      {/* Location Pickup & Destination Pickers */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        {/* PICKUP ITEM */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Lokasi Jemput (Asal)
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDetectCurrentLocation('pickup')}
                disabled={isPickupGpsLoading}
                className="text-[11px] bg-emerald-50 hover:bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold flex items-center gap-1 transition-colors active:scale-95"
                title="Gunakan GPS perangkat & Nominatim untuk mendeteksi lokasi saat ini"
              >
                {isPickupGpsLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-emerald-700" />
                ) : (
                  <Crosshair className="w-3 h-3 text-emerald-700" />
                )}
                <span>Lokasi Saat Ini</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenMapPicker('pickup')}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold hover:underline flex items-center gap-0.5"
              >
                <MapPin className="w-3 h-3" />
                <span>Pilih dari Peta</span>
              </button>
            </div>
          </div>

          {/* Real Input Text for Pickup Address */}
          <div className="relative">
            <input
              type="text"
              value={pickup.address || pickup.name}
              onChange={(e) => {
                onSetPickup({
                  ...pickup,
                  name: e.target.value.split(',')[0] || e.target.value,
                  address: e.target.value,
                });
              }}
              placeholder="Ketik alamat penjemputan atau klik Pilih dari Peta..."
              className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
            />
          </div>

          {/* Quick preset selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-0.5 scrollbar-none">
            <span className="text-slate-400 whitespace-nowrap">Favorit:</span>
            {BANJARMASIN_LOCATIONS.slice(0, 4).map((loc) => (
              <button
                key={`qp-${loc.id}`}
                type="button"
                onClick={() => onSetPickup(loc)}
                className={`px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
                  pickup.id === loc.id
                    ? 'bg-emerald-100 border-emerald-300 text-emerald-800 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
              >
                {loc.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-slate-100 relative">
          <div className="absolute left-3 -top-2.5 bg-white px-1 text-[10px] text-slate-400">
            menuju ke
          </div>
        </div>

        {/* DESTINATION ITEM */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Tujuan Antar
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleDetectCurrentLocation('destination')}
                disabled={isDestGpsLoading}
                className="text-[11px] bg-red-50 hover:bg-red-100 text-red-700 px-2 py-0.5 rounded-md border border-red-200 font-semibold flex items-center gap-1 transition-colors active:scale-95"
                title="Gunakan GPS perangkat untuk menentukan lokasi tujuan"
              >
                {isDestGpsLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-red-700" />
                ) : (
                  <Crosshair className="w-3 h-3 text-red-700" />
                )}
                <span>Lokasi Saat Ini</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenMapPicker('destination')}
                className="text-[11px] text-sky-600 hover:text-sky-800 font-semibold hover:underline flex items-center gap-0.5"
              >
                <MapPin className="w-3 h-3" />
                <span>Pilih dari Peta</span>
              </button>
            </div>
          </div>

          {/* Real Input Text for Destination Address */}
          <div className="relative">
            <input
              type="text"
              value={destination.address || destination.name}
              onChange={(e) => {
                onSetDestination({
                  ...destination,
                  name: e.target.value.split(',')[0] || e.target.value,
                  address: e.target.value,
                });
              }}
              placeholder="Ketik alamat tujuan atau klik Pilih dari Peta..."
              className="w-full text-xs font-semibold text-slate-900 bg-slate-50 border border-slate-200 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-red-500 focus:bg-white"
            />
          </div>

          {/* Quick preset selector */}
          <div className="flex items-center gap-1.5 overflow-x-auto text-[10px] pt-0.5 scrollbar-none">
            <span className="text-slate-400 whitespace-nowrap">Favorit:</span>
            {BANJARMASIN_LOCATIONS.slice(1, 5).map((loc) => (
              <button
                key={`qd-${loc.id}`}
                type="button"
                onClick={() => onSetDestination(loc)}
                className={`px-2 py-0.5 rounded-full border whitespace-nowrap transition-colors ${
                  destination.id === loc.id
                    ? 'bg-red-100 border-red-300 text-red-800 font-bold'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-200'
                }`}
              >
                {loc.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Trip estimate stats */}
        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Navigation className="w-3.5 h-3.5 text-sky-600" />
            <span className="font-semibold text-slate-900">{distanceKm} km</span>
            <span className="text-slate-400">·</span>
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            <span>± {estimatedMins} Menit</span>
          </div>
          <span className="text-[11px] text-slate-400 truncate max-w-[180px]">
            {pickup.name.slice(0, 16)} → {destination.name.slice(0, 16)}
          </span>
        </div>
      </div>

      {/* Ride Options / Notes */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <label className="flex items-center gap-2 text-xs text-[#17211B] cursor-pointer">
          <input
            type="checkbox"
            checked={needExtraHelmet}
            onChange={(e) => setNeedExtraHelmet(e.target.checked)}
            className="rounded border-[#D7E2DB] text-[#18B86A] focus:ring-[#18B86A]"
          />
          <span>Minta driver siapkan helm bersih dengan hairnet higienis</span>
        </label>
        <div>
          <input
            type="text"
            placeholder="Catatan untuk driver (cth: Tunggu di pos satpam gerbang depan)"
            value={tripNotes}
            onChange={(e) => setTripNotes(e.target.value)}
            className="w-full text-xs p-2.5 rounded-xl border border-[#D7E2DB] bg-[#F7FAF8] focus:outline-none focus:ring-1 focus:ring-[#18B86A] text-[#17211B]"
          />
        </div>
      </div>

      {/* Payment & Promo */}
      <div className="bg-white p-3.5 rounded-2xl border border-[#E4ECE7] shadow-xs space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[#17211B]">Metode Pembayaran</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('kawaipay')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                paymentMethod === 'kawaipay'
                  ? 'bg-[#DDF8EA] border-[#18B86A]/40 text-[#0E8F52]'
                  : 'bg-[#F0F5F2] border-[#D7E2DB] text-[#66736B]'
              }`}
            >
              KawaiPay (Saldo Rp {walletBalance.toLocaleString('id-ID')})
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`px-2.5 py-1 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
                paymentMethod === 'cash'
                  ? 'bg-amber-50 border-amber-300 text-[#F5A623]'
                  : 'bg-[#F0F5F2] border-[#D7E2DB] text-[#66736B]'
              }`}
            >
              Tunai / Cash
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-[#E4ECE7] text-xs">
          <div className="flex items-center gap-1.5 text-[#17211B]">
            <Tag className="w-3.5 h-3.5 text-[#F5A623]" />
            <span>Voucher Promo:</span>
          </div>
          <select
            value={appliedPromo}
            onChange={(e) => setAppliedPromo(e.target.value)}
            className="text-xs font-semibold text-[#0E8F52] bg-[#DDF8EA] border border-[#18B86A]/30 rounded-xl px-2 py-1"
          >
            <option value="">Tanpa Voucher</option>
            {PROMO_VOUCHERS.map((v) => (
              <option key={v.code} value={v.code}>
                {v.code} - Potongan Rp {v.discountAmount.toLocaleString('id-ID')}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Tarif Perjalanan ({distanceKm} km)</span>
            <span className="font-mono tabular-nums">Rp {baseFare.toLocaleString('id-ID')}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Diskon Voucher ({appliedPromo})</span>
              <span className="font-mono tabular-nums">-Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1 border-t border-[#E4ECE7] font-bold text-[#17211B]">
            <span>Total Bayar</span>
            <span className="text-base text-[#18B86A] font-mono tabular-nums">
              Rp {totalPay.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Book Button */}
      <button
        type="button"
        onClick={handleBook}
        className="w-full h-12 rounded-2xl bg-[#18B86A] hover:bg-[#0E8F52] active:bg-[#0E8F52] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
      >
        <Bike className="w-4 h-4" />
        <span>Pesan Kawai {vehicleType === 'motor' ? 'Ojek' : 'Mobil'} Sekarang</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
