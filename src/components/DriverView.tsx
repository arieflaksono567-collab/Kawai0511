import React, { useState, useEffect } from 'react';
import {
  Bike,
  Power,
  Navigation,
  MapPin,
  Clock,
  CheckCircle2,
  XCircle,
  Radio,
  Phone,
  Star,
} from 'lucide-react';
import { LocationPoint } from '../types';
import { BanjarmasinMap } from './BanjarmasinMap';
import { DriverEarningsCard } from './DriverEarningsCard';
import { TripHistoryModal } from './TripHistoryModal';
import { TripDetailModal } from './TripDetailModal';

interface DriverViewProps {
  activeRide: any;
  onAcceptRide: () => void;
  onRejectRide: () => void;
  onTimeoutRide: () => void;
  onArrivedRide: () => void;
  onStartRide: () => void;
  onCompleteRide: () => void;
  driverPosition: { x: number; y: number; heading?: number; name?: string };
  landmarks: LocationPoint[];
  pickup: LocationPoint;
  destination: LocationPoint;
}

export const DriverView: React.FC<DriverViewProps> = ({
  activeRide,
  onAcceptRide,
  onRejectRide,
  onTimeoutRide,
  onArrivedRide,
  onStartRide,
  onCompleteRide,
  driverPosition,
  landmarks,
  pickup,
  destination,
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [countdown, setCountdown] = useState(30);
  const [todayEarnings, setTodayEarnings] = useState(185500);
  const [completedTrips, setCompletedTrips] = useState(12);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDetailRideId, setSelectedDetailRideId] = useState<string | null>(null);

  const isOfferPending = activeRide && activeRide.status === 'SEARCHING' && isOnline;

  useEffect(() => {
    let timer: any = null;
    if (isOfferPending) {
      setCountdown(30);
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            onTimeoutRide();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      setCountdown(30);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isOfferPending, onTimeoutRide]);

  useEffect(() => {
    if (activeRide && activeRide.status === 'COMPLETED') {
      const driverShare = Math.round((activeRide.totalFare || 12400) * 0.85);
      setTodayEarnings((prev) => prev + driverShare);
      setCompletedTrips((prev) => prev + 1);
    }
  }, [activeRide?.status]);

  const totalFare = activeRide?.totalFare || 12400;
  const driverNetShare = Math.round(totalFare * 0.85);

  return (
    <div className="mx-auto flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-[#E8ECF3] bg-white text-[#111827] shadow-sm">
      <header className="flex items-center justify-between border-b border-[#E8ECF3] bg-white px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl border border-[#E8ECF3] bg-[#F3F5F9] shadow-sm">
              <img
                src="/src/assets/images/driver_portrait_ridho_1790780315040.jpg"
                alt="Ahmad Gazali"
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div className={`absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white ${isOnline ? 'bg-[#E31E24]' : 'bg-[#5B6475]'}`} />
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm font-bold text-[#111827]">Ahmad Gazali</h2>
              <span className="rounded border border-[#E8ECF3] bg-[#F3F5F9] px-1.5 py-0.2 text-[10px] font-mono font-bold text-[#111827]">
                DA 5110 KAW
              </span>
            </div>
            <p className="text-[11px] text-[#5B6475]">Honda Vario 160 • ★ 4.9</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowHistoryModal(true)}
            className="flex items-center gap-1.5 rounded-full border border-[#E8ECF3] bg-[#F3F5F9] px-3 py-1.5 text-xs font-semibold text-[#111827] transition hover:bg-[#EAF1FF]"
            title="Riwayat Trip Driver"
          >
            <Clock className="h-3.5 w-3.5 text-[#E31E24]" />
            <span>Riwayat</span>
          </button>

          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition ${
              isOnline
                ? 'border border-[#E31E24]/30 bg-[#FEE5E6] text-[#11274A]'
                : 'border border-[#E8ECF3] bg-[#F3F5F9] text-[#5B6475]'
            }`}
          >
            <Power className="h-3.5 w-3.5" />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE'}</span>
          </button>
        </div>
      </header>

      <div className="flex items-center justify-between border-b border-[#E8ECF3] bg-[#F3F5F9] px-4 py-2 text-[11px]">
        <div className="flex items-center gap-1.5 font-medium text-[#11274A]">
          <Radio className="h-3 w-3 animate-pulse text-[#E31E24]" />
          <span>GPS FRESH (&lt; 10s)</span>
          <span className="text-[#A3ABBA]">•</span>
          <span className="text-[#5B6475]">Akurasi ~5m</span>
        </div>
        <div className="font-mono text-[10px] text-[#5B6475]">Redis GEO • PostGIS Aktif</div>
      </div>

      <div className="bg-[#F7F7F8] p-3">
        <BanjarmasinMap
          pickup={pickup}
          destination={destination}
          driverPosition={driverPosition}
          landmarks={landmarks}
          status={activeRide?.status || 'idle'}
          isDriverView={true}
        />
      </div>

      <div className="space-y-4 p-5">
        {isOfferPending && (
          <div className="relative space-y-4 overflow-hidden rounded-2xl border-2 border-[#E31E24] bg-white p-5 shadow-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-ping rounded-full bg-[#E31E24]" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#E31E24]">Order Masuk Baru!</span>
              </div>
              <div className="flex items-center gap-1 rounded-full border border-[#F5A623]/30 bg-amber-50 px-2 py-0.5 text-xs font-bold font-mono text-[#F5A623]">
                <Clock className="h-3 w-3" />
                <span>{countdown}s</span>
              </div>
            </div>

            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#F3F5F9]">
              <div
                className="h-full rounded-full bg-[#E31E24] transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 30) * 100}%` }}
              />
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#FEE5E6] text-[#11274A]">
                  <MapPin className="h-3.5 w-3.5 text-[#E31E24]" />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-[#5B6475]">Titik Jemput:</span>
                  <span className="text-sm font-bold text-[#111827]">{pickup.name}</span>
                  <p className="truncate text-[10px] text-[#5B6475]">{pickup.address}</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-[#EAF1FF] text-[#11274A]">
                  <Navigation className="h-3.5 w-3.5" />
                </div>
                <div>
                  <span className="block text-[10px] font-semibold uppercase text-[#5B6475]">Tujuan Penumpang:</span>
                  <span className="text-sm font-bold text-[#111827]">{destination.name}</span>
                  <p className="truncate text-[10px] text-[#5B6475]">{destination.address}</p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E8ECF3] bg-[#F7F7F8] p-3 text-xs">
              <div>
                <span className="block text-[10px] text-[#5B6475]">Pendapatan Mitra (85%):</span>
                <span className="font-mono text-base font-black text-[#E31E24]">Rp {driverNetShare.toLocaleString('id-ID')}</span>
              </div>
              <div className="text-right">
                <span className="block text-[10px] text-[#5B6475]">Total Tarif:</span>
                <span className="font-mono text-xs font-bold text-[#111827]">Rp {totalFare.toLocaleString('id-ID')}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button onClick={onRejectRide} className="flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-white py-3 text-xs font-bold text-[#E31E24] transition hover:bg-rose-50">
                <XCircle className="h-4 w-4" />
                <span>Tolak</span>
              </button>

              <button onClick={onAcceptRide} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#E31E24] py-3 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#B0101A]">
                <CheckCircle2 className="h-4 w-4" />
                <span>Terima Order</span>
              </button>
            </div>
          </div>
        )}

        {activeRide && ['ASSIGNED', 'ARRIVED', 'IN_TRIP'].includes(activeRide.status) && (
          <div className="space-y-4 rounded-2xl border border-[#E8ECF3] bg-[#F7F7F8] p-4">
            <div className="flex items-center justify-between border-b border-[#E8ECF3] pb-3">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-[#E31E24]" />
                <span className="text-xs font-bold text-[#111827]">
                  Trip Sedang Berjalan (Order #{activeRide.id ? activeRide.id.slice(-6) : '0511'})
                </span>
              </div>
              <span className="rounded bg-[#FEE5E6] px-2 py-0.5 text-[10px] font-mono font-bold text-[#11274A]">
                {activeRide.status}
              </span>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#E8ECF3] bg-white p-3">
              <div>
                <span className="block text-[10px] font-semibold uppercase text-[#5B6475]">Penumpang:</span>
                <span className="text-sm font-bold text-[#111827]">{activeRide.passengerName || 'Arief Laksono'}</span>
                <p className="text-[10px] text-[#5B6475]">Pembayaran Tunai (Cash)</p>
              </div>
              <a href="tel:+6281255110987" className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#E31E24]/30 bg-[#FEE5E6] text-[#11274A] transition hover:bg-[#E31E24] hover:text-white" title="Hubungi Penumpang">
                <Phone className="h-4 w-4" />
              </a>
            </div>

            {activeRide.status === 'ASSIGNED' && (
              <div className="space-y-3">
                <p className="text-xs text-[#5B6475]">Menuju lokasi penjemputan penumpang di <strong className="text-[#111827]">{pickup.name}</strong>.</p>
                <button onClick={onArrivedRide} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E31E24] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#B0101A]">
                  <MapPin className="h-4 w-4" />
                  <span>SAYA SUDAH TIBA DI LOKASI PENJEMPUTAN</span>
                </button>
              </div>
            )}

            {activeRide.status === 'ARRIVED' && (
              <div className="space-y-3">
                <div className="rounded-xl border border-[#E31E24]/30 bg-[#FEE5E6] p-2.5 text-xs text-[#11274A]">
                  Driver sudah tiba di titik jemput. Pastikan penumpang sudah naik kendaraan.
                </div>
                <button onClick={onStartRide} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E31E24] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#B0101A]">
                  <Navigation className="h-4 w-4" />
                  <span>MULAI PERJALANAN (START TRIP)</span>
                </button>
              </div>
            )}

            {activeRide.status === 'IN_TRIP' && (
              <div className="space-y-3">
                <p className="text-xs text-[#5B6475]">Dalam perjalanan menuju <strong className="text-[#111827]">{destination.name}</strong>.</p>
                <button onClick={onCompleteRide} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#E31E24] py-3.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#B0101A]">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>SELESAIKAN PERJALANAN (COMPLETE)</span>
                </button>
              </div>
            )}
          </div>
        )}

        {(!activeRide || activeRide.status === 'idle' || activeRide.status === 'COMPLETED' || activeRide.status === 'CANCELLED') && !isOfferPending && (
          <div className="space-y-4">
            {activeRide && activeRide.status === 'COMPLETED' && (
              <div className="space-y-3 rounded-2xl border-2 border-[#E31E24]/30 bg-[#FEE5E6] p-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-[#E31E24]" />
                    <span className="text-xs font-bold uppercase tracking-wider text-[#11274A]">Perjalanan Selesai</span>
                  </div>
                  <span className="rounded-full border border-[#E31E24]/20 bg-white px-2 py-0.5 text-[10px] font-mono font-bold text-[#11274A]">Bagi Hasil 85%</span>
                </div>

                <div className="space-y-1.5 rounded-xl border border-[#E31E24]/20 bg-white p-3 text-xs">
                  <div className="flex justify-between text-[#5B6475]">
                    <span>Pendapatan Bersih Masuk Saldo:</span>
                    <strong className="text-sm font-extrabold text-[#11274A]">Rp {driverNetShare.toLocaleString('id-ID')}</strong>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#5B6475]">
                    <span>Rute:</span>
                    <span className="font-semibold text-[#111827] line-clamp-1">{pickup.name} → {destination.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#5B6475]">
                    <span>Pelanggan:</span>
                    <span className="font-semibold text-[#111827]">{activeRide.passengerName || 'Arief Laksono'}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button type="button" onClick={() => setSelectedDetailRideId(activeRide.id || 'ride-0511-102')} className="flex items-center justify-center gap-1.5 rounded-xl bg-[#E31E24] px-2 py-2.5 text-xs font-bold text-white transition hover:bg-[#B0101A]">
                    <Star className="h-3.5 w-3.5 fill-white" />
                    <span>Detail & Rating</span>
                  </button>
                  <button type="button" onClick={() => setShowHistoryModal(true)} className="flex items-center justify-center gap-1.5 rounded-xl border border-[#E8ECF3] bg-white px-2 py-2.5 text-xs font-bold text-[#111827] transition hover:bg-[#F3F5F9]">
                    <Clock className="h-3.5 w-3.5 text-[#E31E24]" />
                    <span>Riwayat Trip</span>
                  </button>
                </div>
              </div>
            )}

            <div className={`flex items-center justify-between rounded-2xl border p-4 ${isOnline ? 'border-[#E31E24]/30 bg-[#FEE5E6] text-[#11274A]' : 'border-[#E8ECF3] bg-[#F3F5F9] text-[#5B6475]'}`}>
              <div className="flex items-center gap-2.5">
                <div className={`h-3 w-3 rounded-full ${isOnline ? 'animate-ping bg-[#E31E24]' : 'bg-[#5B6475]'}`} />
                <div>
                  <span className="block text-xs font-bold">{isOnline ? 'ONLINE — SIAP MENERIMA ORDER' : 'OFFLINE — Driver Sedang Istirahat'}</span>
                  <span className="text-[10px] opacity-80">{isOnline ? 'Standby di sekitar Duta Mall Banjarmasin' : 'Aktifkan status untuk mulai menerima order'}</span>
                </div>
              </div>
            </div>

            <DriverEarningsCard
              driverId="d0000000-0000-0000-0000-000000000001"
              driverName="Ahmad Gazali"
              initialTodayEarnings={todayEarnings || 185500}
              initialTodayRides={completedTrips || 12}
              initialWeekEarnings={1240000}
              onViewHistory={() => setShowHistoryModal(true)}
            />
          </div>
        )}
      </div>

      <TripHistoryModal role="DRIVER" isOpen={showHistoryModal} onClose={() => setShowHistoryModal(false)} />

      {selectedDetailRideId && (
        <TripDetailModal
          rideId={selectedDetailRideId}
          role="DRIVER"
          isOpen={Boolean(selectedDetailRideId)}
          onClose={() => setSelectedDetailRideId(null)}
        />
      )}
    </div>
  );
};
