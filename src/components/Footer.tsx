import React from 'react';
import { useLocale } from '../i18n/LocaleProvider';
import { BrandLogo } from './BrandLogo';
import { ExternalLink } from 'lucide-react';
import { socialLinks } from '../data/socialLinks';
import { trackEvent } from '../utils/analytics';

const socialIconPath = (id: (typeof socialLinks)[number]['id']) => `/branding/social/${id}.svg`;

interface FooterProps {
  onNavigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t } = useLocale();
  const handleNavClick = (e: React.MouseEvent, path: string, label: string) => {
    if (onNavigate) e.preventDefault();
    trackEvent('footer_nav_click', {
      category: 'navigation',
      label,
      destination: path,
    });
    if (onNavigate) {
      onNavigate(path);
    }
  };

  return (
    <footer className="mt-8 px-5 pb-8 pt-4 text-center">
      {/* Thin elegant separator with golden center glow */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mb-6" />

      {/* Central brand artwork */}
      <div className="flex justify-center mb-4">
        <BrandLogo variant="banner" size="lg" showSubtitle={false} />
      </div>

      {/* Professional FinTech Slogan */}
      <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] text-slate-400 uppercase select-none">
        MARKET INTELLIGENCE • NEXT-GEN QUANT TERMINAL
      </p>

      <nav aria-label="Capital-AI Community" className="mt-5 flex flex-wrap justify-center gap-3">
        {socialLinks.map((link) => (
          <a key={link.id} href={link.href} target="_blank" rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-500/20 bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-300 transition-colors hover:border-amber-400/60 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-400"
            aria-label={`${link.label} – ${t('external')}`}>
            <span className="flex h-5 w-5 items-center justify-center rounded bg-white p-0.5" aria-hidden="true">
              <img src={socialIconPath(link.id)} alt="" className="h-4 w-4 object-contain" />
            </span>
            <span>{link.label}</span>
            <ExternalLink size={12} className="text-amber-400/70" aria-hidden="true" />
          </a>
        ))}
      </nav>
      <nav aria-label="Öffentliche Lernbeiträge" className="mt-4"><a href="/blog" onClick={e => handleNavClick(e, '/blog', 'blog')} className="inline-flex min-h-11 items-center text-base text-amber-200 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-brand-gold">Blog · Wissen &amp; Lernen</a></nav>
      {/* Consolidated legal and documentation navigation */}
      <div className="mt-3 text-[11px] text-slate-400 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        <span>© {new Date().getFullYear()} Capital-AI</span>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-impressum"
          href="/impressum"
          onClick={(e) => handleNavClick(e, '/impressum', 'impressum')}
          className="hover:text-amber-400 transition-colors cursor-pointer text-slate-400 font-medium hover:underline underline-offset-4"
          data-analytics="footer-impressum"
        >
          {t('imprint')}
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-agb"
          href="/agb"
          onClick={(e) => handleNavClick(e, '/agb', 'agb')}
          className="hover:text-pink-400 transition-colors cursor-pointer text-slate-400 font-medium hover:underline underline-offset-4"
          data-analytics="footer-agb"
        >
          {t('terms')}
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-datenschutz"
          href="/datenschutz"
          onClick={(e) => handleNavClick(e, '/datenschutz', 'datenschutz')}
          className="hover:text-emerald-400 transition-colors cursor-pointer text-slate-400 font-medium hover:underline underline-offset-4"
          data-analytics="footer-datenschutz"
        >
          {t('privacy')}
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-faq"
          href="/faq"
          onClick={(e) => handleNavClick(e, '/faq', 'faq')}
          className="hover:text-amber-400 transition-colors cursor-pointer text-slate-400 font-medium hover:underline underline-offset-4 flex items-center gap-1"
          data-analytics="footer-faq"
        >
          FAQ
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-pricing"
          href="/pricing"
          onClick={(e) => handleNavClick(e, '/pricing', 'pricing')}
          className="hover:text-amber-300 transition-colors cursor-pointer text-amber-300 font-bold hover:underline underline-offset-4 flex items-center gap-1"
          data-analytics="footer-pricing"
        >
          {t('pricing')}
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-documentation"
          href="/dokumentation"
          onClick={(e) => handleNavClick(e, '/dokumentation', 'documentation')}
          className="hover:text-cyan-300 transition-colors cursor-pointer text-cyan-300 font-semibold hover:underline underline-offset-4"
          data-analytics="footer-documentation"
        >
          {t('docs')}
        </a>
      </div>


      {/* Mobile iOS Home Indicator Bar */}
      <div className="w-28 h-1 bg-white/40 rounded-full mx-auto mt-6" />
    </footer>
  );
};
