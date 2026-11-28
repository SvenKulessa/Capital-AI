import { ProductDisclaimer } from './ProductDisclaimer';
import { BrandGlobe } from './BrandGlobe';
import { ArrowRight, BarChart3, BookOpen } from 'lucide-react';
import { useLocale } from '../i18n/LocaleProvider';

const detailCopy = {
  de: ['Scoring-Methodik ansehen', 'Nachvollziehbare Methodik · Transparente Datenabdeckung · Keine ungeprüften Handlungssignale'],
  en: ['Explore scoring methodology', 'Traceable methodology · Transparent data coverage · No unverified trading signals'],
  it: ['Scopri la metodologia di scoring', 'Metodologia comprensibile · Copertura dei dati trasparente · Nessun segnale operativo non verificato'],
  fr: ['Découvrir la méthode de scoring', 'Méthode explicable · Couverture des données transparente · Aucun signal de trading non vérifié'],
  pt: ['Conhecer a metodologia de scoring', 'Metodologia explicável · Cobertura de dados transparente · Sem sinais de negociação não verificados'],
  es: ['Consultar la metodología de scoring', 'Metodología comprensible · Cobertura de datos transparente · Sin señales de negociación no verificadas'],
} as const;

function NeuronPath() {
  return <svg className="universe-neuron-path" viewBox="0 0 300 52" preserveAspectRatio="none" aria-hidden="true" focusable="false"><g stroke="currentColor" fill="none" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><path d="M2 43 L21 36 33 46 58 37 78 48 107 44 M21 36 L9 25 M33 46 L41 51 M58 37 L66 28 M193 7 L221 4 239 13 257 4 277 14 298 7 M239 13 L232 23 M277 14 L289 25"/><path d="M5 8 L18 2 38 11 M270 49 L283 39 297 47" opacity=".7"/></g><g fill="currentColor"><circle cx="21" cy="36" r="1.7"/><circle cx="58" cy="37" r="1.7"/><circle cx="239" cy="13" r="1.7"/><circle cx="277" cy="14" r="1.7"/></g></svg>;
}

export function Hero() {
  const { t, locale } = useLocale();
  return (
    <section aria-labelledby="public-hero-title" className="capital-ai-hero relative isolate overflow-hidden px-4 pt-4 pb-7 sm:px-8">
      <div className="hero-globe-background" aria-hidden="true">
        <BrandGlobe paused={false} />
      </div>
      <div className="hero-copy relative z-10 max-w-2xl rounded-2xl p-4 sm:p-8">
        <div className="hero-brand-artwork relative mb-5 inline-flex max-w-full">
          <img src="/branding/capital-ai-logo.jpg" alt="CAPITAL-AI"
            width={320} height={180} loading="eager" decoding="async"
            className="hero-brand-logo block h-auto max-h-16 w-auto sm:max-h-24 max-w-full rounded-xl" />
        </div>
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand-gold">{t('heroEyebrow')}</p>
        <h1 id="public-hero-title" className="mb-5 text-[30px] font-extrabold leading-[1.12] tracking-tight text-white sm:text-5xl">
          <span className="block universe-hero-heading">{t('hero1')}</span>
          {' '}<span className="block">{t('hero2')}</span>
        </h1>
        <p className="mb-6 max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">{t('heroDescription')}</p>
        <div className="flex w-full max-w-sm flex-col gap-3">
          <a id="hero-open-learning-link" href="/learning" className="hero-action universe-hub-action universe-hub-action--learning">
            <BookOpen aria-hidden="true" /><span>{t('heroOpenLearning')}</span><ArrowRight aria-hidden="true" /><NeuronPath />
          </a>
          <a id="hero-start-analysis-btn" href="/marketscreener" className="hero-action hero-action-secondary universe-hub-action universe-hub-action--analytics">
            <BarChart3 aria-hidden="true" /><span>{locale === 'de' ? 'Analyse entdecken durch Analytics Hub' : t('heroAnalysisDemo')}</span><ArrowRight aria-hidden="true" /><NeuronPath />
          </a>
          <a href="/marketscreener/scorer" className="inline-flex min-h-11 items-center self-start text-sm font-semibold text-amber-200 underline underline-offset-4">{detailCopy[locale][0]}</a>
        </div>
        <p className="mt-5 text-sm leading-6 text-slate-300">{detailCopy[locale][1]}</p>
        <ProductDisclaimer />
      </div>
    </section>
  );
}
