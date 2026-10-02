import React, { useState } from 'react';
import { LocationPoint, OrderDetails } from '../types';
import { BANJARMASIN_LOCATIONS, PROMO_VOUCHERS } from '../data/mockData';
import { Package, ShieldCheck, Clock, MapPin, Tag, User, Phone, CheckCircle2 } from 'lucide-react';

interface ServiceDeliveryProps {
  pickup: LocationPoint;
  destination: LocationPoint;
  onSetPickup: (loc: LocationPoint) => void;
  onSetDestination: (loc: LocationPoint) => void;
  onOpenMapPicker: (target: 'pickup' | 'destination') => void;
  onBookDelivery: (order: Partial<OrderDetails>) => void;
  walletBalance: number;
}

export const ServiceDelivery: React.FC<ServiceDeliveryProps> = ({
  pickup,
  destination,
  onSetPickup,
  onSetDestination,
  onOpenMapPicker,
  onBookDelivery,
  walletBalance,
}) => {
  const [packageType, setPackageType] = useState<string>('Dokumen');
  const [packageWeight, setPackageWeight] = useState<string>('Kecil (< 5 kg)');
  const [senderName, setSenderName] = useState<string>('Arief Laksono');
  const [recipientName, setRecipientName] = useState<string>('Ibu Rahmah');
  const [recipientPhone, setRecipientPhone] = useState<string>('0813-9051-1200');
  const [notes, setNotes] = useState<string>('Tolong jangan ditumpuk, berkas penting');
  const [deliverySpeed, setDeliverySpeed] = useState<'instant' | 'sameday'>('instant');
  const [isInsured, setIsInsured] = useState<boolean>(true);
  const [appliedPromo, setAppliedPromo] = useState<string>('ONGKIRKILAT');
  const [paymentMethod, setPaymentMethod] = useState<'kawaipay' | 'cash'>('kawaipay');

  const dx = pickup.x - destination.x;
  const dy = pickup.y - destination.y;
  const rawDist = Math.sqrt(dx * dx + dy * dy) * 0.18;
  const distanceKm = Math.max(1.2, parseFloat(rawDist.toFixed(1)));

  const baseRate = deliverySpeed === 'instant' ? 10000 : 7000;
  const perKmRate = 2200;
  const insuranceFee = isInsured ? 1000 : 0;
  const weightSurcharge = packageWeight.includes('Besar') ? 5000 : packageWeight.includes('Sedang') ? 2500 : 0;
  const baseFare = Math.round(baseRate + Math.max(0, distanceKm - 2) * perKmRate + weightSurcharge + insuranceFee);

  const promoObj = PROMO_VOUCHERS.find((p) => p.code === appliedPromo);
  const discount = promoObj && baseFare >= promoObj.minSpend ? promoObj.discountAmount : 0;
  const totalPay = Math.max(2000, baseFare - discount);

  const handleBook = () => {
    onBookDelivery({
      service: 'delivery',
      pickup,
      destination,
      distanceKm,
      fare: baseFare,
      discount,
      totalPay,
      paymentMethod,
      packageDetails: {
        type: packageType,
        weight: packageWeight,
        recipientName,
        recipientPhone,
        notes,
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kawai Kurir Instant 0511</h2>
          <p className="text-xs text-slate-500">Kirim paket, dokumen, & barang dagangan kilat se-Banjarmasin</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-sky-700 bg-sky-50 px-2 py-1 rounded border border-sky-200">
          <ShieldCheck className="w-3.5 h-3.5 text-sky-600" />
          <span>Garansi Aman 100%</span>
        </div>
      </div>

      {/* Speed Options */}
      <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-xl">
        <button
          type="button"
          onClick={() => setDeliverySpeed('instant')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            deliverySpeed === 'instant'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Instant Kilat (30-45 Mnt)
          </span>
          <span className="text-[10px] text-slate-400 font-normal">Langsung dijemput & diantar</span>
        </button>
        <button
          type="button"
          onClick={() => setDeliverySpeed('sameday')}
          className={`flex flex-col items-center justify-center py-2 px-3 rounded-lg text-xs font-semibold transition-all ${
            deliverySpeed === 'sameday'
              ? 'bg-white text-red-600 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>Same Day Hemat (3-4 Jam)</span>
          <span className="text-[10px] text-slate-400 font-normal">Ongkir lebih ekonomis</span>
        </button>
      </div>

      {/* Location Pickers */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-700 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-600" />
              Alamat Pengirim (Jemput Paket)
            </span>
            <button
              type="button"
              onClick={() => onOpenMapPicker('pickup')}
              className="text-[11px] text-sky-600 hover:text-sky-800 font-medium hover:underline"
            >
              Pilih di Peta
            </button>
          </div>
          <select
            value={pickup.id}
            onChange={(e) => {
              const found = BANJARMASIN_LOCATIONS.find((l) => l.id === e.target.value);
              if (found) onSetPickup(found);
            }}
            className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
          >
            {BANJARMASIN_LOCATIONS.map((loc) => (
              <option key={`p-${loc.id}`} value={loc.id}>
                {loc.name} — {loc.address.slice(0, 36)}...
              </option>
            ))}
          </select>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nama Pengirim"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="No HP Pengirim"
                defaultValue="0812-5511-0987"
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-red-600 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-red-600" />
              Alamat Penerima (Tujuan Paket)
            </span>
            <button
              type="button"
              onClick={() => onOpenMapPicker('destination')}
              className="text-[11px] text-sky-600 hover:text-sky-800 font-medium hover:underline"
            >
              Pilih di Peta
            </button>
          </div>
          <select
            value={destination.id}
            onChange={(e) => {
              const found = BANJARMASIN_LOCATIONS.find((l) => l.id === e.target.value);
              if (found) onSetDestination(found);
            }}
            className="w-full text-xs font-medium text-slate-800 bg-slate-50 border border-slate-200 rounded-lg p-2.5"
          >
            {BANJARMASIN_LOCATIONS.map((loc) => (
              <option key={`d-${loc.id}`} value={loc.id}>
                {loc.name} — {loc.address.slice(0, 36)}...
              </option>
            ))}
          </select>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">
              <User className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Nama Penerima"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200 text-xs">
              <Phone className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="No HP Penerima"
                value={recipientPhone}
                onChange={(e) => setRecipientPhone(e.target.value)}
                className="w-full bg-transparent text-xs focus:outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Package Specs */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Package className="w-3.5 h-3.5 text-red-600" />
          Detail Barang Kiriman
        </h3>

        <div className="flex flex-wrap gap-1.5">
          {['Dokumen', 'Makanan / Kue', 'Pakaian & Olshop', 'Elektronik Kecil', 'Obat / Farmasi', 'Lainnya'].map(
            (cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setPackageType(cat)}
                className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                  packageType === cat
                    ? 'bg-red-50 border-red-400 text-red-700 font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
              >
                {cat}
              </button>
            )
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          {['Kecil (< 5 kg)', 'Sedang (5-10 kg)', 'Besar (10-20 kg)'].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setPackageWeight(w)}
              className={`p-2 rounded-lg text-center border text-xs transition-colors ${
                packageWeight === w
                  ? 'bg-sky-50 border-sky-400 text-sky-800 font-semibold'
                  : 'bg-slate-50 border-slate-200 text-slate-600'
              }`}
            >
              {w}
            </button>
          ))}
        </div>

        <div>
          <input
            type="text"
            placeholder="Instruksi penanganan paket / patokan rumah penerima"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full text-xs p-2 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
        </div>

        <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer pt-1">
          <input
            type="checkbox"
            checked={isInsured}
            onChange={(e) => setIsInsured(e.target.checked)}
            className="rounded border-slate-300 text-red-600 focus:ring-red-500"
          />
          <span>Proteksi Kerusakan & Kehilangan Kawai Aman (+Rp 1.000)</span>
        </label>
      </div>

      {/* Payment & Voucher */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">Pembayaran</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('kawaipay')}
              className={`px-2 py-1 rounded text-xs border ${
                paymentMethod === 'kawaipay'
                  ? 'bg-sky-50 border-sky-400 text-sky-800 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              KawaiPay
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`px-2 py-1 rounded text-xs border ${
                paymentMethod === 'cash'
                  ? 'bg-amber-50 border-amber-400 text-amber-800 font-semibold'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              }`}
            >
              Tunai di Tempat
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
          <span className="text-slate-600 flex items-center gap-1">
            <Tag className="w-3.5 h-3.5 text-red-600" /> Voucher:
          </span>
          <select
            value={appliedPromo}
            onChange={(e) => setAppliedPromo(e.target.value)}
            className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 rounded p-1"
          >
            <option value="">Tanpa Voucher</option>
            {PROMO_VOUCHERS.map((v) => (
              <option key={v.code} value={v.code}>
                {v.code} (-Rp {v.discountAmount.toLocaleString('id-ID')})
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Ongkir ({distanceKm} km) + Proteksi</span>
            <span className="font-mono tabular-nums">Rp {baseFare.toLocaleString('id-ID')}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Diskon Voucher ({appliedPromo})</span>
              <span className="font-mono tabular-nums">-Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-1 border-t border-slate-200 font-bold text-slate-900">
            <span>Total Biaya Kurir</span>
            <span className="text-base text-red-600 font-mono tabular-nums">
              Rp {totalPay.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBook}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20 transition-all"
      >
        <Package className="w-4 h-4" />
        <span>Panggil Kurir Instant Kawai 0511</span>
      </button>
    </div>
  );
};
