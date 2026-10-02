import React, { useState } from 'react';
import { LocationPoint, OrderDetails } from '../types';
import { POPULAR_SHOPPING_STORES, PROMO_VOUCHERS, BANJARMASIN_LOCATIONS } from '../data/mockData';
import { ShoppingBag, Store, Plus, Trash2, CheckCircle2, ShieldCheck, Tag } from 'lucide-react';

interface ServiceMartProps {
  userLocation: LocationPoint;
  onBookMart: (order: Partial<OrderDetails>) => void;
  walletBalance: number;
}

export const ServiceMart: React.FC<ServiceMartProps> = ({
  userLocation,
  onBookMart,
  walletBalance,
}) => {
  const [selectedStore, setSelectedStore] = useState(POPULAR_SHOPPING_STORES[0]);
  const [customList, setCustomList] = useState<string[]>([
    'Ikan Haruan (Gabus) Segar 1 kg (minta dibersihkan & dipotong)',
    'Cabai Rawit Merah 2 ons',
    'Bawang Merah Banjar 1/4 kg',
  ]);
  const [newItemInput, setNewItemInput] = useState<string>('');
  const [estimatedBudget, setEstimatedBudget] = useState<number>(75000);
  const [paymentMethod, setPaymentMethod] = useState<'kawaipay' | 'cash'>('cash');
  const [appliedPromo, setAppliedPromo] = useState<string>('HEMAT0511');

  const addItem = () => {
    if (newItemInput.trim()) {
      setCustomList([...customList, newItemInput.trim()]);
      setNewItemInput('');
    }
  };

  const removeItem = (index: number) => {
    setCustomList(customList.filter((_, i) => i !== index));
  };

  const courierFee = 12000;
  const promoObj = PROMO_VOUCHERS.find((p) => p.code === appliedPromo);
  const discount = promoObj ? Math.min(5000, promoObj.discountAmount) : 0;
  const totalServiceFee = Math.max(7000, courierFee - discount);
  const grandTotalEstimate = estimatedBudget + totalServiceFee;

  const handleBook = () => {
    if (customList.length === 0) return;

    const storeLocation: LocationPoint = {
      id: `store-${selectedStore.id}`,
      name: selectedStore.name,
      address: `Area ${selectedStore.name}, Banjarmasin`,
      x: 42,
      y: 65,
    };

    onBookMart({
      service: 'mart',
      pickup: storeLocation,
      destination: userLocation,
      distanceKm: 2.5,
      fare: courierFee,
      discount,
      totalPay: grandTotalEstimate,
      paymentMethod,
      shoppingItems: customList,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kawai Belanja 0511</h2>
          <p className="text-xs text-slate-500">Jasa titip belanja pasar tradisional, supermarket & minimarket</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-cyan-800 bg-cyan-50 px-2 py-1 rounded border border-cyan-200">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-600" />
          <span>Struk Belanja Terlampir</span>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2">
        <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
          <Store className="w-3.5 h-3.5 text-red-600" />
          Pilih Tempat Belanja / Toko Tujuan
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {POPULAR_SHOPPING_STORES.map((store) => (
            <button
              key={store.id}
              type="button"
              onClick={() => setSelectedStore(store)}
              className={`p-2.5 rounded-xl border text-left transition-all ${
                selectedStore.id === store.id
                  ? 'border-red-500 bg-red-50/50 shadow-sm ring-1 ring-red-500'
                  : 'border-slate-200 bg-slate-50 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-900">{store.name}</span>
                <span className="text-[10px] text-slate-500">{store.distance}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 line-clamp-1">{store.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <ShoppingBag className="w-3.5 h-3.5 text-red-600" />
            Tulis Catatan / Daftar Barang Titipan Kamu
          </label>
          <span className="text-[11px] text-slate-400 font-mono">{customList.length} item</span>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Cth: Telur ayam 1 kg, Minyak goreng Sania 2 liter..."
            value={newItemInput}
            onChange={(e) => setNewItemInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            className="flex-1 text-xs p-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none focus:ring-1 focus:ring-red-500"
          />
          <button
            type="button"
            onClick={addItem}
            className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {customList.map((item, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50 border border-slate-100"
            >
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 rounded-full bg-red-100 text-red-600 font-bold text-[10px] flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="text-slate-800 font-medium">{item}</span>
              </div>
              <button
                type="button"
                onClick={() => removeItem(idx)}
                className="text-slate-400 hover:text-red-600 p-1 transition-colors"
                title="Hapus Item"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
          <div>
            <span className="font-semibold text-slate-800">Perkiraan Dana Belanja:</span>
            <p className="text-[10px] text-slate-400">Driver akan menalangi belanjaan & menunjukkan nota kasir</p>
          </div>
          <div className="flex items-center gap-1 bg-slate-50 px-2 py-1 rounded border border-slate-200">
            <span className="text-slate-500 font-bold">Rp</span>
            <input
              type="number"
              value={estimatedBudget}
              onChange={(e) => setEstimatedBudget(Number(e.target.value) || 0)}
              className="w-24 bg-transparent font-mono font-bold text-slate-900 text-xs focus:outline-none text-right"
              step={5000}
            />
          </div>
        </div>
      </div>

      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm space-y-2.5">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-800">Metode Penggantian:</span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('cash')}
              className={`px-2 py-1 rounded text-xs border ${
                paymentMethod === 'cash'
                  ? 'bg-amber-50 border-amber-400 text-amber-800 font-semibold'
                  : 'bg-slate-50 text-slate-600'
              }`}
            >
              Bayar Tunai ke Driver (Sesuai Nota)
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod('kawaipay')}
              className={`px-2 py-1 rounded text-xs border ${
                paymentMethod === 'kawaipay'
                  ? 'bg-sky-50 border-sky-400 text-sky-800 font-semibold'
                  : 'bg-slate-50 text-slate-600'
              }`}
            >
              KawaiPay
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
          <div className="flex justify-between text-slate-500">
            <span>Estimasi Belanjaan (Talangan)</span>
            <span className="font-mono">± Rp {estimatedBudget.toLocaleString('id-ID')}</span>
          </div>
          <div className="flex justify-between text-slate-500">
            <span>Ongkos Jasa Titip Kurir</span>
            <span className="font-mono">Rp {courierFee.toLocaleString('id-ID')}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between text-emerald-600 font-medium">
              <span>Diskon Voucher</span>
              <span className="font-mono">-Rp {discount.toLocaleString('id-ID')}</span>
            </div>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-bold text-slate-900">
            <span>Perkiraan Total Bayar</span>
            <span className="text-base text-red-600 font-mono">
              ± Rp {grandTotalEstimate.toLocaleString('id-ID')}
            </span>
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleBook}
        disabled={customList.length === 0}
        className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-slate-300 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
      >
        <ShoppingBag className="w-4 h-4" />
        <span>Kirim Kurir Belanja Kawai Sekarang</span>
      </button>
    </div>
  );
};
