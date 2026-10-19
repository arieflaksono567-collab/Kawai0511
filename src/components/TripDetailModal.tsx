import React, { useState, useEffect } from 'react';
import {
  MapPin,
  Clock,
  CheckCircle2,
  AlertCircle,
  X,
  CreditCard,
  Banknote,
  Star,
  ShieldCheck,
  TrendingUp,
  Receipt,
  User,
  Bike,
  RefreshCw,
  Calendar,
  Share2,
} from 'lucide-react';
import { RatingModal } from './RatingModal';

interface TripDetailModalProps {
  rideId: string;
  role?: 'CUSTOMER' | 'DRIVER' | 'ADMIN';
  isOpen: boolean;
  onClose: () => void;
  onOpenRating?: (rideId: string) => void;
  onOpenEarnings?: () => void;
}

export const TripDetailModal: React.FC<TripDetailModalProps> = ({
  rideId,
  role = 'CUSTOMER',
  isOpen,
  onClose,
  onOpenRating,
  onOpenEarnings,
}) => {
  const [detail, setDetail] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRatingModalOpen, setIsRatingModalOpen] = useState<boolean>(false);

  const fetchDetail = async () => {
    if (!rideId) return;
    setIsLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/rides/${rideId}/detail?role=${role}`);
      if (!res.ok) {
        throw new Error('Gagal mengambil rincian detail perjalanan');
      }
      const data = await res.json();
      setDetail(data);
    } catch (err: any) {
      setErrorMsg(err.message || 'Koneksi ke API detail perjalanan gagal');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && rideId) {
      fetchDetail();
    }
  }, [isOpen, rideId, role]);

  if (!isOpen) return null;

  const handleRatingSuccess = (ratingData: any) => {
    if (detail) {
      setDetail((prev: any) => ({
        ...prev,
        rating: ratingData,
      }));
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/30">
            SELESAI (COMPLETED)
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
            DIBATALKAN (CANCELLED)
          </span>
        );
      case 'IN_TRIP':
        return (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
            DALAM PERJALANAN (IN_TRIP)
          </span>
        );
      default:
        return (
          <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            {status}
          </span>
        );
    }
  };

  const formatDateTime = (isoString?: string | null) => {
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
                0511
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-bold text-[#17211B] flex items-center gap-2">
                  <span>Detail Perjalanan</span>
                  {detail && getStatusBadge(detail.status)}
                </h3>
                <p className="text-[10px] text-[#66736B] font-mono">
                  Order #{rideId ? rideId.slice(-8) : '0511-demo'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={fetchDetail}
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

          {/* BODY */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
            {isLoading && !detail ? (
              <div className="py-16 text-center space-y-3">
                <RefreshCw className="w-8 h-8 text-[#18B86A] animate-spin mx-auto" />
                <p className="text-xs text-[#66736B]">Memuat data dari Trip Detail API...</p>
              </div>
            ) : errorMsg && !detail ? (
              <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <AlertCircle className="w-4 h-4" />
                  <span>Gagal Memuat Detail</span>
                </div>
                <p>{errorMsg}</p>
                <button
                  onClick={fetchDetail}
                  className="px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-semibold hover:bg-rose-700 transition"
                >
                  Coba Lagi
                </button>
              </div>
            ) : detail ? (
              <>
                {/* 1. ROUTE CARD (PICKUP & DESTINATION) */}
                <div className="bg-[#F7FAF8] rounded-2xl p-4 border border-[#E4ECE7] space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 flex flex-col items-center">
                      <div className="w-3.5 h-3.5 rounded-full bg-[#18B86A] ring-4 ring-[#DDF8EA]" />
                      <div className="w-0.5 h-8 bg-[#D7E2DB] my-0.5" />
                      <div className="w-3.5 h-3.5 rounded-full bg-[#E5484D] ring-4 ring-rose-100" />
                    </div>

                    <div className="flex-1 space-y-3 min-w-0">
                      <div>
                        <span className="text-[10px] text-[#66736B] uppercase font-semibold block">
                          Titik Penjemputan (Pickup)
                        </span>
                        <p className="text-xs font-bold text-[#17211B] leading-tight mt-0.5">
                          {detail.pickup?.address || detail.pickupAddress}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-[#66736B] uppercase font-semibold block">
                          Tujuan Pengantaran (Destination)
                        </span>
                        <p className="text-xs font-bold text-[#17211B] leading-tight mt-0.5">
                          {detail.destination?.address || detail.destinationAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* DISTANCE & DURATION CHIP */}
                  <div className="pt-2 border-t border-[#E4ECE7] flex items-center justify-between text-xs text-[#66736B]">
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>Jarak Tempuh:</span>
                      <strong className="text-[#17211B]">
                        {detail.distanceKm ? `${detail.distanceKm} km` : 'Belum tersedia'}
                      </strong>
                    </span>
                    <span className="flex items-center gap-1.5 font-medium">
                      <span>Estimasi Waktu:</span>
                      <strong className="text-[#17211B]">
                        {detail.durationMinutes ? `${detail.durationMinutes} menit` : 'Belum tersedia'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* 2. PARTY SUMMARY CARD */}
                {role === 'CUSTOMER' && detail.driver ? (
                  <div className="p-3.5 bg-white rounded-2xl border border-[#E4ECE7] flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#F0F5F2] border border-[#D7E2DB] flex items-center justify-center font-bold text-base text-[#0E8F52]">
                        🛵
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#66736B] block">
                          Mitra Driver KAWAI 0511
                        </span>
                        <span className="text-xs font-bold text-[#17211B] block">
                          {detail.driver.name}
                        </span>
                        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#66736B]">
                          <span className="font-mono text-[#0E8F52] font-semibold">
                            {detail.driver.vehiclePlate || 'DA 5110 KAW'}
                          </span>
                          <span>•</span>
                          <span>{detail.driver.vehicleModel || 'Honda Vario 160'}</span>
                        </div>
                      </div>
                    </div>
                    {detail.driver.rating && (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 font-bold text-xs">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                        <span>{detail.driver.rating.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                ) : role === 'DRIVER' && detail.passenger ? (
                  <div className="p-3.5 bg-white rounded-2xl border border-[#E4ECE7] flex items-center justify-between shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-[#F0F5F2] border border-[#D7E2DB] flex items-center justify-center font-bold text-base text-[#0E8F52]">
                        👤
                      </div>
                      <div>
                        <span className="text-[10px] uppercase font-semibold text-[#66736B] block">
                          Pelanggan Penumpang
                        </span>
                        <span className="text-xs font-bold text-[#17211B] block">
                          {detail.passenger.fullName || 'Arief Laksono'}
                        </span>
                        {detail.passenger.phoneNumber && (
                          <span className="text-[11px] text-[#66736B] font-mono">
                            {detail.passenger.phoneNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : null}

                {/* 3. FARE BREAKDOWN (RINCIAN TARIF) */}
                <div className="bg-white rounded-2xl p-4 border border-[#E4ECE7] space-y-2.5 shadow-2xs">
                  <h4 className="text-xs font-bold text-[#17211B] flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Receipt className="w-3.5 h-3.5 text-[#18B86A]" />
                      <span>Rincian Tarif Perjalanan</span>
                    </span>
                    <span className="text-sm font-black text-[#17211B]">
                      Rp {(detail.totalFare || 0).toLocaleString('id-ID')}
                    </span>
                  </h4>

                  <div className="space-y-1.5 text-xs text-[#66736B] pt-1 border-t border-[#F0F5F2]">
                    <div className="flex items-center justify-between">
                      <span>Tarif Dasar (Base Fare)</span>
                      <span>Rp {(detail.fare?.baseFare || 7000).toLocaleString('id-ID')}</span>
                    </div>
                    {detail.fare?.distanceFare !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Tarif Jarak ({detail.distanceKm || 0} km)</span>
                        <span>Rp {detail.fare.distanceFare.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                    {detail.fare?.durationFare !== undefined && (
                      <div className="flex items-center justify-between">
                        <span>Tarif Waktu ({detail.durationMinutes || 0} min)</span>
                        <span>Rp {detail.fare.durationFare.toLocaleString('id-ID')}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. DRIVER EARNINGS LEDGER CARD (DRIVER & ADMIN ONLY) */}
                {(role === 'DRIVER' || role === 'ADMIN') && detail.earnings && (
                  <div className="bg-[#DDF8EA] rounded-2xl p-4 border border-[#18B86A]/30 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <TrendingUp className="w-4 h-4 text-[#0E8F52]" />
                        <span className="text-xs font-bold text-[#0E8F52]">
                          Buku Besar Pendapatan Mitra (Ledger)
                        </span>
                      </div>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white text-[#0E8F52] border border-[#18B86A]/20">
                        85% BAGI HASIL
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-[#17211B] pt-1 border-t border-[#18B86A]/20">
                      <div className="flex items-center justify-between text-[#66736B]">
                        <span>Gross Fare (Tarif Bruto)</span>
                        <span>Rp {(detail.earnings.grossAmount || detail.totalFare).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#66736B]">
                        <span>Biaya Platform (15%)</span>
                        <span>-Rp {(detail.earnings.platformFee || 0).toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex items-center justify-between font-bold text-sm text-[#0E8F52] pt-1 border-t border-[#18B86A]/20">
                        <span>Pendapatan Bersih Mitra</span>
                        <span>Rp {(detail.earnings.netAmount || 0).toLocaleString('id-ID')}</span>
                      </div>
                    </div>

                    {onOpenEarnings && (
                      <button
                        onClick={onOpenEarnings}
                        className="w-full mt-2 py-2 bg-white hover:bg-[#F0F5F2] text-[#0E8F52] border border-[#18B86A]/30 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
                      >
                        <TrendingUp className="w-3.5 h-3.5 text-[#0E8F52]" />
                        <span>Buka Buku Besar Pendapatan Lengkap (Earnings API)</span>
                      </button>
                    )}
                  </div>
                )}

                {/* 5. PAYMENT STATUS CARD */}
                <div className="bg-[#F7FAF8] rounded-2xl p-4 border border-[#E4ECE7] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#17211B] flex items-center gap-1.5">
                      {detail.payment?.method === 'DIGITAL' ? (
                        <CreditCard className="w-3.5 h-3.5 text-[#18B86A]" />
                      ) : (
                        <Banknote className="w-3.5 h-3.5 text-[#18B86A]" />
                      )}
                      <span>Status Pembayaran</span>
                    </span>

                    {detail.payment ? (
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#DDF8EA] text-[#0E8F52] border border-[#18B86A]/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>{detail.payment.status || 'PAID'}</span>
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#66736B] font-medium bg-[#F0F5F2] px-2 py-0.5 rounded-full">
                        Belum Dibayar
                      </span>
                    )}
                  </div>

                  {detail.payment && (
                    <div className="flex items-center justify-between text-xs text-[#66736B] pt-1">
                      <span>Metode: {detail.payment.method || 'CASH'}</span>
                      <span>
                        Waktu: {formatDateTime(detail.payment.paidAt || detail.completedAt)}
                      </span>
                    </div>
                  )}
                </div>

                {/* 6. RATING & ULASAN SECTION */}
                <div className="bg-white rounded-2xl p-4 border border-[#E4ECE7] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#17211B] flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>Rating & Ulasan Perjalanan</span>
                    </h4>

                    {detail.rating ? (
                      <div className="flex items-center gap-1 text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                        <span>{detail.rating.score}.0</span>
                      </div>
                    ) : (
                      <span className="text-[10px] text-[#66736B] font-medium bg-[#F0F5F2] px-2 py-0.5 rounded-full">
                        Belum Dinilai
                      </span>
                    )}
                  </div>

                  {detail.rating ? (
                    <div className="p-3 bg-[#F7FAF8] rounded-xl border border-[#E4ECE7] space-y-1.5 text-xs">
                      <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`w-3.5 h-3.5 ${
                              s <= detail.rating.score
                                ? 'fill-amber-400 text-amber-400'
                                : 'text-[#D7E2DB]'
                            }`}
                          />
                        ))}
                        <span className="text-[11px] text-[#66736B] ml-2">
                          {formatDateTime(detail.rating.createdAt)}
                        </span>
                      </div>
                      {detail.rating.comment && (
                        <p className="text-xs text-[#17211B] italic">
                          "{detail.rating.comment}"
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="p-3 bg-[#F7FAF8] rounded-xl border border-[#E4ECE7] text-center space-y-2">
                      <p className="text-xs text-[#66736B]">
                        {role === 'CUSTOMER'
                          ? 'Bagikan pengalaman Anda untuk membantu meningkatkan kualitas layanan Mitra KAWAI 0511.'
                          : 'Bagikan penilaian Anda terhadap pelanggan penumpang ini.'}
                      </p>
                      {detail.status === 'COMPLETED' && (
                        <button
                          onClick={() => setIsRatingModalOpen(true)}
                          className="w-full py-2.5 bg-[#E1192E] hover:bg-[#C81023] active:bg-[#B91223] text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <Star className="w-3.5 h-3.5 fill-white" />
                          <span>
                            {role === 'CUSTOMER'
                              ? 'BERI PENILAIAN MITRA DRIVER'
                              : 'BERI PENILAIAN PENUMPANG'}
                          </span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* 7. TIMESTAMPS AUDIT TRAIL */}
                <div className="bg-[#F7FAF8] rounded-2xl p-4 border border-[#E4ECE7] space-y-2">
                  <h4 className="text-xs font-bold text-[#17211B] flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-[#66736B]" />
                    <span>Catatan Waktu Lifecycle Perjalanan</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-[#66736B] pt-1">
                    <div>
                      <span className="block text-[10px] text-[#A8B2AC]">Waktu Dipesan:</span>
                      <strong className="text-[#17211B] font-mono">
                        {formatDateTime(detail.timestamps?.createdAt || detail.createdAt)}
                      </strong>
                    </div>
                    {detail.timestamps?.assignedAt && (
                      <div>
                        <span className="block text-[10px] text-[#A8B2AC]">Driver Ditugaskan:</span>
                        <strong className="text-[#17211B] font-mono">
                          {formatDateTime(detail.timestamps.assignedAt)}
                        </strong>
                      </div>
                    )}
                    {detail.timestamps?.arrivedAt && (
                      <div>
                        <span className="block text-[10px] text-[#A8B2AC]">Driver Tiba:</span>
                        <strong className="text-[#17211B] font-mono">
                          {formatDateTime(detail.timestamps.arrivedAt)}
                        </strong>
                      </div>
                    )}
                    {detail.timestamps?.completedAt && (
                      <div>
                        <span className="block text-[10px] text-[#A8B2AC]">Selesai Antar:</span>
                        <strong className="text-[#17211B] font-mono">
                          {formatDateTime(detail.timestamps.completedAt)}
                        </strong>
                      </div>
                    )}
                    {detail.timestamps?.cancelledAt && (
                      <div>
                        <span className="block text-[10px] text-[#A8B2AC]">Dibatalkan Pada:</span>
                        <strong className="text-rose-600 font-mono">
                          {formatDateTime(detail.timestamps.cancelledAt)}
                        </strong>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* FOOTER */}
          <div className="p-4 bg-white border-t border-[#E4ECE7] flex items-center justify-between sticky bottom-0">
            <span className="text-[11px] text-[#66736B]">
              KAWAI 0511 Banjarmasin • Real API
            </span>
            <button
              onClick={onClose}
              className="px-5 py-2.5 bg-[#17211B] hover:bg-[#2A3B31] text-white text-xs font-bold rounded-xl transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>

      {/* NESTED RATING MODAL */}
      {detail && (
        <RatingModal
          isOpen={isRatingModalOpen}
          onClose={() => setIsRatingModalOpen(false)}
          rideId={detail.rideId || detail.id}
          driverName={detail.driver?.name}
          vehiclePlate={detail.driver?.vehiclePlate}
          passengerName={detail.passenger?.fullName}
          role={role === 'DRIVER' ? 'DRIVER' : 'CUSTOMER'}
          onSuccess={handleRatingSuccess}
        />
      )}
    </>
  );
};
