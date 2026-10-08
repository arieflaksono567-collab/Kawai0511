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

  const [orderTimer, setOrderTimer] = useState<number>(15);
  const [timerAlert, setTimerAlert] = useState<string | null>(null);
  const [isSosOpen, setIsSosOpen] = useState<boolean>(false);
  const [navTarget, setNavTarget] = useState<{ name: string; address: string } | null>(null);
  const [networkStatus, setNetworkStatus] = useState<'strong' | 'weak' | 'offline'>('strong');
  const [pingMs, setPingMs] = useState<number>(24);
  const [isCheckingPing, setIsCheckingPing] = useState<boolean>(false);

  useEffect(() => {
    if (!isOnline || activeDriverTrip || incomingOrder || networkStatus === 'offline') return;

    const timer = setTimeout(() => {
      const pickupLoc = BANJARMASIN_LOCATIONS[0];
      const destLoc = BANJARMASIN_LOCATIONS[1];
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

  useEffect(() => {
    if (!incomingOrder || activeDriverTrip) return;

    if (orderTimer <= 0) {
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

  const openDirectGoogleMaps = (locationName: string, locationAddress: string) => {
    setNavTarget({ name: locationName, address: locationAddress });
  };

  return (
    <div className="space-y-4">
      {/* Top Driver Status Bar & Internet Connection Indicator */}
      <div className="bg-white border border-[#E4ECE7] text-[#17211B] p-4 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-2xl bg-[#18B86A] flex items-center justify-center font-bold text-white text-base shadow-xs">
                0511
              </div>
              <span
                className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white ${
                  isOnline && networkStatus !== 'offline' ? 'bg-[#18B86A]' : 'bg-[#66736B]'
                }`}
              />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-sm text-[#17211B]">Pak Ridho Saputra (Mitra Kawai)</h3>
                <span className="text-[10px] bg-[#F0F5F2] text-[#17211B] border border-[#D7E2DB] px-1.5 py-0.2 rounded font-mono">DA 4511 AB</span>
              </div>
              <p className="text-xs text-[#66736B] mt-0.5">
                <span
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isOnline && networkStatus !== 'offline'
                      ? 'bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/30'
                      : 'bg-[#F0F5F2] text-[#66736B] border border-[#D7E2DB]'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isOnline && networkStatus !== 'offline' ? 'bg-[#18B86A] animate-ping' : 'bg-[#66736B]'
                    }`}
                  />
                  {networkStatus === 'offline'
                    ? 'KONEKSI TERPUTUS'
                    : isOnline
                    ? 'ONLINE — SIAP MENERIMA ORDER'
                    : 'OFFLINE — Driver Sedang Istirahat'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsSosOpen(true)}
              className="px-3 py-2 rounded-xl bg-[#E5484D] hover:bg-rose-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm active:scale-95 transition-all cursor-pointer"
              title="Tombol Bantuan Darurat & SOS Driver"
            >
              <Siren className="w-4 h-4 text-white" />
              <span>SOS</span>
            </button>

            <button
              type="button"
              onClick={() => setIsOnline(!isOnline)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                isOnline
                  ? 'bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/40 hover:bg-[#cbf5de]'
                  : 'bg-[#F0F5F2] text-[#66736B] border border-[#D7E2DB] hover:text-[#17211B]'
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isOnline ? 'Online' : 'Offline'}</span>
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-[#E4ECE7] flex flex-wrap items-center justify-between text-xs text-[#66736B] gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-[#17211B] flex items-center gap-1.5">
              {networkStatus === 'offline' ? (
                <WifiOff className="w-3.5 h-3.5 text-[#E5484D]" />
              ) : (
                <Wifi className={`w-3.5 h-3.5 ${networkStatus === 'strong' ? 'text-[#18B86A]' : 'text-[#F5A623]'}`} />
              )}
              Jaringan:
            </span>

            <div className="flex items-center gap-1 bg-[#F0F5F2] border border-[#D7E2DB] px-2 py-0.5 rounded text-[11px] font-mono">
              <span
                className={`w-2 h-2 rounded-full ${
                  networkStatus === 'strong'
                    ? 'bg-[#18B86A]'
                    : networkStatus === 'weak'
                    ? 'bg-[#F5A623]'
                    : 'bg-[#E5484D]'
                }`}
              />
              <span
                className={
                  networkStatus === 'strong'
                    ? 'text-[#0E8F52] font-bold'
                    : networkStatus === 'weak'
                    ? 'text-[#F5A623] font-bold'
                    : 'text-[#E5484D] font-bold'
                }
              >
                {networkStatus === 'strong'
                  ? `4G Kuat (${pingMs}ms)`
                  : networkStatus === 'weak'
                  ? '3G Lemah (180ms)'
                  : 'Offline (Terputus)'}
              </span>
            </div>

            <button
              type="button"
              onClick={handleTestPing}
              disabled={isCheckingPing}
              className="text-[10px] text-[#18B86A] hover:underline flex items-center gap-0.5 ml-1 font-semibold cursor-pointer"
              title="Uji Ulang Koneksi Internet"
            >
              <RefreshCw className={`w-3 h-3 ${isCheckingPing ? 'animate-spin' : ''}`} />
              <span>Tes Ping</span>
            </button>
          </div>

          <div className="flex items-center gap-1 text-[10px]">
            <span className="text-[#66736B]">Uji Jaringan:</span>
            <button
              type="button"
              onClick={() => setNetworkStatus('strong')}
              className={`px-2 py-0.5 rounded transition ${
                networkStatus === 'strong' ? 'bg-[#DDF8EA] text-[#0E8F52] font-bold border border-[#18B86A]/30' : 'hover:bg-[#F0F5F2] text-[#66736B]'
              }`}
            >
              Kuat
            </button>
            <button
              type="button"
              onClick={() => setNetworkStatus('weak')}
              className={`px-2 py-0.5 rounded transition ${
                networkStatus === 'weak' ? 'bg-amber-50 text-[#F5A623] font-bold border border-amber-300' : 'hover:bg-[#F0F5F2] text-[#66736B]'
              }`}
            >
              Lemah
            </button>
            <button
              type="button"
              onClick={() => setNetworkStatus('offline')}
              className={`px-2 py-0.5 rounded transition ${
                networkStatus === 'offline' ? 'bg-rose-50 text-[#E5484D] font-bold border border-rose-300' : 'hover:bg-[#F0F5F2] text-[#66736B]'
              }`}
            >
              Putus
            </button>
          </div>
        </div>

        {networkStatus !== 'strong' && (
          <div
            className={`p-2.5 rounded-xl text-xs flex items-center gap-2 ${
              networkStatus === 'offline'
                ? 'bg-rose-50 border border-rose-200 text-[#E5484D]'
                : 'bg-amber-50 border border-amber-200 text-[#F5A623]'
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
        <div className="bg-white p-3.5 rounded-2xl border border-[#E4ECE7] shadow-xs">
          <span className="text-[10px] text-[#66736B] flex items-center gap-1">
            <TrendingUp className="w-3 h-3 text-[#18B86A]" />
            Pendapatan Bersih
          </span>
          <p className="text-base font-bold text-[#18B86A] font-mono mt-0.5">
            Rp {todayEarnings.toLocaleString('id-ID')}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#E4ECE7] shadow-xs">
          <span className="text-[10px] text-[#66736B] flex items-center gap-1">
            <Bike className="w-3 h-3 text-[#18B86A]" />
            Trip Selesai
          </span>
          <p className="text-base font-bold text-[#17211B] font-mono mt-0.5">{todayTrips} Order</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-[#E4ECE7] shadow-xs">
          <span className="text-[10px] text-[#66736B] flex items-center gap-1">
            <Award className="w-3 h-3 text-[#F5A623]" />
            Performa Rating
          </span>
          <p className="text-base font-bold text-[#17211B] font-mono mt-0.5">4.95 ★</p>
        </div>
      </div>

      {/* Incoming Order Alert Drawer - Bright Clean Mobility UI */}
      {incomingOrder && !activeDriverTrip && (
        <div className="bg-white p-5 rounded-2xl border-2 border-[#18B86A] shadow-md space-y-4 relative overflow-hidden animate-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#18B86A] animate-ping" />
              <div>
                <span className="text-xs font-bold text-[#18B86A] uppercase tracking-wider block">
                  Order Masuk Baru! (Kawai Ride)
                </span>
                <span className="text-[11px] text-[#66736B]">
                  Keputusan cepat: Ambil atau lewati
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-black border transition-colors ${
                  orderTimer <= 5
                    ? 'bg-rose-50 text-[#E5484D] border-rose-300 animate-pulse'
                    : orderTimer <= 10
                    ? 'bg-amber-50 text-[#F5A623] border-amber-300'
                    : 'bg-[#DDF8EA] text-[#0E8F52] border-[#18B86A]/40'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                <span>{orderTimer}s</span>
              </div>
              <span className="text-xs font-bold text-[#0E8F52] font-mono bg-[#DDF8EA] px-2 py-1 rounded-lg border border-[#18B86A]/30">
                + Rp {incomingOrder.fareNet.toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          <div className="w-full bg-[#F0F5F2] h-1.5 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-1000 ease-linear rounded-full ${
                orderTimer <= 5 ? 'bg-[#E5484D]' : orderTimer <= 10 ? 'bg-[#F5A623]' : 'bg-[#18B86A]'
              }`}
              style={{ width: `${(orderTimer / 15) * 100}%` }}
            />
          </div>

          {/* Mini-Map Preview */}
          <div className="relative h-28 w-full bg-[#F0F5F2] rounded-xl overflow-hidden border border-[#E4ECE7] shadow-inner">
            <svg
              className="w-full h-full"
              viewBox="0 0 100 60"
              preserveAspectRatio="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <rect x="5" y="5" width="35" height="22" rx="2" fill="#FFFFFF" />
              <rect x="45" y="8" width="50" height="20" rx="2" fill="#FFFFFF" />
              <rect x="8" y="32" width="40" height="24" rx="2" fill="#FFFFFF" />
              <rect x="52" y="32" width="42" height="24" rx="2" fill="#FFFFFF" />

              <path
                d="M 20 0 Q 30 25, 42 35 T 35 60"
                fill="none"
                stroke="#C5E6F7"
                strokeWidth="4"
              />

              <line x1="0" y1="34" x2="100" y2="42" stroke="#FFFFFF" strokeWidth="2.5" />
              <line x1="0" y1="34" x2="100" y2="42" stroke="#D7E2DB" strokeWidth="0.8" strokeDasharray="1.5,1.5" />

              <path
                d="M 48 30 Q 42 22, 38 20"
                fill="none"
                stroke="#18B86A"
                strokeWidth="2.2"
                strokeDasharray="2,1"
              />

              <circle cx="48" cy="30" r="3.2" fill="#18B86A" stroke="#ffffff" strokeWidth="1" />
              <circle cx="38" cy="20" r="3.2" fill="#E5484D" stroke="#ffffff" strokeWidth="1" />
            </svg>

            <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-white/95 backdrop-blur-sm text-[#17211B] text-[10px] px-2 py-0.5 rounded-lg shadow-xs border border-[#E4ECE7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#18B86A]" />
              <span className="font-semibold">{incomingOrder.pickup.name}</span>
              <span className="text-[#A8B2AC]">→</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E5484D]" />
              <span className="font-semibold">{incomingOrder.destination.name}</span>
            </div>

            <div className="absolute bottom-2 right-2 bg-white/95 text-[#17211B] text-[10px] font-bold px-2 py-0.5 rounded shadow-xs border border-[#E4ECE7]">
              {incomingOrder.distanceKm} km · ± 8 mnt
            </div>
          </div>

          <div className="bg-[#F7FAF8] p-3 rounded-2xl text-xs space-y-2.5 border border-[#E4ECE7]">
            <div className="flex items-center justify-between font-semibold text-[#17211B]">
              <span>Penumpang: {incomingOrder.passengerName}</span>
              <span className="text-[#66736B]">{incomingOrder.distanceKm} km perjalanan</span>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-[#E4ECE7]">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#18B86A] mt-1 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-[#0E8F52] block">Jemput di:</span>
                  <span className="font-bold text-[#17211B] block truncate">{incomingOrder.pickup.name}</span>
                  <span className="text-[10px] text-[#66736B] truncate block">{incomingOrder.pickup.address}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openDirectGoogleMaps(incomingOrder.pickup.name, incomingOrder.pickup.address)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F0F5F2] text-[#18B86A] text-[11px] font-bold flex items-center gap-1 shrink-0 border border-[#D7E2DB] transition-colors cursor-pointer"
                title="Buka Navigasi Lokasi"
              >
                <Navigation className="w-3.5 h-3.5 text-[#18B86A]" />
                <span>Navigasi</span>
              </button>
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 bg-white rounded-xl border border-[#E4ECE7]">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5484D] mt-1 shrink-0" />
                <div className="truncate">
                  <span className="text-[10px] uppercase font-bold text-[#E5484D] block">Tujuan ke:</span>
                  <span className="font-bold text-[#17211B] block truncate">{incomingOrder.destination.name}</span>
                  <span className="text-[10px] text-[#66736B] truncate block">{incomingOrder.destination.address}</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => openDirectGoogleMaps(incomingOrder.destination.name, incomingOrder.destination.address)}
                className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-[#F0F5F2] text-[#18B86A] text-[11px] font-bold flex items-center gap-1 shrink-0 border border-[#D7E2DB] transition-colors cursor-pointer"
                title="Buka Navigasi Lokasi"
              >
                <Navigation className="w-3.5 h-3.5 text-[#18B86A]" />
                <span>Navigasi</span>
              </button>
            </div>

            {incomingOrder.notes && (
              <p className="text-[10px] text-[#66736B] italic bg-amber-50/70 p-2 rounded-xl border border-amber-200">
                Catatan Penumpang: "{incomingOrder.notes}"
              </p>
            )}
          </div>

          {/* Action Buttons: Secondary (White + border #D7E2DB) & Primary (#18B86A) */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={declineOrder}
              className="py-3 rounded-2xl bg-white hover:bg-[#F0F5F2] border border-[#D7E2DB] text-[#66736B] hover:text-[#17211B] text-xs font-bold transition-colors cursor-pointer"
            >
              Lewatkan ({orderTimer}s)
            </button>
            <button
              type="button"
              onClick={acceptOrder}
              className="py-3 rounded-2xl bg-[#18B86A] hover:bg-[#0E8F52] text-white text-xs font-bold shadow-sm flex items-center justify-center gap-1.5 active:scale-[0.98] transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Terima Orderan Ini</span>
            </button>
          </div>
        </div>
      )}

      {/* Active Trip Navigation State */}
      {activeDriverTrip && (
        <div className="bg-white p-5 rounded-2xl border border-[#E4ECE7] shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E4ECE7]">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#66736B]">Order Sedang Berjalan</span>
              <h4 className="font-bold text-sm text-[#17211B]">
                {activeDriverTrip.passengerName} · Rp {activeDriverTrip.fareNet.toLocaleString('id-ID')}
              </h4>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-[#0E8F52] bg-[#DDF8EA] px-2.5 py-1 rounded-full border border-[#18B86A]/20">
                {tripStage === 'to_pickup' && 'Menuju Penjemputan'}
                {tripStage === 'arrived' && 'Tiba di Titik Jemput'}
                {tripStage === 'delivering' && 'Sedang Mengantar'}
                {tripStage === 'done' && 'Order Selesai'}
              </span>
            </div>
          </div>

          <div className="bg-[#F7FAF8] p-3.5 rounded-2xl border border-[#E4ECE7] space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2.5 text-xs">
                <Navigation className="w-4 h-4 text-[#18B86A] mt-0.5 shrink-0" />
                <div>
                  <span className="font-semibold text-[#66736B] text-[11px] uppercase">
                    {tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? 'Titik Penjemputan Penumpang:'
                      : 'Alamat Tujuan Penumpang:'}
                  </span>
                  <p className="font-bold text-[#17211B] text-sm mt-0.5">
                    {tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? activeDriverTrip.pickup.name
                      : activeDriverTrip.destination.name}
                  </p>
                  <p className="text-[11px] text-[#66736B]">
                    {tripStage === 'to_pickup' || tripStage === 'arrived'
                      ? activeDriverTrip.pickup.address
                      : activeDriverTrip.destination.address}
                  </p>
                </div>
              </div>

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
                className="px-3 py-2 bg-white hover:bg-[#F0F5F2] text-[#18B86A] border border-[#D7E2DB] rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs shrink-0 transition-transform active:scale-95 cursor-pointer"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>Buka Navigasi</span>
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={advanceTripStage}
            className="w-full h-12 rounded-2xl bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
          >
            {tripStage === 'to_pickup' && 'Konfirmasi Sudah Tiba di Lokasi Jemput'}
            {tripStage === 'arrived' && 'Mulai Perjalanan Mengantar'}
            {tripStage === 'delivering' && 'Selesaikan Trip & Terima Pembayaran'}
            {tripStage === 'done' && 'Siap Menerima Order Berikutnya'}
          </button>
        </div>
      )}

      {!incomingOrder && !activeDriverTrip && isOnline && networkStatus !== 'offline' && (
        <div className="bg-[#DDF8EA]/60 p-4 rounded-2xl border border-[#18B86A]/30 text-center space-y-2">
          <div className="w-9 h-9 rounded-full bg-[#18B86A] text-white flex items-center justify-center mx-auto shadow-xs">
            <Bell className="w-4 h-4 animate-pulse" />
          </div>
          <h4 className="font-bold text-xs text-[#0E8F52]">ONLINE — SIAP MENERIMA ORDER</h4>
          <p className="text-[11px] text-[#66736B] max-w-sm mx-auto">
            Orderan baru di sekitar Banjarmasin akan muncul otomatis dengan opsi navigasi dan konfirmasi 15 detik.
          </p>
        </div>
      )}

      <SosModal
        isOpen={isSosOpen}
        onClose={() => setIsSosOpen(false)}
        driverName="Pak Ridho Saputra (DA 4511 AB)"
        currentLocationName={
          activeDriverTrip ? activeDriverTrip.pickup.name : 'Jl. A. Yani Km 2, Banjarmasin'
        }
      />

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
