import React, { useState } from 'react';
import { LocationPoint, OrderDetails } from '../types';
import { BANJARMASIN_LOCATIONS, PROMO_VOUCHERS } from '../data/mockData';
import { MapPin, Navigation, Bike, Car, Tag, Shield, Clock, ChevronRight, Check } from 'lucide-react';

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

  // Calculate approximate distance from coordinate percentage deltas
  const dx = pickup.x - destination.x;
  const dy = pickup.y - destination.y;
  const rawDist = Math.sqrt(dx * dx + dy * dy) * 0.18; // scaled to realistic Banjarmasin km
  const distanceKm = Math.max(1.2, parseFloat(rawDist.toFixed(1)));
  const estimatedMins = Math.max(6, Math.round(distanceKm * (vehicleType === 'motor' ? 2.5 : 3.8)));

  // Calculate fare in Rupiah
  const baseRate = vehicleType === 'motor' ? 9000 : 18000;
  const perKmRate = vehicleType === 'motor' ? 2500 : 4500;
  const baseFare = Math.round(baseRate + Math.max(0, distanceKm - 2) * perKmRate);

  // Discount
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
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setVehicleType('motor')}
          className={`flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            vehicleType === 'motor'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
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
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Car className="w-4 h-4" />
          <span>Kawai Car (Mobil AC)</span>
        </button>
      </div>

      {/* Location Pickup & Destination Pickers */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Pickup Item */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Lokasi Jemput
            </span>
            <button
              type="button"
              onClick={() => onOpenMapPicker('pickup')}
              className="text-[11px] text-sky-600 hover:text-sky-800 font-medium hover:underline"
            >
              Pilih dari Peta
            </button>
          </div>
          <div className="relative">
            <select
              value={pickup.id}
              onChange={(e) => {
                const found = BANJARMASIN_LOCATIONS.find((l) => l.id === e.target.value);
                if (found) onSetPickup(found);
              }}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {BANJARMASIN_LOCATIONS.map((loc) => (
                <option key={`p-${loc.id}`} value={loc.id}>
                  {loc.name} — {loc.landmark || loc.address.slice(0, 30)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">{pickup.address}</p>
        </div>

        {/* Divider */}
        <div className="border-t border-slate-100 relative">
          <div className="absolute left-3 -top-2.5 bg-white px-1 text-[10px] text-slate-400">
            menuju ke
          </div>
        </div>

        {/* Destination Item */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Tujuan Antar
            </span>
            <button
              type="button"
              onClick={() => onOpenMapPicker('destination')}
              className="text-[11px] text-sky-600 hover:text-sky-800 font-medium hover:underline"
            >
              Pilih dari Peta
            </button>
          </div>
          <div className="relative">
            <select
              value={destination.id}
              onChange={(e) => {
                const found = BANJARMASIN_LOCATIONS.find((l) => l.id === e.target.value);
                if (found) onSetDestination(found);
              }}
              className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5 pr-8 focus:outline-none focus:ring-1 focus:ring-red-500"
            >
              {BANJARMASIN_LOCATIONS.map((loc) => (
                <option key={`d-${loc.id}`} value={loc.id}>
                  {loc.name} — {loc.landmark || loc.address.slice(0, 30)}
                </option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-slate-400 mt-1 truncate">{destination.address}</p>
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
          <span className="text-[11px] text-slate-400">Rute tercepat via Jl. A. Yani</span>
        </div>
      </div>

      {/* Ride Options / Notes */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={needExtraHelmet}
            onChange={(e) => setNeedExtraHelmet(e.target.checked)}
            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span>Minta driver siapkan helm bersih dengan hairnet higienis</span>
        </label>
        <div>
          <input
            type="text"
            placeholder="Catatan untuk driver (cth: Tunggu di pos satpam gerbang depan)"
            value={tripNotes}
            onChange={(e) => setTripNotes(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>
      </div>

      {/* Payment & Promo */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        {/* Payment Method Selector */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-800">Metode Pembayaran</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('kawaipay')}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                paymentMethod === 'kawaipay'
                  ? 'bg-sky-50 border-sky-400 text-sky-700 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              KawaiPay (Saldo Rp {walletBalance.toLocaleString('id-ID')})
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`px-2.5 py-1 rounded text-xs font-medium border transition-colors ${
                paymentMethod === 'cash'
                  ? 'bg-amber-50 border-amber-400 text-amber-800 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              Tunai / Cash
            </button>
          </div>
        </div>

        {/* Promo Code Input */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-1.5 text-slate-700">
            <Tag className="w-3.5 h-3.5 text-red-600" />
            <span>Voucher Promo:</span>
          </div>
          <select
            value={appliedPromo}
            onChange={(e) => setAppliedPromo(e.target.value)}
            className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 rounded p-1"
          >
            <option value="">Tanpa Voucher</option>
            {PROMO_VOUCHERS.map((v) => (
              <option key={v.code} value={v.code}>
                {v.code} - Potongan Rp {v.discountAmount.toLocaleString('id-ID')}
              </option>
            ))}
          </select>
        </div>

        {/* Fare Breakdown */}
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
          <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 font-bold text-slate-900">
            <span>Total Bayar</span>
            <span className="text-base text-red-600 font-mono tabular-nums">
              Rp {totalPay.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      {/* Book Button */}
      <button
        type="button"
        onClick={handleBook}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all"
      >
        <Bike className="w-4 h-4" />
        <span>Pesan Kawai {vehicleType === 'motor' ? 'Ojek' : 'Mobil'} Sekarang</span>
        <ChevronRight className="w-4 h-4" />
      </button>
    </div>
  );
};
