import type { MouseEvent } from 'react';
import { ArrowRight, Database, FileCode2, LockKeyhole, SlidersHorizontal } from 'lucide-react';
import { useLocale } from '../../i18n/LocaleProvider';
import {
  MARKET_BLUEPRINTS,
  computeBlueprintDemoIndex,
  demoAlertWouldCross,
  type MarketBlueprintDefinition,
} from './marketBlueprintDemo';

type Language = 'de' | 'en';
type Props = { variant?: 'home' | 'documentation'; onNavigate?: (path: string) => void };

/** Fictional, unitless SVG series. No network, provider, timer or scoring-runtime access. */
function DemoChart({ blueprint, language }: { blueprint: MarketBlueprintDefinition; language: Language }) {
  const points = blueprint.series.map((value, index) =>
    String(22 + index * 51) + ',' + String(96 - value * 0.75)
  ).join(' ');
  const caption = language === 'de'
    ? 'Synthetischer Index ohne Einheit · keine Kurs- oder Performancehistorie'
    : 'Synthetic unitless index · not price or performance history';
  return (
    <figure className="rounded-xl border border-slate-700/70 bg-brand-canvas/85 p-3">
      <figcaption className="mb-2 text-xs font-semibold text-amber-200">
        {language === 'de' ? 'DEMO · Illustrativer Verlauf' : 'DEMO · Illustrative trend'}
      </figcaption>
      <svg viewBox="0 0 360 118" role="img" aria-label={caption} className="h-auto w-full">
        <path d="M22 18H338 M22 52H338 M22 86H338" fill="none" stroke="#64748b" strokeOpacity="0.35" strokeDasharray="3 6" />
        {blueprint.id === 'alerts' && (
          <>
            <path d="M22 43.5H338" fill="none" stroke="#FF2E93" strokeWidth="1.8" strokeDasharray="5 4" />
            <text x="337" y="38" fill="#fbcfe8" fontSize="11" textAnchor="end">
              {language === 'de' ? 'Modellschwelle 70' : 'Model threshold 70'}
            </text>
          </>
        )}
        <polyline points={points} fill="none" stroke="#F9BF21" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        {blueprint.series.map((value, index) => (
          <circle key={index} cx={22 + index * 51} cy={96 - value * 0.75} r="3.5" fill="#F9BF21" />
        ))}
        <text x="22" y="110" fill="#cbd5e1" fontSize="10">T1</text>
        <text x="338" y="110" fill="#cbd5e1" fontSize="10" textAnchor="end">T7</text>
      </svg>
      <p className="text-xs leading-relaxed text-slate-300">{caption}</p>
    </figure>
  );
}

function BlueprintCard({ blueprint, language }: { blueprint: MarketBlueprintDefinition; language: Language }) {
  const example = computeBlueprintDemoIndex(blueprint.factors);
  return (
    <article className="flex min-w-0 flex-col gap-4 rounded-2xl border border-slate-700 bg-[#071124] p-4 shadow-lg shadow-black/20 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-200">
          <FileCode2 className="h-4 w-4" aria-hidden="true" /> Blueprint · {blueprint.id}
        </span>
        <span className="rounded-full border border-slate-600 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-slate-200">
          {blueprint.runtime === 'PAUSED'
            ? (language === 'de' ? 'Runtime pausiert' : 'Runtime paused')
            : (language === 'de' ? 'Konzept' : 'Concept')}
        </span>
      </div>
      <div>
        <h3 className="text-lg font-bold tracking-tight text-white">{blueprint.name}</h3>
        <p className="mt-1 text-sm leading-relaxed text-slate-300">{blueprint.subtitle}</p>
      </div>
      <DemoChart blueprint={blueprint} language={language} />
      <div className="rounded-xl border border-amber-400/20 bg-amber-400/5 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-slate-200">
            {language === 'de' ? 'Beispielhafter Modellindex' : 'Illustrative model index'}
          </span>
          <strong className="text-lg tabular-nums text-amber-200">{example.toFixed(1)} / 100</strong>
        </div>
        <p className="mt-1 text-xs text-slate-300">
          {language === 'de'
            ? 'Rechenbeispiel aus frei erfundenen Faktoren; kein verifizierter Markt-Score.'
            : 'Calculated from fictional factors, not a verified market score.'}
        </p>
        {blueprint.id === 'alerts' && (
          <p className="mt-2 text-xs font-medium text-pink-200">
            {language === 'de'
              ? 'Beispielregel: ' + (demoAlertWouldCross(blueprint.series, 70) ? 'Modellschwelle überschritten' : 'Schwelle nicht erreicht') + ' · keine Benachrichtigung'
              : 'Example rule: ' + (demoAlertWouldCross(blueprint.series, 70) ? 'model threshold crossed' : 'threshold not crossed') + ' · no notification'}
          </p>
        )}
      </div>
      <details className="group rounded-xl border border-slate-700/70 bg-slate-950/60">
        <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 px-3 py-3 text-sm font-semibold text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
          <span className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4" aria-hidden="true" />
            {language === 'de' ? 'Datenmodell & Scoring aufklappen' : 'Explore data model & scoring'}
          </span>
          <ArrowRight className="h-4 w-4 transition-transform group-open:rotate-90 motion-reduce:transition-none" aria-hidden="true" />
        </summary>
        <div className="space-y-3 border-t border-slate-700/70 p-3">
          <div>
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-200">
              {language === 'de' ? 'Eingabevertrag (Konzept)' : 'Input contract (concept)'}
            </h4>
            <code className="block break-words whitespace-normal text-xs leading-relaxed text-slate-200">{blueprint.dataConcept}</code>
          </div>
          <div>
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-200">
              {language === 'de' ? 'Demo-Logik' : 'Demo logic'}
            </h4>
            <p className="text-sm leading-relaxed text-slate-200">{blueprint.formula}</p>
          </div>
          <div className="space-y-2">
            {blueprint.factors.map((factor) => (
              <div key={factor.id}>
                <div className="flex justify-between gap-3 text-xs text-slate-200">
                  <span>{factor.label} · {Math.round(factor.weight * 100)} %</span>
                  <span className="tabular-nums">{factor.value} / 100</span>
                </div>
                <div className="mt-1 h-1.5 rounded-full bg-slate-700" aria-hidden="true">
                  <div className="h-full rounded-full bg-brand-ai" style={{ width: String(factor.value) + '%' }} />
                </div>
              </div>
            ))}
          </div>
          <div>
            <h4 className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-200">
              {language === 'de' ? 'Ausgabevertrag / Sicherheitsgrenze' : 'Output contract / security boundary'}
            </h4>
            <p className="text-sm leading-relaxed text-slate-200">{blueprint.outputContract}</p>
          </div>
        </div>
      </details>
    </article>
  );
}

