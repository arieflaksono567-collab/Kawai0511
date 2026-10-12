import React, { useState } from 'react';
import {
  Bike,
  User,
  Split,
  MapPin,
  CheckCircle2,
  Sparkles,
  Info,
  Shield,
  Phone,
  CreditCard,
  X,
  SlidersHorizontal,
  Terminal,
  Navigation,
} from 'lucide-react';
import { BANJARMASIN_LOCATIONS } from './data/mockData';
import { LocationPoint } from './types';
import { PassengerView } from './components/PassengerView';
import { DriverView } from './components/DriverView';
import { E2ESimulationRunner } from './components/E2ESimulationRunner';
import { PassengerPaymentCard } from './components/PassengerPaymentCard';
import { DriverEarningsCard } from './components/DriverEarningsCard';
import { LiveMapSimulator } from './components/LiveMapSimulator';
import { KAWAI_COLORS } from './constants/theme';

export default function App() {
  // Current active mode: 'passenger' | 'driver' | 'dual' | 'payment' | 'simulator'
  const [viewMode, setViewMode] = useState<'passenger' | 'driver' | 'dual' | 'payment' | 'simulator'>('passenger');

  // Developer mode configuration (nonaktif secara default)
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  // Manual dialog/drawer visibility for E2E simulation (tertutup secara default)
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  // Administration & settings menu visibility
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState<boolean>(false);

  // Selected Pickup & Destination
  const [pickup, setPickup] = useState<LocationPoint>(BANJARMASIN_LOCATIONS[0]); // Duta Mall
  const [destination, setDestination] = useState<LocationPoint>(BANJARMASIN_LOCATIONS[3]); // ULM Kayutangi

  // Active driver position in Banjarmasin
  const [driverPosition, setDriverPosition] = useState({
    x: 44,
    y: 49,
    heading: 180,
    name: 'Ahmad Gazali',
  });

  // Active Ride State (Shared across Passenger & Driver)
  const [activeRide, setActiveRide] = useState<any>({
    id: 'ride-0511-demo',
    status: 'idle', // 'idle' | 'SEARCHING' | 'ASSIGNED' | 'ARRIVED' | 'IN_TRIP' | 'COMPLETED' | 'CANCELLED'
    version: 1,
    passengerName: 'Arief Laksono',
    totalFare: 12400,
    distanceKm: 4.2,
    durationMinutes: 14,
    driver: {
      id: 'd0000000-0000-0000-0000-000000000001',
      name: 'Ahmad Gazali',
      phone: '+6281390511200',
      vehiclePlate: 'DA 5110 KAW',
      vehicleModel: 'Honda Vario 160',
      rating: 4.9,
    },
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // PASSENGER: PESAN OJEK
  const handleOrderRide = async () => {
    try {
      const res = await fetch('/rides/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pickupAddress: pickup.name + ', ' + pickup.address,
          pickupLat: -3.319437,
          pickupLng: 114.590822,
          destinationAddress: destination.name + ', ' + destination.address,
          destinationLat: -3.298510,
          destinationLng: 114.588020,
          distanceKm: 4.2,
          durationMinutes: 14,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setActiveRide(data);
        showToast('Pesanan dibuat! Menghubungkan ke Mitra Driver...');
        return;
      }
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      id: `ride-${Date.now().toString().slice(-4)}`,
      status: 'SEARCHING',
      version: 1,
      totalFare: 12400,
      distanceKm: 4.2,
      durationMinutes: 14,
    }));
    showToast('Mencari driver terdekat (Radius 1.5 km)...');
  };

  // DRIVER: TERIMA ORDER
  const handleAcceptRide = async () => {
    try {
      await fetch(`/rides/${activeRide.id}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: activeRide.version }),
      });
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      status: 'ASSIGNED',
      version: (prev.version || 1) + 1,
    }));
    showToast('Order diterima! Silakan menuju titik penjemputan.');
  };

  // DRIVER: TOLAK ORDER
  const handleRejectRide = async () => {
    try {
      await fetch(`/rides/${activeRide.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Ban bocor' }),
      });
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      status: 'SEARCHING',
      driver: null,
      version: (prev.version || 1) + 1,
    }));
    showToast('Order ditolak. Menawarkan ke kandidat berikutnya...');
  };

  // DRIVER: TIMEOUT (30s)
  const handleTimeoutRide = async () => {
    try {
      await fetch(`/rides/${activeRide.id}/timeout`, {
        method: 'POST',
      });
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      status: 'SEARCHING',
      driver: null,
      version: (prev.version || 1) + 1,
    }));
    showToast('Waktu habis (30s). Menawarkan ke driver berikutnya...');
  };

  // DRIVER: TIBA DI LOKASI JEMPUT
  const handleArrivedRide = async () => {
    try {
      await fetch(`/rides/${activeRide.id}/arrived`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: activeRide.version }),
      });
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      status: 'ARRIVED',
      version: (prev.version || 1) + 1,
    }));
    showToast('Driver telah tiba di titik jemput.');
  };

  // DRIVER: MULAI PERJALANAN
  const handleStartRide = async () => {
    try {
      await fetch(`/rides/${activeRide.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: activeRide.version }),
      });
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      status: 'IN_TRIP',
      version: (prev.version || 1) + 1,
    }));
    showToast('Perjalanan dimulai menuju destinasi.');
  };

  // DRIVER: SELESAIKAN PERJALANAN (COMPLETE)
  const handleCompleteRide = async () => {
    try {
      await fetch(`/rides/${activeRide.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expectedVersion: activeRide.version }),
      });
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      status: 'COMPLETED',
      version: (prev.version || 1) + 1,
    }));
    showToast('Perjalanan selesai! Silakan lakukan pembayaran.');
  };

  // BATALKAN ORDER
  const handleCancelRide = async () => {
    try {
      await fetch(`/rides/${activeRide.id}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Dibatalkan oleh penumpang' }),
      });
    } catch {
      // Fallback
    }

    setActiveRide((prev: any) => ({
      ...prev,
      status: 'CANCELLED',
      cancellationReason: 'Dibatalkan oleh pengguna',
      version: (prev.version || 1) + 1,
    }));
    showToast('Pesanan dibatalkan.');
  };

  return (
    <div className="min-h-screen bg-[#F7FAF8] text-[#17211B] flex flex-col font-sans selection:bg-[#DDF8EA] selection:text-[#0E8F52]">
      {/* GLOBAL TOP NAVIGATION & ROLE SWITCHER - Bright Clean Header */}
      <nav className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4ECE7] px-4 py-3 shadow-xs">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Logo & Brand */}
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#18B86A] flex items-center justify-center text-white font-black text-xs tracking-tight shadow-xs">
              0511
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-sm tracking-wide text-[#17211B]">
                  KAWAI 0511
                </span>
                <span className="text-[10px] font-semibold text-[#0E8F52] bg-[#DDF8EA] border border-[#18B86A]/20 px-1.5 py-0.2 rounded">
                  Banjarmasin
                </span>
              </div>
              <p className="text-[10px] text-[#66736B]">
                Layanan Ojek & Transportasi Lokal Kalimantan Selatan
              </p>
            </div>
          </div>

          {/* Role & View Mode Switcher */}
          <div className="flex items-center bg-[#F0F5F2] p-1 rounded-xl border border-[#D7E2DB] text-xs">
            <button
              onClick={() => setViewMode('passenger')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'passenger'
                  ? 'bg-[#18B86A] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#17211B] hover:bg-white/80'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Penumpang (Passenger)</span>
            </button>

            <button
              onClick={() => setViewMode('driver')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'driver'
                  ? 'bg-[#18B86A] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#17211B] hover:bg-white/80'
              }`}
            >
              <Bike className="w-3.5 h-3.5" />
              <span>Driver (Mitra)</span>
            </button>

            <button
              onClick={() => setViewMode('dual')}
              className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'dual'
                  ? 'bg-[#18B86A] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#17211B] hover:bg-white/80'
              }`}
              title="Tampilkan kedua aplikasi berdampingan untuk menguji simulasi secara langsung"
            >
              <Split className="w-3.5 h-3.5" />
              <span>Simulasi Berdampingan</span>
            </button>

            <button
              onClick={() => setViewMode('payment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'payment'
                  ? 'bg-[#18B86A] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#17211B] hover:bg-white/80'
              }`}
              title="Tampilkan UI Pembayaran Penumpang & Pendapatan Driver (Langkah 6)"
            >
              <CreditCard className="w-3.5 h-3.5" />
              <span>UI Pembayaran (Langkah 6)</span>
            </button>

            <button
              onClick={() => setViewMode('simulator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'simulator'
                  ? 'bg-[#18B86A] text-white shadow-xs'
                  : 'text-[#66736B] hover:text-[#17211B] hover:bg-white/80'
              }`}
              title="Peta Interaktif & Simulator Perjalanan KAWAI 0511 (Leaflet / OpenStreetMap)"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Peta & Simulator Live</span>
            </button>

            {/* Developer Tools manual invocation (hanya muncul jika Developer Mode aktif dan BUKAN di halaman pelanggan umum) */}
            {isDevMode && viewMode !== 'passenger' && (
              <button
                onClick={() => setIsSimModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold bg-[#17211B] hover:bg-black text-white transition shadow-xs cursor-pointer"
                title="Buka panel Acceptance Test End-to-End Simulation"
              >
                <Terminal className="w-3.5 h-3.5 text-[#18B86A]" />
                <span>Developer Tools</span>
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#18B86A] text-white font-bold px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 border border-white/20 animate-bounce text-xs">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* MAIN APPLICATION CONTAINER */}
      <main className="flex-1 max-w-5xl mx-auto w-full p-4 sm:p-6 flex flex-col justify-center items-center">
        {/* VIEW 1: PASSENGER ONLY */}
        {viewMode === 'passenger' && (
          <div className="w-full flex justify-center py-2 animate-fadeIn">
            <PassengerView
              pickup={pickup}
              destination={destination}
              onPickupChange={setPickup}
              onDestinationChange={setDestination}
              landmarks={BANJARMASIN_LOCATIONS}
              activeRide={activeRide}
              onOrderRide={handleOrderRide}
              onCancelRide={handleCancelRide}
              driverPosition={driverPosition}
              onOpenLiveMap={() => setViewMode('simulator')}
            />
          </div>
        )}

        {/* VIEW 2: DRIVER ONLY */}
        {viewMode === 'driver' && (
          <div className="w-full flex justify-center py-2 animate-fadeIn">
            <DriverView
              activeRide={activeRide}
              onAcceptRide={handleAcceptRide}
              onRejectRide={handleRejectRide}
              onTimeoutRide={handleTimeoutRide}
              onArrivedRide={handleArrivedRide}
              onStartRide={handleStartRide}
              onCompleteRide={handleCompleteRide}
              driverPosition={driverPosition}
              landmarks={BANJARMASIN_LOCATIONS}
              pickup={pickup}
              destination={destination}
            />
          </div>
        )}

        {/* VIEW 3: DUAL SIMULATION (SIDE-BY-SIDE) */}
        {viewMode === 'dual' && (
          <div className="w-full space-y-4 animate-fadeIn">
            <div className="p-3.5 bg-[#DDF8EA] border border-[#18B86A]/30 rounded-2xl flex items-center justify-between text-xs text-[#0E8F52]">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#18B86A] shrink-0" />
                <span>
                  <strong>Mode Simulasi Interaktif:</strong> Tekan <strong>[PESAN OJEK]</strong> di sisi Penumpang, dan saksikan tawaran order otomatis masuk ke aplikasi Driver secara real-time.
                </span>
              </div>
              <span className="text-[10px] font-mono bg-white text-[#17211B] border border-[#D7E2DB] px-2 py-0.5 rounded">
                Status: {activeRide.status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              {/* Left Column: Passenger App */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[#66736B]">
                  <User className="w-4 h-4 text-[#18B86A]" />
                  <span>Aplikasi Penumpang (Passenger View)</span>
                </div>
                <PassengerView
                  pickup={pickup}
                  destination={destination}
                  onPickupChange={setPickup}
                  onDestinationChange={setDestination}
                  landmarks={BANJARMASIN_LOCATIONS}
                  activeRide={activeRide}
                  onOrderRide={handleOrderRide}
                  onCancelRide={handleCancelRide}
                  driverPosition={driverPosition}
                />
              </div>

              {/* Right Column: Driver App */}
              <div className="space-y-2">
                <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[#66736B]">
                  <Bike className="w-4 h-4 text-[#18B86A]" />
                  <span>Aplikasi Mitra Pengemudi (Driver View)</span>
                </div>
                <DriverView
                  activeRide={activeRide}
                  onAcceptRide={handleAcceptRide}
                  onRejectRide={handleRejectRide}
                  onTimeoutRide={handleTimeoutRide}
                  onArrivedRide={handleArrivedRide}
                  onStartRide={handleStartRide}
                  onCompleteRide={handleCompleteRide}
                  driverPosition={driverPosition}
                  landmarks={BANJARMASIN_LOCATIONS}
                  pickup={pickup}
                  destination={destination}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 4: LANGKAH 6 — UI PEMBAYARAN & PENDAPATAN */}
        {viewMode === 'payment' && (
          <div className="w-full space-y-6 animate-fadeIn py-2">
            <div className="p-4 bg-[#DDF8EA]/60 border border-[#18B86A]/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#0E8F52]">
              <div className="flex items-center gap-2.5">
                <CreditCard className="w-5 h-5 text-[#18B86A] shrink-0" />
                <div>
                  <h3 className="font-bold text-[#17211B] text-sm">Langkah 6 — UI Pembayaran & Pendapatan</h3>
                  <p className="text-[#66736B] text-xs mt-0.5">
                    Antarmuka Penumpang (CASH & DIGITAL Provider Abstraction) dan Mitra Driver (Double-Entry Authoritative Ledger).
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 font-mono text-[11px] bg-white px-3 py-1 rounded-xl border border-[#D7E2DB]">
                <span className="text-[#66736B]">Tarif Contoh:</span>
                <span className="text-[#18B86A] font-bold">Rp 18.400</span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start max-w-4xl mx-auto w-full">
              {/* Sisi Penumpang: Kartu Pembayaran */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#66736B] px-2 flex items-center gap-1.5">
                  <User className="w-4 h-4 text-[#18B86A]" />
                  <span>Sisi Penumpang (Passenger UI)</span>
                </div>
                <PassengerPaymentCard
                  fareAmount={18400}
                  rideId="ride-0511-demo"
                  driverId="d0000000-0000-0000-0000-000000000001"
                  driverName="Ahmad Gazali"
                  onPaymentSuccess={() => {
                    showToast('Pembayaran berhasil dicatat di buku besar!');
                  }}
                />
              </div>

              {/* Sisi Driver: Kartu Pendapatan */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-[#66736B] px-2 flex items-center gap-1.5">
                  <Bike className="w-4 h-4 text-[#18B86A]" />
                  <span>Sisi Mitra Driver (Driver UI)</span>
                </div>
                <DriverEarningsCard
                  driverId="d0000000-0000-0000-0000-000000000001"
                  driverName="Ahmad Gazali"
                  initialTodayEarnings={185500}
                  initialTodayRides={12}
                  initialWeekEarnings={1240000}
                />
              </div>
            </div>
          </div>
        )}

        {/* VIEW 5: LIVE MAP & TRIP SIMULATOR (LEAFLET & OPENSTREETMAP) */}
        {viewMode === 'simulator' && (
          <div className="w-full flex justify-center py-2 animate-fadeIn">
            <LiveMapSimulator onClose={() => setViewMode('passenger')} />
          </div>
        )}
      </main>

      {/* FOOTER & SYSTEM ADMINISTRATION ENTRY */}
      <footer className="bg-white border-t border-[#E4ECE7] px-4 py-3 text-[11px] text-[#66736B]">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2.5">
          <p className="text-center sm:text-left">
            KAWAI 0511 Banjarmasin • Kode Wilayah 0511 Kalimantan Selatan • Bright Clean Mobility UI
          </p>

          <div className="flex items-center gap-3">
            {/* Quick Developer Tools invocation on non-passenger pages when dev mode is active */}
            {isDevMode && viewMode !== 'passenger' && (
              <button
                type="button"
                onClick={() => setIsSimModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 bg-[#17211B] hover:bg-black text-white rounded-lg text-[11px] font-semibold transition shadow-xs cursor-pointer"
                title="Buka panel Acceptance Test End-to-End Simulation"
              >
                <Terminal className="w-3 h-3 text-[#18B86A]" />
                <span>Developer Tools</span>
              </button>
            )}

            {/* Administrasi & Pengaturan menu */}
            <button
              type="button"
              onClick={() => setIsAdminMenuOpen(true)}
              className="flex items-center gap-1 px-2 py-1 text-[11px] text-[#66736B] hover:text-[#17211B] hover:bg-[#F0F5F2] rounded-lg transition font-medium cursor-pointer"
              title="Buka Menu Administrasi & Pengaturan Sistem"
            >
              <SlidersHorizontal className="w-3 h-3 text-[#18B86A]" />
              <span>Administrasi & Pengaturan</span>
            </button>
          </div>
        </div>
      </footer>

      {/* MODAL: ADMINISTRASI & PENGATURAN SISTEM */}
      {isAdminMenuOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-dialog-title"
        >
          <div className="bg-white rounded-2xl border border-[#E4ECE7] shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E4ECE7] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center">
                  <SlidersHorizontal className="w-4 h-4 text-[#18B86A]" />
                </div>
                <h3 id="admin-dialog-title" className="font-bold text-sm text-[#17211B]">
                  Administrasi & Pengaturan Sistem
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminMenuOpen(false)}
                className="p-1.5 text-[#66736B] hover:text-[#17211B] hover:bg-[#F0F5F2] rounded-lg transition cursor-pointer"
                aria-label="Tutup pengaturan"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-[#66736B]">
              {/* Developer Mode Toggle Configuration */}
              <div className="bg-[#F7FAF8] p-3.5 rounded-xl border border-[#E4ECE7] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#17211B]">Developer Mode</span>
                    <span className="ml-2 text-[10px] px-1.5 py-0.2 rounded font-mono bg-[#E4ECE7] text-[#66736B]">
                      {isDevMode ? 'AKTIF' : 'NONAKTIF'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDevMode}
                      onChange={(e) => {
                        const nextVal = e.target.checked;
                        setIsDevMode(nextVal);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-[#D7E2DB] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[#A8B2AC] after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#18B86A]"></div>
                  </label>
                </div>
                <p className="text-[11px] leading-relaxed text-[#66736B]">
                  Konfigurasi mode pengembang internal (nonaktif secara default). Catatan: perkakas ini belum terlindungi autentikasi server.
                </p>
              </div>

              {/* Developer Tools manual invocation */}
              {isDevMode ? (
                <div className="p-3 bg-[#DDF8EA]/50 rounded-xl border border-[#18B86A]/30 space-y-2.5">
                  <div className="flex items-center gap-1.5 text-[11px] text-[#0E8F52] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#18B86A]" />
                    <span>Developer Mode aktif. Perkakas pengembang siap digunakan.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setIsAdminMenuOpen(false);
                      setIsSimModalOpen(true);
                    }}
                    className="w-full py-2.5 px-3 bg-[#17211B] hover:bg-black text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition shadow-xs cursor-pointer"
                  >
                    <Terminal className="w-3.5 h-3.5 text-[#18B86A]" />
                    <span>Developer Tools (Simulasi E2E)</span>
                  </button>
                </div>
              ) : (
                <div className="p-3 bg-[#F0F5F2] rounded-xl border border-[#E4ECE7] text-[11px] text-[#66736B] leading-relaxed">
                  Aktifkan tombol <strong>Developer Mode</strong> di atas untuk menampilkan tombol pemanggilan manual <em>Developer Tools</em> dan panel simulasi E2E.
                </div>
              )}
            </div>

            <div className="pt-1 flex justify-end">
              <button
                type="button"
                onClick={() => setIsAdminMenuOpen(false)}
                className="px-4 py-2 bg-[#F0F5F2] hover:bg-[#E4ECE7] text-[#17211B] rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG / DRAWER: ACCEPTANCE TEST E2E SIMULATION (PEMANGGILAN MANUAL) */}
      <div
        className={
          isSimModalOpen
            ? 'fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto animate-fadeIn'
            : 'hidden'
        }
        role="dialog"
        aria-modal="true"
        aria-labelledby="simulation-dialog-title"
      >
        <div className="bg-[#F7FAF8] rounded-3xl border border-[#E4ECE7] shadow-2xl max-w-5xl w-full max-h-[92vh] flex flex-col overflow-hidden my-auto">
          {/* DIALOG HEADER */}
          <div className="bg-white border-b border-[#E4ECE7] px-4 sm:px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center font-bold">
                <Terminal className="w-4 h-4 text-[#18B86A]" />
              </div>
              <div>
                <h3 id="simulation-dialog-title" className="font-bold text-sm text-[#17211B]">
                  Developer Tools — Acceptance Test End-to-End Simulation
                </h3>
                <p className="text-[11px] text-[#66736B]">
                  Simulasi pipeline 15 tahap siklus perjalanan KAWAI 0511 Banjarmasin
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsSimModalOpen(false)}
              className="px-3.5 py-1.5 bg-[#F0F5F2] hover:bg-[#E4ECE7] text-[#17211B] border border-[#D7E2DB] rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-xs"
              title="Kembali ke tampilan normal"
            >
              <X className="w-4 h-4 text-[#66736B]" />
              <span>Tutup</span>
            </button>
          </div>

          {/* DIALOG BODY - MEMPERTAHANKAN SELURUH STATE & LOGIKA SIMULASI */}
          <div className="overflow-y-auto p-4 sm:p-6 flex-1">
            <E2ESimulationRunner />
          </div>
        </div>
      </div>
    </div>
  );
}
