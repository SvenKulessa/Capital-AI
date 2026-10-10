import { lazy, Suspense } from 'react';
import { Header } from '../../components/Header';
import { Hero } from '../../components/Hero';
const LearningCadsShowcase = lazy(() => import('./LearningCadsShowcase').then(module => ({ default: module.LearningCadsShowcase })));
const ContentEngineConcept = lazy(() => import('./ContentEngineConcept').then(module => ({ default: module.ContentEngineConcept })));
import { CommerceEntrySection } from './CommerceEntrySection';
import { HomeLatestLearning } from './HomeLatestLearning';
import { KeyPillars } from '../../components/KeyPillars';
import { Footer } from '../../components/Footer';
import { MarketSentiment } from '../market/MarketSentiment';
import { SectorAnalysis } from '../market/SectorAnalysis';
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

      <HomeLatestLearning onNavigate={onNavigate} />

      <CommerceEntrySection onNavigate={onNavigate} />

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

      <SectorAnalysis
        onSelectAsset={onSelectAsset}
        onOpenPriceAlerts={onOpenPriceAlerts}
        onExploreMarkets={onExploreMarkets}
      />

      <MarketSentiment
        onStartAnalysis={onOpenAnalysis}
        onExploreMarkets={() => onExploreMarkets()}
      />

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
