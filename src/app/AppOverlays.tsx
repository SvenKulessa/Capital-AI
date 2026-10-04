import {
  lazy,
  Suspense,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { MARKET_ASSETS } from '../data/mockData';
import type {
  AssetSubclass,
  MainCategory,
  MarketAsset,
} from '../entities/market/model';
import type { CoreModule } from '../entities/module/model';

const AnalysisModal = lazy(() =>
  import('../components/AnalysisModal').then((module) => ({
    default: module.AnalysisModal,
  })),
);
const ProductTourModal = lazy(() =>
  import('../components/ProductTourModal').then((module) => ({
    default: module.ProductTourModal,
  })),
);
const AssetDetailModal = lazy(() =>
  import('../components/AssetDetailModal').then((module) => ({
    default: module.AssetDetailModal,
  })),
);
const ModuleDetailModal = lazy(() =>
  import('../components/ModuleDetailModal').then((module) => ({
    default: module.ModuleDetailModal,
  })),
);
const AllMarketsModal = lazy(() =>
  import('../components/AllMarketsModal').then((module) => ({
    default: module.AllMarketsModal,
  })),
);
const SubclassDetailModal = lazy(() =>
  import('../components/SubclassDetailModal').then((module) => ({
    default: module.SubclassDetailModal,
  })),
);
const MarketVocabularyModal = lazy(() =>
  import('../features/learning/MarketVocabularyModal').then((module) => ({
    default: module.MarketVocabularyModal,
  })),
);
const PriceAlertsModal = lazy(() =>
  import('../features/alerts/PriceAlertsModal').then((module) => ({
    default: module.PriceAlertsModal,
  })),
);
const WhaleRadarModal = lazy(() =>
  import('../features/whale-radar/WhaleRadarModal').then((module) => ({
    default: module.WhaleRadarModal,
  })),
);
const MonetizationModal = lazy(() =>
  import('../features/pricing/MonetizationModal').then((module) => ({
    default: module.MonetizationModal,
  })),
);
const MarketscreenerModal = lazy(() =>
  import('../components/MarketscreenerModal').then((module) => ({
    default: module.MarketscreenerModal,
  })),
);

type SelectedSubclass = {
  subclass: AssetSubclass;
  category: MainCategory;
};

type AppOverlaysProps = {
  currentRoute: string;
  navigateTo: (path: string) => void;

  isAnalysisOpen: boolean;
  setIsAnalysisOpen: Dispatch<SetStateAction<boolean>>;
  analysisInitialTab: 'asset' | 'sector';
  setAnalysisInitialTab: Dispatch<SetStateAction<'asset' | 'sector'>>;
  analysisInitialTicker?: string;
  analysisInitialSectorId?: string;

  isMarketscreenerOpen: boolean;
  setIsMarketscreenerOpen: Dispatch<SetStateAction<boolean>>;
  isProductTourOpen: boolean;
  setIsProductTourOpen: Dispatch<SetStateAction<boolean>>;
  isAllMarketsOpen: boolean;
  setIsAllMarketsOpen: Dispatch<SetStateAction<boolean>>;
  isMonetizationOpen: boolean;
  setIsMonetizationOpen: Dispatch<SetStateAction<boolean>>;
  isVocabularyOpen: boolean;
  setIsVocabularyOpen: Dispatch<SetStateAction<boolean>>;

  isAlertModalOpen: boolean;
  setIsAlertModalOpen: (open: boolean) => void;
  isWhaleRadarOpen: boolean;
  setIsWhaleRadarOpen: (open: boolean) => void;

  marketCategoryFilter: 'ALLE' | MainCategory;
  setMarketCategoryFilter: Dispatch<SetStateAction<'ALLE' | MainCategory>>;
  marketSubclassFilter?: string;
  setMarketSubclassFilter: Dispatch<SetStateAction<string | undefined>>;

  selectedAsset: MarketAsset | null;
  setSelectedAsset: Dispatch<SetStateAction<MarketAsset | null>>;
  selectedModule: CoreModule | null;
  setSelectedModule: Dispatch<SetStateAction<CoreModule | null>>;
  selectedSubclass: SelectedSubclass | null;
  setSelectedSubclass: Dispatch<SetStateAction<SelectedSubclass | null>>;

  onOpenSectorAnalysis: () => void;
  onOpenModuleById: (moduleId: string) => void;
};

export function AppOverlays({
  currentRoute,
  navigateTo,
  isAnalysisOpen,
  setIsAnalysisOpen,
  analysisInitialTab,
  setAnalysisInitialTab,
  analysisInitialTicker,
  analysisInitialSectorId,
  isMarketscreenerOpen,
  setIsMarketscreenerOpen,
  isProductTourOpen,
  setIsProductTourOpen,
  isAllMarketsOpen,
  setIsAllMarketsOpen,
  isMonetizationOpen,
  setIsMonetizationOpen,
  isVocabularyOpen,
  setIsVocabularyOpen,
  isAlertModalOpen,
  setIsAlertModalOpen,
  isWhaleRadarOpen,
  setIsWhaleRadarOpen,
  marketCategoryFilter,
  setMarketCategoryFilter,
  marketSubclassFilter,
  setMarketSubclassFilter,
  selectedAsset,
  setSelectedAsset,
  selectedModule,
  setSelectedModule,
  selectedSubclass,
  setSelectedSubclass,
  onOpenSectorAnalysis,
  onOpenModuleById,
}: AppOverlaysProps) {
  return (
    <Suspense fallback={null}>
      <AnalysisModal
        isOpen={isAnalysisOpen}
        onClose={() => {
          setIsAnalysisOpen(false);
          if (
            typeof window !== 'undefined' &&
            window.location.search.includes('analysis=')
          ) {
            window.history.replaceState({}, '', window.location.pathname);
          }
        }}
        initialTab={analysisInitialTab}
        initialTicker={analysisInitialTicker}
        initialSectorId={analysisInitialSectorId}
        onSelectAsset={setSelectedAsset}
      />

      <ProductTourModal
        isOpen={isProductTourOpen}
        onClose={() => setIsProductTourOpen(false)}
        onStartAnalysis={() => {
          setIsProductTourOpen(false);
          setIsAnalysisOpen(true);
        }}
      />

      <AssetDetailModal
        asset={selectedAsset}
        onClose={() => setSelectedAsset(null)}
        onOpenAllAlerts={() => setIsAlertModalOpen(true)}
      />

      <ModuleDetailModal
        module={selectedModule}
        onClose={() => setSelectedModule(null)}
        onOpenAnalysis={() => {
          setSelectedModule(null);
          setIsAnalysisOpen(true);
        }}
        onOpenVocabulary={() => {
          setSelectedModule(null);
          setIsVocabularyOpen(true);
        }}
      />

      <MarketVocabularyModal
        isOpen={isVocabularyOpen}
        onClose={() => {
          setIsVocabularyOpen(false);
        }}
        onOpenAnalysis={() => {
          setIsVocabularyOpen(false);
          setIsAnalysisOpen(true);
        }}
        onSelectAssetSymbol={(symbol) => {
          const cleanSymbol = symbol.split('/')[0].toUpperCase();
          const found = MARKET_ASSETS.find(
            (asset) =>
              asset.symbol.toUpperCase() === symbol.toUpperCase() ||
              asset.symbol.toUpperCase() === cleanSymbol ||
              asset.name.toUpperCase().includes(cleanSymbol),
          );
          if (found) setSelectedAsset(found);
        }}
      />

      <SubclassDetailModal
        isOpen={!!selectedSubclass}
        onClose={() => setSelectedSubclass(null)}
        subclass={selectedSubclass ? selectedSubclass.subclass : null}
        category={selectedSubclass ? selectedSubclass.category : null}
        onSelectAsset={setSelectedAsset}
        onOpenAnalysis={() => {
          setSelectedSubclass(null);
          setIsAnalysisOpen(true);
        }}
        onExploreMarkets={(subclassId) => {
          if (selectedSubclass) {
            setMarketCategoryFilter(selectedSubclass.category);
            setMarketSubclassFilter(
              subclassId || selectedSubclass.subclass.id,
            );
            setSelectedSubclass(null);
            setIsAllMarketsOpen(true);
          }
        }}
      />

      <AllMarketsModal
        isOpen={isAllMarketsOpen}
        onClose={() => {
          setIsAllMarketsOpen(false);
          setMarketSubclassFilter(undefined);
        }}
        initialCategory={marketCategoryFilter}
        initialSubclassId={marketSubclassFilter}
        onSelectAsset={(asset) => {
          setIsAllMarketsOpen(false);
          setSelectedAsset(asset);
        }}
      />

      <PriceAlertsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onSelectAsset={(asset) => {
          setIsAlertModalOpen(false);
          setSelectedAsset(asset);
        }}
      />

      <MonetizationModal
        isOpen={isMonetizationOpen}
        onClose={() => {
          setIsMonetizationOpen(false);
          if (currentRoute === '/pricing') {
            navigateTo('/');
          }
        }}
        onNavigateLogin={() => {
          setIsMonetizationOpen(false);
          navigateTo('/login');
        }}
        onOpenWhaleRadar={() => {
          setIsMonetizationOpen(false);
          setIsWhaleRadarOpen(true);
        }}
        onNavigateTokenomics={() => {
          setIsMonetizationOpen(false);
          navigateTo('/tokenomics');
        }}
      />

      <WhaleRadarModal
        isOpen={isWhaleRadarOpen}
        onClose={() => {
          setIsWhaleRadarOpen(false);
          if (currentRoute === '/whale-radar') {
            navigateTo('/');
          }
        }}
        onSelectAsset={(symbol) => {
          const found = MARKET_ASSETS.find(
            (asset) => asset.symbol.toUpperCase() === symbol.toUpperCase(),
          );
          if (found) setSelectedAsset(found);
        }}
      />

      <MarketscreenerModal
        isOpen={isMarketscreenerOpen}
        onClose={() => setIsMarketscreenerOpen(false)}
        onNavigate={navigateTo}
        onOpenAnalysis={(tab) => {
          setIsMarketscreenerOpen(false);
          if (tab) setAnalysisInitialTab(tab);
          setIsAnalysisOpen(true);
        }}
        onOpenSectorAnalysis={() => {
          setIsMarketscreenerOpen(false);
          onOpenSectorAnalysis();
        }}
        onOpenWhaleRadar={() => {
          setIsMarketscreenerOpen(false);
          setIsWhaleRadarOpen(true);
        }}
        onOpenModule={(moduleId) => {
          setIsMarketscreenerOpen(false);
          onOpenModuleById(moduleId);
        }}
        onViewAllMarkets={() => {
          setIsMarketscreenerOpen(false);
          setMarketCategoryFilter('ALLE');
          setIsAllMarketsOpen(true);
        }}
      />
    </Suspense>
  );
}
