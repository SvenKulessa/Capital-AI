// SPDX-License-Identifier: MIT
// Server-only, pure protocol normalization. Public API transport ≠ commercial market-data entitlement.
// Never open vendor connections on import; the existing source/right gates own persistence.
import { instrumentCatalog } from '../shared/market-contracts.mjs';
import { evaluateSpotIngestion, ingestAdmittedSpotQuote } from './market-spot-ingestion.mjs';

const MAX_FRAME_BYTES = 64 * 1024;
const SPOT_WIRE_PROVIDERS = Object.freeze(['binance', 'kraken']);
const SUPPORTED_SYMBOLS = Object.freeze({
  binance: Object.freeze({ BTCUSDT: Object.freeze({ exchangeSymbol:'BTCUSDT', quote:'USDT' }) }),
  kraken: Object.freeze({ BTCUSD: Object.freeze({ exchangeSymbol:'BTC/USD', quote:'USD' }) }),
});
const ENDPOINTS = Object.freeze({
  binance: Object.freeze({ rest:'https://api.binance.com/api/v3/trades', websocket:'wss://stream.binance.com:9443/ws' }),
  kraken: Object.freeze({ rest:'https://api.kraken.com/0/public/Trades', websocket:'wss://ws.kraken.com/v2' }),
});

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function requireFinitePrice(value) {
  if (typeof value !== 'string' && typeof value !== 'number') throw new Error('SPOT_PRICE_INVALID');
  if (typeof value === 'string' && (!/^\d+(?:\.\d+)?$/.test(value) || value.length > 32)) throw new Error('SPOT_PRICE_INVALID');
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) throw new Error('SPOT_PRICE_INVALID');
  return num;
}
function requireUnixMillis(value) {
  if (!Number.isSafeInteger(value) || value < 946684800000) throw new Error('SPOT_TIMESTAMP_INVALID');
  return value;
}
function requireUtcDateTime(value) {
  if (typeof value !== 'string' || value.length > 40 || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value)) {
    throw new Error('SPOT_TIMESTAMP_INVALID');
  }
  return requireUnixMillis(Date.parse(value));
}
function requireKrakenSeconds(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new Error('SPOT_TIMESTAMP_INVALID');
  return requireUnixMillis(Math.floor(value * 1000));
}
function boundedFrame(input) {
  const raw = typeof input === 'string' ? input : JSON.stringify(input);
  if (typeof raw !== 'string' || Buffer.byteLength(raw, 'utf8') > MAX_FRAME_BYTES || raw.length < 2) throw new Error('SPOT_FRAME_SIZE_INVALID');
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new Error('SPOT_FRAME_JSON_INVALID'); }
  return payload;
}
function binding(provider, symbol) {
  if (!SPOT_WIRE_PROVIDERS.includes(provider)) throw new Error('SPOT_PROVIDER_UNSUPPORTED');
  const instrument = instrumentCatalog[symbol];
  const mapped = SUPPORTED_SYMBOLS[provider]?.[symbol];
  if (!mapped || !instrument || !instrument.providers.includes(provider) ||
      instrument.quote !== mapped.quote || instrument.timeSemantics !== 'realtime') {
    throw new Error('SPOT_SYMBOL_MAPPING_UNADMITTED');
  }
  return mapped;
}

// Provider addresses are constants; untrusted symbol inputs never form a network hostname.
export function spotWireRequest({provider,symbol,transport}) {
  const mapped = binding(provider,symbol);
  if (transport === 'rest') {
    const url = new URL(ENDPOINTS[provider].rest);
    url.searchParams.set(provider === 'binance' ? 'symbol' : 'pair',mapped.exchangeSymbol);
    if (provider === 'binance') url.searchParams.set('limit','1');
    return Object.freeze({method:'GET',url:url.toString(),credentials:'omit',redirect:'error',maxResponseBytes:MAX_FRAME_BYTES});
  }
  if (transport === 'websocket') {
    if (provider === 'binance') return Object.freeze({
      url:ENDPOINTS.binance.websocket,subscribe:JSON.stringify({
        method:'SUBSCRIBE',params:[mapped.exchangeSymbol.toLowerCase()+'@trade'],id:1,
      }),
    });
    return Object.freeze({
      url:ENDPOINTS.kraken.websocket,subscribe:JSON.stringify({
        method:'subscribe',params:{channel:'ticker',symbol:[mapped.exchangeSymbol],snapshot:true},
      }),
    });
  }
  throw new Error('SPOT_TRANSPORT_UNSUPPORTED');
}

