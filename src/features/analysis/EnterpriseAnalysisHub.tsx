import { HistoricalAnalyticsDemo } from './HistoricalAnalyticsDemo';
import { ProductDisclaimer } from '../../components/ProductDisclaimer';
import { HubNavigationPanel } from '../../components/HubNavigationPanel';
import { navigateAppLocation } from '../../utils/appNavigation';
import React from 'react';
import { Mail } from 'lucide-react';
import { ContactForm } from '../../components/ContactForm';
import { useHubTab } from '../../hooks/useHubTab';
import { EnterpriseScorerDashboard } from '../screener/EnterpriseScorerDashboard';
import { ScreenerTable } from '../screener/ScreenerTable';
import { AnalysisComponentExplorer } from './AnalysisComponentExplorer';
import {
  SentimentIntelligencePanel,
  WhaleIntelligencePanel,
} from './MarketIntelligencePanels';
import { analysisUiEnabled } from './analysisUiFlags';
import { buttonClass } from './AnalysisUi';
import { BinanceMarketPanel } from './BinanceMarketPanel';
const TABS = [
  'overview',
  'scorer',
  'terminal',
  'binance',
  'components',
  'sentiment',
  'whales',
  'kontakt',
] as const;
const LABELS = {
  overview: 'Übersicht',
  scorer: 'Enterprise Scorer',
  terminal: 'Screener',
  binance: 'Krypto-Kursverlauf',
  components: '50 Analysekomponenten',
  sentiment: 'Sentiment',
  whales: 'Whale Radar',
  kontakt: 'Kontakt',
};
export function EnterpriseAnalysisHub({
  onSelectAsset,
}: {
  onSelectAsset?: (symbol: string) => void;
}) {
  const [tab, setTab] = useHubTab(TABS, 'overview');
  const enabledTabs = TABS.filter(
    (id) =>
      !['components', 'sentiment', 'whales'].includes(id) ||
      analysisUiEnabled(id as 'components' | 'sentiment' | 'whales'),
  );
  const active = enabledTabs.includes(tab) ? tab : 'overview';
  return (
    <div className="space-y-6">
      <HubNavigationPanel hubId="marketscreener" onNavigate={navigateAppLocation} />
      {['overview', 'scorer', 'terminal'].includes(active) && <HistoricalAnalyticsDemo showMethodology={active !== 'scorer'} />}
      {active === 'scorer' && (
        <EnterpriseScorerDashboard onSelectAsset={onSelectAsset} />
      )}
      {active === 'terminal' && <ScreenerTable />}
      {active === 'binance' && <BinanceMarketPanel />}
      {active === 'components' && <AnalysisComponentExplorer />}
      {active === 'sentiment' && <SentimentIntelligencePanel />}
      {active === 'whales' && <WhaleIntelligencePanel />}
      {active === 'kontakt' && <ContactForm />}
    </div>
  );
}
