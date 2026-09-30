import React, { useState } from 'react';
import { PROMO_VOUCHERS } from '../data/mockData';
import { Tag, Copy, Check, X, Sparkles } from 'lucide-react';

interface PromoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyCode: (code: string) => void;
}

export const PromoModal: React.FC<PromoModalProps> = ({
  isOpen,
  onClose,
  onApplyCode,
}) => {
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCopy = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => {
      setCopiedCode(null);
      onApplyCode(code);
      onClose();
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-red-600 to-rose-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h3 className="font-bold text-sm">Voucher Promo Kawai 0511</h3>
              <p className="text-[10px] text-white/80">Spesial warga Banjarmasin & sekitarnya</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Voucher List */}
        <div className="p-4 space-y-3 overflow-y-auto">
          {PROMO_VOUCHERS.map((voucher) => (
            <div
              key={voucher.code}
              className="p-3.5 rounded-xl border border-dashed border-red-300 bg-red-50/40 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono font-bold text-xs bg-red-600 text-white px-2 py-0.5 rounded">
                      {voucher.code}
                    </span>
                    <span className="text-[11px] text-slate-400 font-normal">· {voucher.expires}</span>
                  </div>
                  <h4 className="font-bold text-xs text-slate-900">{voucher.title}</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">{voucher.desc}</p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    Min. Transaksi Rp {voucher.minSpend.toLocaleString('id-ID')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(voucher.code)}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-sm transition-colors"
                >
                  {copiedCode === voucher.code ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Dipakai!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Gunakan</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
