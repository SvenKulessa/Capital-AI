// SPDX-License-Identifier: MIT
// Server-only, pure protocol normalization. Public API transport ≠ commercial market-data entitlement.
// Never open vendor connections on import; the existing source/right gates own persistence.
import { instrumentCatalog } from '../shared/market-contracts.mjs';
import { evaluateSpotIngestion, ingestAdmittedSpotQuote } from './market-spot-ingestion.mjs';
import { infrastructure } from './infrastructure.mjs';

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
    if (tradeKeys.length !== 1 || !new Set(['XXBTZUSD','XBTUSD','BTCUSD','BTC/USD','XBT/USD']).has(tradeKeys[0]) ||
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

// These explicit entrypoints are dormant unless MARKET_SPOT_INGESTION_ENABLED=true AND
// source-specific commercial market-data rights are recorded in MARKET_SOURCE_POLICY.
// No cron, background subscription, user BYOK key or client-side websocket is created here.
function requireSpotPermission(provider,symbol,transport,env) {
  return evaluateSpotIngestion({provider,symbol,transport,env});
}
function boundedResponseBytes(response) {
  const declared=Number(response?.headers?.get?.('content-length') || 0);
  if (!Number.isSafeInteger(declared) || declared > MAX_FRAME_BYTES) throw new Error('SPOT_HTTP_BODY_TOO_LARGE');
  const type=String(response?.headers?.get?.('content-type') || '').toLowerCase();
  if (!type.startsWith('application/json')) throw new Error('SPOT_HTTP_CONTENT_TYPE_INVALID');
}
async function readBoundedJson(response) {
  boundedResponseBytes(response);
  if (!response.body || typeof response.body.getReader !== 'function') throw new Error('SPOT_HTTP_STREAM_REQUIRED');
  const reader=response.body.getReader();
  const chunks=[];let bytes=0;
  try {
    while(true) {
      const {done,value}=await reader.read();
      if(done) break;
      if (!(value instanceof Uint8Array)) throw new Error('SPOT_HTTP_CHUNK_INVALID');
      bytes+=value.byteLength;
      if(bytes>MAX_FRAME_BYTES) throw new Error('SPOT_HTTP_BODY_TOO_LARGE');
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const content=new Uint8Array(bytes);let offset=0;
  for(const chunk of chunks){content.set(chunk,offset);offset+=chunk.length;}
  return new TextDecoder('utf-8',{fatal:true}).decode(content);
}

export async function fetchAdmittedSpotRest({
  provider,symbol,env=process.env,store=infrastructure,
  fetchImpl=globalThis.fetch,
}={}) {
  const admission=requireSpotPermission(provider,symbol,'rest',env);
  if(!admission.allowed) return Object.freeze({status:'BLOCKED',reason:admission.reason});
  if(store.status().status!=='connected') return Object.freeze({status:'BLOCKED',reason:'INFRASTRUCTURE_UNAVAILABLE'});
  if(typeof fetchImpl!=='function') throw new Error('SPOT_FETCH_UNAVAILABLE');
  const req=spotWireRequest({provider,symbol,transport:'rest'});
  const response=await fetchImpl(req.url,{method:'GET',redirect:'error',cache:'no-store',
    credentials:'omit',headers:{accept:'application/json'},signal:AbortSignal.timeout(5000)});
  if(!response?.ok) throw new Error('SPOT_HTTP_STATUS_INVALID');
  const payload=await readBoundedJson(response);
  return ingestSpotWireFrame({provider,symbol,transport:'rest',payload},{env,store});
}

export function startAdmittedSpotWebSocket({
  provider,symbol,env=process.env,store=infrastructure,
  SocketClass=globalThis.WebSocket,
}={}) {
  const admission=requireSpotPermission(provider,symbol,'websocket',env);
  if(!admission.allowed) return Object.freeze({status:'BLOCKED',reason:admission.reason});
  if(store.status().status!=='connected') return Object.freeze({status:'BLOCKED',reason:'INFRASTRUCTURE_UNAVAILABLE'});
  if(typeof SocketClass!=='function') throw new Error('SPOT_WEBSOCKET_UNAVAILABLE');
  const request=spotWireRequest({provider,symbol,transport:'websocket'});
  const socket=new SocketClass(request.url);
  let stopped=false,processing=false,accepted=0,rejected=0,dropped=0;
  const close=()=>{
    stopped=true;clearTimeout(timer);
    if(socket.readyState===0||socket.readyState===1) socket.close(1000,'session_end');
  };
  const timer=setTimeout(close,30*60_000);
  timer.unref?.();
  socket.addEventListener('open',()=>{
    if(stopped) return;
    try{socket.send(request.subscribe);}catch{close();}
  });
  socket.addEventListener('message',event=>{
    if(stopped) return;
    // Bound memory and pressure on JetStream; drop rather than buffering unbounded frames.
    if(processing){dropped++;return;}
    processing=true;
    void (async()=>{
      try {
        const raw=event.data;
        if(typeof raw!=='string' || Buffer.byteLength(raw,'utf8')>MAX_FRAME_BYTES) throw new Error('SPOT_FRAME_SIZE_INVALID');
        const result=await ingestSpotWireFrame({provider,symbol,transport:'websocket',payload:raw},{env,store});
        if(result.status==='READY') accepted++; else rejected++;
      }catch{rejected++;}
      finally{processing=false;}
    })();
  });
  socket.addEventListener('close',()=>{stopped=true;clearTimeout(timer);});
  socket.addEventListener('error',()=>{close();});
  return Object.freeze({
    status:'CONNECTING',provider,symbol,
    stop:close,
    metrics:()=>Object.freeze({accepted,rejected,dropped,stopped}),
  });
}
