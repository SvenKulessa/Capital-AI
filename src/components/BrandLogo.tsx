import React from 'react';
const brandLogo = '/branding/capital-ai-logo.jpg';
const vendorLogo = '/branding/asset-pack/vendor/vendor-app-icon-512x512.png';

interface BrandLogoProps {
  variant?: 'emblem' | 'inline' | 'stacked' | 'banner' | 'vendor';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showSubtitle?: boolean;
  slogan?: string;
  className?: string;
  onClick?: () => void;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  variant = 'inline',
  size = 'md',
  showSubtitle = true,
  slogan = 'MARKET INTELLIGENCE',
  className = '',
  onClick,
}) => {
  // Existing owner-supplied vendor artwork: no wordmark, no added background.
  // Screen blending integrates its dark raster backdrop into the header surface.
  if (variant === 'vendor') {
    const dimensions = {
      sm: 'w-16 h-10', md: 'w-20 h-12', lg: 'w-24 h-14', xl: 'w-32 h-20',
    }[size];
    const image = <img src={vendorLogo} alt="Capital-AI — Globus in Blau und Gold"
      width={512} height={512} decoding="async"
      className={`${dimensions} object-cover object-center mix-blend-screen`} />;
    const classes = `inline-flex shrink-0 items-center justify-center select-none ${className}`;
    return onClick ? (
      <button type="button" onClick={onClick} aria-label="Capital-AI – zum Seitenanfang"
        className={`${classes} min-h-11 min-w-11 cursor-pointer rounded-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400`}>
        {image}
      </button>
    ) : <div className={classes}>{image}</div>;
  }

  // Sizing configurations
  const emblemSizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-16 h-16',
    xl: 'w-24 h-24',
  }[size];

  const titleSizeClasses = {
    sm: 'text-base',
    md: 'text-[20px]',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }[size];

  const subtitleSizeClasses = {
    sm: 'text-[7.5px] tracking-[0.22em]',
    md: 'text-[8.5px] tracking-[0.24em]',
    lg: 'text-[10px] tracking-[0.26em]',
    xl: 'text-xs tracking-[0.28em]',
  }[size];

  // Use the globe portion of the original artwork at compact sizes.
  const emblem = (
    <span className={`${emblemSizeClasses} relative overflow-hidden shrink-0 rounded-md bg-[#020b14]`}>
      <img src={brandLogo} alt="Capital-AI — Globus in Blau und Gold" width={1536} height={864}
        decoding="async" className="absolute max-w-none w-[180%] h-[101.25%] left-[-40%] top-0 object-cover object-top" />
    </span>
  );
  const imageClasses = variant === 'banner'
    ? { sm: 'w-48', md: 'w-64', lg: 'w-80', xl: 'w-96' }[size]
    : { sm: 'w-24', md: 'w-32', lg: 'w-48', xl: 'w-64' }[size];

  if (variant !== 'inline') {
    const content = variant === 'emblem' ? emblem : (
      <>
        <img src={brandLogo}
          alt="Capital-AI.online — Data, Insights, Markets, Opportunities"
          width={1536}
          height={864}
          decoding="async" className={`${imageClasses} max-w-full h-auto object-contain rounded-lg`} />
        {showSubtitle && slogan !== 'MARKET INTELLIGENCE' && (
          <span className={`${subtitleSizeClasses} mt-2 text-slate-400 uppercase`}>{slogan}</span>
        )}
      </>
    );
    const classes = `inline-flex max-w-full flex-col items-center justify-center select-none ${className}`;
    return onClick ? (
      <button type="button" onClick={onClick} aria-label="Capital-AI"
        className={`${classes} cursor-pointer focus-visible:outline-2 focus-visible:outline-amber-400`}>
        {content}
      </button>
    ) : <div className={classes}>{content}</div>;
  }

  // Inline header / row variant
  return (
    <div
      className={`flex items-center space-x-3 cursor-pointer select-none group ${className}`}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? 'Capital-AI' : undefined}
      onKeyDown={onClick ? (event) => {
        if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onClick(); }
      } : undefined}
    >
      {emblem}

      {/* Brand Wordmark & Subtitle */}
      <div className="flex flex-col">
        <div className="flex items-center gap-0.5">
          <span
            className={`${titleSizeClasses} font-black tracking-tight leading-none text-white group-hover:text-slate-100 transition-colors drop-shadow-[0_1px_3px_rgba(0,0,0,0.6)]`}
          >
            Capital
          </span>
          <span
            className={`${titleSizeClasses} font-black tracking-tight leading-none text-transparent bg-clip-text bg-[linear-gradient(90deg,#FFD54F_0%,#F9BF21_50%,#FFA000_100%)] group-hover:brightness-115 transition-all drop-shadow-[0_0_10px_rgba(249,191,33,0.3)]`}
          >
            -AI
          </span>
        </div>

        {/* Professional FinTech Subtitle with Live Telemetry Pulse Pip */}
        {showSubtitle && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
            <span
              className={`${subtitleSizeClasses} font-semibold uppercase truncate text-slate-400 group-hover:text-slate-300 transition-colors`}
            >
              {slogan}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
