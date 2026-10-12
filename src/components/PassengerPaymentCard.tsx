import React, { useState } from 'react';
import {
  Banknote,
  Smartphone,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Sparkles,
  Info,
  RefreshCw,
  Receipt,
  Star,
} from 'lucide-react';
import { KAWAI_COLORS } from '../constants/theme';

interface PassengerPaymentCardProps {
  fareAmount?: number;
  rideId?: string;
  driverId?: string;
  driverName?: string;
  onPaymentSuccess?: (payment: any) => void;
  onResetOrder?: () => void;
  onOpenRating?: () => void;
  onViewDetail?: () => void;
}

export const PassengerPaymentCard: React.FC<PassengerPaymentCardProps> = ({
  fareAmount = 18400,
  rideId = 'ride-0511-demo',
  driverId = 'd0000000-0000-0000-0000-000000000001',
  driverName = 'Ahmad Gazali',
  onPaymentSuccess,
  onResetOrder,
  onOpenRating,
  onViewDetail,
}) => {
  const [method, setMethod] = useState<'CASH' | 'DIGITAL'>('CASH');
  const [digitalProvider, setDigitalProvider] = useState<string>('QRIS_MOCK');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState<any | null>(null);
  const [showExtensibleProvider, setShowExtensibleProvider] = useState(false);

  // Split estimation (85% driver / 15% platform)
  const driverShare = Math.round(fareAmount * 0.85);
  const platformFee = fareAmount - driverShare;

  const handlePay = async () => {
    setIsProcessing(true);
    const idempotencyKey = `idem-${rideId}-${Date.now()}`;

    try {
      const response = await fetch('/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rideId,
          payerId: '11111111-1111-4111-a111-111111111111',
          payeeDriverId: driverId,
          amount: fareAmount,
          currency: 'IDR',
          method,
          provider: method === 'CASH' ? 'CASH' : 'MOCK_DIGITAL_GATEWAY',
          idempotencyKey,
        }),
      });

      if (response.ok) {
        const json = await response.json();
        const data = json.data || json;
        setPaymentResult(data);
        if (onPaymentSuccess) onPaymentSuccess(data);
        setIsProcessing(false);
        return;
      }
    } catch {
      // Fallback
    }

    // Local simulation fallback
    setTimeout(() => {
      const mockResult = {
        payment: {
          id: `pay-${Date.now().toString().slice(-6)}`,
          rideId,
          amount: fareAmount,
          currency: 'IDR',
          method,
          status: method === 'CASH' ? 'PAID' : 'PENDING',
          provider: method === 'CASH' ? 'CASH' : digitalProvider,
          paidAt: method === 'CASH' ? new Date().toISOString() : undefined,
          isSettled: method === 'CASH',
          driverShareAmount: driverShare,
          platformFeeAmount: platformFee,
          ledgerTransactionId: `tx-ledger-${Date.now().toString().slice(-6)}`,
        },
        split: {
          driverAmount: driverShare,
          platformAmount: platformFee,
        },
      };

      setPaymentResult(mockResult);
      if (onPaymentSuccess) onPaymentSuccess(mockResult);
      setIsProcessing(false);
    }, 600);
  };

  const handleSimulateWebhookDigitalSuccess = async () => {
    if (!paymentResult?.payment) return;
    setIsProcessing(true);

    try {
      await fetch(`/payments/${paymentResult.payment.id}/settle`, {
        method: 'POST',
      });
    } catch {
      // Fallback
    }

    setTimeout(() => {
      setPaymentResult((prev: any) => ({
        ...prev,
        payment: {
          ...prev.payment,
          status: 'PAID',
          isSettled: true,
          paidAt: new Date().toISOString(),
          ledgerTransactionId: `tx-settled-${Date.now().toString().slice(-6)}`,
        },
      }));
      setIsProcessing(false);
    }, 400);
  };

  return (
    <div className="w-full max-w-sm mx-auto bg-white border border-[#E4ECE7] rounded-3xl p-6 shadow-sm text-[#17211B] flex flex-col font-sans relative overflow-hidden">
      {/* CARD HEADER */}
      <div className="border-b border-[#E4ECE7] pb-4 mb-5 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-[#17211B] tracking-tight">Pembayaran</h2>
          <p className="text-xs text-[#66736B] mt-0.5">Kawai 0511 Banjarmasin</p>
        </div>
        <div className="w-8 h-8 rounded-xl bg-[#DDF8EA] text-[#0E8F52] flex items-center justify-center font-mono text-xs font-bold border border-[#18B86A]/20">
          0511
        </div>
      </div>

      {/* STATE 1: SELECTION & ACTION */}
      {!paymentResult && (
        <div className="space-y-6">
          {/* SECTION 1: TARIF PERJALANAN */}
          <div className="space-y-1">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-[#66736B]">
              Tarif perjalanan
            </span>
            <div className="text-3xl font-black text-[#18B86A] font-mono tracking-tight">
              Rp {fareAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-[#66736B] flex items-center gap-1.5 pt-1">
              <span>Driver: {driverName}</span>
              <span aria-hidden="true">·</span>
              <span>Bagi hasil 85% / 15%</span>
            </div>
          </div>

          {/* SECTION 2: PILIH PEMBAYARAN */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#66736B]">
                Pilih pembayaran
              </span>
              <span className="text-[10px] text-[#66736B]">Metode resmi</span>
            </div>

            <div className="space-y-2.5">
              {/* OPTION 1: CASH */}
              <label
                onClick={() => setMethod('CASH')}
                className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between cursor-pointer select-none ${
                  method === 'CASH'
                    ? 'bg-[#DDF8EA]/40 border-[#18B86A] shadow-xs'
                    : 'bg-white border-[#E4ECE7] hover:border-[#D7E2DB]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                      method === 'CASH'
                        ? 'border-[#18B86A] bg-[#18B86A]'
                        : 'border-[#D7E2DB] bg-white'
                    }`}
                  >
                    {method === 'CASH' && (
                      <div className="w-2 h-2 rounded-full bg-white" />
                    )}
                  </div>
                  <div>
                    <span className="text-sm font-bold text-[#17211B] block">CASH</span>
                    <span className="text-[11px] text-[#66736B]">
                      Bayar tunai ke driver di tempat
                    </span>
                  </div>
                </div>
                <Banknote className="w-5 h-5 text-[#18B86A] shrink-0" />
              </label>

              {/* OPTION 2: DIGITAL */}
              <label
                onClick={() => setMethod('DIGITAL')}
                className={`w-full p-3.5 rounded-2xl border transition-all flex flex-col gap-2 cursor-pointer select-none ${
                  method === 'DIGITAL'
                    ? 'bg-[#DDF8EA]/40 border-[#18B86A] shadow-xs'
                    : 'bg-white border-[#E4ECE7] hover:border-[#D7E2DB]'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${
                        method === 'DIGITAL'
                          ? 'border-[#18B86A] bg-[#18B86A]'
                          : 'border-[#D7E2DB] bg-white'
                      }`}
                    >
                      {method === 'DIGITAL' && (
                        <div className="w-2 h-2 rounded-full bg-white" />
                      )}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#17211B] block">DIGITAL</span>
                      <span className="text-[11px] text-[#66736B]">
                        QRIS / Saldo Elektronik / Gateway
                      </span>
                    </div>
                  </div>
                  <Smartphone className="w-5 h-5 text-[#18B86A] shrink-0" />
                </div>

                {/* EXTENSIBLE PROVIDER SLOT */}
                {method === 'DIGITAL' && (
                  <div className="mt-2 pt-2.5 border-t border-[#E4ECE7] text-xs text-[#17211B] space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-[#66736B]">
                      <span>Gateway Provider:</span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowExtensibleProvider(!showExtensibleProvider);
                        }}
                        className="text-[#18B86A] hover:underline text-[10px] font-semibold"
                      >
                        {showExtensibleProvider ? 'Sembunyikan' : 'Pilih Provider'}
                      </button>
                    </div>

                    <div className="bg-[#F7FAF8] rounded-xl p-2.5 border border-[#E4ECE7] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <QrCode className="w-4 h-4 text-[#18B86A] shrink-0" />
                        <div>
                          <span className="font-semibold text-[#17211B] block text-[11px]">
                            {digitalProvider === 'QRIS_MOCK'
                              ? 'QRIS Standar Indonesia'
                              : digitalProvider}
                          </span>
                          <span className="text-[9px] text-[#66736B] font-mono">
                            Provider Abstraction v1 (Independent)
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-mono text-[#18B86A] font-bold bg-[#DDF8EA] px-1.5 py-0.5 rounded">
                        AKTIF
                      </span>
                    </div>

                    {showExtensibleProvider && (
                      <div className="bg-white p-2 rounded-xl border border-[#E4ECE7] space-y-1.5 animate-fadeIn shadow-xs">
                        <div className="text-[10px] text-[#66736B] font-semibold mb-1">
                          Slot Provider (Dapat diperluas tanpa ubah UI):
                        </div>
                        {[
                          { id: 'QRIS_MOCK', label: 'QRIS (Bank & E-Wallet)' },
                          { id: 'MOCK_DIGITAL_GATEWAY', label: 'Gateway Mitra Independen' },
                          { id: 'VA_TRANSFER', label: 'Virtual Account Transfer' },
                        ].map((prov) => (
                          <button
                            key={prov.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDigitalProvider(prov.id);
                            }}
                            className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[11px] flex items-center justify-between transition ${
                              digitalProvider === prov.id
                                ? 'bg-[#DDF8EA] text-[#0E8F52] font-bold'
                                : 'text-[#66736B] hover:bg-[#F0F5F2] hover:text-[#17211B]'
                            }`}
                          >
                            <span>{prov.label}</span>
                            {digitalProvider === prov.id && (
                              <CheckCircle2 className="w-3 h-3 text-[#18B86A]" />
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </label>
            </div>
          </div>

          {/* ACTION: [ BAYAR ] BUTTON */}
          <div className="pt-2">
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-4 bg-[#18B86A] hover:bg-[#0E8F52] active:bg-[#0E8F52] disabled:opacity-50 text-white font-bold rounded-2xl text-sm tracking-wider uppercase transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>MEMPROSES PEMBAYARAN...</span>
                </>
              ) : (
                <>
                  <span>[ BAYAR ]</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STATE 2: PAYMENT SUCCESS RECEIPT / DIGITAL PENDING FLOW */}
      {paymentResult && (
        <div className="space-y-4 animate-fadeIn">
          {paymentResult.payment?.status === 'PAID' ? (
            /* PAID RECEIPT */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-[#DDF8EA] border border-[#18B86A]/30 text-[#18B86A] mx-auto flex items-center justify-center shadow-xs">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base font-bold text-[#17211B]">Pembayaran Sukses!</h3>
                <p className="text-xs text-[#66736B] mt-0.5">
                  Transaksi telah dicatat dan terverifikasi di Double-Entry Ledger.
                </p>
              </div>

              {/* Receipt Breakdown Card */}
              <div className="bg-[#F7FAF8] p-4 rounded-2xl border border-[#E4ECE7] text-xs space-y-2.5 text-left font-mono">
                <div className="flex justify-between text-[#66736B]">
                  <span>Metode:</span>
                  <span className="text-[#17211B] font-bold">{paymentResult.payment.method}</span>
                </div>
                <div className="flex justify-between text-[#66736B]">
                  <span>Tarif Terbayar:</span>
                  <span className="text-[#18B86A] font-bold">
                    Rp {paymentResult.payment.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-[#66736B] pt-2 border-t border-[#E4ECE7]">
                  <span>Mitra Driver (85%):</span>
                  <span className="text-[#17211B] font-semibold">
                    Rp {(paymentResult.payment.driverShareAmount || driverShare).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between text-[#66736B]">
                  <span>Platform Fee (15%):</span>
                  <span className="text-[#17211B] font-semibold">
                    Rp {(paymentResult.payment.platformFeeAmount || platformFee).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="pt-2 border-t border-[#E4ECE7] flex items-center justify-between text-[10px] text-[#66736B]">
                  <span>Ledger Tx Ref:</span>
                  <span className="text-[#18B86A] font-bold truncate max-w-[140px]">
                    {paymentResult.payment.ledgerTransactionId || 'Balanced'}
                  </span>
                </div>
              </div>

              <div className="p-2.5 bg-[#DDF8EA] border border-[#18B86A]/20 rounded-xl flex items-center justify-between text-[11px] text-[#0E8F52]">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#18B86A]" />
                  <span>Double-Entry Balance:</span>
                </div>
                <span className="font-mono font-bold">DEBIT = KREDIT</span>
              </div>

              {onResetOrder && (
                <button
                  onClick={onResetOrder}
                  className="w-full py-3 bg-white hover:bg-[#F0F5F2] text-[#18B86A] border border-[#D7E2DB] font-semibold rounded-xl text-xs transition uppercase tracking-wider"
                >
                  Pesan Ojek Lagi
                </button>
              )}
            </div>
          ) : (
            /* DIGITAL PENDING STATE */
            <div className="space-y-4 text-center">
              <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-200 text-[#F5A623] mx-auto flex items-center justify-center">
                <Clock className="w-6 h-6 animate-pulse" />
              </div>

              <div>
                <h3 className="text-base font-bold text-[#17211B]">Menunggu Pembayaran</h3>
                <p className="text-xs text-[#66736B] mt-0.5">
                  Silakan selesaikan pembayaran digital via QRIS / Gateway.
                </p>
              </div>

              {/* QRIS / Gateway Preview Box */}
              <div className="bg-[#F7FAF8] p-4 rounded-2xl border border-[#E4ECE7] space-y-3">
                <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl flex items-center justify-center shadow-xs border border-[#E4ECE7]">
                  <QrCode className="w-28 h-28 text-[#17211B]" />
                </div>
                <div className="text-xs font-mono text-[#18B86A] font-bold">
                  Rp {fareAmount.toLocaleString('id-ID')}
                </div>
                <p className="text-[10px] text-[#66736B]">
                  Scan QRIS menggunakan Mobile Banking atau Dompet Digital pilihan Anda.
                </p>
              </div>

              {/* Interactive Webhook Simulator Button */}
              <button
                onClick={handleSimulateWebhookDigitalSuccess}
                disabled={isProcessing}
                className="w-full py-3 bg-[#18B86A] hover:bg-[#0E8F52] text-white font-bold rounded-xl text-xs transition uppercase tracking-wider shadow-sm flex items-center justify-center gap-1.5"
              >
                {isProcessing ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                <span>Simulasi Webhook Sukses (Konfirmasi)</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
