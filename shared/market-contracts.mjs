import { z } from 'zod';

const ECB_REFERENCE_CURRENCIES = [
  'USD','JPY','CZK','DKK','GBP','HUF','PLN','RON','SEK','CHF',
  'ISK','NOK','TRY','AUD','BRL','CAD','CNY','HKD','IDR','ILS',
];

const ecbReferenceCatalog = Object.fromEntries(ECB_REFERENCE_CURRENCIES.map(currency => {
  const symbol = `EUR/${currency}`;
  return [symbol, {
    instrumentId: `fx:EUR-${currency}:ecb-reference`,
    symbol,
    name: `Euro / ${currency}`,
    venue: 'ECB reference rates',
    quote: currency,
    category: 'FOREX',
    providers: ['ecb-reference-rates'],
    timeSemantics: 'reference',
  }];
}));

export const instrumentCatalog = Object.freeze({
  BTCUSDT: { instrumentId:'market:BINANCE:BTCUSDT', symbol:'BTCUSDT', name:'Bitcoin / Tether', venue:'BINANCE', quote:'USDT', category:'KRYPTO', providers:['binance'], timeSemantics:'realtime' },
  BTCUSD: { instrumentId:'market:KRAKEN:BTCUSD', symbol:'BTCUSD', name:'Bitcoin / US-Dollar', venue:'KRAKEN', quote:'USD', category:'KRYPTO', providers:['kraken'], timeSemantics:'realtime' },
  AAPL: { instrumentId:'market:NASDAQ:AAPL', symbol:'AAPL', name:'Apple Inc.', venue:'NASDAQ', quote:'USD', category:'AKTIEN', providers:['twelvedata','polygon'], timeSemantics:'realtime' },
  ...ecbReferenceCatalog,
});

export const REFERENCE_RATE_MAX_AGE_MS = 8 * 24 * 60 * 60 * 1000;

export const QuoteFactSchema = z.object({
  schemaVersion: z.literal('1.0.0'),
  symbol: z.string().min(1),
  venue: z.string().min(1),
  provider: z.string().min(1),
  price: z.number().positive().finite(),
  quote: z.string().regex(/^[A-Z0-9]{3,6}$/),
  bid: z.number().positive().finite().nullable(),
  ask: z.number().positive().finite().nullable(),
  volume24h: z.number().nonnegative().finite().nullable(),
  observedAt: z.number().int().positive(),
  observedAtPrecision: z.enum(['instant','date']).default('instant'),
  publishedAt: z.number().int().positive().nullable().default(null),
  publishedAtSource: z.enum(['http_last_modified']).nullable().default(null),
  receivedAt: z.number().int().positive(),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().default(null),
  timeSemantics: z.enum(['realtime','reference']).default('realtime'),
  mode: z.enum(['websocket','rest']),
  isDemo: z.literal(false),
  licenseScope: z.enum(['unverified','open_data_admitted']),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
}).superRefine((f, ctx) => {
  const instrument = instrumentCatalog[f.symbol];
  if (!instrument) {
    ctx.addIssue({ code:'custom', message:'INSTRUMENT_UNKNOWN' });
    return;
  }
  if (f.quote !== instrument.quote || f.venue !== instrument.venue || !instrument.providers.includes(f.provider)) {
    ctx.addIssue({ code:'custom', message:'INSTRUMENT_PROVIDER_MISMATCH' });
  }
  if (f.receivedAt < f.observedAt || (f.bid !== null && f.ask !== null && f.bid > f.ask)) {
    ctx.addIssue({ code:'custom', message:'TIMESTAMP_OR_BOOK_INVALID' });
  }

  if (f.timeSemantics === 'reference') {
    if (instrument.timeSemantics !== 'reference' || f.provider !== 'ecb-reference-rates' ||
        f.mode !== 'rest' || f.licenseScope !== 'open_data_admitted') {
      ctx.addIssue({ code:'custom', message:'REFERENCE_RATE_SEMANTICS_INVALID' });
    }
    if (!f.referenceDate || f.observedAtPrecision !== 'date' || !f.publishedAt ||
        f.publishedAtSource !== 'http_last_modified') {
      ctx.addIssue({ code:'custom', message:'REFERENCE_RATE_TIME_EVIDENCE_MISSING' });
    } else {
      const expectedObservedAt = Date.parse(`${f.referenceDate}T00:00:00.000Z`);
      if (f.observedAt !== expectedObservedAt || f.publishedAt < f.observedAt || f.receivedAt + 300000 < f.publishedAt) {
        ctx.addIssue({ code:'custom', message:'REFERENCE_RATE_TIME_EVIDENCE_INVALID' });
      }
    }
    if (f.bid !== null || f.ask !== null || f.volume24h !== null) {
      ctx.addIssue({ code:'custom', message:'REFERENCE_RATE_MARKET_MICROSTRUCTURE_FORBIDDEN' });
    }
  } else {
    if (instrument.timeSemantics !== 'realtime' || f.referenceDate !== null ||
        f.observedAtPrecision !== 'instant' || f.publishedAt !== null || f.publishedAtSource !== null) {
      ctx.addIssue({ code:'custom', message:'REALTIME_TIME_SEMANTICS_INVALID' });
    }
  }
});

