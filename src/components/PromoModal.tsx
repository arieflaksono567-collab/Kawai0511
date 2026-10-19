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
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[85vh] overflow-hidden shadow-xl flex flex-col border border-[#E2E8F0] text-[#0F172A]">
        <div className="p-4 bg-white border-b border-[#E2E8F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] text-[#E1192E] flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-[#E1192E]" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#0F172A]">Voucher Promo Kawai 0511</h3>
              <p className="text-[10px] text-[#64748B]">Spesial warga Banjarmasin & sekitarnya</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[#F1F5F9] flex items-center justify-center text-[#64748B] hover:text-[#0F172A] transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto">
          {PROMO_VOUCHERS.map((voucher) => (
            <div
              key={voucher.code}
              className="p-3.5 rounded-xl border border-dashed border-[#E1192E]/40 bg-[#FEE2E2]/20 relative overflow-hidden"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="font-mono font-bold text-xs bg-[#E1192E] text-white px-2 py-0.5 rounded-lg">
                      {voucher.code}
                    </span>
                    <span className="text-[11px] text-[#64748B] font-normal">· {voucher.expires}</span>
                  </div>
                  <h4 className="font-bold text-xs text-[#0F172A]">{voucher.title}</h4>
                  <p className="text-[11px] text-[#64748B] mt-0.5">{voucher.desc}</p>
                  <p className="text-[10px] text-[#94A3B8] mt-1">
                    Min. Transaksi Rp {voucher.minSpend.toLocaleString('id-ID')}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => handleCopy(voucher.code)}
                  className="px-3 py-1.5 rounded-xl bg-[#E1192E] hover:bg-[#C81023] text-white text-xs font-bold shrink-0 flex items-center gap-1 shadow-xs transition-colors cursor-pointer"
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
