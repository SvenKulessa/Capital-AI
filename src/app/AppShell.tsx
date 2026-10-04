import { lazy, Suspense } from 'react';
import { PriceAlertToast } from '../features/alerts/PriceAlertToast';
import { HeroBuddy } from '../components/HeroBuddy';
import { useRouteAnalytics } from '../platform/analytics/useRouteAnalytics';
import { useMarketAssets } from '../services/marketDataStore';
import { RouteLoadingFallback } from '../shared/ui/RouteLoadingFallback';
import { ApplicationViewport } from './layout/ApplicationViewport';
import { useAppOverlayController } from './overlays/useAppOverlayController';
import { AppRoutes } from './routing/AppRoutes';
import { useBrowserRoute } from './routing/useBrowserRoute';

const AppOverlays = lazy(() =>
  import('./AppOverlays').then((module) => ({ default: module.AppOverlays })),
);

export function AppShell() {
  useMarketAssets();
  const { currentRoute, navigateTo, analysisRequest } = useBrowserRoute();
  useRouteAnalytics(currentRoute);

  const ui = useAppOverlayController({
    currentRoute,
    navigateTo,
    analysisRequest,
  });

  return (
    <>
      <ApplicationViewport currentRoute={currentRoute}>
        <Suspense fallback={<RouteLoadingFallback />}>
          <AppRoutes
            currentRoute={currentRoute}
            navigateTo={navigateTo}
            onSelectAsset={ui.setSelectedAsset}
            onOpenMarketscreener={() => ui.setIsMarketscreenerOpen(true)}
            onOpenAnalysis={() => ui.setIsAnalysisOpen(true)}
            onOpenSectorAnalysis={ui.handleOpenSectorAnalysis}
            onOpenModule={ui.handleOpenModuleById}
            onOpenVocabulary={() => ui.setIsVocabularyOpen(true)}
            onOpenPriceAlerts={() => ui.setIsAlertModalOpen(true)}
            onOpenMonetization={() => ui.setIsMonetizationOpen(true)}
            onOpenWhaleRadar={() => ui.setIsWhaleRadarOpen(true)}
            onSelectSubclass={(subclass, category) =>
              ui.setSelectedSubclass({ subclass, category })
            }
            onExploreMarkets={ui.handleExploreMarkets}
            onSelectModule={ui.setSelectedModule}
            onStartProductTour={() => ui.setIsProductTourOpen(true)}
          />
        </Suspense>
      </ApplicationViewport>

      <PriceAlertToast
        onSelectAsset={ui.setSelectedAsset}
        onOpenSentiment={() => {
          document
            .getElementById('market-sentiment-section')
            ?.scrollIntoView({ behavior: 'smooth' });
        }}
      />

      <HeroBuddy
        onNavigate={navigateTo}
        onOpenMonetization={() => ui.setIsMonetizationOpen(true)}
        onOpenVocabulary={() => ui.setIsVocabularyOpen(true)}
        onOpenAlerts={() => ui.setIsAlertModalOpen(true)}
        onOpenWhaleRadar={() => ui.setIsWhaleRadarOpen(true)}
        onOpenAnalysis={() => ui.setIsAnalysisOpen(true)}
      />

      {ui.shouldRenderOverlays && (
        <Suspense fallback={null}>
          <AppOverlays
            currentRoute={currentRoute}
            navigateTo={navigateTo}
            isAnalysisOpen={ui.isAnalysisOpen}
            setIsAnalysisOpen={ui.setIsAnalysisOpen}
            analysisInitialTab={ui.analysisInitialTab}
            setAnalysisInitialTab={ui.setAnalysisInitialTab}
            analysisInitialTicker={ui.analysisInitialTicker}
            analysisInitialSectorId={ui.analysisInitialSectorId}
            isMarketscreenerOpen={ui.isMarketscreenerOpen}
            setIsMarketscreenerOpen={ui.setIsMarketscreenerOpen}
            isProductTourOpen={ui.isProductTourOpen}
            setIsProductTourOpen={ui.setIsProductTourOpen}
            isAllMarketsOpen={ui.isAllMarketsOpen}
            setIsAllMarketsOpen={ui.setIsAllMarketsOpen}
            isMonetizationOpen={ui.isMonetizationOpen}
            setIsMonetizationOpen={ui.setIsMonetizationOpen}
            isVocabularyOpen={ui.isVocabularyOpen}
            setIsVocabularyOpen={ui.setIsVocabularyOpen}
            isAlertModalOpen={ui.isAlertModalOpen}
            setIsAlertModalOpen={ui.setIsAlertModalOpen}
            isWhaleRadarOpen={ui.isWhaleRadarOpen}
            setIsWhaleRadarOpen={ui.setIsWhaleRadarOpen}
            marketCategoryFilter={ui.marketCategoryFilter}
            setMarketCategoryFilter={ui.setMarketCategoryFilter}
            marketSubclassFilter={ui.marketSubclassFilter}
            setMarketSubclassFilter={ui.setMarketSubclassFilter}
            selectedAsset={ui.selectedAsset}
            setSelectedAsset={ui.setSelectedAsset}
            selectedModule={ui.selectedModule}
            setSelectedModule={ui.setSelectedModule}
            selectedSubclass={ui.selectedSubclass}
            setSelectedSubclass={ui.setSelectedSubclass}
            onOpenSectorAnalysis={ui.handleOpenSectorAnalysis}
            onOpenModuleById={ui.handleOpenModuleById}
          />
        </Suspense>
      )}
    </>
  );
}
