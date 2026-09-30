import React from 'react';
import { ServiceType } from '../types';
import { Wallet, Smartphone, Monitor, Car, UserCheck, Shield } from 'lucide-react';

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
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('ride');
          }}
          className="text-xl sm:text-2xl font-black tracking-tight text-red-600 hover:text-red-700 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
        >
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-red-600 text-white font-black text-sm shadow-sm">
            K
          </span>
          <span className="font-extrabold text-slate-900">
            Kawai<span className="text-red-600">0511</span>
          </span>
        </a>

        {/* Zone 2: 4-6 clean text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
          <button
            type="button"
            onClick={() => onSelectTab('ride')}
            className={`hover:text-red-600 transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'ride' ? 'text-red-600 border-red-600 font-semibold' : 'border-transparent'
            }`}
          >
            Transport
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('delivery')}
            className={`hover:text-red-600 transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'delivery' ? 'text-red-600 border-red-600 font-semibold' : 'border-transparent'
            }`}
          >
            Kurir Kilat
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('food')}
            className={`hover:text-red-600 transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'food' ? 'text-red-600 border-red-600 font-semibold' : 'border-transparent'
            }`}
          >
            Kawai Food
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('mart')}
            className={`hover:text-red-600 transition-colors whitespace-nowrap pb-1 border-b-2 ${
              activeTab === 'mart' ? 'text-red-600 border-red-600 font-semibold' : 'border-transparent'
            }`}
          >
            Titip Belanja
          </button>
          <button
            type="button"
            onClick={() => onSelectTab('orders')}
            className={`hover:text-red-600 transition-colors whitespace-nowrap pb-1 border-b-2 relative ${
              activeTab === 'orders' ? 'text-red-600 border-red-600 font-semibold' : 'border-transparent'
            }`}
          >
            Aktivitas
            {activeOrderCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-red-600 text-white rounded-full font-bold">
                {activeOrderCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => onOpenPromo()}
            className="hover:text-red-600 transition-colors whitespace-nowrap pb-1 border-b-2 border-transparent text-amber-600 font-semibold"
          >
            Promo Banua
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* KawaiPay Wallet Action */}
          <button
            type="button"
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-900 border border-sky-200 transition-colors text-xs font-semibold whitespace-nowrap"
            title="Buka Dompet KawaiPay"
          >
            <Wallet className="w-3.5 h-3.5 text-sky-600" />
            <span className="hidden sm:inline text-slate-500 font-normal">KawaiPay:</span>
            <span className="font-bold text-sky-700 font-mono tabular-nums">
              Rp {walletBalance.toLocaleString('id-ID')}
            </span>
          </button>

          {/* Toggle Driver Mode */}
          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'driver_mode' ? 'ride' : 'driver_mode')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'driver_mode'
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
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
            className="hidden lg:flex items-center justify-center w-8 h-8 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
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
