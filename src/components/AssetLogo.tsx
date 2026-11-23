import React from 'react';
import { MainCategory } from '../types';

interface AssetLogoProps {
  asset?: {
    id?: string;
    symbol: string;
    name?: string;
    mainCategory?: MainCategory;
    iconType?: string;
  };
  symbol?: string;
  name?: string;
  category?: MainCategory;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const AssetLogo: React.FC<AssetLogoProps> = ({
  asset,
  symbol: propSymbol,
  name: propName,
  category: propCategory,
  size = 'md',
  className = '',
}) => {
  const symbolRaw = (asset?.symbol || propSymbol || '').toUpperCase();
  const cleanSymbol = symbolRaw.split('/')[0].trim();
  const name = asset?.name || propName || '';
  const category: string = asset?.mainCategory || propCategory || 'KRYPTO';

  const sizeStyles = {
    xs: 'w-5 h-5 text-[9px] rounded-md',
    sm: 'w-7 h-7 text-[10px] rounded-lg',
    md: 'w-9 h-9 text-[11px] rounded-xl',
    lg: 'w-12 h-12 text-[13px] rounded-2xl',
    xl: 'w-14 h-14 text-[15px] rounded-2xl',
  };

  const currentSizeStyle = sizeStyles[size] || sizeStyles.md;

  // Fail-closed SaaS branding: display descriptive tickers only until asset/logo rights are evidenced.
  // This prevents unverified company/crypto SVG reconstructions from being delivered to browsers.
  const renderLogoContent = () => {
    const getCategoryColors = () => {
      switch (category) {
        case 'KRYPTO':
          return {
            bg: 'bg-gradient-to-br from-amber-500/20 to-amber-600/10',
            border: 'border-amber-500/40',
            text: 'text-amber-300',
          };
        case 'AKTIEN':
          return {
            bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
            border: 'border-emerald-500/40',
            text: 'text-emerald-300',
          };
        case 'INDIZIES':
          return {
            bg: 'bg-gradient-to-br from-purple-500/20 to-purple-600/10',
            border: 'border-purple-500/40',
            text: 'text-purple-300',
          };
        case 'FOREX':
          return {
            bg: 'bg-gradient-to-br from-fuchsia-500/20 to-fuchsia-600/10',
            border: 'border-fuchsia-500/40',
            text: 'text-fuchsia-300',
          };
        case 'ROHSTOFFE':
          return {
            bg: 'bg-gradient-to-br from-yellow-500/20 to-amber-600/10',
            border: 'border-yellow-500/40',
            text: 'text-yellow-300',
          };
        default:
          return {
            bg: 'bg-slate-800',
            border: 'border-slate-700',
            text: 'text-white',
          };
      }
    };

    const colors = getCategoryColors();
    // Display clean full ticker up to 4 chars without truncating below 3
    const displayLabel = cleanSymbol ? (cleanSymbol.length <= 4 ? cleanSymbol : cleanSymbol.slice(0, 4)) : '—';

    return (
      <div
        className={`w-full h-full ${colors.bg} ${colors.border} ${colors.text} border flex items-center justify-center font-mono font-bold tracking-tight text-center`}
      >
        <span className="truncate px-0.5">{displayLabel}</span>
      </div>
    );
  };

  return (
    <div
      role="img"
      aria-label={name ? `${name} (${cleanSymbol || "ohne Symbol"})` : (cleanSymbol || "Unbekanntes Asset")}
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden font-mono shadow-sm select-none ${currentSizeStyle} ${className}`}
    >
      {renderLogoContent()}
    </div>
  );
};
