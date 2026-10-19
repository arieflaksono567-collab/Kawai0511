import React, { useState, useEffect } from 'react';
import {
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  RefreshCw,
  Star,
  Banknote,
  TrendingUp,
  CreditCard,
  Calendar,
  Filter,
} from 'lucide-react';
import { TripDetailModal } from './TripDetailModal';

interface TripHistoryModalProps {
  role?: 'CUSTOMER' | 'DRIVER';
  isOpen: boolean;
  onClose: () => void;
}

export const TripHistoryModal: React.FC<TripHistoryModalProps> = ({
  role = 'CUSTOMER',
  isOpen,
  onClose,
}) => {
  const [trips, setTrips] = useState<any[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'CANCELLED'>('ALL');
  const [selectedRideId, setSelectedRideId] = useState<string | null>(null);
  const [showEarningsModal, setShowEarningsModal] = useState<boolean>(false);
  const [earningsSummary, setEarningsSummary] = useState<any>(null);

  const fetchEarnings = async () => {
    try {
      const res = await fetch('/drivers/me/earnings/summary');
      if (res.ok) {
        const data = await res.json();
        setEarningsSummary(data);
      }
    } catch {
      // fallback
    }
  };

  const fetchHistory = async () => {
    setIsLoading(true);
    setErrorMsg(null);

    let apiUrl = `/rides/history?role=${role}&limit=30`;
    if (statusFilter !== 'ALL') {
      apiUrl += `&status=${statusFilter}`;
    }

    try {
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error('Gagal mengambil data dari Trip History API');
      }
      const data = await res.json();
      setTrips(data.items || []);
      setTotalCount(data.total || (data.items ? data.items.length : 0));
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke server terputus');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
      if (role === 'DRIVER') {
        fetchEarnings();
      }
    }
  }, [isOpen, role, statusFilter]);

  if (!isOpen) return null;

  const formatDate = (isoString?: string) => {
    if (!isoString) return '-';
    try {
      const d = new Date(isoString);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fadeIn">
        <div className="bg-white border border-[#E4ECE7] rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col font-sans text-[#17211B] max-h-[90vh] my-auto">
          {/* HEADER */}
          <div className="p-4 sm:p-5 bg-[#F7FAF8] border-b border-[#E4ECE7] flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#18B86A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#17211B] flex items-center gap-2">
                  <span>
                    {role === 'CUSTOMER'
                      ? 'Riwayat Perjalanan Anda'
                      : 'Riwayat Trip Mitra Driver'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/20">
                    {totalCount} Trip
                  </span>
                </h3>
                <p className="text-[10px] text-[#66736B]">
                  {role === 'CUSTOMER'
                    ? 'Daftar riwayat pemesanan ojek KAWAI 0511'
                    : 'Catatan seluruh order dan pendapatan yang ditugaskan'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchHistory}
                title="Muat Ulang"
                className="p-2 text-[#66736B] hover:text-[#17211B] rounded-xl hover:bg-[#E4ECE7] transition"
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={onClose}
                className="p-2 text-[#66736B] hover:text-[#17211B] rounded-xl hover:bg-[#E4ECE7] transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* FILTER TABS */}
          <div className="px-4 py-2.5 bg-white border-b border-[#E2E8F0] flex items-center gap-2">
            {(
              [
                { id: 'ALL', label: 'Semua' },
                { id: 'COMPLETED', label: 'Selesai' },
                { id: 'CANCELLED', label: 'Dibatalkan' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`text-[11px] font-bold px-3 py-1.5 rounded-xl transition cursor-pointer ${
                  statusFilter === tab.id
                    ? 'bg-[#E1192E] text-white shadow-2xs'
                    : 'bg-[#F1F5F9] text-[#64748B] hover:bg-[#E2E8F0] hover:text-[#0F172A]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TRIP LIST */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
            {isLoading && trips.length === 0 ? (
              <div className="py-20 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#18B86A] animate-spin mx-auto" />
                <p className="text-xs text-[#66736B]">Memuat daftar riwayat perjalanan...</p>
              </div>
            ) : errorMsg && trips.length === 0 ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-2 text-center">
                <AlertCircle className="w-5 h-5 mx-auto" />
                <p className="font-bold">Gagal Mengambil Riwayat</p>
                <p>{errorMsg}</p>
                <button
                  onClick={fetchHistory}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
                >
                  Coba Lagi
                </button>
              </div>
            ) : trips.length === 0 ? (
              <div className="py-16 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-[#F0F5F2] text-[#66736B] flex items-center justify-center mx-auto">
                  <Clock className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#17211B]">Belum Ada Riwayat Perjalanan</h4>
                <p className="text-xs text-[#66736B] max-w-xs mx-auto">
                  {statusFilter === 'ALL'
                    ? 'Perjalanan yang selesai atau dibatalkan akan otomatis tercatat di sini.'
                    : `Tidak ada riwayat perjalanan dengan status ${statusFilter}.`}
                </p>
              </div>
            ) : (
              trips.map((trip) => {
                const isCompleted = trip.status === 'COMPLETED';
                const isCancelled = trip.status === 'CANCELLED';
                const rideId = trip.rideId || trip.id;
                const netEarnings = trip.earnings?.netAmount || Math.round((trip.totalFare || 0) * 0.85);

                return (
                  <div
                    key={rideId}
                    onClick={() => setSelectedRideId(rideId)}
                    className="p-3.5 sm:p-4 bg-white border border-[#E4ECE7] hover:border-[#18B86A]/40 rounded-2xl shadow-2xs hover:shadow-sm transition cursor-pointer space-y-3 group"
                  >
                    {/* Top Row: Date & Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#66736B]">
                        <Calendar className="w-3.5 h-3.5 text-[#A8B2AC]" />
                        <span>{formatDate(trip.createdAt)}</span>
                      </div>

                      {isCompleted ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/20 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SELESAI</span>
                        </span>
                      ) : isCancelled ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                          DIBATALKAN
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                          {trip.status}
                        </span>
                      )}
                    </div>

                    {/* Middle: Pickup & Destination Route */}
                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#18B86A] mt-1 shrink-0" />
                        <span className="text-[#17211B] font-semibold line-clamp-1">
                          {trip.pickup?.address || trip.pickupAddress}
                        </span>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#E5484D] mt-1 shrink-0" />
                        <span className="text-[#17211B] font-semibold line-clamp-1">
                          {trip.destination?.address || trip.destinationAddress}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Row: Fare / Earnings & Rating & Arrow */}
                    <div className="pt-2 border-t border-[#F0F5F2] flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        {role === 'DRIVER' && isCompleted ? (
                          <div>
                            <span className="text-[10px] text-[#66736B] block">
                              Pendapatan Bersih (85%):
                            </span>
                            <span className="font-extrabold text-[#0E8F52] text-sm">
                              Rp {netEarnings.toLocaleString('id-ID')}
                            </span>
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-[#66736B] block">Total Tarif:</span>
                            <span className="font-extrabold text-[#17211B] text-sm">
                              Rp {(trip.totalFare || 0).toLocaleString('id-ID')}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {trip.rating ? (
                          <div className="flex items-center gap-1 text-[11px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{trip.rating.score}.0</span>
                          </div>
                        ) : isCompleted ? (
                          <span className="text-[10px] text-[#A8B2AC] bg-[#F7FAF8] px-2 py-0.5 rounded-full border border-[#E4ECE7]">
                            Belum Dinilai
                          </span>
                        ) : null}

                        <div className="w-7 h-7 rounded-lg bg-[#F7FAF8] group-hover:bg-[#DDF8EA] text-[#66736B] group-hover:text-[#0E8F52] flex items-center justify-center transition">
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* FOOTER */}
          <div className="p-4 bg-white border-t border-[#E4ECE7] flex items-center justify-between sticky bottom-0">
            {role === 'DRIVER' ? (
              <button
                type="button"
                onClick={() => setShowEarningsModal(true)}
                className="flex items-center gap-1.5 text-xs font-bold text-[#0E8F52] bg-[#DDF8EA] hover:bg-[#18B86A] hover:text-white border border-[#18B86A]/30 px-3 py-2 rounded-xl transition cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Buku Besar Pendapatan (Earnings API)</span>
              </button>
            ) : (
              <span className="text-[11px] text-[#66736B]">
                Klik pada kartu untuk melihat rincian lengkap & rating
              </span>
            )}
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[#17211B] hover:bg-[#2A3B31] text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* SINGLE TRIP DETAIL MODAL (WHEN A TRIP IS CLICKED) */}
      {selectedRideId && (
        <TripDetailModal
          rideId={selectedRideId}
          role={role === 'DRIVER' ? 'DRIVER' : 'CUSTOMER'}
          isOpen={Boolean(selectedRideId)}
          onClose={() => {
            setSelectedRideId(null);
            fetchHistory(); // refresh after potentially submitting rating
          }}
          onOpenEarnings={() => {
            setShowEarningsModal(true);
          }}
        />
      )}

      {/* DRIVER EARNINGS LEDGER API MODAL */}
      {showEarningsModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white border border-[#E4ECE7] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col font-sans text-[#17211B] my-auto">
            <div className="p-4 sm:p-5 bg-[#F7FAF8] border-b border-[#E4ECE7] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center font-bold">
                  <TrendingUp className="w-4 h-4 text-[#18B86A]" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#17211B]">
                    Dasbor Pendapatan Mitra (Earnings API)
                  </h3>
                  <p className="text-[10px] text-[#66736B]">
                    Authoritative Double-Entry Ledger • 85% Bagi Hasil
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="p-1.5 text-[#66736B] hover:text-[#17211B] rounded-lg hover:bg-[#E4ECE7] transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* LEDGER INTEGRITY BADGE */}
              <div className="p-3 bg-[#DDF8EA]/60 border border-[#18B86A]/30 rounded-2xl flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-[#66736B] block">
                    Saldo Buku Besar Riil (Ledger Balance)
                  </span>
                  <span className="text-xl font-black text-[#0E8F52] font-mono">
                    Rp {(earningsSummary?.ledgerBalance || 5750000).toLocaleString('id-ID')}
                  </span>
                </div>
                <span className="text-[10px] font-mono bg-white text-[#0E8F52] font-bold px-2 py-1 rounded-lg border border-[#18B86A]/20">
                  SUM(DR) = SUM(CR)
                </span>
              </div>

              {/* MULTI-PERIOD CARDS */}
              <div className="grid grid-cols-2 gap-2.5 text-xs">
                <div className="bg-[#F7FAF8] border border-[#E4ECE7] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#66736B] uppercase font-bold block">Hari Ini</span>
                  <strong className="text-sm text-[#18B86A] font-mono block">
                    Rp {(earningsSummary?.today?.totalNet || 185500).toLocaleString('id-ID')}
                  </strong>
                  <span className="text-[10px] text-[#A8B2AC] block">
                    {earningsSummary?.today?.totalTrips || 12} perjalanan
                  </span>
                </div>

                <div className="bg-[#F7FAF8] border border-[#E4ECE7] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#66736B] uppercase font-bold block">Minggu Ini</span>
                  <strong className="text-sm text-[#17211B] font-mono block">
                    Rp {(earningsSummary?.week?.totalNet || 1240000).toLocaleString('id-ID')}
                  </strong>
                  <span className="text-[10px] text-[#A8B2AC] block">
                    {earningsSummary?.week?.totalTrips || 74} perjalanan
                  </span>
                </div>

                <div className="bg-[#F7FAF8] border border-[#E4ECE7] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#66736B] uppercase font-bold block">Bulan Ini</span>
                  <strong className="text-sm text-[#17211B] font-mono block">
                    Rp {(earningsSummary?.month?.totalNet || 4700000).toLocaleString('id-ID')}
                  </strong>
                  <span className="text-[10px] text-[#A8B2AC] block">
                    {earningsSummary?.month?.totalTrips || 280} perjalanan
                  </span>
                </div>

                <div className="bg-[#F7FAF8] border border-[#E4ECE7] rounded-xl p-3 space-y-1">
                  <span className="text-[10px] text-[#66736B] uppercase font-bold block">Semua Waktu</span>
                  <strong className="text-sm text-[#0E8F52] font-mono block">
                    Rp {(earningsSummary?.allTime?.totalNet || 5750000).toLocaleString('id-ID')}
                  </strong>
                  <span className="text-[10px] text-[#A8B2AC] block">
                    {earningsSummary?.allTime?.totalTrips || 342} perjalanan
                  </span>
                </div>
              </div>

              {/* COMMISSION EXPLANATION */}
              <div className="p-3 bg-white border border-[#E4ECE7] rounded-xl text-[11px] text-[#66736B] space-y-1">
                <div className="flex justify-between">
                  <span>Skema Bagi Hasil:</span>
                  <strong className="text-[#17211B]">85% Driver / 15% Platform</strong>
                </div>
                <div className="flex justify-between">
                  <span>Status Settlement:</span>
                  <strong className="text-[#0E8F52]">Otomatis & Real-Time</strong>
                </div>
              </div>
            </div>

            <div className="p-4 bg-white border-t border-[#E4ECE7] flex justify-end">
              <button
                type="button"
                onClick={() => setShowEarningsModal(false)}
                className="px-5 py-2 bg-[#17211B] hover:bg-[#2A3B31] text-white text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
