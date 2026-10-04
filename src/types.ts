/**
 * ============================================================================
 * [ARCHITEKTUR-MAPPING & DATEN-MODELL: CORE TYPES & INTERFACES]
 * ----------------------------------------------------------------------------
 * 1. GRAFISCHE KOMPONENTE : Typisierungs-Fundament für alle UI-Komponenten (Ticker, Modals, Radar, Alerts)
 * 2. SCORING-LOGIK        : Datenmodelle für AI-Score (0-100), Fear & Greed Index,
 *                           SMFI (Smart Money Flow Index), Sector Relative Strength, Buffett Value Check
 * 3. DATENANBINDUNG       : Schnittstellen für Context (PriceAlertsContext), Webhooks, Telegram API
 * 4. DATENQUELLEN / FEEDS : Schemata für Multi-Asset Börsenkurse, Mempool On-Chain Blöcke, ATS Dark Pools
 * ============================================================================
 */

import type { MainCategory } from './entities/market/model';

export type {
  MainCategory,
  AssetSubclass,
  AssetClassInfo,
  MarketAsset,
} from './entities/market/model';
export type { CoreModule } from './entities/module/model';

export interface KeyPillar {
  id: string;
  title: string;
  iconType: 'coins' | 'ai-brain' | 'users' | 'globe';
  color: string;
}

export type AlertCondition = 'ABOVE' | 'BELOW';

export type SentimentLevel =
  | 'EXTREME_FEAR'
  | 'FEAR'
  | 'NEUTRAL'
  | 'GREED'
  | 'EXTREME_GREED';

export type SentimentConditionType =
  | 'TRANSITION_TO'     // Triggered when sentiment transitions to a target level
  | 'TRANSITION_FROM_TO' // Triggered on specific transition (e.g., FEAR -> EXTREME_GREED)
  | 'SCORE_ABOVE'       // Triggered when sentiment score rises above threshold
  | 'SCORE_BELOW'       // Triggered when sentiment score falls below threshold
  | 'REGIME_CHANGE';    // Triggered on any regime flip between Fear and Greed

export interface PriceAlertSentimentCoupling {
  enabled: boolean;
  requiredSentiment?: SentimentLevel | 'ANY_GREED' | 'ANY_FEAR';
  triggerOnSentimentShift?: boolean;
  targetRegime?: string;
  category?: 'ALLE' | MainCategory;
}

export interface PriceAlert {
  id: string;
  assetId: string;
  assetSymbol: string;
  assetName: string;
  assetCategory: MainCategory;
  targetPrice: number;
  initialPrice: number;
  currentPrice: number;
  direction: AlertCondition;
  note?: string;
  isEnabled: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  formattedTarget: string;
  sentimentCoupling?: PriceAlertSentimentCoupling;
}

export interface SentimentAlert {
  id: string;
  type: 'SENTIMENT';
  category: 'ALLE' | MainCategory;
  categoryLabel: string;
  conditionType: SentimentConditionType;
  targetLevel?: SentimentLevel;
  fromLevel?: SentimentLevel;
  targetScore?: number;
  scoreDirection?: 'ABOVE' | 'BELOW';
  coupledAssetSymbol?: string;
  coupledAssetName?: string;
  note?: string;
  isEnabled: boolean;
  isTriggered: boolean;
  triggeredAt?: string;
  createdAt: string;
  title: string;
  description: string;
  triggerDetail?: string;
}

export type AlertToastData =
  | {
      type: 'PRICE';
      alert: PriceAlert;
    }
  | {
      type: 'SENTIMENT';
      sentimentAlert: SentimentAlert;
    };

export interface TelegramMessageLog {
  id: string;
  sentAt: string;
  title: string;
  body: string;
  status: 'DELIVERED' | 'SIMULATED' | 'FAILED';
  chatId?: string;
}

