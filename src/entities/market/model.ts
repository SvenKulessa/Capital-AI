export type MainCategory =
  | 'KRYPTO'
  | 'AKTIEN'
  | 'INDIZIES'
  | 'FOREX'
  | 'ROHSTOFFE'
  | 'ETFS'
  | 'FUTURES'
  | 'OPTIONEN'
  | 'ANLEIHEN';

export interface AssetSubclass {
  id: string;
  name: string;
  shortDesc: string;
  examples: string[];
  trending?: string;
}

export interface AssetClassInfo {
  id: MainCategory;
  name: string;
  color: string;
  description: string;
  subclasses: AssetSubclass[];
}

export interface MarketAsset {
  id: string;
  name: string;
  symbol: string;
  value: string;
  change: string;
  isPositive: boolean;
  mainCategory: MainCategory;
  subclassId?: string;
  subclassName?: string;
  iconType:
    | 'trend'
    | 'bitcoin'
    | 'gold'
    | 'forex'
    | 'stock'
    | 'crypto'
    | 'commodity'
    | 'index';
  sparklinePath: string;
  glowColor: string;
  borderColor: string;
  waveColor: string;
  category: string;
  high24h: string;
  low24h: string;
  volume24h: string;
  aiScore: number | null;
  aiRating: string;
  description: string;
  evidenceId?: string;
  observedAt?: number;
  provider?: string;
  dataAvailability?: 'live' | 'cached';
  quoteCurrency?: string;
  price?: number;
  actionable?: boolean;
}