/** Public education/marketing only. Real provider or tenant data never enters this component. */
export function MarketBlueprintShowcase({ variant = 'home', onNavigate }: Props) {
  const { locale } = useLocale();
  const language: Language = locale === 'de' ? 'de' : 'en';
  const follow = (event: MouseEvent<HTMLAnchorElement>, url: string) => {
    if (!onNavigate || event.button !== 0 || event.ctrlKey || event.metaKey ||
        event.shiftKey || event.altKey) return;
    event.preventDefault();
    onNavigate(url);
  };
  return (
    <section id="market-blueprint-catalog" aria-labelledby="market-blueprint-heading"
      className={variant === 'home' ? 'mx-auto max-w-7xl px-4 py-10 sm:px-6' : 'py-6'}>
      <header className="mb-6 rounded-2xl border border-amber-400/25 bg-[#0a1228] p-5 sm:p-6">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-200">
          <Database className="h-4 w-4" aria-hidden="true" /> CAPITAL-AI / BLUEPRINT PRODUCTS
        </p>
        <h2 id="market-blueprint-heading" className="mt-2 text-2xl font-extrabold text-white sm:text-3xl">
          {language === 'de' ? 'Marktmodelle erleben – ohne Live-Daten' : 'Explore market models – without live data'}
        </h2>
        <p className="mt-3 max-w-4xl text-base leading-relaxed text-slate-200">
          {language === 'de'
            ? 'Vier demonstrierbare Produkt-Blueprints zeigen Datenkonzept, Regelwerk und gewichtete Berechnung. Alle Kurven und Zahlen sind synthetisch. Keine echten Kurse, Handelssignale, Benchmarks oder historischen Resultate.'
            : 'Four product blueprints explain data contracts, rules and weighted calculations. All curves and numbers are synthetic: no prices, signals, benchmarks or historical results.'}
        </p>
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-purple-400/30 bg-brand-ai/10 p-3 text-sm leading-relaxed text-slate-100">
          <LockKeyhole className="mt-0.5 h-5 w-5 shrink-0 text-purple-200" aria-hidden="true" />
          <p>{language === 'de'
            ? 'Rust-Bridge, NATS und Price Alerts bleiben pausiert. Kraken ist als erste spätere kommerzielle Ingestion geplant – erst nach Portfoliofinanzierung und vertraglich nachgewiesenen Nutzungsrechten. Kein API-Key oder Live-Feed wird hier verwendet.'
            : 'Rust bridge, NATS and price alerts remain paused. Kraken is the first planned commercial ingestion source, contingent on financing and verified contractual rights. No API key or live feed is used here.'}</p>
        </div>
        {variant === 'home' && (
          <a href="/marketscreener/dokumentation#market-blueprint-catalog"
            onClick={(event) => follow(event, '/marketscreener/dokumentation#market-blueprint-catalog')}
            className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm font-bold text-amber-200 hover:bg-amber-400/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            {language === 'de' ? 'Blueprint-Dokumentation öffnen' : 'Open blueprint documentation'}
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </a>
        )}
      </header>
      <div className="grid gap-4 md:grid-cols-2">
        {MARKET_BLUEPRINTS.map((blueprint) => (
          <BlueprintCard key={blueprint.id} blueprint={blueprint} language={language} />
        ))}
      </div>
      <p className="mt-5 max-w-4xl text-xs leading-relaxed text-slate-400">
        {language === 'de'
          ? 'Die Indizes sind ausschließlich didaktische Beispielrechnungen. Es existiert keine Freigabe für produktives Scoring, Live-Preise oder kommerzielle Weiterverbreitung von Providerdaten. Kein Kauf von Kraken-Datenrechten ist erfolgt.'
          : 'All indices are educational calculations only. No live scoring, price data or commercial provider redistribution is approved. No Kraken data rights have been purchased.'}
      </p>
    </section>
  );
}
