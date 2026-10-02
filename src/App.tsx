import React, { useState } from 'react';
import { ServiceType, LocationPoint, OrderDetails } from './types';
import {
  BANJARMASIN_LOCATIONS,
  MOCK_DRIVERS,
  MOCK_MERCHANTS,
  PROMO_VOUCHERS
} from './data/mockData';
import { KawaiHeader } from './components/KawaiHeader';
import { InteractiveMap } from './components/InteractiveMap';
import { ServiceRide } from './components/ServiceRide';
import { ServiceDelivery } from './components/ServiceDelivery';
import { ServiceFood } from './components/ServiceFood';
import { ServiceMart } from './components/ServiceMart';
import { ActiveOrderTracker } from './components/ActiveOrderTracker';
import { DriverModeView } from './components/DriverModeView';
import { WalletModal } from './components/WalletModal';
import { PromoModal } from './components/PromoModal';
import {
  Bike,
  Package,
  UtensilsCrossed,
  ShoppingBag,
  Clock,
  Sparkles,
  MapPin,
  ChevronRight,
  Shield,
  PhoneCall,
  History,
  Layers,
  ArrowRight
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ServiceType | 'orders' | 'driver_mode'>('ride');
  const [isMobileFrame, setIsMobileFrame] = useState<boolean>(false);
  const [walletBalance, setWalletBalance] = useState<number>(125000);
  const [isWalletOpen, setIsWalletOpen] = useState<boolean>(false);
  const [isPromoOpen, setIsPromoOpen] = useState<boolean>(false);

  // Selected Locations on Map
  const [pickup, setPickup] = useState<LocationPoint>(BANJARMASIN_LOCATIONS[0]); // Duta Mall
  const [destination, setDestination] = useState<LocationPoint>(BANJARMASIN_LOCATIONS[1]); // Siring
  const [mapPickerTarget, setMapPickerTarget] = useState<'pickup' | 'destination' | null>(null);

  // Active Orders List
  const [orders, setOrders] = useState<OrderDetails[]>([
    {
      id: 'kwi-0511-prev',
      service: 'ride',
      status: 'completed',
      pickup: BANJARMASIN_LOCATIONS[3], // ULM
      destination: BANJARMASIN_LOCATIONS[0], // Duta Mall
      distanceKm: 4.2,
      fare: 14500,
      discount: 5000,
      totalPay: 9500,
      paymentMethod: 'kawaipay',
      driver: MOCK_DRIVERS[0],
      createdAt: 'Kemarin, 16:30',
    },
  ]);

  const activeOrders = orders.filter((o) => o.status !== 'completed' && o.status !== 'cancelled');

  const handleBookOrder = (orderData: Partial<OrderDetails>) => {
    const newOrder: OrderDetails = {
      id: `kwi-${Date.now().toString().slice(-4)}`,
      service: orderData.service || 'ride',
      status: 'searching',
      pickup: orderData.pickup || pickup,
      destination: orderData.destination || destination,
      distanceKm: orderData.distanceKm || 2.5,
      fare: orderData.fare || 12000,
      discount: orderData.discount || 0,
      totalPay: orderData.totalPay || 12000,
      paymentMethod: orderData.paymentMethod || 'kawaipay',
      driver: MOCK_DRIVERS[0], // Pak Ridho Saputra
      createdAt: 'Baru saja',
      packageDetails: orderData.packageDetails,
      foodItems: orderData.foodItems,
      shoppingItems: orderData.shoppingItems,
      vehicleType: orderData.vehicleType || 'motor',
    };

    // Deduct from wallet if paid via KawaiPay
    if (newOrder.paymentMethod === 'kawaipay') {
      setWalletBalance((prev) => Math.max(0, prev - newOrder.totalPay));
    }

    setOrders((prev) => [newOrder, ...prev]);
    setActiveTab('orders');
  };

  const handleUpdateOrderStatus = (orderId: string, newStatus: OrderDetails['status']) => {
    setOrders((prev) =>
      prev.map((ord) => (ord.id === orderId ? { ...ord, status: newStatus } : ord))
    );
  };

  const handleCancelOrder = (orderId: string) => {
    setOrders((prev) =>
      prev.map((ord) => {
        if (ord.id === orderId) {
          // Refund wallet if paid via KawaiPay
          if (ord.paymentMethod === 'kawaipay') {
            setWalletBalance((b) => b + ord.totalPay);
          }
          return { ...ord, status: 'cancelled' };
        }
        return ord;
      })
    );
  };

  const handleFinishOrder = (orderId: string, rating: number, tip: number) => {
    if (tip > 0 && walletBalance >= tip) {
      setWalletBalance((prev) => prev - tip);
    }
  };

  const handleTopUpWallet = (amount: number) => {
    setWalletBalance((prev) => prev + amount);
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-800 antialiased font-sans">
      {/* Top Bar Contract */}
      <KawaiHeader
        activeTab={activeTab}
        onSelectTab={(tab) => {
          setActiveTab(tab);
          setMapPickerTarget(null);
        }}
        walletBalance={walletBalance}
        onOpenWallet={() => setIsWalletOpen(true)}
        onOpenPromo={() => setIsPromoOpen(true)}
        isMobileFrame={isMobileFrame}
        onToggleFrame={() => setIsMobileFrame(!isMobileFrame)}
        activeOrderCount={activeOrders.length}
      />

      {/* Main Container Wrapper */}
      <main className="flex-1 flex justify-center py-4 px-2 sm:px-6">
        <div
          className={`w-full transition-all duration-300 ${
            isMobileFrame
              ? 'max-w-md bg-white rounded-3xl shadow-2xl border-4 border-slate-800 overflow-hidden min-h-[780px] flex flex-col'
              : 'max-w-7xl'
          }`}
        >
          {/* Sub-Hero Banner */}
          {activeTab !== 'driver_mode' && activeOrders.length === 0 && (
            <div className="mb-4 relative rounded-2xl overflow-hidden shadow-sm border border-slate-200 bg-white">
              <div className="relative h-36 sm:h-44 w-full bg-slate-900">
                <img
                  src="/src/assets/images/kawai_hero_banner_1790780292416.jpg"
                  alt="Kawai 0511 Ojek Online Banjarmasin"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover opacity-90"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-red-950/85 via-red-900/60 to-transparent flex items-center p-4 sm:p-6">
                  <div className="max-w-md text-white">
                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-white/20 backdrop-blur-sm text-[11px] font-semibold mb-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>0511 Banjarmasin & Banjarbaru</span>
                    </div>
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Kawai Kurir & Ojek Online
                    </h1>
                    <p className="text-xs text-white/90 mt-1 line-clamp-2">
                      Layanan transportasi, kirim paket kilat, kuliner soto banjar, dan jasa titip belanja terpercaya.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Service Selector Tabs (The 4 Pillars) */}
          {activeTab !== 'driver_mode' && (
            <section className="mb-4">
              <div className="grid grid-cols-4 gap-2 sm:gap-3 bg-white p-2.5 sm:p-3.5 rounded-2xl border border-slate-200 shadow-sm">
                {/* 1. INSTANT DELIVERY */}
                <button
                  type="button"
                  onClick={() => setActiveTab('delivery')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group ${
                    activeTab === 'delivery'
                      ? 'bg-emerald-50 text-emerald-800 font-bold ring-2 ring-emerald-500 shadow-sm'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-emerald-100 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform border border-emerald-300">
                    <Package className="w-5 h-5 text-emerald-700" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                    Instant Delivery
                  </span>
                  <span className="text-[9px] text-slate-400 hidden sm:inline">Kurir Kilat</span>
                </button>

                {/* 2. TRANSPORT */}
                <button
                  type="button"
                  onClick={() => setActiveTab('ride')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group ${
                    activeTab === 'ride'
                      ? 'bg-red-50 text-red-700 font-bold ring-2 ring-red-500 shadow-sm'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-red-100 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform border border-red-300">
                    <Bike className="w-5 h-5 text-red-600" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                    Transport
                  </span>
                  <span className="text-[9px] text-slate-400 hidden sm:inline">Ojek & Mobil</span>
                </button>

                {/* 3. FOOD */}
                <button
                  type="button"
                  onClick={() => setActiveTab('food')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group ${
                    activeTab === 'food'
                      ? 'bg-amber-50 text-amber-800 font-bold ring-2 ring-amber-500 shadow-sm'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-amber-100 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform border border-amber-300">
                    <UtensilsCrossed className="w-5 h-5 text-amber-700" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                    Kawai Food
                  </span>
                  <span className="text-[9px] text-slate-400 hidden sm:inline">Kuliner Banjar</span>
                </button>

                {/* 4. MART / BELANJA */}
                <button
                  type="button"
                  onClick={() => setActiveTab('mart')}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl transition-all group ${
                    activeTab === 'mart'
                      ? 'bg-sky-50 text-sky-800 font-bold ring-2 ring-sky-500 shadow-sm'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className="w-11 h-11 rounded-full bg-sky-100 flex items-center justify-center mb-1.5 group-hover:scale-105 transition-transform border border-sky-300">
                    <ShoppingBag className="w-5 h-5 text-sky-700" />
                  </div>
                  <span className="text-[11px] sm:text-xs font-bold text-center leading-tight">
                    Titip Belanja
                  </span>
                  <span className="text-[9px] text-slate-400 hidden sm:inline">Pasar & Mart</span>
                </button>
              </div>
            </section>
          )}

          {/* Active Orders Banner */}
          {activeOrders.length > 0 && activeTab !== 'orders' && (
            <div
              onClick={() => setActiveTab('orders')}
              className="mb-4 bg-gradient-to-r from-red-600 to-rose-700 text-white p-3.5 rounded-2xl shadow-md flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
            >
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                <div>
                  <h4 className="font-bold text-xs">Kamu memiliki {activeOrders.length} pesanan berjalan</h4>
                  <p className="text-[10px] text-white/80">
                    Klik untuk melihat live radar & posisi driver Kawai
                  </p>
                </div>
              </div>
              <span className="text-xs font-bold bg-white/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                Pantau <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          )}

          {/* Layout Content: Split View on Desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column */}
            <div
              className={`${
                activeTab === 'driver_mode' || activeTab === 'orders'
                  ? 'lg:col-span-12'
                  : 'lg:col-span-5'
              } space-y-4`}
            >
              {/* Service: RIDE */}
              {activeTab === 'ride' && (
                <ServiceRide
                  pickup={pickup}
                  destination={destination}
                  onSetPickup={setPickup}
                  onSetDestination={setDestination}
                  onOpenMapPicker={(target) => setMapPickerTarget(target)}
                  onBookRide={handleBookOrder}
                  walletBalance={walletBalance}
                />
              )}

              {/* Service: DELIVERY */}
              {activeTab === 'delivery' && (
                <ServiceDelivery
                  pickup={pickup}
                  destination={destination}
                  onSetPickup={setPickup}
                  onSetDestination={setDestination}
                  onOpenMapPicker={(target) => setMapPickerTarget(target)}
                  onBookDelivery={handleBookOrder}
                  walletBalance={walletBalance}
                />
              )}

              {/* Service: FOOD */}
              {activeTab === 'food' && (
                <ServiceFood
                  userLocation={destination}
                  onBookFood={handleBookOrder}
                  walletBalance={walletBalance}
                />
              )}

              {/* Service: MART */}
              {activeTab === 'mart' && (
                <ServiceMart
                  userLocation={destination}
                  onBookMart={handleBookOrder}
                  walletBalance={walletBalance}
                />
              )}

              {/* View: DRIVER MODE */}
              {activeTab === 'driver_mode' && <DriverModeView />}

              {/* View: ORDERS / ACTIVITY HISTORY */}
              {activeTab === 'orders' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">Aktivitas & Riwayat Pesanan</h2>
                      <p className="text-xs text-slate-500">Pantau status perjalanan & struk transaksi Kawai</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('ride')}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 transition-colors"
                    >
                      Pesan Layanan Baru
                    </button>
                  </div>

                  {activeOrders.map((ord) => (
                    <ActiveOrderTracker
                      key={ord.id}
                      order={ord}
                      onUpdateStatus={handleUpdateOrderStatus}
                      onCancelOrder={handleCancelOrder}
                      onFinishOrder={handleFinishOrder}
                    />
                  ))}

                  <div className="space-y-2 pt-2">
                    <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-slate-500" />
                      Riwayat Pesanan Selesai
                    </h3>
                    {orders
                      .filter((o) => o.status === 'completed' || o.status === 'cancelled')
                      .map((past) => (
                        <div
                          key={past.id}
                          className="bg-white p-3.5 rounded-xl border border-slate-200 text-xs space-y-1.5 shadow-sm"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 uppercase">
                              Kawai {past.service}
                            </span>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                past.status === 'completed'
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                  : 'bg-red-50 text-red-700 border border-red-200'
                              }`}
                            >
                              {past.status === 'completed' ? 'Selesai' : 'Dibatalkan'}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px]">
                            {past.pickup.name} → {past.destination.name}
                          </p>
                          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-100">
                            <span>{past.createdAt}</span>
                            <span className="font-mono font-bold text-slate-900">
                              Rp {past.totalPay.toLocaleString('id-ID')}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Live Map Simulator */}
            {activeTab !== 'driver_mode' && (
              <div className="lg:col-span-7 flex flex-col space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-red-600" />
                    <h3 className="font-bold text-sm text-slate-900">
                      Peta Interaktif Kota Banjarmasin
                    </h3>
                  </div>
                  <span className="text-[11px] text-slate-500">
                    {MOCK_DRIVERS.length} Driver Aktif Siap Jemput
                  </span>
                </div>

                <div className="w-full h-[400px] lg:h-[580px]">
                  <InteractiveMap
                    pickup={pickup}
                    destination={destination}
                    mode={mapPickerTarget ? `pick_${mapPickerTarget}` : 'view'}
                    onSelectPickup={(point) => {
                      setPickup(point);
                      setMapPickerTarget(null);
                    }}
                    onSelectDestination={(point) => {
                      setDestination(point);
                      setMapPickerTarget(null);
                    }}
                    drivers={MOCK_DRIVERS}
                    activeDriver={activeOrders.length > 0 ? activeOrders[0].driver : null}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-8 bg-white border-t border-slate-200 py-6 px-4 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-slate-900 text-sm">
              Kawai<span className="text-red-600">0511</span>
            </span>
            <span className="text-slate-300">|</span>
            <span>Kurir Instant & Ojek Online Asli Banua</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600">
            <span>Wilayah: Banjarmasin · Banjarbaru · Martapura</span>
            <span className="text-slate-300">·</span>
            <span>Customer Care: 0812-5511-0511</span>
          </div>

          <div>
            <p className="text-[11px] text-slate-400">© 2026 Kawai 0511. Hak Cipta Dilindungi.</p>
          </div>
        </div>
      </footer>

      <WalletModal
        isOpen={isWalletOpen}
        onClose={() => setIsWalletOpen(false)}
        balance={walletBalance}
        onTopUp={handleTopUpWallet}
      />

      <PromoModal
        isOpen={isPromoOpen}
        onClose={() => setIsPromoOpen(false)}
        onApplyCode={(code) => {}}
      />
    </div>
  );
}