export interface TelegramConfig {
  enabled: boolean;
  connected: boolean;
  chatId?: string;
  channelName?: string;
  notifyWhaleRadar: boolean;
  notifySmartMoney: boolean;
  notifyPriceAlerts: boolean;
  notifySentimentFlips: boolean;
  minWhaleVolumeMln: number; // e.g. 5 for $5M+
  lastTestedAt?: string;
}

export interface UserAlertPreferences {
  inAppNotifications: boolean;
  soundEnabled: boolean;
  emailDigest: boolean;
  pushSimulation: boolean;
  autoCheckIntervalSec: number;
  sentimentAlertsEnabled?: boolean;
  telegram?: TelegramConfig;
}

export type WhaleActionType =
  | 'EXCHANGE_INFLOW'   // Bearish / Potential Sell pressure
  | 'EXCHANGE_OUTFLOW'  // Bullish / Strong Accumulation / Cold Storage
  | 'INTERNAL_TRANSFER' // Neutral / Wallet Reorganization
  | 'DARK_POOL_BUY'     // Institutional Equity Accumulation
  | 'DARK_POOL_SELL'    // Institutional Equity Distribution
  | 'OTC_SETTLEMENT'    // Whale OTC Deal
  | 'DEFI_MINT_BURN';   // Stablecoin Issuance / Burn

export type SmartMoneyBias =
  | 'STRONG_BULLISH'
  | 'BULLISH'
  | 'NEUTRAL'
  | 'BEARISH'
  | 'STRONG_BEARISH';

export interface WhaleWalletInfo {
  address: string;
  label: string;
  isExchange: boolean;
  entityName?: string;
}

export interface WhaleTransaction {
  id: string;
  timestamp: string;
  assetSymbol: string;
  assetName: string;
  category: MainCategory;
  amountNative: number;
  amountUsd: number;
  actionType: WhaleActionType;
  actionLabel: string;
  fromWallet: WhaleWalletInfo;
  toWallet: WhaleWalletInfo;
  smartMoneyBias: SmartMoneyBias;
  impactScore: number; // 0 - 100
  aiInterpretation: string;
  txHash: string;
  explorerUrl?: string;
  telegramPushed?: boolean;
}

export interface SmartMoneyFlowMetric {
  assetSymbol: string;
  assetName: string;
  category: MainCategory;
  score: number; // 0 - 100
  netInflow24hUsd: number; // Positive = Net Inflow, Negative = Net Outflow
  largeTransactionsCount24h: number;
  dominantWhaleAction: WhaleActionType;
  smartMoneyBias: SmartMoneyBias;
  whaleAccumulationIndex: number; // 0 - 100
  retailVsWhaleDivergence: 'CONVERGENT_BULLISH' | 'BULLISH_DIVERGENCE' | 'NEUTRAL' | 'BEARISH_DIVERGENCE';
  topExchangesInflowOutflow: {
    exchange: string;
    inflowUsd: number;
    outflowUsd: number;
  }[];
  history24h: { time: string; netFlow: number; smartMoneyScore: number }[];
}

export type SectorRotationPhase = 'LEADING' | 'WEAKENING' | 'LAGGING' | 'IMPROVING';

export interface SectorMetric {
  label: string;
  value: string;
  change?: string;
  isPositive?: boolean;
}

export interface SectorInfo {
  id: string;
  name: string;
  shortName: string;
  category: MainCategory;
  aiScore: number;
  rotationPhase: SectorRotationPhase;
  rotationLabel: string;
  phaseColor: string;
  relativeStrength: number; // 0 - 100
  momentum: number; // -10 to +10
  performance: {
    '1D': number;
    '1W': number;
    '1M': number;
    'YTD': number;
  };
  netCapitalInflowMrd: number; // in Mrd. USD
  beta: number;
  sparklineHistory: number[];
  aiSummary: string;
  growthDrivers: string[];
  keyRisks: string[];
  topAssetSymbols: string[];
  iconType: 'tech' | 'finance' | 'crypto' | 'health' | 'energy' | 'industry' | 'materials' | 'consumer';
}


