import { lazy } from 'react';
import type { LegalRoute } from '../../components/LegalAndFaqPages';
import {
  ResearchLicensePages,
} from '../../components/ResearchLicensePages';
import {
  RESEARCH_ROUTES,
  type ResearchRoute,
} from '../../data/researchLicenses';
import { MARKET_ASSETS } from '../../data/mockData';
import type {
  AssetSubclass,
  MainCategory,
  MarketAsset,
} from '../../entities/market/model';
import type { CoreModule } from '../../entities/module/model';
import { HomePage } from '../../features/home/HomePage';
import { DataUnavailable } from '../../shared/ui/DataUnavailable';
import { LEGAL_ROUTES } from './routes';

const LoginPage = lazy(() =>
  import('../../features/auth/LoginPage').then((module) => ({
    default: module.LoginPage,
  })),
);
const LegalAndFaqPages = lazy(() =>
  import('../../components/LegalAndFaqPages').then((module) => ({
    default: module.LegalAndFaqPages,
  })),
);

const ProfilePage = lazy(() =>
  import('../../components/ProfilePage').then((module) => ({
    default: module.ProfilePage,
  })),
);
const SecurityPage = lazy(() =>
  import('../../components/SecurityPage').then((module) => ({
    default: module.SecurityPage,
  })),
);
const KeyVaultPage = lazy(() =>
  import('../../components/KeyVaultPage').then((module) => ({
    default: module.KeyVaultPage,
  })),
);
const ArchitecturePage = lazy(() =>
  import('../../components/ArchitecturePage').then((module) => ({
    default: module.ArchitecturePage,
  })),
);
const TokenomicsPage = lazy(() =>
  import('../../components/TokenomicsPage').then((module) => ({
    default: module.TokenomicsPage,
  })),
);
const PipelineBuilder = lazy(() =>
  import('../../features/pipeline-builder/PipelineBuilder').then((module) => ({
    default: module.PipelineBuilder,
  })),
);
const StudioPage = lazy(() =>
  import('../../features/studio/StudioPage').then((module) => ({
    default: module.StudioPage,
  })),
);
const LearningPortalPage = lazy(() =>
  import('../../features/learning/LearningPortalPage').then((module) => ({
    default: module.LearningPortalPage,
  })),
);
const ControlCenterPage = lazy(() =>
  import('../../components/ControlCenterPage').then((module) => ({
    default: module.ControlCenterPage,
  })),
);
const BlueprintDocumentationPage = lazy(() =>
  import('../../features/documentation/BlueprintDocumentationPage').then((module) => ({
    default: module.BlueprintDocumentationPage,
  })),
);
const DocumentationHub = lazy(() =>
  import('../../features/documentation/DocumentationHub').then((module) => ({
    default: module.DocumentationHub,
  })),
);
const EnterpriseScorerDashboard = lazy(() =>
  import('../../features/screener/EnterpriseScorerDashboard').then((module) => ({
    default: module.EnterpriseScorerDashboard,
  })),
);
const ScreenerTable = lazy(() =>
  import('../../features/screener/ScreenerTable').then((module) => ({
    default: module.ScreenerTable,
  })),
);

type AppRoutesProps = {
  currentRoute: string;
  navigateTo: (path: string) => void;
  onSelectAsset: (asset: MarketAsset) => void;
  onOpenMarketscreener: () => void;
  onOpenAnalysis: () => void;
  onOpenSectorAnalysis: () => void;
  onOpenModule: (moduleId: string) => void;
  onOpenVocabulary: () => void;
  onOpenPriceAlerts: () => void;
  onOpenMonetization: () => void;
  onOpenWhaleRadar: () => void;
  onSelectSubclass: (subclass: AssetSubclass, category: MainCategory) => void;
  onExploreMarkets: (category?: MainCategory | 'ALLE') => void;
  onSelectModule: (module: CoreModule) => void;
  onStartProductTour: () => void;
};

