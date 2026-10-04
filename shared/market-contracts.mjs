import { z } from 'zod';

export const instrumentCatalog = Object.freeze({
  BTCUSDT: { symbol: 'BTCUSDT', name: 'Bitcoin / Tether', venue: 'BINANCE', quote: 'USDT', category: 'KRYPTO' },
  BTCUSD: { symbol: 'BTCUSD', name: 'Bitcoin / US-Dollar', venue: 'KRAKEN', quote: 'USD', category: 'KRYPTO' },
  AAPL: { symbol: 'AAPL', name: 'Apple Inc.', venue: 'NASDAQ', quote: 'USD', category: 'AKTIEN' },
});
export const assetClasses = Object.freeze(['AKTIEN', 'ETFS', 'INDIZIES', 'KRYPTO', 'FOREX', 'ROHSTOFFE', 'FUTURES', 'OPTIONEN', 'ANLEIHEN']);
export const InstrumentSchema = z.object({
  assetId: z.string().regex(/^[A-Za-z0-9_:-]{1,128}$/), symbol: z.string().regex(/^[A-Z0-9_:-]{1,64}$/),
  name: z.string().min(1).max(160), venue: z.string().min(1).max(64), quote: z.string().regex(/^[A-Z0-9]{2,12}$/),
  category: z.enum(assetClasses), provider: z.string().regex(/^[a-z0-9-]{1,64}$/),
});
export const InstrumentManifestSchema = z.array(InstrumentSchema).max(9000).superRefine((items, ctx) => {
  if (new Set(items.map(i => i.symbol)).size !== items.length) ctx.addIssue({ code: 'custom', message: 'DUPLICATE_INSTRUMENT' });
  const classes = new Map();
  for (const i of items) {
    if (classes.has(i.assetId) && classes.get(i.assetId) !== i.category) ctx.addIssue({code:'custom',message:'ASSET_CLASS_MISMATCH'});
    classes.set(i.assetId, i.category);
  }
  for (const category of assetClasses) if (items.filter(i => i.category === category).length > 1000)
    ctx.addIssue({ code: 'custom', message: 'CLASS_LIMIT' });
});
export const QuoteFactSchema = z.object({
  schemaVersion: z.enum(['1.0.0','2.0.0']), symbol: z.string().regex(/^[A-Z0-9_:-]{1,64}$/), instrument: InstrumentSchema.optional(),
  venue: z.string().min(1), provider: z.string().regex(/^[a-z0-9-]{1,64}$/),
  price: z.number().positive().finite(), quote: z.string().regex(/^[A-Z0-9]{2,12}$/),
  bid: z.number().positive().finite().nullable(), ask: z.number().positive().finite().nullable(),
  volume24h: z.number().nonnegative().finite().nullable(),
  observedAt: z.number().int().positive(), receivedAt: z.number().int().positive(),
  mode: z.enum(['websocket', 'rest']), isDemo: z.literal(false),
  licenseScope: z.literal('unverified'), payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((f, ctx) => {
  if (f.schemaVersion === '1.0.0' && f.instrument) { ctx.addIssue({code:'custom',message:'LEGACY_METADATA_FORBIDDEN'}); return; }
  const i = f.schemaVersion === '2.0.0' ? f.instrument : instrumentCatalog[f.symbol];
  if (!i || (f.schemaVersion === '2.0.0' && (i.symbol !== f.symbol || i.provider !== f.provider))) { ctx.addIssue({code:'custom',message:'UNKNOWN_INSTRUMENT'}); return; }
  if (f.quote !== i.quote || f.venue !== i.venue || (f.schemaVersion === '1.0.0' && ((f.symbol === 'BTCUSDT' && f.provider !== 'binance') ||
      (f.provider === 'kraken' && f.symbol !== 'BTCUSD') || (f.provider === 'binance' && f.symbol !== 'BTCUSDT')))) {
    ctx.addIssue({ code: 'custom', message: 'INSTRUMENT_PROVIDER_MISMATCH' });
  }
  if (f.receivedAt < f.observedAt || (f.bid !== null && f.ask !== null && f.bid > f.ask)) {
    ctx.addIssue({ code: 'custom', message: 'TIMESTAMP_OR_BOOK_INVALID' });
  }
});
export const QuoteDeliverySchema = QuoteFactSchema.safeExtend({
  evidenceId: z.string().regex(/^CAPITAL_FACTS:[1-9][0-9]{0,19}:[a-f0-9]{64}$/),
  availability: z.enum(['live', 'cached']), validated: z.literal(true),
  actionable: z.literal(false), reasonCodes: z.array(z.string().max(160)).max(32),
});
export function isFresh(fact, now = Date.now()) {
  return fact.observedAt <= now && fact.receivedAt <= now && now - fact.observedAt < 30000;
}

export const MarketStatusSchema = z.object({
  status: z.literal('ok'), ingress: z.literal('fail_closed'),
  symbols: z.array(z.string()), quotesEnabled: z.boolean(),
  infrastructure: z.object({ status: z.enum(['connected', 'degraded', 'unavailable']),
    redis: z.enum(['connected', 'unavailable']), nats: z.enum(['connected', 'unavailable']),
    pubsub: z.enum(['connected', 'unavailable', 'disabled']).optional(),
    stream: z.literal('CAPITAL_FACTS'), storage: z.literal('file'), replicasConfigured: z.number().int().positive() }),
});

export const MarketSnapshotSchema = z.object({
  schema: z.literal('CAPITAL_AI_MARKET_SNAPSHOT@1'),
  universeId: z.string().regex(/^[a-f0-9]{64}$/), total: z.number().int().min(0).max(9000),
  items: z.array(QuoteDeliverySchema).max(100), nextCursor: z.string().regex(/^[a-f0-9]{64}:[1-9][0-9]{0,3}$/).nullable(),
  coverage: z.array(z.object({ category: z.enum(assetClasses), registered: z.number().int().min(0).max(1000), target: z.literal(100) })).length(9),
});
