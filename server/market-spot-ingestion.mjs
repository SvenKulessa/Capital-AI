// SPDX-License-Identifier: MIT
// MARKET: transport-neutral spot ingestion; never confuse public endpoint access with data rights.
import { instrumentCatalog, QuoteFactSchema, isFresh } from '../shared/market-contracts.mjs';
import { MARKET_SOURCE_POLICY, isAdmittedMarketSource } from './open-source-market-policy.mjs';
import { infrastructure, payloadHash } from './infrastructure.mjs';

export const MARKET_MINIMUM_ASSETS_PER_CLASS = 50;
export const MARKET_ASSET_CLASSES = Object.freeze(['KRYPTO','AKTIEN','INDIZIES','FOREX','ROHSTOFFE']);
export const SPOT_TRANSPORTS = Object.freeze(['rest','websocket']);

// This is an inventory of candidate interfaces, NOT an entitlement or an egress allowlist.
// Software adapters have independent licenses; underlying market-data rights are a separate contract.
export const SPOT_PROVIDER_CANDIDATES = Object.freeze([
  Object.freeze({ id:'binance', protocols:['rest','websocket'], rights:'NOT_ADMITTED' }),
  Object.freeze({ id:'kraken', protocols:['rest','websocket'], rights:'NOT_ADMITTED' }),
  Object.freeze({ id:'coinbase', protocols:['rest','websocket'], rights:'NOT_ADMITTED' }),
  Object.freeze({ id:'twelvedata', protocols:['rest','websocket'], rights:'NOT_ADMITTED' }),
  Object.freeze({ id:'polygon', protocols:['rest','websocket'], rights:'NOT_ADMITTED' }),
  Object.freeze({ id:'massive', protocols:['rest','websocket'], rights:'NOT_ADMITTED' }),
  Object.freeze({ id:'ccxt', protocols:['rest','websocket'], rights:'SOFTWARE_ONLY' }),
  Object.freeze({ id:'hummingbot', protocols:['rest','websocket'], rights:'SOFTWARE_ONLY' }),
  Object.freeze({ id:'cryptofeed', protocols:['websocket'], rights:'SOFTWARE_ONLY' }),
  Object.freeze({ id:'openbb', protocols:['rest'], rights:'SOFTWARE_ONLY' }),
]);

export function marketAssetCoverage() {
  const manifest = Object.values(instrumentCatalog);
  const result = {};
  for (const category of MARKET_ASSET_CLASSES) {
    const instruments = manifest.filter(instrument => instrument.category === category &&
      instrument.providers.some(provider => isAdmittedMarketSource(provider,'marketQuotes')));
    result[category] = {
      target: MARKET_MINIMUM_ASSETS_PER_CLASS,
      admittedInstruments: instruments.length,
      shortfall: Math.max(0, MARKET_MINIMUM_ASSETS_PER_CLASS - instruments.length),
      status: instruments.length >= MARKET_MINIMUM_ASSETS_PER_CLASS ? 'TARGET_ADMITTED' : 'BELOW_TARGET',
    };
  }
  return Object.freeze(result);
}

export function evaluateSpotIngestion({provider, symbol, transport, env=process.env}={}) {
  if (!SPOT_TRANSPORTS.includes(transport)) return Object.freeze({allowed:false,reason:'SPOT_TRANSPORT_UNSUPPORTED'});
  if (env.MARKET_SPOT_INGESTION_ENABLED !== 'true') return Object.freeze({allowed:false,reason:'SPOT_RUNTIME_DISABLED'});
  const source = MARKET_SOURCE_POLICY.admittedSources.find(item => item.providerId === provider);
  if (!source || !isAdmittedMarketSource(provider,'marketQuotes') || source.capabilities.realtime !== true) {
    return Object.freeze({allowed:false,reason:'REALTIME_MARKET_DATA_RIGHTS_NOT_ADMITTED'});
  }
  const instrument = instrumentCatalog[symbol];
  if (!instrument || !instrument.providers.includes(provider) || instrument.timeSemantics !== 'realtime') {
    return Object.freeze({allowed:false,reason:'SPOT_INSTRUMENT_NOT_ADMITTED'});
  }
  const symbols = String(env.MARKET_SYMBOLS || '').split(',').map(item=>item.trim());
  if (!symbols.includes(symbol)) return Object.freeze({allowed:false,reason:'SPOT_SYMBOL_NOT_CONFIGURED'});
  if (env.MARKET_QUOTES_ENABLED !== 'true') return Object.freeze({allowed:false,reason:'MARKET_QUOTES_DISABLED'});
  return Object.freeze({allowed:true,reason:null});
}

export async function ingestAdmittedSpotQuote({
  provider, symbol, transport, price, quote, observedAt, bid=null, ask=null, volume24h=null,
}, {env=process.env, store=infrastructure, now=Date.now}={}) {
  // Gate BEFORE upstream I/O or any broker/cache write. This helper never owns API credentials.
  const admission = evaluateSpotIngestion({provider,symbol,transport,env});
  if (!admission.allowed) return Object.freeze({status:'BLOCKED',reason:admission.reason});
  if (store.status().status !== 'connected') return Object.freeze({status:'BLOCKED',reason:'INFRASTRUCTURE_UNAVAILABLE'});
  const receivedAt=now();
  const normalized = {provider,symbol,transport,price,quote,observedAt,bid,ask,volume24h};
  const rawPayload = Object.freeze(normalized);
  const fact = QuoteFactSchema.parse({
    schemaVersion:'1.0.0',symbol,venue:instrumentCatalog[symbol].venue,provider,
    price:Number(price),quote,observedAt:Number(observedAt),receivedAt,
    observedAtPrecision:'instant',publishedAt:null,publishedAtSource:null,
    referenceDate:null,timeSemantics:'realtime',mode:transport,isDemo:false,
    licenseScope:'open_data_admitted',
    payloadHash:payloadHash(rawPayload),
    bid,ask,volume24h,
  });
  if (!isFresh(fact, receivedAt)) throw new Error('SPOT_QUOTE_STALE');
  const delivery=await store.persist(fact,rawPayload);
  const replay=await store.replay(delivery.evidenceId);
  if (JSON.stringify(replay.fact) !== JSON.stringify(fact)) throw new Error('SPOT_REPLAY_INVALID');
  return Object.freeze({
    status:'READY',provider,symbol,transport,evidenceId:delivery.evidenceId,
    actionable:false,scoreEligible:false,decisionEligible:false,
  });
}
