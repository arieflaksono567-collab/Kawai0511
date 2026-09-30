import React, { useState, useEffect } from 'react';
import { BANJARMASIN_LOCATIONS } from '../data/mockData';
import { SosModal } from './SosModal';
import { NavigationModal } from './NavigationModal';
import {
  Car,
  Bike,
  Power,
  TrendingUp,
  Award,
  Wallet,
  MapPin,
  Navigation,
  CheckCircle2,
  Bell,
  Clock,
  ChevronRight,
  ShieldCheck,
  Siren,
  Wifi,
  WifiOff,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const DriverModeView: React.FC = () => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [todayTrips, setTodayTrips] = useState<number>(7);
  const [todayEarnings, setTodayEarnings] = useState<number>(118000);
  const [driverBalance, setDriverBalance] = useState<number>(245000);
  const [incomingOrder, setIncomingOrder] = useState<any | null>(null);
  const [activeDriverTrip, setActiveDriverTrip] = useState<any | null>(null);
  const [tripStage, setTripStage] = useState<'to_pickup' | 'arrived' | 'delivering' | 'done'>('to_pickup');

  // Feature 2: 15-second countdown timer for incoming orders
  const [orderTimer, setOrderTimer] = useState<number>(15);
  const [timerAlert, setTimerAlert] = useState<string | null>(null);

  // Feature 4: SOS Modal State
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);

  // Feature 1: Navigation Modal State
  const [navTarget, setNavTarget] = useState<{ name: string; address: string } | null>(null);

  // Feature 5: Internet Connection Status
  const [networkStatus, setNetworkStatus] = useState<'strong' | 'weak' | 'offline'>('strong');
  const [pingMs, setPingMs] = useState<number>(24);
  const [isCheckingPing, setIsCheckingPing] = useState<boolean>(false);

  // Incoming order generator when online
  useEffect(() => {
    if (!isOnline || activeDriverTrip || incomingOrder || networkStatus === 'offline') return;

    const timer = setTimeout(() => {
      const pickupLoc = BANJARMASIN_LOCATIONS[0]; // Duta Mall
      const destLoc = BANJARMASIN_LOCATIONS[1]; // Siring
      setIncomingOrder({
        id: `drv-order-${Date.now()}`,
        service: 'ride',
        passengerName: 'Ananda Putri',
        pickup: pickupLoc,
        destination: destLoc,
        distanceKm: 2.3,
        fareNet: 14500,
        notes: 'Depan lobby Duta Mall pintu timur',
      });
      setOrderTimer(15);
    }, 3500);

    return () => clearTimeout(timer);
  }, [isOnline, activeDriverTrip, incomingOrder, networkStatus]);

  // Countdown timer effect
  useEffect(() => {
    if (!incomingOrder || activeDriverTrip) return;

    if (orderTimer <= 0) {
      // Order automatically re-routed to another driver!
      setIncomingOrder(null);
      setTimerAlert('Waktu menerima habis (15 dtk). Orderan otomatis dialihkan ke driver lain.');
      const alertTimeout = setTimeout(() => setTimerAlert(null), 4000);
      return () => clearTimeout(alertTimeout);
    }

    const interval = setInterval(() => {
      setOrderTimer((t) => t - 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [incomingOrder, orderTimer, activeDriverTrip]);

  const acceptOrder = () => {
    setActiveDriverTrip(incomingOrder);
    setIncomingOrder(null);
    setTripStage('to_pickup');
  };

  const declineOrder = () => {
    setIncomingOrder(null);
    setTimerAlert('Orderan dilewatkan.');
    setTimeout(() => setTimerAlert(null), 2500);
  };

  const advanceTripStage = () => {
    if (tripStage === 'to_pickup') {
      setTripStage('arrived');
    } else if (tripStage === 'arrived') {
      setTripStage('delivering');
    } else if (tripStage === 'delivering') {
      setTripStage('done');
      if (activeDriverTrip) {
        setTodayEarnings((prev) => prev + activeDriverTrip.fareNet);
        setDriverBalance((prev) => prev + activeDriverTrip.fareNet);
        setTodayTrips((prev) => prev + 1);
      }
    } else {
      setActiveDriverTrip(null);
      setTripStage('to_pickup');
    }
  };

  const handleTestPing = () => {
    setIsCheckingPing(true);
    setTimeout(() => {
      const simulatedPing = Math.floor(18 + Math.random() * 20);
      setPingMs(simulatedPing);
      setNetworkStatus('strong');
      setIsCheckingPing(false);
    }, 800);
  };

  // Launch Google Maps navigation
  const openDirectGoogleMaps = (locationName: string, locationAddress: string) => {
    setNavTarget({ name: locationName, address: locationAddress });
  };

  return (
    <div className="space-y-4">
      {/* Top Driver Status Bar & Internet Connection Indicator */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-lg space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-full bg-red-600 flex items-center justify-center font-bold text-white text-base border-2 border-slate-700">
                0511
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                  isOnline && networkStatus !== 'offline' ? 'bg-emerald-500' : 'bg-slate-500'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm">Pak Ridho Saputra (Mitra Kawai)</h3>
                <span className="text-[10px] bg-red-600/80 px-1.5 py-0.2 rounded font-mono">DA 4511 AB</span>
              </div>
              <p className="text-xs text-slate-400">
                Status:{' '}
                <span
                  className={
                    isOnline && networkStatus !== 'offline'
                      ? 'text-emerald-400 font-semibold'
                      : 'text-slate-400'
                  }
                >
                  {networkStatus === 'offline'
                    ? 'Koneksi Terputus'
                    : isOnline
                    ? 'Aktif & Menerima Orderan'
                    : 'Offline (Istirahat)'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Feature 4: SOS Emergency Panic Button */}
            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="px-3 py-2 rounded-xl bg-red-600/90 hover:bg-red-600 text-white text-xs font-black flex items-center gap-1.5 shadow-md shadow-red-600/30 active:scale-95 transition-all border border-red-400/40 animate-pulse"
              title="Tombol Bantuan Darurat & SOS Driver"
            >
              <Siren className="w-4 h-4 text-white" />
              <span>SOS</span>
            </button>

            {/* Online / Offline switch */}
            <button
              type="button"
              onClick={() => setIsOnline(!isOnline)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                isOnline
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>

        {/* Feature 5: Internet Connection & Signal Status Bar */}
        <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              {networkStatus === 'offline' ? (
                <WifiOff className="w-3.5 h-3.5 text-red-400" />
              ) : (
                <Wifi className={`w-3.5 h-3.5 ${networkStatus === 'strong' ? 'text-emerald-400' : 'text-amber-400'}`} />
              )}
              Jaringan:
            </span>

            {/* Signal Badge */}
            <div className="flex items-center gap-1 bg-slate-800 px-2 py-0.5 rounded text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  networkStatus === 'strong'
                    ? 'bg-emerald-400'
                    : networkStatus === 'weak'
                    ? 'bg-amber-400'
                    : 'bg-red-400'
                }`}
              />
              <span
                className={
                  networkStatus === 'strong'
                    ? 'text-emerald-300 font-bold'
                    : networkStatus === 'weak'
                    ? 'text-amber-300 font-bold'
                    : 'text-red-300 font-bold'
                }
              >
                {networkStatus === 'strong'
                  ? `4G Kuat (${pingMs}ms)`
                  : networkStatus === 'weak'
                  ? '3G Lemah (180ms)'
                  : 'Offline (Terputus)'}
              </span>
            </div>

            {/* Ping Refresh Button */}
            <button
              type="button"
              onClick={handleTestPing}
              disabled={isCheckingPing}
              className="text-[10px] text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-0.5 ml-1"
              title="Uji Ulang Koneksi Internet"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingPing ? 'animate-spin' : ''}`} />
              <span>Tes Ping</span>
            </button>
          </div>

          {/* Network Switcher for Testing */}
          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-slate-500">Uji Jaringan:</span>
            <button
              type="button"
              onClick={() => setNetworkStatus('strong')}
              className={`px-1.5 py-0.5 rounded ${
                networkStatus === 'strong' ? 'bg-emerald-500/20 text-emerald-300 font-bold' : 'hover:bg-slate-800'
              }`}
            >
              Kuat
            </button>
            <button
              type="button"
              onClick={() => setNetworkStatus('weak')}
              className={`px-1.5 py-0.5 rounded ${
                networkStatus === 'weak' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'hover:bg-slate-800'
              }`}
            >
              Lemah
            </button>
            <button
              type="button"
              onClick={() => setNetworkStatus('offline')}
              className={`px-1.5 py-0.5 rounded ${
                networkStatus === 'offline' ? 'bg-red-500/20 text-red-300 font-bold' : 'hover:bg-slate-800'
              }`}
            >
              Putus
            </button>
          </div>
        </div>

        {/* Warning if network is weak or offline */}
        {networkStatus !== 'strong' && (
          <div
            className={`p-2 rounded-xl text-xs flex items-center gap-2 ${
              networkStatus === 'offline'
                ? 'bg-red-950/80 border border-red-800 text-red-200'
                : 'bg-amber-950/80 border border-amber-800 text-amber-200'
            }`}
          >
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {networkStatus === 'offline'
                ? 'Koneksi internet terputus. Kamu tidak dapat menerima orderan baru sampai koneksi pulih.'
                : 'Sinyal seluler lemah. Respon penerimaan order mungkin tertunda.'}
            </span>
          </div>
        )}
      </div>

      {/* Timer alert banner (if expired) */}
      {timerAlert && (
        <div className="bg-amber-50 border border-amber-300 text-amber-900 p-3 rounded-xl text-xs flex items-center justify-between shadow-sm animate-in slide-in-from-top-1">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-600" />
            <span>{timerAlert}</span>
          </div>
          <span className="text-[11px] font-bold text-amber-700">Otomatis Dialihkan</span>
        </div>
      )}

      {/* Driver Daily Metrics Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-red-600" />
            Pendapatan Bersih
          </span>
          <p className="text-base font-bold text-slate-900 font-mono mt-0.5">
            Rp {todayEarnings.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Bike className="w-3 h-3 text-sky-600" />
            Trip Selesai
          </span>
          <p className="text-base font-bold text-slate-900 font-mono mt-0.5">{todayTrips} Order</p>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-[10px] text-slate-500 flex items-center gap-1">
            <Award className="w-3 h-3 text-amber-500" />
            Performa Rating
          </span>
          <p className="text-base font-bold text-slate-900 font-mono mt-0.5">4.95 ★</p>
        </div>
      </div>

      {/* Incoming Order Alert Drawer (with Features 1, 2, and 3!) */}
      {incomingOrder && !activeDriverTrip && (
        <div className="bg-white p-4 rounded-2xl border-2 border-red-500 shadow-2xl space-y-3 relative overflow-hidden">
          {/* Header with Circular Countdown Timer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-ping" />
              <div>
                <span className="text-xs font-black text-red-600 uppercase tracking-wider block">
                  Order Masuk! (Kawai Ride)
                </span>
                <span className="text-[11px] text-slate-500">
                  Keputusan cepat: Ambil atau lewati
                </span>
              </div>
            </div>

            {/* Feature 2: Visual Countdown Timer */}
            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-black border transition-colors ${
                  orderTimer <= 5
                    ? 'bg-red-50 text-red-600 border-red-400 animate-pulse'
                    : orderTimer <= 10
                    ? 'bg-amber-50 text-amber-700 border-amber-300'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-300'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{orderTimer}s</span>
              </div>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                + Rp {incomingOrder.fareNet.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Feature 2: Visual Progress Bar */}
          <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                orderTimer <= 5 ? 'bg-red-600' : orderTimer <= 10 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${(orderTimer / 15) * 100}%` }}
            />
          </div>

          {/* Feature 3: Integrated Mini-Map Preview */}
          <div className="relative h-28 w-full bg-slate-100 rounded-xl overflow-hidden border border-slate-200 shadow-inner">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* City blocks */}
              <rect x="5" y="5" width="35" height="22" rx="2" fill="#e2edf5" />
              <rect x="45" y="8" width="50" height="20" rx="2" fill="#d9e9f5" />
              <rect x="8" y="32" width="40" height="24" rx="2" fill="#e0ecf7" />
              <rect x="52" y="32" width="42" height="24" rx="2" fill="#dbeef8" />

              {/* River curve */}
              <path
                d="M 20 0 Q 30 25, 42 35 T 35 60"
                fill="none"
                stroke="#9ed0f5"
                strokeWidth="4"
              />

              {/* Main Arterial Avenue */}
              <line x1="0" y1="34" x2="100" y2="42" stroke="#ffffff" strokeWidth="2.5" />
              <line x1="0" y1="34" x2="100" y2="42" stroke="#f1c40f" strokeWidth="0.8" strokeDasharray="1.5,1.5" />

              {/* Route line connecting pickup (48, 28) and destination (38, 22) */}
              <path
                d="M 48 30 Q 42 22, 38 20"
                fill="none"
                stroke="#0284c7"
                strokeWidth="2.2"
                strokeDasharray="2,1"
              />

              {/* Pickup Pin Green */}
              <circle cx="48" cy="30" r="3.2" fill="#10b981" stroke="#ffffff" strokeWidth="1" />
              {/* Destination Pin Red */}
              <circle cx="38" cy="20" r="3.2" fill="#ef4444" stroke="#ffffff" strokeWidth="1" />
            </svg>

            {/* Floating Mini-Map Badge Labels */}
            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-sm text-white text-[10px] px-2 py-0.5 rounded shadow">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="font-semibold">{incomingOrder.pickup.name}</span>
              <span className="text-slate-400">→</span>
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              <span className="font-semibold">{incomingOrder.destination.name}</span>
            </div>

            <div className="absolute bottom-2 right-2 bg-white/95 text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded shadow border border-slate-200">
              {incomingOrder.distanceKm} km · ± 8 mnt
            </div>
          </div>

          {/* Order Details & Feature 1: Direct Navigation Buttons */}
          <div className="bg-slate-50 p-3 rounded-xl text-xs space-y-2.5">
            <div className="flex items-center justify-between font-semibold text-slate-900">
              <span>Penumpang: {incomingOrder.passengerName}</span>
              <span className="text-slate-500">{incomingOrder.distanceKm} km perjalanan</span>
            </div>

            {/* Pickup with Direct Navigation Button */}
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Jemput di:</span>
                  <span className="font-bold text-slate-900 block truncate">{incomingOrder.pickup.name}</span>
                  <span className="text-[10px] text-slate-400 truncate block">{incomingOrder.pickup.address}</span>
                </div>
              </div>
              {/* Feature 1: Google Maps Direct Navigation Button */}
              <button
                type="button"
                onClick={() => openDirectGoogleMaps(incomingOrder.pickup.name, incomingOrder.pickup.address)}
                className="px-2 py-1.5 rounded-lg bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-[#1a73e8] text-[11px] font-bold flex items-center gap-1 shrink-0 border border-[#4285F4]/30 transition-colors"
                title="Buka Navigasi Google Maps Langsung"
              >
                {/* Google Maps Pin Icon */}
                <svg className="w-3.5 h-3.5 fill-[#1a73e8]" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span>Navigasi</span>
              </button>
            </div>

            {/* Destination with Direct Navigation Button */}
            <div className="flex items-center justify-between gap-2 p-2 bg-white rounded-lg border border-slate-200">
              <div className="flex items-start gap-1.5 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 mt-1 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-red-700 block">Tujuan ke:</span>
                  <span className="font-bold text-slate-900 block truncate">{incomingOrder.destination.name}</span>
                  <span className="text-[10px] text-slate-400 truncate block">{incomingOrder.destination.address}</span>
                </div>
              </div>
              {/* Feature 1: Google Maps Direct Navigation Button */}
              <button
                type="button"
                onClick={() => openDirectGoogleMaps(incomingOrder.destination.name, incomingOrder.destination.address)}
                className="px-2 py-1.5 rounded-lg bg-[#4285F4]/10 hover:bg-[#4285F4]/20 text-[#1a73e8] text-[11px] font-bold flex items-center gap-1 shrink-0 border border-[#4285F4]/30 transition-colors"
                title="Buka Navigasi Google Maps Langsung"
              >
                <svg className="w-3.5 h-3.5 fill-[#1a73e8]" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span>Navigasi</span>
              </button>
            </div>

            {incomingOrder.notes && (
              <p className="text-[10px] text-slate-600 italic bg-amber-50/60 p-1.5 rounded border border-amber-200">
                Catatan Penumpang: "{incomingOrder.notes}"
              </p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={declineOrder}
              className="py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-semibold hover:bg-slate-100 transition-colors"
            >
              Lewatkan ({orderTimer}s)
            </button>
            <button
              type="button"
              onClick={acceptOrder}
              className="py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terima Orderan Ini</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Trip Navigation State */}
      {activeDriverTrip && (
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-lg space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Order Sedang Berjalan</span>
              <h4 className="font-bold text-sm text-slate-900">
                {activeDriverTrip.passengerName} · Rp {activeDriverTrip.fareNet.toLocaleString('id-ID')}
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-1 rounded">
                {tripStage === 'to_pickup' && 'Menuju Penjemputan'}
                {tripStage === 'arrived' && 'Tiba di Titik Jemput'}
                {tripStage === 'delivering' && 'Sedang Mengantar'}
                {tripStage === 'done' && 'Order Selesai'}
              </span>
            </div>
          </div>

          {/* Current Target with Feature 1: Direct Google Maps Navigation Button */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 text-xs">
                <Navigation className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-slate-800 text-[11px] uppercase">
                    {tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? 'Titik Penjemputan Penumpang:'
                      : 'Alamat Tujuan Penumpang:'}
                  </span>
                  <p className="font-bold text-slate-900 text-sm mt-0.5">
                    {tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? activeDriverTrip.pickup.name
                      : activeDriverTrip.destination.name}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? activeDriverTrip.pickup.address
                      : activeDriverTrip.destination.address}
                  </p>
                </div>
              </div>

              {/* Feature 1: Prominent Navigation Button in Active Trip */}
              <button
                type="button"
                onClick={() =>
                  openDirectGoogleMaps(
                    tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? activeDriverTrip.pickup.name
                      : activeDriverTrip.destination.name,
                    tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? activeDriverTrip.pickup.address
                      : activeDriverTrip.destination.address
                  )
                }
                className="px-3 py-2 bg-[#4285F4] hover:bg-[#3367D6] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 shrink-0 transition-transform active:scale-95"
              >
                <svg className="w-3.5 h-3.5 fill-white" viewBox="0 0 24 24">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
                </svg>
                <span>Buka Navigasi</span>
              </button>
            </div>
          </div>

          {/* Driver Next Action Button */}
          <button
            type="button"
            onClick={advanceTripStage}
            className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 active:scale-[0.99] transition-all"
          >
            {tripStage === 'to_pickup' && 'Konfirmasi Sudah Tiba di Lokasi Jemput'}
            {tripStage === 'arrived' && 'Mulai Perjalanan Mengantar'}
            {tripStage === 'delivering' && 'Selesaikan Trip & Terima Pembayaran'}
            {tripStage === 'done' && 'Siap Menerima Order Berikutnya'}
          </button>
        </div>
      )}

      {/* Driver Tips & Info */}
      {!incomingOrder && !activeDriverTrip && isOnline && networkStatus !== 'offline' && (
        <div className="bg-sky-50/80 p-4 rounded-2xl border border-sky-200 text-center space-y-2">
          <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center mx-auto">
            <Bell className="w-4 h-4 animate-pulse" />
          </div>
          <h4 className="font-bold text-xs text-sky-950">Mencari Orderan di Sekitar Banjarmasin</h4>
          <p className="text-[11px] text-sky-800 max-w-sm mx-auto">
            Orderan baru akan muncul dengan timer 15 detik dan tombol navigasi langsung ke lokasi penjemputan.
          </p>
        </div>
      )}

      {/* Feature 4: SOS Emergency Modal */}
      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        driverName="Pak Ridho Saputra (DA 4511 AB)"
        currentLocationName={
          activeDriverTrip ? activeDriverTrip.pickup.name : 'Jl. A. Yani Km 2, Banjarmasin'
        }
      />

      {/* Feature 1: Turn-by-Turn GPS & Google Maps Launcher Modal */}
      {navTarget && (
        <NavigationModal
          isOpen={!!navTarget}
          onClose={() => setNavTarget(null)}
          destinationName={navTarget.name}
          destinationAddress={navTarget.address}
        />
      )}
    </div>
  );
};
