import { type FinalRankResult } from '../../contracts/canonicalContracts';
import { type ProductAssetClass } from '../../contracts/marketAssetTaxonomy';
import { safeScorePresentation } from './scorePresentation';
export interface ScreenerRowItem {
  assetId: string;
  symbol: string;
  name: string;
  assetClass: ProductAssetClass;
  market: string;
  sector: string;
  regime: string;
  liquidity: number | null;
  scoreChange: number | null;
  sentimentVelocity: number | null;
  sentimentDirection: 'positive' | 'neutral' | 'negative' | 'unavailable';
  riskFlags: string[];
  rawResult: FinalRankResult;
}
export interface ScreenerFilters {
  search: string;
  assetClass: string;
  market: string;
  sector: string;
  minScore: number;
  maxScore: number;
  minConfidence: number;
  minLiquidity: number;
  status: string;
  regime: string;
  sentiment: string;
  risk: string;
  sort: string;
}
export function projectScreenerRows(
  items: readonly ScreenerRowItem[],
  filters: ScreenerFilters,
  now: number,
) {
  return items
    .map((item) => ({
      item,
      presentation: safeScorePresentation(item.rawResult, now),
    }))
    .filter(({ item, presentation: p }) => {
      if (
        !p.result ||
        p.result.assetId !== item.assetId ||
        p.result.symbol !== item.symbol
      )
        return false;
      const search = filters.search.toLocaleLowerCase('de');
      if (
        search &&
        !(item.symbol + ' ' + item.name)
          .toLocaleLowerCase('de')
          .includes(search)
      )
        return false;
      if (
        filters.assetClass !== 'all' &&
        filters.assetClass !== item.assetClass
      )
        return false;
      if (
        filters.market &&
        !item.market
          .toLocaleLowerCase('de')
          .includes(filters.market.toLocaleLowerCase('de'))
      )
        return false;
      if (
        filters.sector &&
        !item.sector
          .toLocaleLowerCase('de')
          .includes(filters.sector.toLocaleLowerCase('de'))
      )
        return false;
      if (
        filters.minScore > 0 &&
        (p.score === null || p.score < filters.minScore)
      )
        return false;
      if (
        filters.maxScore < 100 &&
        (p.score === null || p.score > filters.maxScore)
      )
        return false;
      if (
        filters.minConfidence > 0 &&
        (p.score === null || p.result.confidence * 100 < filters.minConfidence)
      )
        return false;
      if (
        filters.minLiquidity > 0 &&
        (item.liquidity === null ||
          !Number.isFinite(item.liquidity) ||
          item.liquidity < filters.minLiquidity)
      )
        return false;
      if (filters.status !== 'all' && p.data !== filters.status) return false;
      if (
        filters.regime &&
        !item.regime
          .toLocaleLowerCase('de')
          .includes(filters.regime.toLocaleLowerCase('de'))
      )
        return false;
      if (
        filters.sentiment !== 'all' &&
        filters.sentiment !== item.sentimentDirection
      )
        return false;
      if (filters.risk === 'flagged' && !item.riskFlags.length) return false;
      if (filters.risk === 'unflagged' && item.riskFlags.length) return false;
      return true;
    })
    .sort((a, b) => {
      const eligibleA = a.presentation.score !== null,
        eligibleB = b.presentation.score !== null;
      if (eligibleA !== eligibleB) return eligibleA ? -1 : 1;
      // Unavailable/demo/ineligible rows never get a synthetic score rank.
      if (!eligibleA) return a.item.symbol.localeCompare(b.item.symbol);
      const value = (row: typeof a): number | null => {
        if (filters.sort === 'momentum')
          return row.item.rawResult.subScores.momentumScore;
        if (filters.sort === 'catalyst')
          return row.item.rawResult.subScores.eventScore;
        if (filters.sort === 'scoreChange') return row.item.scoreChange;
        if (filters.sort === 'sentimentVelocity')
          return row.item.sentimentVelocity;
        return row.presentation.score;
      };
      const left = value(a),
        right = value(b);
      return (
        (right ?? -Infinity) - (left ?? -Infinity) ||
        a.item.symbol.localeCompare(b.item.symbol)
      );
    });
}
export const numericFilter = (value: string, fallback: number) => {
  const n = value.trim() === '' ? NaN : Number(value);
  return Number.isFinite(n) && n >= 0 && n <= 100 ? n : fallback;
};
