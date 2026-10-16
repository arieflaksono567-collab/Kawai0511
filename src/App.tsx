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

export default function App() {
  const [viewMode, setViewMode] = useState<'passenger' | 'driver' | 'dual' | 'payment' | 'simulator'>('passenger');
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [isSimModalOpen, setIsSimModalOpen] = useState<boolean>(false);
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState<boolean>(false);

  const [pickup, setPickup] = useState<LocationPoint>(BANJARMASIN_LOCATIONS[0]);
  const [destination, setDestination] = useState<LocationPoint>(BANJARMASIN_LOCATIONS[3]);
  const [driverPosition, setDriverPosition] = useState({ x: 44, y: 49, heading: 180, name: 'Ahmad Gazali' });
  const [activeRide, setActiveRide] = useState<any>({
    id: 'ride-0511-demo',
    status: 'idle',
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

  const handleOrderRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'SEARCHING', version: (prev.version || 1) + 1 }));
    showToast('Mencari driver terdekat...');
  };

  const handleAcceptRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'ASSIGNED', version: (prev.version || 1) + 1 }));
    showToast('Order diterima!');
  };

  const handleRejectRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'SEARCHING', driver: null, version: (prev.version || 1) + 1 }));
    showToast('Order ditolak.');
  };

  const handleTimeoutRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'SEARCHING', driver: null, version: (prev.version || 1) + 1 }));
    showToast('Waktu habis.');
  };

  const handleArrivedRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'ARRIVED', version: (prev.version || 1) + 1 }));
    showToast('Driver tiba di lokasi.');
  };

  const handleStartRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'IN_TRIP', version: (prev.version || 1) + 1 }));
    showToast('Perjalanan dimulai.');
  };

  const handleCompleteRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'COMPLETED', version: (prev.version || 1) + 1 }));
    showToast('Perjalanan selesai!');
  };

  const handleCancelRide = async () => {
    setActiveRide((prev: any) => ({ ...prev, status: 'CANCELLED', cancellationReason: 'Dibatalkan oleh pengguna', version: (prev.version || 1) + 1 }));
    showToast('Pesanan dibatalkan.');
  };

  const roleButton = (active: boolean, label: string, onClick: () => void) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
      active ? 'bg-[#E31E24] text-white shadow-sm' : 'text-[#5B6475] hover:bg-[#F3F5F9] hover:text-[#111827]'
    }`;

  return (
    <div className="min-h-screen bg-[#F7F7F8] text-[#111827]">
      <nav className="sticky top-0 z-40 border-b border-[#E8ECF3] bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 px-4 py-3 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#E31E24] text-sm font-black text-white">0511</div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-extrabold tracking-wide text-[#111827]">KAWAI 0511</span>
                <span className="rounded-full border border-[#E31E24]/20 bg-[#FEE5E6] px-1.5 py-0.2 text-[10px] font-semibold text-[#11274A]">Banjarmasin</span>
              </div>
              <p className="text-[10px] text-[#5B6475]">Layanan Ojek & Transportasi Lokal</p>
            </div>
          </div>

          <div className="flex items-center gap-1 rounded-xl bg-[#F3F5F9] p-1 text-xs">
            <button onClick={() => setViewMode('passenger')} className={roleButton(viewMode === 'passenger', 'Penumpang', () => setViewMode('passenger'))}>Penumpang</button>
            <button onClick={() => setViewMode('driver')} className={roleButton(viewMode === 'driver', 'Driver', () => setViewMode('driver'))}>Driver</button>
            <button onClick={() => setViewMode('payment')} className={roleButton(viewMode === 'payment', 'Pembayaran', () => setViewMode('payment'))}>Pembayaran</button>
            <button onClick={() => setViewMode('simulator')} className={roleButton(viewMode === 'simulator', 'Map', () => setViewMode('simulator'))}>Map</button>
          </div>
        </div>
      </nav>

      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-xl border border-[#E31E24]/30 bg-[#E31E24] px-4 py-2.5 text-xs font-bold text-white shadow-lg">
          <CheckCircle2 className="h-4 w-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center p-4 sm:p-6">
        {viewMode === 'passenger' && (
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
        )}

        {viewMode === 'driver' && (
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
        )}

        {viewMode === 'payment' && (
          <div className="w-full max-w-4xl space-y-6 py-2">
            <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-[#E31E24]/20 bg-[#FEE5E6] p-4 text-xs text-[#11274A] sm:flex-row sm:items-center">
              <div className="flex items-center gap-2.5">
                <CreditCard className="h-5 w-5 text-[#E31E24]" />
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">UI Pembayaran & Pendapatan</h3>
                  <p className="mt-0.5 text-[#5B6475]">Penumpang dan driver dashboard dalam gaya KAWAI.</p>
                </div>
              </div>
              <div className="rounded-xl border border-[#E31E24]/20 bg-white px-3 py-1 font-mono text-[11px] text-[#11274A]">
                Tarif Contoh: <span className="font-bold">Rp 18.400</span>
              </div>
            </div>

            <div className="grid w-full grid-cols-1 items-start gap-8 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[#5B6475]">
                  <User className="h-4 w-4 text-[#E31E24]" />
                  <span>Penumpang</span>
                </div>
                <PassengerPaymentCard
                  fareAmount={18400}
                  rideId="ride-0511-demo"
                  driverId="d0000000-0000-0000-0000-000000000001"
                  driverName="Ahmad Gazali"
                  onPaymentSuccess={() => showToast('Pembayaran berhasil dicatat!')}
                />
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-1.5 px-2 text-xs font-bold text-[#5B6475]">
                  <Bike className="h-4 w-4 text-[#E31E24]" />
                  <span>Driver</span>
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

        {viewMode === 'simulator' && (
          <div className="w-full max-w-5xl py-2"><LiveMapSimulator onClose={() => setViewMode('passenger')} /></div>
        )}
      </main>

      <footer className="border-t border-[#E8ECF3] bg-white px-4 py-3 text-[11px] text-[#5B6475]">
        <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-2.5 sm:flex-row">
          <p className="text-center sm:text-left">KAWAI 0511 Banjarmasin • Kode Wilayah 0511 • Clean Mobility UI</p>
          <div className="flex items-center gap-3">
            {isDevMode && viewMode !== 'passenger' && (
              <button onClick={() => setIsSimModalOpen(true)} className="flex items-center gap-1.5 rounded-lg bg-[#11274A] px-2.5 py-1 text-[11px] font-semibold text-white">
                <Terminal className="h-3 w-3 text-[#E31E24]" />
                <span>Developer Tools</span>
              </button>
            )}
            <button onClick={() => setIsAdminMenuOpen(true)} className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#5B6475] hover:bg-[#F3F5F9] hover:text-[#111827]">
              <SlidersHorizontal className="h-3 w-3 text-[#E31E24]" />
              <span>Administrasi</span>
            </button>
          </div>
        </div>
      </footer>

      {isAdminMenuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#E8ECF3] bg-white p-5">
            <div className="flex items-center justify-between border-b border-[#E8ECF3] pb-3">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#FEE5E6] text-[#E31E24]">
                  <SlidersHorizontal className="h-4 w-4" />
                </div>
                <h3 className="text-sm font-bold text-[#111827]">Administrasi & Pengaturan</h3>
              </div>
              <button onClick={() => setIsAdminMenuOpen(false)} className="rounded-lg p-1 text-[#5B6475] hover:bg-[#F3F5F9]">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 pt-4 text-xs text-[#5B6475]">
              <div className="rounded-xl border border-[#E8ECF3] bg-[#F7F7F8] p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-bold text-[#111827]">Developer Mode</span>
                    <span className="ml-2 rounded bg-[#E8ECF3] px-1.5 py-0.2 font-mono text-[10px] text-[#5B6475]">{isDevMode ? 'AKTIF' : 'NONAKTIF'}</span>
                  </div>
                  <button onClick={() => setIsDevMode((v) => !v)} className={`h-5 w-9 rounded-full ${isDevMode ? 'bg-[#E31E24]' : 'bg-[#D9DEE9]'}`}>
                    <span className={`block h-4 w-4 rounded-full bg-white transition-transform ${isDevMode ? 'translate-x-4' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setIsAdminMenuOpen(false)} className="rounded-xl bg-[#F3F5F9] px-4 py-2 text-xs font-semibold text-[#111827]">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {isSimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-6">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-3xl border border-[#E8ECF3] bg-[#F7F7F8] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#E8ECF3] bg-white px-4 py-3.5 sm:px-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FEE5E6] text-[#E31E24]">
                  <Terminal className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#111827]">Developer Tools</h3>
                  <p className="text-[11px] text-[#5B6475]">Acceptance Test End-to-End Simulation</p>
                </div>
              </div>
              <button onClick={() => setIsSimModalOpen(false)} className="rounded-xl border border-[#E8ECF3] bg-[#F3F5F9] px-3.5 py-1.5 text-xs font-bold text-[#111827]">
                Tutup
              </button>
            </div>
            <div className="overflow-y-auto p-4 sm:p-6"><E2ESimulationRunner /></div>
          </div>
        </div>
      )}
    </div>
  );
}
