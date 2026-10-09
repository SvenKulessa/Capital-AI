/**
 * Narrow Finance source DTOs. Provider fetches are not copied: CAPITAL-AI rights and private BYOK
 * boundaries own ingestion. Observations require independent provenance/permission evaluation.
 */
export interface CommodityMarketEvidence {
  version: 'commodity-market-evidence/1.0.0';
  symbol: string;
  provider: string;
  providerId: string;
  providerSymbol: string;
  providerName: string;
  points: { date: string; close: number }[];
  observedAt: string;
  retrievedAt: string;
  sourcePath: string;
  evidenceIds: string[];
}
export interface BondEvidenceResult {
  provider: 'EODHD';
  providerSymbol: string;
  points: { date: string; value: number }[];
  retrievedAt: string;
  sourcePath: string;
  evidenceIds: string[];
}