export const QuoteDeliverySchema = QuoteFactSchema.safeExtend({
  evidenceId: z.string().regex(/^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/),
  availability: z.enum(['live','cached','reference']),
  validated: z.literal(true),
  actionable: z.literal(false),
  reasonCodes: z.array(z.string()),
});

export const CanonicalAssetValueSchema = z.object({
  schema: z.literal('CAPITAL_AI_ASSET_VALUE@1'),
  instrumentId: z.string().min(1),
  symbol: z.string().min(1),
  value: z.number().positive().finite(),
  quoteCurrency: z.string().min(1),
  observedAt: z.number().int().positive(),
  observedAtPrecision: z.enum(['instant','date']),
  publishedAt: z.number().int().positive().nullable(),
  referenceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  timeSemantics: z.enum(['realtime','reference']),
  provider: z.string().min(1),
  venue: z.string().min(1),
  evidenceId: z.string().regex(/^CAPITAL_FACTS:[1-9][0-9]*:[a-f0-9]{64}$/),
  replayVerified: z.literal(true),
  sourceAdmission: z.literal('OPEN_SOURCE_OPEN_DATA_ADMITTED'),
  scoreEligible: z.literal(false),
  decisionEligible: z.literal(false),
  reasonCodes: z.array(z.string()).min(1),
});

export function deliveryReasonCodes(fact) {
  return fact.timeSemantics === 'reference'
    ? ['REFERENCE_RATE_INFORMATION_ONLY','SCORING_FEATURE_DQ_GATES_OPEN']
    : ['ANALYSIS_INPUTS_INCOMPLETE'];
}

export function toCanonicalAssetValue(delivery) {
  const fact = QuoteDeliverySchema.parse(delivery);
  const instrument = instrumentCatalog[fact.symbol];
  return CanonicalAssetValueSchema.parse({
    schema:'CAPITAL_AI_ASSET_VALUE@1',
    instrumentId:instrument.instrumentId,
    symbol:fact.symbol,
    value:fact.price,
    quoteCurrency:fact.quote,
    observedAt:fact.observedAt,
    observedAtPrecision:fact.observedAtPrecision,
    publishedAt:fact.publishedAt,
    referenceDate:fact.referenceDate,
    timeSemantics:fact.timeSemantics,
    provider:fact.provider,
    venue:fact.venue,
    evidenceId:fact.evidenceId,
    replayVerified:true,
    sourceAdmission:'OPEN_SOURCE_OPEN_DATA_ADMITTED',
    scoreEligible:false,
    decisionEligible:false,
    reasonCodes:deliveryReasonCodes(fact),
  });
}

export function isFresh(fact, now = Date.now()) {
  if (fact.observedAt > now || fact.receivedAt > now) return false;
  if (fact.timeSemantics === 'reference') {
    return Number.isSafeInteger(fact.publishedAt) &&
      fact.publishedAt <= now &&
      now - fact.publishedAt < REFERENCE_RATE_MAX_AGE_MS;
  }
  return now - fact.observedAt < 30000;
}

export function cacheTtlMs(fact, now = Date.now()) {
  if (!isFresh(fact, now)) return 0;
  if (fact.timeSemantics === 'reference') return REFERENCE_RATE_MAX_AGE_MS - (now - fact.publishedAt);
  return 30000 - (now - fact.observedAt);
}

export const MarketAssetCatalogItemSchema = z.object({
  instrumentId: z.string().min(1),
  symbol: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(['KRYPTO','AKTIEN','INDIZIES','FOREX','ROHSTOFFE']),
  venue: z.string().min(1),
  quoteCurrency: z.string().min(1),
  provider: z.string().min(1),
  timeSemantics: z.enum(['realtime','reference']),
  sourceAdmission: z.literal('OPEN_SOURCE_OPEN_DATA_ADMITTED'),
  marketQuotesEligible: z.literal(true),
  runtimeEnabled: z.boolean(),
  scoreEligible: z.literal(false),
  decisionEligible: z.literal(false),
  actionable: z.literal(false),
});

export const MarketAssetCatalogSchema = z.object({
  schema: z.literal('CAPITAL_AI_MARKET_ASSET_CATALOG@1'),
  sourcePolicy: z.literal('OPEN_SOURCE_AND_OPEN_DATA_ONLY'),
  quotesEnabled: z.boolean(),
  assets: z.array(MarketAssetCatalogItemSchema),
});

export const MarketStatusSchema = z.object({
  status:z.literal('ok'),
  ingress:z.literal('fail_closed'),
  symbols:z.array(z.string()),
  quotesEnabled:z.boolean(),
  infrastructure:z.object({
    status:z.enum(['connected','degraded','unavailable']),
    redis:z.enum(['connected','unavailable']),
    nats:z.enum(['connected','unavailable']),
    pubsub:z.enum(['connected','unavailable','disabled']).optional(),
    stream:z.literal('CAPITAL_FACTS'),
    storage:z.literal('file'),
    replicasConfigured:z.number().int().positive(),
    authMode:z.enum(['scoped_user','legacy_token','unconfigured']).optional(),
  }),
});
