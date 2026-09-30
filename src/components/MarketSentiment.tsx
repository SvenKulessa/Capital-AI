import React from 'react';
import type { MarketAsset, MainCategory } from '../types';
import { DataUnavailable } from './DataUnavailable';
export const MarketSentiment: React.FC<{ onStartAnalysis?: () => void; onExploreMarkets?: () => void }> = () => <DataUnavailable title="Market Sentiment Index" required="validierte News-, Social-, Volatilitäts- und historische Kursdaten" id="market-sentiment-section" />;
