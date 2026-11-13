import { ProductDisclaimer } from './ProductDisclaimer';
import React, { useState } from 'react';
import { BrandGlobe } from './BrandGlobe';
import { ArrowRight, BarChart3, BookOpen, Play } from 'lucide-react';
import { openHeroBuddy } from './HeroBuddy';
import { motion, useReducedMotion } from 'motion/react';
import { useLocale } from '../i18n/LocaleProvider';


interface HeroProps {
  onExploreProduct: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onExploreProduct }) => {
  const { t, locale } = useLocale();
  const reduceMotion = useReducedMotion();
  const [globePaused, setGlobePaused] = useState(false);
  const [globeReady, setGlobeReady] = useState(false);
  return (
    <section className="capital-ai-hero relative isolate overflow-hidden px-[20px] pt-4 pb-7">
      <div className="hero-globe-background">
        <BrandGlobe paused={globePaused} onReadyChange={setGlobeReady} />
      </div>
      {globeReady && reduceMotion === false && <button type="button" className="hero-globe-pause"
        aria-pressed={globePaused} onClick={() => setGlobePaused(value => !value)}>
        {locale === 'de' ? (globePaused ? 'Globus fortsetzen' : 'Globus pausieren')
          : (globePaused ? 'Resume globe' : 'Pause globe')}
      </button>}

      {/* Hero Content */}
      <div className="hero-copy relative z-10 max-w-lg rounded-2xl p-[16px] sm:p-[20px]">
        {/* An accessible brand anchor above the headline, without obscuring the primary CTA. */}
        <div className="hero-brand-artwork relative mb-3 inline-flex max-w-full">
          <img src="/branding/capital-ai-logo.jpg" alt="CAPITAL-AI – Market Intelligence"
            width={320} height={180} loading="eager" decoding="async"
            className="hero-brand-logo block h-auto max-h-28 w-auto max-w-full rounded-xl" />

        </div>
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
          <span className="text-brand-gold block">{t('hero1')} </span>
          <span className="text-white block">{t('hero2')}</span>
        </motion.h1>

        {/* Body Description */}
        <motion.p
          initial={reduceMotion ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-slate-200 text-base leading-relaxed max-w-[38ch] mb-6 font-normal"
        >
          {t('heroDescription')}
        </motion.p>

        <div className="flex w-full max-w-[280px] flex-col gap-3">
          <a id="hero-open-learning-link" href="/learning" className="hero-action bg-brand-gold font-bold text-black">
            <BookOpen aria-hidden="true" />
            <span>{t('heroOpenLearning')}</span>
            <ArrowRight aria-hidden="true" />
          </a>
          <a id="hero-start-analysis-btn" href="/marketscreener" className="hero-action hero-action-secondary">
            <BarChart3 aria-hidden="true" />
            <span>{t('heroAnalysisDemo')}</span>
            <ArrowRight aria-hidden="true" />
          </a>
          <button id="hero-explore-product-btn" type="button" onClick={onExploreProduct} className="hero-action hero-action-secondary">
            <Play aria-hidden="true" />
            <span>{t('heroProductTour')}</span>
            <ArrowRight aria-hidden="true" />
          </button>
          <button id="hero-buddy-support-btn" type="button" onClick={openHeroBuddy} className="flex min-h-12 items-center justify-between rounded-2xl border border-brand-marketing/70 px-5 py-3 text-pink-100">
            Hero Buddy <img src="/assets/jaja-avatar-transparent.webp" alt="" width={32} height={36} className="h-9 w-8 object-contain" />
          </button>
        </div>
        <ProductDisclaimer />
      </div>
    </section>
  );
};
