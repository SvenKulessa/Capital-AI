import { z } from 'zod';

export const HistoricalPriceObservationSchema = z.strictObject({
  schema: z.literal('CAPITAL_AI_HISTORICAL_PRICE_OBSERVATION@1'),
  providerId: z.literal('faironchain-open-price'),
  datasetId: z.literal('ethereum/chainlink_eth_usd.csv'),
  datasetSnapshotSha256: z.string().regex(/^[a-f0-9]{64}$/),
  dataLicense: z.literal('CC-BY-4.0'),
  displayStatus: z.literal('DELAYED'),
  isDemo: z.literal(false),
  asset: z.strictObject({
    assetId: z.literal('crypto:ETH:USD:CHAINLINK_ETHEREUM'),
    symbol: z.literal('ETHUSD'),
    name: z.literal('Ether / US Dollar'),
    assetClass: z.literal('crypto'),
    venue: z.literal('CHAINLINK_ETHEREUM'),
    currency: z.literal('USD'),
  }),
  value: z.number().positive().finite(),
  observedAt: z.number().int().positive(),
  extractedAt: z.number().int().positive(),
  fetchedAt: z.number().int().positive(),
  provenance: z.strictObject({
    globalRoundId: z.string().min(1),
    phase: z.number().int().nonnegative(),
    aggregatorRound: z.number().int().nonnegative(),
    answeredInRound: z.string().min(1),
    answerStatus: z.literal('ok'),
    extractionRunId: z.string().min(1),
    schemaVersion: z.string().min(1),
    clientName: z.string().min(1),
    clientVersion: z.string().min(1),
    chainId: z.literal(1),
    feedProxyAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    feedDescription: z.string().min(1),
    baseAsset: z.literal('ETH'),
    quoteAsset: z.literal('USD'),
    extractionScriptHash: z.string().regex(/^[a-f0-9]{64}$/),
    abiHash: z.string().regex(/^[a-f0-9]{64}$/),
    sourceUrl: z.string().url(),
    attribution: z.literal('FairOnChain / Open Price, CC BY 4.0'),
  }),
  liveEligible: z.literal(false),
  marketQuoteEligible: z.literal(false),
  scoreEligible: z.literal(false),
  decisionEligible: z.literal(false),
  reasonCodes: z.array(z.string()).min(1),
}).superRefine((value, ctx) => {
  if (value.observedAt > value.extractedAt || value.extractedAt > value.fetchedAt) {
    ctx.addIssue({ code: 'custom', message: 'HISTORICAL_TIMELINE_INVALID' });
  }
});

export const FAIRONCHAIN_ETH_USD_SOURCE = Object.freeze({
  providerId: 'faironchain-open-price',
  datasetId: 'ethereum/chainlink_eth_usd.csv',
  sourceUrl: 'https://files.deepmining.ch/files/ethereum/prices/chainlink_eth_usd.csv',
  dataLicense: 'CC-BY-4.0',
  displayStatus: 'DELAYED',
});
