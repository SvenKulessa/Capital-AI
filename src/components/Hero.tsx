/**
 * ============================================================================
 * [ARCHITEKTUR-MAPPING: HERO LANDING & BRAND CONSTELLATION]
 * ----------------------------------------------------------------------------
 * 1. GRAFISCHE KOMPONENTE : 
 *    - Luminous Glowing Earth Node Canvas mit goldenen neuronalen Lichtpfaden
 *    - Primärer Call-to-Action: "Analyse starten" (Goldener Button mit 3-Bar Chart Icon)
 *    - Sekundärer Call-to-Action: "Produkt entdecken" (Glassmorphic Play Button)
 * 2. SCORING-LOGIK        : 
 *    - Einstiegspunkt in die quantitative Analyse-Engine
 * 3. DATENANBINDUNG       : 
 *    - Callbacks `onStartAnalysis()` (öffnet AnalysisModal) und `onExploreProduct()` (ProductTourModal)
 * 4. DATENQUELLEN / FEEDS : 
 *    - Hochauflösende Vektor- und Bild-Assets (`heroEarthImage`)
 * ============================================================================
 */

import { ProductDisclaimer } from './ProductDisclaimer';
import React, { useState } from 'react';
import { BrandGlobe } from './BrandGlobe';
import { ArrowRight, Play } from 'lucide-react';
import { openHeroBuddy } from './HeroBuddy';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from '../i18n/LocaleProvider';



interface HeroProps {
  onStartAnalysis: () => void;
  onExploreProduct: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartAnalysis, onExploreProduct }) => {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [globePaused, setGlobePaused] = useState(false);
  return (
    <section className="capital-ai-hero relative isolate overflow-hidden px-[20px] pt-4 pb-7">
      <div className="hero-globe-background">
        <BrandGlobe paused={globePaused} />
      </div>
      {reduceMotion === false && <button type="button" className="hero-globe-pause"
        aria-pressed={globePaused} onClick={() => setGlobePaused(value => !value)}>
        {locale === 'de' ? (globePaused ? 'Globus fortsetzen' : 'Globus pausieren')
          : (globePaused ? 'Resume globe' : 'Pause globe')}
      </button>}

      {/* Hero Content */}
      <div className="hero-copy relative z-10 max-w-lg rounded-2xl p-[16px] sm:p-[20px]">
        {/* An accessible brand anchor above the headline, without obscuring the primary CTA. */}
        <img src="/branding/capital-ai-logo.jpg" alt="CAPITAL-AI – Market Intelligence"
          width={320} height={180} loading="eager" decoding="async"
          className="mb-3 block max-h-28 w-full max-w-[230px] rounded-xl border border-amber-300/20 object-contain object-left shadow-[0_0_32px_rgba(245,176,20,0.20)] sm:max-w-[270px]" />
        {/* Eyebrow */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-1.5 mb-3"
        >
          <span className="text-xs font-semibold tracking-wide text-brand-gold">
            {t('heroEyebrow')}
          </span>
        </motion.div>

        {/* Main Title matching the exact mockup wording & colors */}
        <motion.h1
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-[34px] sm:text-[40px] font-extrabold tracking-tight leading-[1.08] mb-4 text-left"
        >
          <span className="text-brand-gold block">{t('hero1')}</span>
          <span className="text-brand-gold block">{t('hero2')}</span>
          <span className="text-white block">{t('hero3')}</span>
          <span className="text-white block">{t('hero4')}</span>
        </motion.h1>

        {/* Body Description */}
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-200 text-base leading-relaxed max-w-[38ch] mb-6 font-normal"
        >
          <strong className="text-slate-100 font-semibold">CAPITAL-AI</strong> {t('heroDescription')}
        </motion.p>

        {/* Action Buttons */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col gap-3 w-full max-w-[280px]"
        >
          {/* Sales-first navigation to public bundle details; no fake checkout. */}
          {/* Existing analysis remains accessible as a clearly labeled demo. */}
          <button
            id="hero-start-analysis-btn"
            type="button"
            onClick={onStartAnalysis}
            className="group relative w-full min-h-[50px] py-3 px-5 bg-slate-900/85 hover:bg-slate-800 active:scale-[0.98] text-amber-100 font-bold border border-amber-400/45 rounded-2xl flex items-center justify-between shadow-[0_4px_24px_rgba(245,176,20,0.35)] hover:shadow-[0_0_38px_rgba(245,176,20,0.70)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 motion-safe:hover:scale-[1.02] motion-reduce:transition-none transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              {/* Distinct 3-bar chart icon matching mockup */}
              <div aria-hidden="true" className="w-6 h-6 flex items-end justify-center gap-[3px] py-1">
                <span className="w-[3px] h-3 bg-amber-300 rounded-full" />
                <span className="w-[3px] h-5 bg-amber-300 rounded-full" />
                <span className="w-[3px] h-4 bg-amber-300 rounded-full" />
              </div>
              <span className="text-[15.5px] font-bold tracking-tight">{locale === 'de' ? 'Analyse-Demo öffnen' : 'Open analysis demo'}</span>
            </div>
            <ArrowRight aria-hidden="true" className="w-5 h-5 transition-transform group-hover:translate-x-1 stroke-[2.4]" />
          </button>

          <button id="hero-explore-product-btn" type="button" onClick={onExploreProduct} className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-brand-gold px-5 py-3 font-bold text-black">
            <span className="flex items-center gap-2"><Play aria-hidden="true" className="h-5 w-5" /> Capital-AI Tour</span><ArrowRight aria-hidden="true" className="h-5 w-5" />
          </button>
          <button id="hero-buddy-support-btn" type="button" onClick={openHeroBuddy} className="flex min-h-12 items-center justify-between rounded-2xl border border-brand-marketing/70 px-5 py-3 text-pink-100">
            Hero Buddy <img src="/assets/jaja-avatar-transparent.webp" alt="" width={32} height={36} className="h-9 w-8 object-contain" />
          </button>
        </motion.div>
<ProductDisclaimer />
      </div>
    </section>
  );
};
