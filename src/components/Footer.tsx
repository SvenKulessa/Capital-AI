import React from 'react';
import { cookieSettingsLabel } from '../i18n/cookieSettingsLabel';
import { useLocale } from '../i18n/LocaleProvider';
import { BrandLogo } from './BrandLogo';
import { ExternalLink } from 'lucide-react';
import { socialLinks } from '../data/socialLinks';
import { trackEvent } from '../utils/analytics';
import { OPEN_COOKIE_PREFERENCES_EVENT } from '../privacy/cookieConsentEvents';

const socialIconPath = (id: (typeof socialLinks)[number]['id']) => `/branding/social/${id}.svg`;

interface FooterProps {
  onNavigate?: (path: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  const { t, locale } = useLocale();
  const handleNavClick = (e: React.MouseEvent, path: string, label: string) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
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
    <footer className="mx-auto mt-8 max-w-6xl border-t border-slate-800 px-4 pb-8 pt-8 text-center sm:px-6">
      {/* Thin elegant separator with golden center glow */}
      <div className="w-full h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent mb-6" />

      {/* Central brand artwork */}
      <div className="flex justify-center mb-4">
        <BrandLogo variant="banner" size="lg" showSubtitle={false} />
      </div>

      {/* Professional FinTech Slogan */}
      <p className="text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] text-slate-400 uppercase select-none">
        {locale === 'de' ? 'Finanzwissen und Werkzeuge zur Marktanalyse' : 'Financial education and market analysis tools'}
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
      {/* Product links remain secondary to the main navigation. */}
      <nav aria-label={locale === 'de' ? 'Produkt und Lernen' : 'Product and learning'} className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1">
        {[{path:'/learning', label:locale === 'de' ? 'Learning Hub' : 'Learning Hub'}, {path:'/marketscreener/scorer',label:locale === 'de' ? 'Scoring-Methodik' : 'Scoring methodology'}, {path:'/studio',label:'Studio'}, {path:'/blueprints',label:'Blueprints'}, {path:'/dokumentation',label:t('docs')}, {path:'/governance-evidence-sprint',label:locale === 'de' ? 'Für Unternehmen' : 'For businesses'}].map(item => <a key={item.path} href={item.path} onClick={event => handleNavClick(event, item.path, item.label)} className="inline-flex min-h-11 items-center text-sm text-slate-200 underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">{item.label}</a>)}
      </nav>
      {/* Consolidated legal and support navigation */}
      <nav aria-label={locale === 'de' ? 'Rechtliches und Support' : 'Legal and support'} className="mt-3 text-xs text-slate-400 flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        <span>© {new Date().getFullYear()} Capital-AI</span>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-impressum"
          href="/impressum"
          onClick={(e) => handleNavClick(e, '/impressum', 'impressum')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white transition-colors cursor-pointer text-slate-100 font-medium hover:underline underline-offset-4"
          data-analytics="footer-impressum"
        >
          {t('imprint')}
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-agb"
          href="/agb"
          onClick={(e) => handleNavClick(e, '/agb', 'agb')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white transition-colors cursor-pointer text-slate-100 font-medium hover:underline underline-offset-4"
          data-analytics="footer-agb"
        >
          {t('terms')}
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-datenschutz"
          href="/datenschutz"
          onClick={(e) => handleNavClick(e, '/datenschutz', 'datenschutz')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white transition-colors cursor-pointer text-slate-100 font-medium hover:underline underline-offset-4"
          data-analytics="footer-datenschutz"
        >
          {t('privacy')}
        </a>
        <span className="text-slate-600">•</span>
        <a id="footer-nav-legal" href="/legal" onClick={(e) => handleNavClick(e, '/legal', 'legal')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white transition-colors cursor-pointer text-slate-100 font-medium hover:underline underline-offset-4">{locale === 'de' ? 'Rechtliches' : 'Legal'}</a>
        <span className="text-slate-600">•</span>
        <a id="footer-nav-kontakt" href="/kontakt" onClick={(e) => handleNavClick(e, '/kontakt', 'kontakt')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white transition-colors cursor-pointer text-slate-100 font-medium hover:underline underline-offset-4">Kontakt</a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-faq"
          href="/faq"
          onClick={(e) => handleNavClick(e, '/faq', 'faq')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white transition-colors cursor-pointer text-slate-100 font-medium hover:underline underline-offset-4 flex items-center gap-1"
          data-analytics="footer-faq"
        >
          FAQ
        </a>
        <span className="text-slate-600">•</span>
        <a
          id="footer-nav-pricing"
          href="/pricing"
          onClick={(e) => handleNavClick(e, '/pricing', 'pricing')}
          className="inline-flex min-h-11 min-w-11 items-center justify-center hover:text-white transition-colors cursor-pointer text-slate-100 font-medium hover:underline underline-offset-4 flex items-center gap-1"
          data-analytics="footer-pricing"
        >
          {t('pricing')}
        </a>
      </nav>

      <button type="button"
        onClick={() => window.dispatchEvent(new Event(OPEN_COOKIE_PREFERENCES_EVENT))}
        className="mt-4 min-h-11 rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 underline underline-offset-4 hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
      >
        {cookieSettingsLabel[locale]}
      </button>


    </footer>
  );
};
