import React from 'react';
import type { MarketAsset, MainCategory } from '../types';
import { DataUnavailable } from './DataUnavailable';
export const SectorAnalysis: React.FC<{ onSelectAsset?: (asset: MarketAsset) => void; onOpenPriceAlerts?: () => void; onExploreMarkets?: (category?: MainCategory | 'ALLE') => void }> = () => <DataUnavailable title="Sector Rotation" required="vergleichbare Sektor- und Benchmark-Zeitreihen" id="sector-analysis-section" />;
