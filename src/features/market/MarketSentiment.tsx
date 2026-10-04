import React from 'react';
import { DataUnavailable } from '../../shared/ui/DataUnavailable';

export const MarketSentiment: React.FC<{
  onStartAnalysis?: () => void;
  onExploreMarkets?: () => void;
}> = () => (
  <DataUnavailable
    title="Market Sentiment Index"
    required="validierte News-, Social-, Volatilitäts- und historische Kursdaten"
    id="market-sentiment-section"
  />
);
