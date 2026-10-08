import React from 'react';
import { ServiceType } from '../types';
import { Wallet, Smartphone, Monitor, Car, UserCheck, Shield } from 'lucide-react';
import { KAWAI_COLORS } from '../constants/theme';

interface KawaiHeaderProps {
  activeTab: ServiceType | 'orders' | 'driver_mode';
  onSelectTab: (tab: ServiceType | 'orders' | 'driver_mode') => void;
  walletBalance: number;
  onOpenWallet: () => void;
  onOpenPromo: () => void;
  isMobileFrame: boolean;
  onToggleFrame: () => void;
  activeOrderCount: number;
}

export const KawaiHeader: React.FC<KawaiHeaderProps> = ({
  activeTab,
  onSelectTab,
  walletBalance,
  onOpenWallet,
  onOpenPromo,
  isMobileFrame,
  onToggleFrame,
  activeOrderCount,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E4ECE7]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('ride');
          }}
          className="text-xl sm:text-2xl font-black tracking-tight text-[#17211B] hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 flex items-center gap-2"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-[#18B86A] text-white font-black text-sm shadow-xs">
            0511
          </span>
          <span className="font-extrabold text-[#17211B]">
            KAWAI <span className="text-[#18B86A]">0511</span>
          </span>
        </a>

        {/* Zone 2: clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#66736B]">
          <button
            type="button"
            onClick={() => onSelectTab('ride')}
            className={`hover:text-[#18B86A] transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'ride' ? 'text-[#18B86A] border-[#18B86A] font-semibold' : 'border-transparent'
            }`}
          >
            Transport
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('delivery')}
            className={`hover:text-[#18B86A] transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'delivery' ? 'text-[#18B86A] border-[#18B86A] font-semibold' : 'border-transparent'
            }`}
          >
            Kurir Kilat
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('food')}
            className={`hover:text-[#18B86A] transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'food' ? 'text-[#18B86A] border-[#18B86A] font-semibold' : 'border-transparent'
            }`}
          >
            Kawai Food
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('mart')}
            className={`hover:text-[#18B86A] transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'mart' ? 'text-[#18B86A] border-[#18B86A] font-semibold' : 'border-transparent'
            }`}
          >
            Titip Belanja
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('orders')}
            className={`hover:text-[#18B86A] transition-colors whitespace-nowrap pb-1 border-b-2 relative ${
              activeTab === 'orders' ? 'text-[#18B86A] border-[#18B86A] font-semibold' : 'border-transparent'
            }`}
          >
            Aktivitas
            {activeOrderCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-[#18B86A] text-white rounded-full font-bold">
                {activeOrderCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenPromo()}
            className="hover:text-[#18B86A] transition-colors whitespace-nowrap pb-1 border-b-2 border-transparent text-[#F5A623] font-semibold"
          >
            Promo Banua
          </button>
        </nav>

        {/* Zone 3: Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* KawaiPay Wallet Action */}
          <button
            type="button"
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#DDF8EA] hover:bg-[#cbf5de] text-[#0E8F52] border border-[#18B86A]/20 transition-colors text-xs font-semibold whitespace-nowrap"
            title="Buka Dompet KawaiPay"
          >
            <Wallet className="w-3.5 h-3.5 text-[#18B86A]" />
            <span className="hidden sm:inline text-[#66736B] font-normal">KawaiPay:</span>
            <span className="font-bold text-[#0E8F52] font-mono tabular-nums">
              Rp {walletBalance.toLocaleString('id-ID')}
            </span>
          </button>

          {/* Toggle Driver Mode */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'driver_mode' ? 'ride' : 'driver_mode')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'driver_mode'
                ? 'bg-[#18B86A] hover:bg-[#0E8F52] text-white shadow-xs'
                : 'bg-[#17211B] hover:bg-slate-800 text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {activeTab === 'driver_mode' ? 'Mode Driver (Aktif)' : 'Mode Driver'}
            </span>
            <span className="sm:hidden">
              {activeTab === 'driver_mode' ? 'Driver' : 'Mitra'}
            </span>
          </button>

          {/* Mobile Frame / Desktop View Toggle */}
          <button
            type="button"
            onClick={onToggleFrame}
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl border border-[#E4ECE7] text-[#66736B] hover:bg-[#F0F5F2] hover:text-[#17211B] transition-colors"
            title={isMobileFrame ? 'Tampilan Layar Penuh' : 'Tampilan Mode Smartphone (Mobile View)'}
            aria-label="Toggle device frame"
          >
            {isMobileFrame ? <Monitor className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
