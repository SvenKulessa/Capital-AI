import React from 'react';
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
const TABS = [
  'overview',
  'scorer',
  'terminal',
  'components',
  'sentiment',
  'whales',
] as const;
const LABELS = {
  overview: 'Übersicht',
  scorer: 'Enterprise Scorer',
  terminal: 'Screener',
  components: '50 Analysekomponenten',
  sentiment: 'Sentiment',
  whales: 'Whale Radar',
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
      <nav
        aria-label="Market Intelligence Unterseiten"
        className="flex flex-wrap gap-2"
      >
        {enabledTabs.map((id) => (
          <button
            type="button"
            key={id}
            aria-pressed={active === id}
            onClick={() => setTab(id)}
            className={
              buttonClass +
              (active === id
                ? ' border-amber-400 bg-amber-400/10 text-amber-200'
                : '')
            }
          >
            {LABELS[id]}
          </button>
        ))}
      </nav>
      {['overview', 'scorer'].includes(active) && (
        <EnterpriseScorerDashboard onSelectAsset={onSelectAsset} />
      )}
      {['overview', 'terminal'].includes(active) && <ScreenerTable />}
      {active === 'components' && <AnalysisComponentExplorer />}
      {active === 'sentiment' && <SentimentIntelligencePanel />}
      {active === 'whales' && <WhaleIntelligencePanel />}
    </div>
  );
}
