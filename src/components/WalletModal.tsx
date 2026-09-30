import React, { useState } from 'react';
import { Wallet, Plus, ArrowUpRight, ArrowDownLeft, X, Check, QrCode } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-sm">Dompet KawaiPay 0511</h3>
              <p className="text-[10px] text-sky-300">Bayar praktis ojek, kurir, makanan & belanja</p>
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

        <div className="p-4 space-y-4 overflow-y-auto">
          {/* Current Balance Card */}
          <div className="bg-gradient-to-br from-sky-600 to-blue-700 text-white p-4 rounded-2xl shadow-md">
            <span className="text-[11px] text-sky-100 uppercase tracking-wider font-semibold">
              Saldo Aktif
            </span>
            <p className="text-2xl font-black font-mono mt-1">
              Rp {balance.toLocaleString('id-ID')}
            </p>
            <div className="mt-3 flex items-center justify-between text-[11px] text-sky-100 pt-2 border-t border-white/20">
              <span>Nomor Akun: 0812-5511-0987</span>
              <span className="bg-white/20 px-2 py-0.5 rounded font-semibold">Terverifikasi</span>
            </div>
          </div>

          {isSuccess ? (
            <div className="py-8 text-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <Check className="w-6 h-6" />
              </div>
              <h4 className="font-bold text-sm text-slate-900">Top-Up Berhasil!</h4>
              <p className="text-xs text-slate-500">
                Saldo +Rp {selectedTopUp.toLocaleString('id-ID')} telah ditambahkan ke KawaiPay kamu.
              </p>
            </div>
          ) : (
            <>
              {/* Presets */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Pilih Nominal Top-Up</label>
                <div className="grid grid-cols-2 gap-2">
                  {topUpPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setSelectedTopUp(amt)}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        selectedTopUp === amt
                          ? 'border-red-500 bg-red-50 text-red-600 font-bold ring-1 ring-red-500'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-white'
                      }`}
                    >
                      <span className="font-mono text-xs">Rp {amt.toLocaleString('id-ID')}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment Method */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-800">Metode Pengisian</label>
                <select
                  value={paymentChannel}
                  onChange={(e) => setPaymentChannel(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-200 bg-slate-50"
                >
                  <option value="QRIS Instant (Bebas Biaya)">QRIS Instant Seluruh Bank & e-Wallet</option>
                  <option value="BCA Virtual Account">BCA Virtual Account</option>
                  <option value="Mandiri Livin">Mandiri Livin Virtual Account</option>
                  <option value="BRImo">BRImo Virtual Account</option>
                  <option value="Bank Kalsel Mobile">Bank Kalsel Mobile (Lokal)</option>
                  <option value="Indomaret / Alfamart">Kasir Indomaret / Alfamart</option>
                </select>
              </div>

              {/* Confirm Top Up */}
              <button
                type="button"
                onClick={handleTopUpConfirm}
                className="w-full h-11 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors"
              >
                Isi Saldo Rp {selectedTopUp.toLocaleString('id-ID')}
              </button>
            </>
          )}

          {/* Recent Wallet History */}
          <div className="pt-2 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 mb-2">Riwayat Transaksi Terakhir</h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Top-Up QRIS</p>
                    <p className="text-[10px] text-slate-400">Kemarin, 14:20</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-emerald-600">+Rp 50.000</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-50">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <ArrowUpRight className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">Kawai Ride Duta Mall</p>
                    <p className="text-[10px] text-slate-400">2 hari lalu</p>
                  </div>
                </div>
                <span className="font-mono font-bold text-red-600">-Rp 12.000</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