// Only trustworthy exchange-observed times may be used. No Date.now() market-price fabrication.
export function parseSpotWireFrame({provider,symbol,transport,payload}) {
  const mapped=binding(provider,symbol);
  if (transport !== 'websocket' && transport !== 'rest') throw new Error('SPOT_TRANSPORT_UNSUPPORTED');
  const frame=boundedFrame(payload);
  let price, observedAt;
  if (provider === 'binance' && transport === 'websocket') {
    const event=object(frame) && object(frame.data) ? frame.data : frame;
    if (!object(event) || event.e !== 'trade' || event.s !== mapped.exchangeSymbol) throw new Error('BINANCE_TRADE_FRAME_INVALID');
    price=requireFinitePrice(event.p);
    observedAt=requireUnixMillis(event.T);
  } else if (provider === 'binance') {
    if (!Array.isArray(frame) || !frame.length || frame.length > 1000) throw new Error('BINANCE_TRADES_INVALID');
    const trade=frame.reduce((a,b)=>Number(a?.time)>Number(b?.time)?a:b);
    if (!object(trade)) throw new Error('BINANCE_TRADES_INVALID');
    price=requireFinitePrice(trade.price);
    observedAt=requireUnixMillis(trade.time);
  } else if (transport === 'websocket') {
    if (!object(frame) || frame.channel !== 'ticker' ||
        !['snapshot','update'].includes(frame.type) || !Array.isArray(frame.data) ||
        frame.data.length !== 1 || frame.data[0]?.symbol !== mapped.exchangeSymbol) {
      throw new Error('KRAKEN_TICKER_FRAME_INVALID');
    }
    price=requireFinitePrice(frame.data[0].last);
    observedAt=requireUtcDateTime(frame.data[0].timestamp);
  } else {
    if (!object(frame) || !Array.isArray(frame.error) || frame.error.length ||
        !object(frame.result)) throw new Error('KRAKEN_TRADES_INVALID');
    const tradeKeys=Object.keys(frame.result).filter(key=>key!=='last');
    if (tradeKeys.length !== 1 || !/^[A-Za-z0-9/]{2,32}$/.test(tradeKeys[0]) ||
        !Array.isArray(frame.result[tradeKeys[0]]) ||
        frame.result[tradeKeys[0]].length > 1000 || !frame.result[tradeKeys[0]].length) {
      throw new Error('KRAKEN_TRADES_INVALID');
    }
    const last=frame.result[tradeKeys[0]].reduce((a,b)=>Number(a?.[2])>Number(b?.[2])?a:b);
    if (!Array.isArray(last) || last.length < 3) throw new Error('KRAKEN_TRADES_INVALID');
    price=requireFinitePrice(last[0]);
    observedAt=requireKrakenSeconds(last[2]);
  }
  return Object.freeze({provider,symbol,transport,price,quote:mapped.quote,observedAt,
    bid:null,ask:null,volume24h:null});
}

export async function ingestSpotWireFrame(input, options={}) {
  // Check source policy BEFORE parsing provider frames, sending requests, or touching broker state.
  const admission=evaluateSpotIngestion({
    provider:input?.provider,symbol:input?.symbol,transport:input?.transport,env:options.env,
  });
  if (!admission.allowed) return Object.freeze({status:'BLOCKED',reason:admission.reason});
  const mapped=parseSpotWireFrame(input);
  return ingestAdmittedSpotQuote(mapped,options);
}

export function spotWireInventory() {
  return SPOT_WIRE_PROVIDERS.map(provider=>({
    provider,rest:true,websocket:true,
    supportedSymbols:Object.keys(SUPPORTED_SYMBOLS[provider]),
    rights:'NOT_ADMITTED',publicDisplay:false,connectionsStarted:false,
  }));
}
