import { lazy, Suspense } from 'react';
import { HomeSearchFocus } from './HomeSearchFocus';
import { Hero } from '../../components/Hero';


const HomeEditorialNews = lazy(() => import('./HomeEditorialNews').then(module => ({ default: module.HomeEditorialNews })));
import { CommerceEntrySection } from './CommerceEntrySection';
import { HomeLatestLearning } from './HomeLatestLearning';
const KeyPillars = lazy(() => import('../../components/KeyPillars').then(module => ({ default: module.KeyPillars })));
// Secondary, below-the-fold market widgets should not inflate the initial landing bundle.
const MarketSentiment = lazy(() => import('../market/MarketSentiment').then(module => ({ default: module.MarketSentiment })));
const SectorAnalysis = lazy(() => import('../market/SectorAnalysis').then(module => ({ default: module.SectorAnalysis })));
import type {
  AssetSubclass,
  MainCategory,
  MarketAsset,
} from '../../entities/market/model';
import type { CoreModule } from '../../entities/module/model';

const MarketOverview = lazy(() =>
  import('../../components/MarketOverview').then((module) => ({
    default: module.MarketOverview,
  })),
);

const HomeHubDirectory = lazy(() =>
  import('../../components/HomeHubDirectory').then((module) => ({
    default: module.HomeHubDirectory,
  })),
);

const CoreModules = lazy(() =>
  import('../../components/CoreModules').then((module) => ({
    default: module.CoreModules,
  })),
);

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

export function HomePage({
  currentRoute,
  onNavigate,
  onOpenMarketscreener,
  onOpenAnalysis,
  onOpenSectorAnalysis,
  onOpenModule,
  onOpenVocabulary,
  onOpenPriceAlerts,
  onOpenMonetization,
  onOpenWhaleRadar,
  onNavigateLogin,
  onSelectSubclass,
  onExploreMarkets,
  onSelectAsset,
  onSelectModule,
  onStartProductTour,
}: HomePageProps) {
  return (
    <>

      <Hero onExploreProduct={onStartProductTour} />

      <section aria-label="CAPITAL-AI entdecken" className="mx-auto max-w-7xl px-5 py-6">
        <button type="button" onClick={onStartProductTour} className="rounded-[3rem] border border-cyan-300/40 bg-cyan-950/60 px-8 py-5 text-left text-cyan-100 shadow-lg motion-safe:animate-[capital-cloud-float_8s_ease-in-out_infinite]">
          <strong className="block text-lg">CAPITAL-AI entdecken</strong>
          <span className="text-sm">Finde den Einstieg, der zu deiner Frage passt.</span>
        </button>
      </section>
      <Suspense fallback={null}>
        <HomeEditorialNews />
      </Suspense>

      <section aria-labelledby="market-transparency-title" className="mx-auto max-w-7xl px-5 py-5">
        <div className="rounded-3xl border border-cyan-300/25 bg-slate-950/70 p-5 shadow-lg sm:p-7">
          <p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">CAPITAL-AI · MARKET</p>
          <h2 id="market-transparency-title" className="mt-2 text-2xl font-bold text-white">Finanzmärkte verstehen – mit nachvollziehbaren Daten</h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200">
            Im Learning Hub erklären wir Marktbegriffe, Bewertungsmethoden und Datenqualität.
            Öffentliche Lernbeispiele sind keine verifizierten Live-Kurse oder Handlungssignale.
          </p>
          <ul className="mt-5 grid gap-3 md:grid-cols-3">
            <li className="rounded-2xl border border-cyan-300/20 bg-cyan-950/30 p-4">
              <h3 className="font-semibold text-cyan-100">Lernen</h3>
              <p className="mt-2 text-sm text-slate-200">Finanzwissen, Fachbegriffe und die Einordnung von Charts.</p>
            </li>
            <li className="rounded-2xl border border-violet-300/20 bg-violet-950/20 p-4">
              <h3 className="font-semibold text-violet-100">Scoring verstehen</h3>
              <p className="mt-2 text-sm text-slate-200">Faktoren und Gewichtungen erklären – ohne ungeprüfte Renditeversprechen.</p>
            </li>
            <li className="rounded-2xl border border-amber-300/20 bg-amber-950/20 p-4">
              <h3 className="font-semibold text-amber-100">News und Analytics</h3>
              <p className="mt-2 text-sm text-slate-200">Ältere Meldungen erscheinen erst nach Quellen-, Grafik- und Rechteprüfung im Archiv.</p>
            </li>
          </ul>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="/learning" className="inline-flex min-h-11 items-center rounded-xl bg-cyan-200 px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-cyan-100">Learning Hub öffnen</a>
            <a href="/screener" className="inline-flex min-h-11 items-center rounded-xl border border-amber-200/40 px-4 py-2 text-sm font-semibold text-amber-100 hover:bg-amber-200/10">Scoring-Methodik ansehen</a>
          </div>
        </div>
      </section>
      <HomeSearchFocus />
      <CommerceEntrySection onNavigate={onNavigate} />
      <HomeLatestLearning onNavigate={onNavigate} />

      <Suspense fallback={null}>
        <HomeHubDirectory
          onNavigate={onNavigate}
          onOpenModule={onOpenModule}
          onOpenSectorAnalysis={onOpenSectorAnalysis}
          onOpenPriceAlerts={onOpenPriceAlerts}
        />
      </Suspense>
      <Suspense fallback={null}>
        <KeyPillars />
      </Suspense>

      <Suspense fallback={<section role="status" className="px-5 py-8 text-sm text-slate-300">Marktsektoren werden geladen …</section>}>
        <SectorAnalysis
          onSelectAsset={onSelectAsset}
          onOpenPriceAlerts={onOpenPriceAlerts}
          onExploreMarkets={onExploreMarkets}
        />
      </Suspense>

      <Suspense fallback={<section role="status" className="px-5 py-8 text-sm text-slate-300">Marktstimmung wird geladen …</section>}>
        <MarketSentiment
          onStartAnalysis={onOpenAnalysis}
          onExploreMarkets={() => onExploreMarkets()}
        />
      </Suspense>

      <Suspense fallback={null}>
        <MarketOverview
          onSelectAsset={onSelectAsset}
          onViewAllMarkets={() => onExploreMarkets()}
        />
      </Suspense>

      <Suspense fallback={null}>
        <CoreModules
          onSelectModule={(module) => {
            if (module.id === 'market-screener' || module.id === 'screener') {
              onNavigate('/screener');
            } else if (module.id === 'learning-portal' || module.id === 'vocabulary') {
              onNavigate('/learning');
            } else if (module.id === 'pipeline-builder') {
              onNavigate('/pipeline-builder');
            } else {
              onSelectModule(module);
            }
          }}
          onViewAllModules={() => onOpenModule('enterprise-scorer')}
          onNavigate={onNavigate}
        />
      </Suspense>

    </>
  );
}
