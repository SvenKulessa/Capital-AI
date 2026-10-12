import { lazy, Suspense } from 'react';
import { Hero } from '../../components/Hero';


const ContentEngineConcept = lazy(() => import('./ContentEngineConcept').then(module => ({ default: module.ContentEngineConcept })));
import { CommerceEntrySection } from './CommerceEntrySection';
import { HomeLatestLearning } from './HomeLatestLearning';
import { KeyPillars } from '../../components/KeyPillars';
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

      <Hero
        onStartAnalysis={onOpenAnalysis}
        onExploreProduct={onStartProductTour}
      />

      <section aria-label="Produkt entdecken" className="mx-auto max-w-7xl px-5 py-6">
        <button type="button" onClick={onStartProductTour} className="rounded-[3rem] border border-cyan-300/40 bg-cyan-950/60 px-8 py-5 text-left text-cyan-100 shadow-lg motion-safe:animate-[capital-cloud-float_8s_ease-in-out_infinite]">
          <strong className="block text-lg">Produkt entdecken</strong>
          <span className="text-sm">Finanzwissen lernen. Analysemethoden verstehen.</span>
        </button>
      </section>
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
      <KeyPillars />
      <Suspense fallback={null}>
        <ContentEngineConcept onNavigate={onNavigate} />
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
