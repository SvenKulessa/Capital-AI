import { z } from 'zod';

export const instrumentCatalog = Object.freeze({
  BTCUSDT: { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', venue: 'BINANCE', quote: 'USDT', category: 'KRYPTO' },
  BTCUSD: { symbol: 'BTCUSD', name: 'Bitcoin / US-Dollar', venue: 'KRAKEN', quote: 'USD', category: 'KRYPTO' },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', venue: 'NASDAQ', quote: 'USD', category: 'AKTIEN' },
});
export const QuoteFactSchema = z.object({
  schemaVersion: z.literal('1.0.0'), symbol: z.enum(['BTCUSDT', 'BTCUSD', 'AAPL']),
  venue: z.string().min(1), provider: z.enum(['binance', 'kraken', 'twelvedata', 'polygon']),
  price: z.number().positive().finite(), quote: z.enum(['USD', 'USDT']),
  bid: z.number().positive().finite().nullable(), ask: z.number().positive().finite().nullable(),
  volume24h: z.number().nonnegative().finite().nullable(),
  observedAt: z.number().int().positive(), receivedAt: z.number().int().positive(),
  mode: z.enum(['websocket', 'rest']), isDemo: z.literal(false),
  licenseScope: z.literal('unverified'), payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((f, ctx) => {
  const i = instrumentCatalog[f.symbol];
  if (f.quote !== i.quote || f.venue !== i.venue || (f.symbol === 'BTCUSDT' && f.provider !== 'binance') ||
      (f.provider === 'kraken' && f.symbol !== 'BTCUSD') || (f.provider === 'binance' && f.symbol !== 'BTCUSDT')) {
    ctx.addIssue({ code: 'custom', message: 'INSTRUMENT_PROVIDER_MISMATCH' });
  }
  if (f.receivedAt < f.observedAt || (f.bid !== null && f.ask !== null && f.bid > f.ask)) {
    ctx.addIssue({ code: 'custom', message: 'TIMESTAMP_OR_BOOK_INVALID' });
  }
});
export const QuoteDeliverySchema = QuoteFactSchema.safeExtend({
  evidenceId: z.string().regex(/^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/),
  availability: z.enum(['live', 'cached']), validated: z.literal(true),
  actionable: z.literal(false), reasonCodes: z.array(z.string()),
});
export const CanonicalAssetValueSchema = z.object({
  schema: z.literal('CAPITAL_AI_ASSET_VALUE@1'),
  instrumentId: z.string().min(1),
  symbol: z.string().min(1),
  value: z.number().positive().finite(),
  quoteCurrency: z.string().min(1),
  observedAt: z.number().int().positive(),
  provider: z.string().min(1),
  venue: z.string().min(1),
  evidenceId: z.string().regex(/^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/),
  replayVerified: z.literal(true),
  sourceAdmission: z.literal('OPEN_SOURCE_OPEN_DATA_ADMITTED'),
  scoreEligible: z.literal(false),
  decisionEligible: z.literal(false),
  reasonCodes: z.array(z.string()).min(1),
});
export function toCanonicalAssetValue(delivery) {
  const f = QuoteDeliverySchema.parse(delivery);
  return CanonicalAssetValueSchema.parse({
    schema: 'CAPITAL_AI_ASSET_VALUE@1',
    instrumentId: `market:${f.venue}:${f.symbol}`,
    symbol: f.symbol,
    value: f.price,
    quoteCurrency: f.quote,
    observedAt: f.observedAt,
    provider: f.provider,
    venue: f.venue,
    evidenceId: f.evidenceId,
    replayVerified: true,
    sourceAdmission: 'OPEN_SOURCE_OPEN_DATA_ADMITTED',
    scoreEligible: false,
    decisionEligible: false,
    reasonCodes: ['SCORING_INPUTS_NOT_YET_COMPLETE'],
  });
}
export function isFresh(fact, now = Date.now()) {
  return fact.observedAt <= now && fact.receivedAt <= now && now - fact.observedAt < 30000;
}

export const MarketStatusSchema = z.object({
  status: z.literal('ok'), ingress: z.literal('fail_closed'),
  symbols: z.array(z.string()), quotesEnabled: z.boolean(),
  infrastructure: z.object({ status: z.enum(['connected', 'degraded', 'unavailable']),
    redis: z.enum(['connected', 'unavailable']), nats: z.enum(['connected', 'unavailable']),
    pubsub: z.enum(['connected', 'unavailable', 'disabled']).optional(),
    stream: z.literal('CAPITAL_FACTS'), storage: z.literal('file'), replicasConfigured: z.number().int().positive(),
    authMode: z.enum(['scoped_user', 'legacy_token', 'unconfigured']).optional() }),
});
