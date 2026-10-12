import React, { useState } from 'react';
import {
  Star,
  CheckCircle2,
  X,
  MessageSquare,
  Sparkles,
  Heart,
  ShieldCheck,
  AlertCircle,
  Banknote,
  Send,
} from 'lucide-react';

interface RatingModalProps {
  rideId: string;
  driverName?: string;
  vehiclePlate?: string;
  passengerName?: string;
  role?: 'CUSTOMER' | 'DRIVER';
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (rating: any) => void;
}

const RATING_TAGS_PASSENGER = [
  'Ramah & Sopan',
  'Tepat Waktu',
  'Helm Bersih & Wangi',
  'Berkendara Aman',
  'Rute Cepat Bebas Macet',
  'Komunikasi Jelas',
];

const RATING_TAGS_DRIVER = [
  'Penumpang Ramah',
  'Tepat Waktu di Titik Jemput',
  'Komunikasi Lancar',
  'Menjaga Kebersihan',
];

export const RatingModal: React.FC<RatingModalProps> = ({
  rideId,
  driverName = 'Ahmad Gazali',
  vehiclePlate = 'DA 5110 KAW',
  passengerName = 'Arief Laksono',
  role = 'CUSTOMER',
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [score, setScore] = useState<number>(5);
  const [hoverScore, setHoverScore] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [comment, setComment] = useState<string>('');
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const availableTags = role === 'CUSTOMER' ? RATING_TAGS_PASSENGER : RATING_TAGS_DRIVER;

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags((prev) => prev.filter((t) => t !== tag));
    } else {
      setSelectedTags((prev) => [...prev, tag]);
    }
  };

  const getScoreLabel = (s: number) => {
    switch (s) {
      case 1:
        return 'Sangat Kecewa (1.0)';
      case 2:
        return 'Kurang Memuaskan (2.0)';
      case 3:
        return 'Cukup Baik (3.0)';
      case 4:
        return 'Sangat Puas (4.0)';
      case 5:
        return 'Luar Biasa Memuaskan! (5.0)';
      default:
        return '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const combinedComment = [
      selectedTags.length > 0 ? selectedTags.join(', ') : '',
      comment.trim(),
    ]
      .filter(Boolean)
      .join(' — ');

    try {
      const res = await fetch(`/rides/${rideId}/rating`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rideId,
          score,
          comment: combinedComment || undefined,
          tipAmount: tipAmount > 0 ? tipAmount : undefined,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || 'Gagal mengirim penilaian');
      }

      const ratingResult = await res.json();
      setIsSuccess(true);
      if (onSuccess) onSuccess(ratingResult);

      setTimeout(() => {
        setIsSuccess(false);
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err.message || 'Terjadi kesalahan saat menyimpan rating');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
      <div className="bg-white border border-[#E4ECE7] rounded-3xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col font-sans text-[#17211B] my-auto">
        {/* HEADER */}
        <div className="p-4 bg-[#F7FAF8] border-b border-[#E4ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center">
              <Star className="w-4 h-4 fill-[#18B86A] text-[#18B86A]" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#17211B]">
                {role === 'CUSTOMER' ? 'Beri Rating Mitra Driver' : 'Beri Rating Penumpang'}
              </h3>
              <p className="text-[10px] text-[#66736B]">
                Order #{rideId ? rideId.slice(-6) : '0511'} • KAWAI 0511
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#66736B] hover:text-[#17211B] rounded-lg hover:bg-[#E4ECE7] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* CONTENT */}
        {isSuccess ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center mx-auto animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h4 className="text-base font-bold text-[#17211B]">Terima Kasih!</h4>
            <p className="text-xs text-[#66736B]">
              Ulasan & rating bintang {score}.0 berhasil disimpan ke sistem KAWAI 0511.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {/* TARGET INFO CARD */}
            <div className="p-3.5 bg-[#F7FAF8] rounded-2xl border border-[#E4ECE7] flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#D7E2DB] flex items-center justify-center font-bold text-sm text-[#0E8F52] shadow-2xs">
                {role === 'CUSTOMER' ? '🛵' : '👤'}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] uppercase font-semibold text-[#66736B] block">
                  {role === 'CUSTOMER' ? 'Mitra Driver Pengemudi' : 'Pelanggan Penumpang'}
                </span>
                <span className="text-sm font-bold text-[#17211B] truncate block">
                  {role === 'CUSTOMER' ? driverName : passengerName}
                </span>
                {role === 'CUSTOMER' && vehiclePlate && (
                  <span className="text-[10px] text-[#0E8F52] font-mono font-medium">
                    {vehiclePlate}
                  </span>
                )}
              </div>
            </div>

            {/* STAR RATING PICKER */}
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3, 4, 5].map((starIndex) => {
                  const active = (hoverScore || score) >= starIndex;
                  return (
                    <button
                      key={starIndex}
                      type="button"
                      onMouseEnter={() => setHoverScore(starIndex)}
                      onMouseLeave={() => setHoverScore(0)}
                      onClick={() => setScore(starIndex)}
                      className="p-1 transition-transform hover:scale-115 focus:outline-none cursor-pointer"
                    >
                      <Star
                        className={`w-8 h-8 transition-colors ${
                          active
                            ? 'fill-amber-400 text-amber-400 drop-shadow-xs'
                            : 'text-[#D7E2DB] fill-[#F0F5F2]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              <p className="text-xs font-semibold text-[#0E8F52] h-4">
                {getScoreLabel(hoverScore || score)}
              </p>
            </div>

            {/* QUICK TAGS */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-[#17211B] flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#18B86A]" />
                <span>Apa yang paling Anda apresiasi?</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {availableTags.map((tag) => {
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={`text-[11px] px-3 py-1.5 rounded-full border transition cursor-pointer font-medium ${
                        isSelected
                          ? 'bg-[#18B86A] text-white border-[#18B86A] shadow-2xs'
                          : 'bg-[#F7FAF8] text-[#66736B] border-[#E4ECE7] hover:border-[#18B86A]/40'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* COMMENT TEXTAREA */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-[#17211B] flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#66736B]" />
                <span>Tulis Ulasan (Opsional)</span>
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Ceritakan pengalaman perjalanan Anda..."
                rows={3}
                className="w-full p-3 bg-[#F7FAF8] border border-[#D7E2DB] rounded-2xl text-xs text-[#17211B] placeholder-[#A8B2AC] focus:outline-none focus:border-[#18B86A] focus:bg-white transition resize-none"
              />
            </div>

            {/* TIP SELECTION (CUSTOMER ONLY) */}
            {role === 'CUSTOMER' && (
              <div className="space-y-2 pt-1 border-t border-[#E4ECE7]">
                <label className="text-[11px] font-bold text-[#17211B] flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-[#18B86A]" />
                    <span>Beri Tip Tambahan untuk Mitra</span>
                  </span>
                  <span className="text-[10px] text-[#0E8F52] font-semibold">100% untuk Driver</span>
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[0, 2000, 5000, 10000].map((amount) => (
                    <button
                      key={amount}
                      type="button"
                      onClick={() => setTipAmount(amount)}
                      className={`py-2 text-xs font-semibold rounded-xl border transition cursor-pointer ${
                        tipAmount === amount
                          ? 'bg-[#DDF8EA] text-[#0E8F52] border-[#18B86A]'
                          : 'bg-[#F7FAF8] text-[#66736B] border-[#E4ECE7] hover:border-[#D7E2DB]'
                      }`}
                    >
                      {amount === 0 ? 'Tanpa Tip' : `Rp ${amount.toLocaleString('id-ID')}`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* SUBMIT BUTTON */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-[#F0F5F2] hover:bg-[#E4ECE7] text-[#66736B] font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Nanti Saja
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-2 py-3 bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold rounded-xl text-xs transition shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Mengirim...' : 'Kirim Penilaian'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