export function AppRoutes({
  currentRoute,
  navigateTo,
  onSelectAsset,
  onOpenMarketscreener,
  onOpenAnalysis,
  onOpenSectorAnalysis,
  onOpenModule,
  onOpenVocabulary,
  onOpenPriceAlerts,
  onOpenMonetization,
  onOpenWhaleRadar,
  onSelectSubclass,
  onExploreMarkets,
  onSelectModule,
  onStartProductTour,
}: AppRoutesProps) {
  if (currentRoute === '/login') {
    return (
      <LoginPage
        onBackToHome={() => navigateTo('/')}
        onNavigateFaq={() => navigateTo('/faq')}
        onNavigateLegal={navigateTo}
      />
    );
  }

  if (currentRoute === '/profile') {
    return <ProfilePage onNavigate={navigateTo} />;
  }

  if (currentRoute === '/profile/security') {
    return <SecurityPage onNavigate={navigateTo} />;
  }

  if (currentRoute === '/profile/key-vault') {
    return <KeyVaultPage onNavigate={navigateTo} />;
  }

  if (currentRoute === '/pipeline-builder') {
    return (
      <PipelineBuilder
        onBackToHome={() => navigateTo('/')}
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateTokenomics={() => navigateTo('/tokenomics')}
      />
    );
  }

  if (currentRoute === '/studio' || currentRoute === '/founder') {
    return (
      <StudioPage
        onBackToHome={() => navigateTo('/')}
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateLegal={navigateTo}
        onNavigate={navigateTo}
      />
    );
  }

  if (currentRoute === '/architecture') {
    return (
      <ArchitecturePage
        onBackToHome={() => navigateTo('/')}
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateLegal={navigateTo}
        onNavigateTokenomics={() => navigateTo('/tokenomics')}
      />
    );
  }

  if (currentRoute === '/tokenomics') {
    return (
      <TokenomicsPage
        onBackToHome={() => navigateTo('/')}
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateLegal={navigateTo}
      />
    );
  }

  if (currentRoute === '/provider-status') {
    return (
      <DataUnavailable
        title="Provider-Status"
        required="freigegebene öffentliche Runtime-, Provider- und Health-Evidence"
      />
    );
  }

  if (currentRoute === '/marketscreener/dokumentation') {
    return <BlueprintDocumentationPage onNavigate={navigateTo} />;
  }

  if (currentRoute === '/dokumentation') {
    return (
      <DocumentationHub
        onBackToHome={() => navigateTo('/')}
        onNavigate={navigateTo}
      />
    );
  }

  if (currentRoute === '/screener' || currentRoute === '/marketscreener') {
    return (
      <div className="w-full text-slate-100 min-h-screen py-6 px-3 sm:px-6 space-y-6">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-mono">
            <span>Capital-AI</span>
            <span>/</span>
            <span className="text-amber-400 font-bold">
              Enterprise Screener &amp; Scorer
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => navigateTo('/marketscreener/dokumentation')}
              className="px-3 py-1.5 rounded-xl border border-amber-400/30 bg-amber-400/10 hover:bg-amber-400/15 text-amber-200 text-xs font-bold transition-all cursor-pointer"
            >
              Dokumentation
            </button>
            <button
              type="button"
              onClick={() => navigateTo('/')}
              className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-bold transition-all cursor-pointer"
            >
              ← Zurück zur Startseite
            </button>
          </div>
        </div>
        <EnterpriseScorerDashboard
          onSelectAsset={(symbol) => {
            const found = MARKET_ASSETS.find((asset) => asset.symbol === symbol);
            if (found) onSelectAsset(found);
          }}
        />
        <div className="pt-4 border-t border-slate-800 space-y-3">
          <h3 className="text-base font-bold text-white font-mono flex items-center gap-2">
            <span>Vollständige Screener-Tabelle (Cross-Sectional Ranking)</span>
          </h3>
          <ScreenerTable />
        </div>
      </div>
    );
  }

  if (
    currentRoute === '/learning' ||
    currentRoute === '/vocabulary' ||
    currentRoute.startsWith('/vocabulary/')
  ) {
    const vocabularyTermId = currentRoute.startsWith('/vocabulary/')
      ? currentRoute.slice('/vocabulary/'.length)
      : undefined;

    return (
      <LearningPortalPage
        onBackToHome={() => navigateTo('/')}
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateTab={navigateTo}
        initialVocabularyTermId={vocabularyTermId}
      />
    );
  }

  if (currentRoute === '/control-center') {
    return (
      <ControlCenterPage
        onBackToHome={() => navigateTo('/')}
        onNavigateLogin={() => navigateTo('/login')}
        onNavigateTab={navigateTo}
      />
    );
  }

  if (RESEARCH_ROUTES.includes(currentRoute as ResearchRoute)) {
    return (
      <ResearchLicensePages
        route={currentRoute as ResearchRoute}
        onNavigate={navigateTo}
      />
    );
  }

  if (LEGAL_ROUTES.includes(currentRoute as LegalRoute)) {
    return (
      <LegalAndFaqPages
        route={currentRoute as LegalRoute}
        onNavigate={navigateTo}
      />
    );
  }

  return (
    <HomePage
      currentRoute={currentRoute}
      onNavigate={navigateTo}
      onOpenMarketscreener={onOpenMarketscreener}
      onOpenAnalysis={onOpenAnalysis}
      onOpenSectorAnalysis={onOpenSectorAnalysis}
      onOpenModule={onOpenModule}
      onOpenVocabulary={onOpenVocabulary}
      onOpenPriceAlerts={onOpenPriceAlerts}
      onOpenMonetization={onOpenMonetization}
      onOpenWhaleRadar={onOpenWhaleRadar}
      onNavigateLogin={() => navigateTo('/login')}
      onSelectSubclass={onSelectSubclass}
      onExploreMarkets={onExploreMarkets}
      onSelectAsset={onSelectAsset}
      onSelectModule={onSelectModule}
      onStartProductTour={onStartProductTour}
    />
  );
}
