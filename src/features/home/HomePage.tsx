import { BRAND_COLORS } from '../../../shared/hub-branding.mjs';
import { lazy, Suspense } from 'react';
import { Hero } from '../../components/Hero';
import { openHeroBuddy } from '../../components/heroBuddyEvents';
import { HomeSearchFocus } from './HomeSearchFocus';
import { GrowthIntelligenceArticle } from './GrowthIntelligenceArticle';
import { CommerceEntrySection } from './CommerceEntrySection';
import { HomeLatestLearning } from './HomeLatestLearning';
import { ProductDisclaimer } from '../../components/ProductDisclaimer';
import type { AssetSubclass, MainCategory, MarketAsset } from '../../entities/market/model';
import type { CoreModule } from '../../entities/module/model';

const HomeEditorialNews = lazy(() => import('./HomeEditorialNews').then(module => ({ default: module.HomeEditorialNews })));
const HomeHubDirectory = lazy(() => import('../../components/HomeHubDirectory').then(module => ({ default: module.HomeHubDirectory })));

type HomePageProps = {
  currentRoute: string;
  onNavigate: (path: string) => void;
  onOpenMarketscreener: () => void;
  onOpenAnalysis: () => void;
  onOpenSectorAnalysis: () => void;
  onOpenModule: (moduleId: string) => void;
  onOpenVocabulary: () => void;
  onOpenPriceAlerts: () => void;
  onOpenMonetization: () => void;
  onOpenWhaleRadar: () => void;
  onNavigateLogin: () => void;
  onSelectSubclass: (subclass: AssetSubclass, category: MainCategory) => void;
  onExploreMarkets: (category?: MainCategory | 'ALLE') => void;
  onSelectAsset: (asset: MarketAsset) => void;
  onSelectModule: (module: CoreModule) => void;
  onStartProductTour: () => void;
};


const trustPoints = [
  ['Nachvollziehbare Methodik', 'Faktoren, Gewichtungen und Grenzen werden verständlich erklärt.'],
  ['Transparente Datenabdeckung', 'Besucher können erkennen, welche Daten verfügbar sind und wo Einschränkungen bestehen.'],
  ['Lernen vor Handeln', 'Inhalte vermitteln Finanzwissen und ersetzen keine individuelle Anlageberatung.'],
  ['Geprüfte öffentliche Inhalte', 'Öffentliche Inhalte werden nur dargestellt, wenn ihre Verwendung und Darstellung freigegeben sind.'],
] as const;

const textLink = 'inline-flex min-h-11 items-center rounded-md text-sm font-semibold text-amber-200 underline underline-offset-4 hover:text-amber-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300';

export function HomePage({ onNavigate, onOpenModule, onOpenSectorAnalysis, onOpenPriceAlerts, onStartProductTour }: HomePageProps) {
  return (
    <>
      <Hero />
      <HomeSearchFocus />
      <section lang="de" aria-labelledby="public-benefits-title" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h2 id="public-benefits-title" className="text-2xl font-bold text-white sm:text-3xl">Von der Finanzfrage zur nachvollziehbaren Einordnung</h2>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300">Für Einsteiger und Menschen, die Finanzdaten selbstständig verstehen und kritisch prüfen möchten. Beginne mit einem Begriff, lerne seine Anwendung und erkunde anschließend die Analysemethodik.</p>
        <ol className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            ['01', 'Begriffe verstehen', 'Lerne, was Kennzahlen aussagen und welche Grenzen sie haben.'],
            ['02', 'Daten einordnen', 'Unterscheide Datenbeobachtungen, Beispiele und Prognosen.'],
            ['03', 'Bewertungen verstehen', 'Prüfe, welche Faktoren und Gewichtungen eine Bewertung beeinflussen.'],
          ].map(([number, title, description]) => <li key={number} className="rounded-2xl border border-slate-700 bg-slate-950 p-5">
            <span aria-hidden="true" className="text-sm font-semibold text-amber-300">{number}</span>
            <h3 className="mt-2 text-lg font-semibold text-white">{title}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
          </li>)}
        </ol>
        <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2">
          <button id="hero-explore-product-btn" type="button" className={textLink} onClick={onStartProductTour}>Plattform-Tour starten</button>
          <button id="hero-buddy-support-btn" type="button" className={textLink} onClick={openHeroBuddy}>Assistent öffnen</button>
        </div>
      </section>
      <Suspense fallback={null}>
        <HomeHubDirectory onNavigate={onNavigate} onOpenModule={onOpenModule}
          onOpenSectorAnalysis={onOpenSectorAnalysis} onOpenPriceAlerts={onOpenPriceAlerts} />
      </Suspense>
      <section lang="de" aria-labelledby="public-trust-title" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-slate-700 bg-slate-950 p-5 sm:p-8">
          <h2 id="public-trust-title" className="text-2xl font-bold text-white sm:text-3xl">Warum CAPITAL-AI?</h2>
          <ul className="mt-6 grid gap-5 sm:grid-cols-2">
            {trustPoints.map(([title, description], index) => <li key={title} style={{ borderLeftColor: [BRAND_COLORS.cyan, BRAND_COLORS.blue, BRAND_COLORS.green, BRAND_COLORS.rose][index] }} className="border-l-[3px] pl-4">
              <h3 className="font-semibold text-white">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-300">{description}</p>
            </li>)}
          </ul>
          <a href="/marketscreener/scorer" className={textLink + ' mt-4'}>Scoring-Methodik ansehen</a>
          <ProductDisclaimer full />
        </div>
      </section>
      <GrowthIntelligenceArticle />
      <HomeLatestLearning onNavigate={onNavigate} />
      <Suspense fallback={null}><HomeEditorialNews /></Suspense>
      <CommerceEntrySection onNavigate={onNavigate} />
      <section lang="de" aria-labelledby="public-final-cta-title" className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="rounded-3xl border border-amber-300/30 bg-slate-950 p-6 sm:p-10">
          <h2 id="public-final-cta-title" className="text-2xl font-bold text-white sm:text-3xl">Beginne mit deinem nächsten Lernschritt.</h2>
          <p className="mt-3 max-w-xl text-slate-300">Entdecke Finanzbegriffe und Methoden im Learning Hub oder vergleiche die verfügbaren Angebote.</p>
          <div className="mt-6 flex flex-wrap gap-4">
            <a href="/learning" className="inline-flex min-h-11 items-center rounded-xl bg-amber-300 px-5 py-3 font-semibold text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-amber-300">Learning Hub öffnen</a>
            <a href="/pricing" className={textLink}>Angebote vergleichen</a>
          </div>
        </div>
      </section>
    </>
  );
}
