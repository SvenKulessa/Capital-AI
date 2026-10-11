import { lazy, Suspense } from 'react';
import { Header } from '../../components/Header';
import { Hero } from '../../components/Hero';
const MarketBlueprintShowcase = lazy(() => import('./MarketBlueprintShowcase').then(module => ({ default: module.MarketBlueprintShowcase })));
const LearningCadsShowcase = lazy(() => import('./LearningCadsShowcase').then(module => ({ default: module.LearningCadsShowcase })));
const ContentEngineConcept = lazy(() => import('./ContentEngineConcept').then(module => ({ default: module.ContentEngineConcept })));
import { CommerceEntrySection } from './CommerceEntrySection';
import { HomeLatestLearning } from './HomeLatestLearning';
import { KeyPillars } from '../../components/KeyPillars';
import { Footer } from '../../components/Footer';
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
      <Header
        currentRoute={currentRoute}
        onOpenMarketscreener={onOpenMarketscreener}
        onOpenAnalysis={onOpenAnalysis}
        onOpenSectorAnalysis={onOpenSectorAnalysis}
        onOpenModule={onOpenModule}
        onOpenVocabulary={onOpenVocabulary}
        onOpenPriceAlerts={onOpenPriceAlerts}
        onOpenMonetization={onOpenMonetization}
        onOpenWhaleRadar={onOpenWhaleRadar}
        onNavigateLogin={onNavigateLogin}
        onNavigate={onNavigate}
        onSelectSubclass={onSelectSubclass}
        onViewAllMarkets={() => onExploreMarkets()}
      />

      <Hero
        onStartAnalysis={onOpenAnalysis}
        onExploreProduct={onStartProductTour}
      />

      {/* Sales-first: the featured, educational Blueprint catalog sits immediately below the Hero. */}
      <Suspense fallback={
        <section role="status" className="mx-auto w-full max-w-7xl px-5 py-8 text-sm text-slate-300">
          Blueprint-Bundles werden geladen …
        </section>
      }>
        <MarketBlueprintShowcase onNavigate={onNavigate} />
      </Suspense>

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
        <LearningCadsShowcase onNavigate={onNavigate} onPricing={onOpenMonetization} />
      </Suspense>
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

      <Footer onNavigate={onNavigate} />
    </>
  );
}
