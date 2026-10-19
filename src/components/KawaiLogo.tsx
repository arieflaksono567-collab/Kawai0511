import React from 'react';

interface KawaiLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
  inverted?: boolean;
}

export const KawaiBadge: React.FC<{ size?: number; className?: string }> = ({ size = 36, className = '' }) => {
  return (
    <div
      style={{ width: size, height: size }}
      className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl bg-[#E1192E] shadow-sm select-none ${className}`}
    >
      {/* Red circular badge with K and subtle mascot silhouette ears & cap */}
      <svg
        viewBox="0 0 100 100"
        className="w-[85%] h-[85%] drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Mascot Face & Cap (Bekantan character style) */}
        <circle cx="50" cy="50" r="44" fill="#E1192E" />
        {/* Face circle */}
        <circle cx="50" cy="54" r="30" fill="#FED7AA" />
        {/* Cheeks */}
        <circle cx="32" cy="58" r="7" fill="#FDBA74" opacity="0.6" />
        <circle cx="68" cy="58" r="7" fill="#FDBA74" opacity="0.6" />
        {/* Eyes */}
        <circle cx="38" cy="50" r="4.5" fill="#1E293B" />
        <circle cx="62" cy="50" r="4.5" fill="#1E293B" />
        <circle cx="36" cy="48" r="1.5" fill="#FFFFFF" />
        <circle cx="60" cy="48" r="1.5" fill="#FFFFFF" />
        {/* Cute Bekantan Nose */}
        <path
          d="M 45 52 Q 50 63 55 52"
          stroke="#EA580C"
          strokeWidth="3.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Smile */}
        <path
          d="M 44 65 Q 50 70 56 65"
          stroke="#C2410C"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
        {/* Red Cap with White K */}
        <path
          d="M 24 40 C 24 22, 76 22, 76 40 Z"
          fill="#DC2626"
        />
        <rect x="22" y="38" width="56" height="6" rx="3" fill="#B91C1C" />
        <text
          x="50"
          y="35"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="15"
          fontWeight="900"
          fontFamily="system-ui, sans-serif"
        >
          K
        </text>
      </svg>
    </div>
  );
};

export const KawaiLogo: React.FC<KawaiLogoProps> = ({
  size = 'md',
  showTagline = true,
  inverted = false,
}) => {
  const badgeSize = size === 'sm' ? 32 : size === 'lg' ? 44 : 38;
  const titleClass =
    size === 'sm'
      ? 'text-base font-black'
      : size === 'lg'
      ? 'text-2xl font-black'
      : 'text-lg font-black';

  return (
    <div className="flex items-center gap-2.5 select-none">
      <KawaiBadge size={badgeSize} />
      <div className="flex flex-col leading-tight">
        <div className={`tracking-tight flex items-center gap-1.5 ${titleClass}`}>
          <span className="text-[#E1192E]">KAWAI</span>
          <span className={inverted ? 'text-white' : 'text-[#0F172A]'}>0511</span>
        </div>
        {showTagline && (
          <span
            className={`text-[10px] font-medium tracking-normal ${
              inverted ? 'text-slate-300' : 'text-[#64748B]'
            }`}
          >
            Teman Bergerak Banjarmasin
          </span>
        )}
      </div>
    </div>
  );
};
