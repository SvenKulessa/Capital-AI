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

import React from 'react';
import { ArrowRight, Play } from 'lucide-react';
import { openHeroBuddy } from './HeroBuddy';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from '../i18n/LocaleProvider';
import heroEarthImage from '../assets/images/glowing_earth_nodes_1789997454893.jpg';

interface HeroProps {
  onStartAnalysis: () => void;
  onExploreProduct: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onStartAnalysis, onExploreProduct }) => {
  const { t } = useLocale();
  const reduceMotion = useReducedMotion();
  return (
    <section className="capital-ai-hero relative px-[20px] pt-4 pb-7 overflow-hidden">
      {/* Golden neural light trails mirroring the logo's lateral filaments */}
      <div aria-hidden="true" className="absolute top-0 left-0 right-0 h-44 pointer-events-none -z-0 opacity-40 overflow-hidden">
        <svg className="w-full h-full" viewBox="0 0 400 160" fill="none" preserveAspectRatio="none">
          <path
            d="M-20,20 C100,50 200,10 320,70 C370,95 410,60 450,40"
            stroke="url(#goldenWaveGrad1)"
            strokeWidth="1.5"
            strokeDasharray="4 3"
          />
          <path
            d="M-40,60 C80,20 180,80 290,40 C350,20 400,80 440,100"
            stroke="url(#goldenWaveGrad2)"
            strokeWidth="1.2"
            opacity="0.75"
          />
          <path
            d="M-10,95 C120,40 220,110 340,30 C380,10 420,50 460,70"
            stroke="url(#magentaWaveGrad)"
            strokeWidth="1.2"
            opacity="0.65"
          />
          <defs>
            <linearGradient id="goldenWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#F5B014" stopOpacity="0" />
              <stop offset="30%" stopColor="#F5B014" stopOpacity="0.8" />
              <stop offset="70%" stopColor="#FDE68A" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#F5B014" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="goldenWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#D97706" stopOpacity="0" />
              <stop offset="50%" stopColor="#FBBF24" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="magentaWaveGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--color-brand-ai)" stopOpacity="0" />
              <stop offset="40%" stopColor="var(--color-brand-marketing)" stopOpacity="0.7" />
              <stop offset="70%" stopColor="var(--color-brand-ai)" stopOpacity="0.8" />
              <stop offset="100%" stopColor="var(--color-brand-ai)" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Luminous Earth & Network Constellation Background */}
      <div aria-hidden="true" className="absolute -top-12 -right-20 w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] pointer-events-none select-none z-0">
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="relative w-full h-full"
        >
          {/* Earth image with radial fade masks */}
          <img
            src={heroEarthImage}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover rounded-full mix-blend-screen opacity-90 filter drop-shadow-[0_0_40px_rgba(245,176,20,0.35)]"
          />
          {/* Radial atmosphere glow */}
          <div className="absolute inset-0 rounded-full bg-radial from-transparent via-transparent to-[#02050e] opacity-80" />
          <div className="absolute -inset-4 bg-gradient-to-l from-transparent via-transparent to-[#02050e] opacity-90" />
          <div className="absolute -inset-4 bg-gradient-to-t from-[#02050e] via-transparent to-transparent opacity-90" />
          
          {/* Ambient golden light bloom */}
          <div className="absolute top-1/4 right-1/4 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl animate-pulse-slow" />
          <div className="absolute top-1/2 right-1/3 w-28 h-28 bg-brand-ai/15 rounded-full blur-xl" />
        </motion.div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-lg rounded-2xl bg-brand-canvas/90 p-[16px] sm:p-[20px]">
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
          {/* Primary Button: Yellow/Gold "Analyse starten" */}
          <button
            id="hero-start-analysis-btn"
            type="button"
            onClick={onStartAnalysis}
            className="group relative w-full min-h-[50px] py-3 px-5 bg-brand-gold hover:bg-[#ffbe26] active:scale-[0.98] text-black font-bold rounded-2xl flex items-center justify-between shadow-[0_4px_24px_rgba(245,176,20,0.35)] hover:shadow-[0_0_38px_rgba(245,176,20,0.70)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300 motion-safe:hover:scale-[1.02] motion-reduce:transition-none transition-all duration-200"
          >
            <div className="flex items-center gap-3">
              {/* Distinct 3-bar chart icon matching mockup */}
              <div aria-hidden="true" className="w-6 h-6 flex items-end justify-center gap-[3px] py-1">
                <span className="w-[3px] h-3 bg-black rounded-full" />
                <span className="w-[3px] h-5 bg-black rounded-full" />
                <span className="w-[3px] h-4 bg-black rounded-full" />
              </div>
              <span className="text-[15.5px] font-bold tracking-tight">{t('analyze')}</span>
            </div>
            <ArrowRight aria-hidden="true" className="w-5 h-5 transition-transform group-hover:translate-x-1 stroke-[2.4]" />
          </button>

          {/* Secondary Button: Dark Glass "Produkt entdecken" */}
          <button
            id="hero-buddy-support-btn"
            type="button"
            onClick={openHeroBuddy}
            className="w-full min-h-[44px] py-3 px-5 bg-transparent hover:bg-fuchsia-400/10 hover:shadow-[0_0_28px_rgba(192,132,252,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fuchsia-300 active:scale-[0.98] border border-brand-marketing/70 rounded-2xl text-pink-100 text-base font-semibold"
          >
            {t('assistant')}
          </button>
          <button
            id="hero-explore-product-btn"
            type="button"
            onClick={onExploreProduct}
            className="w-full min-h-[48px] py-3 px-5 bg-[#0a1128]/80 hover:bg-[#101b3d]/90 hover:shadow-[0_0_28px_rgba(34,211,238,0.30)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300 active:scale-[0.98] border border-slate-700/70 hover:border-slate-500/80 rounded-2xl text-white flex items-center justify-center gap-3 backdrop-blur-md transition-all duration-200"
          >
            {/* Play Icon in Solid Circle */}
            <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
              <Play aria-hidden="true" className="w-3 h-3 text-black fill-black ml-0.5" />
            </div>
            <span className="text-[14.5px] font-medium text-slate-100">{t('discover')}</span>
          </button>
        </motion.div>
      </div>
    </section>
  );
};
