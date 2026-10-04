import { useEffect, useState } from 'react';
import { usePriceAlerts } from '../../context/PriceAlertsContext';
import { CORE_MODULES } from '../../data/mockData';
import type {
  AssetSubclass,
  MainCategory,
  MarketAsset,
} from '../../entities/market/model';
import type { CoreModule } from '../../entities/module/model';
import type { AnalysisRouteRequest } from '../routing/useBrowserRoute';

type OverlayControllerArgs = {
  currentRoute: string;
  navigateTo: (path: string) => void;
  analysisRequest: AnalysisRouteRequest;
};

export function useAppOverlayController({
  currentRoute,
  navigateTo,
  analysisRequest,
}: OverlayControllerArgs) {
  const {
    isAlertModalOpen,
    setIsAlertModalOpen,
    isWhaleRadarOpen,
    setIsWhaleRadarOpen,
  } = usePriceAlerts();

  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isMarketscreenerOpen, setIsMarketscreenerOpen] = useState(false);
  const [isProductTourOpen, setIsProductTourOpen] = useState(false);
  const [isAllMarketsOpen, setIsAllMarketsOpen] = useState(false);
  const [isMonetizationOpen, setIsMonetizationOpen] = useState(
    () => currentRoute === '/pricing',
  );
  const [isVocabularyOpen, setIsVocabularyOpen] = useState(false);
  const [marketCategoryFilter, setMarketCategoryFilter] = useState<
    'ALLE' | MainCategory
  >('ALLE');
  const [marketSubclassFilter, setMarketSubclassFilter] = useState<
    string | undefined
  >(undefined);
  const [selectedAsset, setSelectedAsset] = useState<MarketAsset | null>(null);
  const [selectedModule, setSelectedModule] = useState<CoreModule | null>(null);
  const [selectedSubclass, setSelectedSubclass] = useState<{
    subclass: AssetSubclass;
    category: MainCategory;
  } | null>(null);
  const [analysisInitialTab, setAnalysisInitialTab] = useState<
    'asset' | 'sector'
  >('asset');
  const [analysisInitialTicker, setAnalysisInitialTicker] = useState<
    string | undefined
  >(undefined);
  const [analysisInitialSectorId, setAnalysisInitialSectorId] = useState<
    string | undefined
  >(undefined);
  const [overlaysLoaded, setOverlaysLoaded] = useState(false);

  useEffect(() => {
    if (!analysisRequest) return;
    setAnalysisInitialTab(analysisRequest.tab);
    setAnalysisInitialTicker(analysisRequest.ticker);
    setAnalysisInitialSectorId(analysisRequest.sectorId);
    setIsAnalysisOpen(true);
  }, [analysisRequest]);

  useEffect(() => {
    if (currentRoute === '/pricing') setIsMonetizationOpen(true);
    if (currentRoute === '/whale-radar') setIsWhaleRadarOpen(true);
  }, [currentRoute, setIsWhaleRadarOpen]);

  const handleOpenModuleById = (moduleId: string) => {
    if (moduleId === 'vocabulary') {
      setIsVocabularyOpen(true);
      return;
    }
    const found = CORE_MODULES.find((module) => module.id === moduleId);
    if (found) setSelectedModule(found);
  };

  const handleOpenSectorAnalysis = () => {
    if (currentRoute !== '/') {
      navigateTo('/');
      setTimeout(() => {
        document
          .getElementById('sector-analysis-section')
          ?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }

    const element = document.getElementById('sector-analysis-section');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    } else {
      setIsAnalysisOpen(true);
    }
  };

  const handleExploreMarkets = (category?: MainCategory | 'ALLE') => {
    setMarketCategoryFilter(category ?? 'ALLE');
    setIsAllMarketsOpen(true);
  };

  const hasOpenOverlay =
    isAnalysisOpen ||
    isMarketscreenerOpen ||
    isProductTourOpen ||
    isAllMarketsOpen ||
    isMonetizationOpen ||
    isVocabularyOpen ||
    isAlertModalOpen ||
    isWhaleRadarOpen ||
    selectedAsset !== null ||
    selectedModule !== null ||
    selectedSubclass !== null;

  useEffect(() => {
    if (hasOpenOverlay) setOverlaysLoaded(true);
  }, [hasOpenOverlay]);

  return {
    isAlertModalOpen,
    setIsAlertModalOpen,
    isWhaleRadarOpen,
    setIsWhaleRadarOpen,
    isAnalysisOpen,
    setIsAnalysisOpen,
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
    analysisInitialTab,
    setAnalysisInitialTab,
    analysisInitialTicker,
    analysisInitialSectorId,
    handleOpenModuleById,
    handleOpenSectorAnalysis,
    handleExploreMarkets,
    shouldRenderOverlays: overlaysLoaded || hasOpenOverlay,
  };
}
