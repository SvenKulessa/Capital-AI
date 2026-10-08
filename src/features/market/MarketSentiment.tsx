import React from 'react';
import { DataUnavailable } from '../../shared/ui/DataUnavailable';
const SentimentIntelligencePanel = React.lazy(() => import('../analysis/MarketIntelligencePanels').then(m => ({ default: m.SentimentIntelligencePanel })));
import { analysisUiEnabled } from '../analysis/analysisUiFlags';
export const MarketSentiment: React.FC<{ onStartAnalysis?: () => void; onExploreMarkets?: () => void }> = ({ onStartAnalysis }) =>
  analysisUiEnabled('sentiment') ? <React.Suspense fallback={<p role="status" className="p-5 text-slate-300">Sentiment-Ansicht wird geladen …</p>}><SentimentIntelligencePanel onStartAnalysis={onStartAnalysis} /></React.Suspense> :
    <DataUnavailable title="Market Sentiment Index" required="validierte News-, Social-, Volatilitäts- und historische Kursdaten" id="market-sentiment-section" />;
