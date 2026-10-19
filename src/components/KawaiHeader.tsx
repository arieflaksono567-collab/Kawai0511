import React from 'react';
import { ServiceType } from '../types';
import { Wallet, Smartphone, Monitor, Car, UserCheck, Shield } from 'lucide-react';
import { KawaiLogo, KawaiBadge } from './KawaiLogo';
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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-[#E2E8F0]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Official Logo wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('ride');
          }}
          className="hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 flex items-center"
        >
          <KawaiLogo size="sm" showTagline={false} />
        </a>

        {/* Zone 2: clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-[#64748B]">
          <button
            type="button"
            onClick={() => onSelectTab('ride')}
            className={`hover:text-[#E1192E] transition-colors whitespace-nowrap pb-1 border-b-2 cursor-pointer ${
              activeTab === 'ride' ? 'text-[#E1192E] border-[#E1192E] font-bold' : 'border-transparent'
            }`}
          >
            Transport
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('delivery')}
            className={`hover:text-[#E1192E] transition-colors whitespace-nowrap pb-1 border-b-2 cursor-pointer ${
              activeTab === 'delivery' ? 'text-[#E1192E] border-[#E1192E] font-bold' : 'border-transparent'
            }`}
          >
            Kurir Kilat
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('food')}
            className={`hover:text-[#E1192E] transition-colors whitespace-nowrap pb-1 border-b-2 cursor-pointer ${
              activeTab === 'food' ? 'text-[#E1192E] border-[#E1192E] font-bold' : 'border-transparent'
            }`}
          >
            Kawai Food
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('mart')}
            className={`hover:text-[#E1192E] transition-colors whitespace-nowrap pb-1 border-b-2 cursor-pointer ${
              activeTab === 'mart' ? 'text-[#E1192E] border-[#E1192E] font-bold' : 'border-transparent'
            }`}
          >
            Titip Belanja
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('orders')}
            className={`hover:text-[#E1192E] transition-colors whitespace-nowrap pb-1 border-b-2 relative cursor-pointer ${
              activeTab === 'orders' ? 'text-[#E1192E] border-[#E1192E] font-bold' : 'border-transparent'
            }`}
          >
            Aktivitas
            {activeOrderCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-[#E1192E] text-white rounded-full font-bold">
                {activeOrderCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenPromo()}
            className="hover:text-[#E1192E] transition-colors whitespace-nowrap pb-1 border-b-2 border-transparent text-[#E1192E] font-bold cursor-pointer"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#FEE2E2] hover:bg-[#FCD2D2] text-[#E1192E] border border-[#E1192E]/20 transition-colors text-xs font-bold whitespace-nowrap cursor-pointer"
            title="Buka Dompet KawaiPay"
          >
            <Wallet className="w-3.5 h-3.5 text-[#E1192E]" />
            <span className="hidden sm:inline text-[#64748B] font-normal">KawaiPay:</span>
            <span className="font-bold text-[#E1192E] font-mono tabular-nums">
              Rp {walletBalance.toLocaleString('id-ID')}
            </span>
          </button>

          {/* Toggle Driver Mode */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'driver_mode' ? 'ride' : 'driver_mode')}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'driver_mode'
                ? 'bg-[#0F172A] hover:bg-black text-white shadow-xs'
                : 'bg-[#0F172A] hover:bg-black text-white'
            }`}
          >
            <Car className="w-3.5 h-3.5 text-[#E1192E]" />
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
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-xl border border-[#CBD5E1]/60 text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors cursor-pointer"
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
