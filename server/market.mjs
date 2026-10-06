import { instrumentCatalog, QuoteFactSchema, isFresh, toCanonicalAssetValue } from '../shared/market-contracts.mjs';
import { infrastructure, payloadHash } from './infrastructure.mjs';
import { MARKET_SOURCE_POLICY, admittedMarketSourcesFor, isAdmittedMarketInstrument, isAdmittedMarketSource } from './open-source-market-policy.mjs';
import { ECB_REFERENCE_RATE_SYMBOLS, fetchEcbReferenceRates } from './ecb-reference-rates.mjs';

const defaultSymbols = ['BTCUSDT','BTCUSD','AAPL', ...ECB_REFERENCE_RATE_SYMBOLS];
const allowed = new Set(
  (process.env.MARKET_SYMBOLS || defaultSymbols.join(',')).split(',').map(value => value.trim()).filter(Boolean),
);
const quoteAdmittedSources = admittedMarketSourcesFor('marketQuotes');
const scoringAdmittedSources = admittedMarketSourcesFor('scoringPriceInput');
const sourceAdmissionAvailable = quoteAdmittedSources.length > 0;
const quotesEnabled = sourceAdmissionAvailable && process.env.MARKET_QUOTES_ENABLED === 'true';
const ecbConfigured = process.env.MARKET_ECB_REFERENCE_RATES_ENABLED === 'true';
const ecbRuntimeEnabled = quotesEnabled && ecbConfigured &&
  isAdmittedMarketSource('ecb-reference-rates', 'marketQuotes');
const ECB_POLL_INTERVAL_MS = 30 * 60 * 1000;

const ecbAdapterState = {
  status: ecbRuntimeEnabled ? 'idle' : 'disabled',
  lastReferenceDate: null,
  lastReplayVerifiedAt: null,
};

export function observation(symbol, provider, price, time, quote, mode, rawPayload, details = {}) {
  const instrument = instrumentCatalog[symbol];
  if (!instrument || !isAdmittedMarketInstrument(provider, instrument.instrumentId, 'marketQuotes')) return null;
  const receivedAt = Number(details.receivedAt ?? Date.now());
  const candidate = {
    schemaVersion:'1.0.0',
    symbol,
    venue:instrumentCatalog[symbol]?.venue,
    provider,
    price:Number(price),
    quote,
    observedAt:Number(time),
    observedAtPrecision:details.observedAtPrecision ?? 'instant',
    publishedAt:details.publishedAt ?? null,
    publishedAtSource:details.publishedAtSource ?? null,
    receivedAt,
    referenceDate:details.referenceDate ?? null,
    timeSemantics:details.timeSemantics ?? 'realtime',
    mode,
    isDemo:false,
    licenseScope:details.licenseScope ?? 'unverified',
    payloadHash:payloadHash(rawPayload),
    bid:details.bid == null ? null : Number(details.bid),
    ask:details.ask == null ? null : Number(details.ask),
    volume24h:details.volume24h == null ? null : Number(details.volume24h),
  };
  const parsed = QuoteFactSchema.safeParse(candidate);
  return allowed.has(symbol) && parsed.success && isFresh(parsed.data, receivedAt)
    ? { fact:parsed.data, rawPayload }
    : null;
}

export async function ingestEcbReferenceRates(fetchImpl = globalThis.fetch) {
  if (!ecbRuntimeEnabled) {
    return { status:'BLOCKED', reason:'ECB_REFERENCE_RATE_ADAPTER_DISABLED', persisted:0, skipped:0 };
  }
  if (infrastructure.status().status !== 'connected') {
    return { status:'BLOCKED', reason:'INFRASTRUCTURE_UNAVAILABLE', persisted:0, skipped:0 };
  }

  const batch = await fetchEcbReferenceRates({ fetchImpl });
  let persisted = 0;
  let skipped = 0;
  for (const row of batch.rates) {
    if (!allowed.has(row.symbol)) continue;
    const record = observation(
      row.symbol,
      'ecb-reference-rates',
      row.rate,
      row.observedAt,
      row.quoteCurrency,
      'rest',
      batch.rawPayload,
      {
        observedAtPrecision:'date',
        publishedAt:row.publishedAt,
        publishedAtSource:'http_last_modified',
        receivedAt:row.receivedAt,
        referenceDate:row.referenceDate,
        timeSemantics:'reference',
        licenseScope:'open_data_admitted',
      },
    );
    if (!record) throw new Error(`ECB_REFERENCE_FACT_REJECTED:${row.symbol}`);

    const existing = await infrastructure.read(row.symbol);
    if (existing?.provider === 'ecb-reference-rates' &&
        existing.referenceDate === record.fact.referenceDate &&
        existing.price === record.fact.price &&
        existing.payloadHash === record.fact.payloadHash) {
      skipped++;
      continue;
    }

    const delivery = await infrastructure.persist(record.fact, record.rawPayload);
    const replay = await infrastructure.replay(delivery.evidenceId);
    if (JSON.stringify(replay.fact) !== JSON.stringify(QuoteFactSchema.parse(record.fact))) {
      throw new Error(`ECB_REPLAY_VERIFICATION_FAILED:${row.symbol}`);
    }
    persisted++;
  }

  ecbAdapterState.status = 'ready';
  ecbAdapterState.lastReferenceDate = batch.referenceDate;
  ecbAdapterState.lastReplayVerifiedAt = Date.now();
  return {
    status:'READY',
    referenceDate:batch.referenceDate,
    persisted,
    skipped,
    replayVerified:true,
  };
}

