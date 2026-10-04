import React from 'react';
import type {
  MainCategory,
  MarketAsset,
} from '../../entities/market/model';
import { DataUnavailable } from '../../shared/ui/DataUnavailable';

export const SectorAnalysis: React.FC<{
  onSelectAsset?: (asset: MarketAsset) => void;
  onOpenPriceAlerts?: () => void;
  onExploreMarkets?: (category?: MainCategory | 'ALLE') => void;
}> = () => (
  <DataUnavailable
    title="Sector Rotation"
    required="vergleichbare Sektor- und Benchmark-Zeitreihen"
    id="sector-analysis-section"
  />
);
