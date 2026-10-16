import React from 'react';
import { ServiceType } from '../types';
import { Wallet, Smartphone, Monitor, Car } from 'lucide-react';

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
    <header className="sticky top-0 z-40 border-b border-[#E8ECF3] bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          type="button"
          onClick={() => onSelectTab('ride')}
          className="flex shrink-0 items-center gap-2 whitespace-nowrap text-xl font-black tracking-tight text-[#111827] transition-opacity hover:opacity-90"
        >
          <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-[#E31E24] text-sm font-black text-white shadow-sm">
            0511
          </span>
          <span className="font-extrabold">
            KAWAI <span className="text-[#11274A]">0511</span>
          </span>
        </button>

        <nav className="hidden items-center gap-6 text-sm font-medium text-[#5B6475] md:flex">
          {[
            ['ride', 'Transport'],
            ['delivery', 'Kurir Kilat'],
            ['food', 'Kawai Food'],
            ['mart', 'Titip Belanja'],
            ['orders', 'Aktivitas'],
          ].map(([tab, label]) => (
            <button
              key={tab}
              type="button"
              onClick={() => onSelectTab(tab as ServiceType | 'orders' | 'driver_mode')}
              className={`whitespace-nowrap border-b-2 pb-1 transition-colors ${
                activeTab === tab
                  ? 'border-[#E31E24] font-semibold text-[#E31E24]'
                  : 'border-transparent hover:text-[#11274A]'
              }`}
            >
              {label}
              {tab === 'orders' && activeOrderCount > 0 && (
                <span className="ml-1 rounded-full bg-[#E31E24] px-1.5 py-0.2 text-[10px] font-bold text-white">
                  {activeOrderCount}
                </span>
              )}
            </button>
          ))}

          <button
            type="button"
            onClick={onOpenPromo}
            className="border-b-2 border-transparent pb-1 font-semibold text-[#11274A] transition-colors hover:text-[#E31E24]"
          >
            Promo Banua
          </button>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={onOpenWallet}
            className="flex items-center gap-1.5 rounded-xl border border-[#E31E24]/20 bg-[#FEE5E6] px-3 py-1.5 text-xs font-semibold text-[#11274A] transition-colors hover:bg-[#FCD7D9]"
            title="Buka Dompet KawaiPay"
          >
            <Wallet className="h-3.5 w-3.5 text-[#E31E24]" />
            <span className="hidden text-[#5B6475] sm:inline">KawaiPay:</span>
            <span className="font-bold text-[#11274A] font-mono tabular-nums">
              Rp {walletBalance.toLocaleString('id-ID')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab(activeTab === 'driver_mode' ? 'ride' : 'driver_mode')}
            className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === 'driver_mode'
                ? 'bg-[#E31E24] text-white hover:bg-[#B0101A]'
                : 'bg-[#11274A] text-white hover:bg-[#0C1D36]'
            }`}
          >
            <Car className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">
              {activeTab === 'driver_mode' ? 'Mode Driver (Aktif)' : 'Mode Driver'}
            </span>
            <span className="sm:hidden">{activeTab === 'driver_mode' ? 'Driver' : 'Mitra'}</span>
          </button>

          <button
            type="button"
            onClick={onToggleFrame}
            className="hidden h-8 w-8 items-center justify-center rounded-xl border border-[#E8ECF3] text-[#5B6475] transition-colors hover:bg-[#F3F5F9] hover:text-[#11274A] lg:flex"
            aria-label="Toggle device frame"
            title={isMobileFrame ? 'Tampilan Layar Penuh' : 'Tampilan Mode Smartphone (Mobile View)'}
          >
            {isMobileFrame ? <Monitor className="h-4 w-4" /> : <Smartphone className="h-4 w-4" />}
          </button>
        </div>
      </div>
    </header>
  );
};
