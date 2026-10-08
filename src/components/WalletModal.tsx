import React, { useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, X, Check, QrCode } from 'lucide-react';
import { KAWAI_COLORS } from '../constants/theme';

interface WalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  balance: number;
  onTopUp: (amount: number) => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({
  isOpen,
  onClose,
  balance,
  onTopUp,
}) => {
  const [selectedTopUp, setSelectedTopUp] = useState<number>(50000);
  const [paymentChannel, setPaymentChannel] = useState<string>('QRIS Instant (Bebas Biaya)');
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleTopUpConfirm = () => {
    onTopUp(selectedTopUp);
    setIsSuccess(true);
    setTimeout(() => {
      setIsSuccess(false);
      onClose();
    }, 1500);
  };

  const topUpPresets = [20000, 50000, 100000, 200000];

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col border border-[#E4ECE7] text-[#17211B]">
        {/* Header - Bright & Clean */}
        <div className="p-4 bg-white border-b border-[#E4ECE7] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center font-bold">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-[#17211B]">Dompet KawaiPay 0511</h3>
              <p className="text-[10px] text-[#66736B]">Bayar praktis ojek, kurir, makanan & belanja</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full hover:bg-[#F0F5F2] flex items-center justify-center text-[#66736B] hover:text-[#17211B] transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Balance Card - KAWAI Green */}
          <div className="bg-[#18B86A] text-white p-4 rounded-2xl shadow-xs">
            <span className="text-[11px] text-[#DDF8EA] uppercase tracking-wider font-semibold">
              Saldo Aktif
            </span>
            <p className="text-2xl font-black font-mono mt-1">
              Rp {balance.toLocaleString('id-ID')}
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-white/90 pt-2 border-t border-white/20">
              <span>Nomor Akun: 0812-5511-0987</span>
              <span className="bg-white/20 px-2 py-0.5 rounded font-semibold text-white">Terverifikasi</span>
            </div>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-[#17211B]">Top-Up Berhasil!</h4>
              <p className="text-xs text-[#66736B]">
                Saldo +Rp {selectedTopUp.toLocaleString('id-ID')} telah ditambahkan ke KawaiPay kamu.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17211B]">Pilih Nominal Top-Up</label>
                <div className="grid grid-cols-2 gap-2">
                  {topUpPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedTopUp(amt)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedTopUp === amt
                          ? 'border-[#18B86A] bg-[#DDF8EA] text-[#0E8F52] font-bold'
                          : 'border-[#D7E2DB] bg-[#F7FAF8] text-[#17211B] hover:bg-white'
                      }`}
                    >
                      <span className="font-mono text-xs">Rp {amt.toLocaleString('id-ID')}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-[#17211B]">Metode Pengisian</label>
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-[#D7E2DB] bg-[#F0F5F2] text-[#17211B] focus:outline-none focus:border-[#18B86A]"
                >
                  <option value="QRIS Instant (Bebas Biaya)">QRIS Instant Seluruh Bank & e-Wallet</option>
                  <option value="BCA Virtual Account">BCA Virtual Account</option>
                  <option value="Mandiri Livin">Mandiri Livin Virtual Account</option>
                  <option value="BRImo">BRImo Virtual Account</option>
                  <option value="Bank Kalsel Mobile">Bank Kalsel Mobile (Lokal)</option>
                  <option value="Indomaret / Alfamart">Kasir Indomaret / Alfamart</option>
                </select>
              </div>

              <button
                type="button"
                onClick={handleTopUpConfirm}
                className="w-full h-11 bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
              >
                Isi Saldo Rp {selectedTopUp.toLocaleString('id-ID')}
              </button>
            </>
          )}

          <div className="pt-2 border-t border-[#E4ECE7]">
            <h4 className="text-xs font-bold text-[#17211B] mb-2">Riwayat Transaksi Terakhir</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7FAF8] border border-[#E4ECE7]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#17211B]">Top-Up QRIS</p>
                    <p className="text-[10px] text-[#66736B]">Kemarin, 14:20</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-[#18B86A]">+Rp 50.000</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#F7FAF8] border border-[#E4ECE7]">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-rose-50 text-[#E5484D] flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#17211B]">Kawai Ride Duta Mall</p>
                    <p className="text-[10px] text-[#66736B]">2 hari lalu</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-[#E5484D]">-Rp 12.000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
