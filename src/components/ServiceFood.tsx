import React, { useState } from 'react';
import { LocationPoint, Merchant, MenuItem, CartItem, OrderDetails } from '../types';
import { MOCK_MERCHANTS, BANJARMASIN_LOCATIONS, PROMO_VOUCHERS } from '../data/mockData';
import { Utensils, Star, Clock, Plus, Minus, ShoppingBag, X, Check, MapPin, Tag } from 'lucide-react';

interface ServiceFoodProps {
  userLocation: LocationPoint;
  onBookFood: (order: Partial<OrderDetails>) => void;
  walletBalance: number;
}

export const ServiceFood: React.FC<ServiceFoodProps> = ({
  userLocation,
  onBookFood,
  walletBalance,
}) => {
  const [selectedMerchant, setSelectedMerchant] = useState<Merchant | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [appliedPromo, setAppliedPromo] = useState<string>('KULINERBANJAR');
  const [paymentMethod, setPaymentMethod] = useState<'kawaipay' | 'cash'>('kawaipay');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const categories = ['Semua', 'Kuliner Banjar', 'Soto & Sop', 'Ayam & Nasi', 'Kopi & Roti'];

  const filteredMerchants = MOCK_MERCHANTS.filter((m) => {
    const matchesCategory =
      selectedCategory === 'Semua' ||
      m.category.toLowerCase().includes(selectedCategory.toLowerCase());
    const matchesSearch =
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const addToCart = (item: MenuItem, merchantId: string) => {
    setCart((prev) => {
      // If adding from a different merchant, replace cart
      if (prev.length > 0 && prev[0].merchantId !== merchantId) {
        return [{ menuItem: item, merchantId, quantity: 1 }];
      }
      const existing = prev.find((ci) => ci.menuItem.id === item.id);
      if (existing) {
        return prev.map((ci) =>
          ci.menuItem.id === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prev, { menuItem: item, merchantId, quantity: 1 }];
    });
  };

  const removeFromCart = (itemId: string) => {
    setCart((prev) => {
      const existing = prev.find((ci) => ci.menuItem.id === itemId);
      if (existing && existing.quantity > 1) {
        return prev.map((ci) =>
          ci.menuItem.id === itemId ? { ...ci, quantity: ci.quantity - 1 } : ci
        );
      }
      return prev.filter((ci) => ci.menuItem.id !== itemId);
    });
  };

  const currentCartMerchant =
    cart.length > 0 ? MOCK_MERCHANTS.find((m) => m.id === cart[0].merchantId) : null;

  const subtotalFood = cart.reduce((acc, item) => acc + item.menuItem.price * item.quantity, 0);
  const deliveryFee = 9000;
  const serviceFee = 2000;
  const rawTotal = subtotalFood + deliveryFee + serviceFee;

  const promoObj = PROMO_VOUCHERS.find((p) => p.code === appliedPromo);
  const discount = promoObj && rawTotal >= promoObj.minSpend ? promoObj.discountAmount : 0;
  const totalPay = Math.max(3000, rawTotal - discount);

  const handleCheckout = () => {
    if (cart.length === 0 || !currentCartMerchant) return;

    const pickupLocation: LocationPoint = {
      id: `merchant-${currentCartMerchant.id}`,
      name: currentCartMerchant.name,
      address: currentCartMerchant.address,
      x: 48,
      y: 46,
    };

    onBookFood({
      service: 'food',
      pickup: pickupLocation,
      destination: userLocation,
      distanceKm: currentCartMerchant.distanceKm,
      fare: rawTotal,
      discount,
      totalPay,
      paymentMethod,
      foodItems: cart,
    });
    setIsCartOpen(false);
  };

  return (
    <div className="space-y-4">
      {/* Food Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Kawai Food 0511</h2>
          <p className="text-xs text-slate-500">Pesan soto banjar, lontong orari & kuliner banua favorit</p>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded border border-amber-200">
          <Utensils className="w-3.5 h-3.5 text-amber-600" />
          <span>Antar Panas & Rapi</span>
        </div>
      </div>

      {/* Search Input */}
      <div>
        <input
          type="text"
          placeholder="Cari resto atau makanan (cth: Soto Banjar, Ayam Bakar, Kopi)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:outline-none focus:ring-1 focus:ring-red-500"
        />
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-lg whitespace-nowrap font-medium transition-colors ${
              selectedCategory === cat
                ? 'bg-red-600 text-white shadow-sm'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Merchants List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {filteredMerchants.map((merchant) => (
          <div
            key={merchant.id}
            onClick={() => setSelectedMerchant(merchant)}
            className="group bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm hover:border-red-300 transition-all cursor-pointer flex flex-col justify-between"
          >
            <div className="relative h-32 w-full overflow-hidden bg-slate-100">
              <img
                src={merchant.image}
                alt={merchant.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
              {merchant.badge && (
                <div className="absolute top-2 left-2 bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded shadow">
                  {merchant.badge}
                </div>
              )}
              <div className="absolute bottom-2 right-2 bg-slate-900/80 backdrop-blur-sm text-white text-[11px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                <Clock className="w-3 h-3 text-amber-400" />
                <span>± {merchant.estimatedMinutes} mnt</span>
              </div>
            </div>

            <div className="p-3">
              <div className="flex items-start justify-between gap-1 mb-1">
                <h3 className="font-bold text-slate-900 text-sm group-hover:text-red-600 transition-colors">
                  {merchant.name}
                </h3>
                <div className="flex items-center gap-0.5 text-xs font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                  <span>{merchant.rating}</span>
                </div>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mb-2">
                <span>{merchant.category}</span>
                <span className="text-slate-300">·</span>
                <span>{merchant.distanceKm} km</span>
              </div>

              <p className="text-[11px] text-slate-400 truncate mb-3">{merchant.address}</p>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs">
                <span className="text-slate-500">{merchant.menu.length} Pilihan Menu</span>
                <span className="text-red-600 font-semibold flex items-center gap-0.5">
                  Buka Menu & Pesan →
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Floating Cart Indicator */}
      {cart.length > 0 && (
        <div className="sticky bottom-3 z-30 bg-slate-900 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-600 flex items-center justify-center relative">
              <ShoppingBag className="w-5 h-5 text-white" />
              <span className="absolute -top-1 -right-1 bg-white text-slate-900 text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                {cart.reduce((a, b) => a + b.quantity, 0)}
              </span>
            </div>
            <div>
              <p className="text-xs font-semibold">{currentCartMerchant?.name}</p>
              <p className="text-xs font-bold text-red-400 font-mono tabular-nums">
                Rp {subtotalFood.toLocaleString('id-ID')}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-colors"
          >
            Lihat Keranjang
          </button>
        </div>
      )}

      {/* Merchant Menu Detail Modal */}
      {selectedMerchant && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-base">{selectedMerchant.name}</h3>
                <p className="text-xs text-slate-500">{selectedMerchant.category} · {selectedMerchant.address}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMerchant(null)}
                className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Menu Items List */}
            <div className="p-4 overflow-y-auto space-y-3 flex-1">
              {selectedMerchant.menu.map((item) => {
                const inCart = cart.find((c) => c.menuItem.id === item.id);
                return (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl border border-slate-200 hover:border-slate-300 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                        {item.popular && (
                          <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 rounded font-semibold">
                            Favorit
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 mb-1.5">{item.description}</p>
                      <span className="text-xs font-bold text-red-600 font-mono tabular-nums">
                        Rp {item.price.toLocaleString('id-ID')}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {inCart ? (
                        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                          <button
                            type="button"
                            onClick={() => removeFromCart(item.id)}
                            className="w-6 h-6 rounded bg-white text-slate-800 flex items-center justify-center font-bold text-sm shadow-sm"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-bold text-slate-900 px-1 font-mono">
                            {inCart.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => addToCart(item, selectedMerchant.id)}
                            className="w-6 h-6 rounded bg-red-600 text-white flex items-center justify-center font-bold text-sm shadow-sm"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(item, selectedMerchant.id)}
                          className="px-3 py-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-600 hover:text-white font-bold text-xs transition-colors flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Modal Bar */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-500">Total di keranjang:</span>
                <p className="text-sm font-bold text-slate-900 font-mono">
                  {cart.length > 0 ? `Rp ${subtotalFood.toLocaleString('id-ID')}` : 'Belum ada item'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedMerchant(null);
                  if (cart.length > 0) setIsCartOpen(true);
                }}
                disabled={cart.length === 0}
                className="px-5 py-2.5 bg-red-600 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors"
              >
                Lanjut ke Pemesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cart & Checkout Sheet */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-lg rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900 text-base">Konfirmasi Pesanan Makanan</h3>
                <p className="text-xs text-slate-500">{currentCartMerchant?.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-4 flex-1">
              {/* Delivery Address */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <span className="font-semibold text-slate-700 flex items-center gap-1 mb-1">
                  <MapPin className="w-3.5 h-3.5 text-red-600" /> Diantar ke Alamat Kamu:
                </span>
                <p className="font-bold text-slate-900">{userLocation.name}</p>
                <p className="text-slate-500 text-[11px]">{userLocation.address}</p>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800">Daftar Makanan:</span>
                {cart.map((ci) => (
                  <div
                    key={ci.menuItem.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100"
                  >
                    <div>
                      <span className="font-semibold text-slate-800">
                        {ci.quantity}x {ci.menuItem.name}
                      </span>
                      <p className="text-[10px] text-slate-400">@ Rp {ci.menuItem.price.toLocaleString('id-ID')}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">
                        Rp {(ci.menuItem.price * ci.quantity).toLocaleString('id-ID')}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => removeFromCart(ci.menuItem.id)}
                          className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-700 text-xs"
                        >
                          -
                        </button>
                        <button
                          type="button"
                          onClick={() => addToCart(ci.menuItem, ci.merchantId)}
                          className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-700 text-xs"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Payment Method */}
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-800">Metode Bayar:</span>
                <div className="flex gap-2">
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
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`px-2 py-1 rounded text-xs border ${
                      paymentMethod === 'cash'
                        ? 'bg-amber-50 border-amber-400 text-amber-800 font-semibold'
                        : 'bg-slate-50 text-slate-600'
                    }`}
                  >
                    Tunai COD
                  </button>
                </div>
              </div>

              {/* Voucher */}
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

              {/* Cost Summary */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal Makanan</span>
                  <span className="font-mono">Rp {subtotalFood.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Ongkir Driver Kawai</span>
                  <span className="font-mono">Rp {deliveryFee.toLocaleString('id-ID')}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Biaya Layanan & Pengemasan</span>
                  <span className="font-mono">Rp {serviceFee.toLocaleString('id-ID')}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-semibold">
                    <span>Diskon Voucher</span>
                    <span className="font-mono">-Rp {discount.toLocaleString('id-ID')}</span>
                  </div>
                )}
                <div className="flex justify-between items-baseline pt-2 border-t border-slate-200 font-bold text-slate-900 text-sm">
                  <span>Total Pembayaran</span>
                  <span className="text-red-600 font-mono">Rp {totalPay.toLocaleString('id-ID')}</span>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-white">
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full h-12 rounded-xl bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-600/20"
              >
                <Utensils className="w-4 h-4" />
                <span>Pesan Sekarang · Rp {totalPay.toLocaleString('id-ID')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