export function startStreams() {
  if (!ecbRuntimeEnabled) return () => {};
  let stopped = false;
  let running = false;
  const tick = async () => {
    if (stopped || running) return;
    running = true;
    try {
      await ingestEcbReferenceRates();
    } catch {
      ecbAdapterState.status = 'unavailable';
    } finally {
      running = false;
    }
  };
  void tick();
  const timer = setInterval(() => { void tick(); }, ECB_POLL_INTERVAL_MS);
  timer.unref();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}

export async function quote(symbol) {
  if (!allowed.has(symbol)) return [400, { error:'unsupported_symbol' }];
  const instrument = instrumentCatalog[symbol];
  if (!sourceAdmissionAvailable) return [503, {
    error:'open_data_source_not_configured',
    symbol,
    sourcePolicy:MARKET_SOURCE_POLICY.mode,
  }];
  if (!quotesEnabled) return [503, { error:'pipeline_disabled', symbol }];
  if (!instrument?.providers?.some(provider =>
    isAdmittedMarketInstrument(provider, instrument.instrumentId, 'marketQuotes'))) {
    return [503, { error:'instrument_not_admitted', symbol, sourcePolicy:MARKET_SOURCE_POLICY.mode }];
  }
  if (instrument.providers.includes('ecb-reference-rates') && !ecbConfigured) {
    return [503, { error:'provider_not_configured', symbol }];
  }

  const cached = await infrastructure.read(symbol);
  if (cached && isAdmittedMarketInstrument(cached.provider, instrument.instrumentId, 'marketQuotes')) return [200, cached];

  return [503, {
    error:instrumentCatalog[symbol]?.timeSemantics === 'reference'
      ? 'reference_rate_unavailable'
      : 'open_data_source_not_configured',
    symbol,
    sourcePolicy:MARKET_SOURCE_POLICY.mode,
  }];
}

export async function assetValues() {
  if (!sourceAdmissionAvailable) return [503, {
    schema:'CAPITAL_AI_ASSET_VALUES@1',
    status:'BLOCKED',
    reason:'NO_ADMITTED_MARKET_QUOTE_SOURCE',
    sourcePolicy:MARKET_SOURCE_POLICY.mode,
    values:[],
  }];
  if (!quotesEnabled) return [503, {
    schema:'CAPITAL_AI_ASSET_VALUES@1',
    status:'BLOCKED',
    reason:'MARKET_QUOTES_DISABLED',
    sourcePolicy:MARKET_SOURCE_POLICY.mode,
    values:[],
  }];

  const values = [];
  for (const symbol of allowed) {
    const [status, delivery] = await quote(symbol);
    if (status !== 200) continue;
    values.push(toCanonicalAssetValue(delivery));
  }
  return [values.length ? 200 : 503, {
    schema:'CAPITAL_AI_ASSET_VALUES@1',
    status:values.length ? 'READY' : 'BLOCKED',
    reason:values.length ? null : 'NO_REPLAY_VERIFIED_VALUES',
    sourcePolicy:MARKET_SOURCE_POLICY.mode,
    values,
  }];
}

export function health() {
  return {
    status:'ok',
    ingress:'fail_closed',
    symbols:[...allowed],
    quotesEnabled,
    infrastructure:infrastructure.status(),
    sourcePolicy:MARKET_SOURCE_POLICY.mode,
    admittedSources:MARKET_SOURCE_POLICY.admittedSources.length,
    quoteAdmittedSources:quoteAdmittedSources.length,
    scoringAdmittedSources:scoringAdmittedSources.length,
    scoreDisplayEnabled:false,
    scoringGate:'FEATURE_DQ_SCORING_GATES_OPEN',
    referenceDataState:ecbAdapterState.status,
  };
}
