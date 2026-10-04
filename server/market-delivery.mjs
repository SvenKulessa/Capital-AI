import { createHash } from 'node:crypto';
import { assetClasses, InstrumentManifestSchema, QuoteDeliverySchema, MarketSnapshotSchema, isFresh } from '../shared/market-contracts.mjs';
import { marketInstruments } from './market.mjs';
import { infrastructure } from './infrastructure.mjs';
import { isAdmittedMarketSource } from './open-source-market-policy.mjs';
import { createLimiter } from './http-security.mjs';

/** @param {{ manifest?: any[], broker?: Pick<typeof infrastructure, 'read' | 'subscribeQuotes'>, admitted?: (provider: string) => boolean, enabled?: boolean, timeoutMs?: number }} [options] */
export function createMarketDelivery({ manifest = marketInstruments, broker = infrastructure,
  admitted = provider => isAdmittedMarketSource(provider, 'marketQuotes'),
  enabled = process.env.MARKET_QUOTES_ENABLED === 'true', timeoutMs = 6000 } = {}) {
  manifest = InstrumentManifestSchema.parse(manifest);
  const universeId = createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
  const bySymbol = new Map(manifest.map(i => [i.symbol, i])), clients = new Set(), limit = createLimiter(120);
  let unsubscribe, subscribing, inflight = 0, pendingReads = 0, stopped = false;
  const available = () => enabled && manifest.some(i => admitted(i.provider));
  function validate(value) {
    const parsed = QuoteDeliverySchema.safeParse(value);
    if (!parsed.success || !isFresh(parsed.data) || !admitted(parsed.data.provider)) return null;
    const f = parsed.data, i = bySymbol.get(f.symbol);
    if (!i || !f.instrument || ['assetId','symbol','name','venue','quote','category','provider'].some(k => i[k] !== f.instrument[k])) return null;
    return f;
  }
  function release() {
    if (!clients.size && unsubscribe) { const stop = unsubscribe; unsubscribe = undefined; void Promise.resolve().then(stop).catch(()=>{}); }
  }
  function send(c, frame) {
    if (!c.ready) return;
    if (c.res.destroyed || c.res.writableEnded || !c.res.write(frame)) c.close();
  }
  async function ensureSubscription() {
    if (unsubscribe) return;
    if (!subscribing) subscribing = broker.subscribeQuotes(value => {
      if (!available()) { for (const c of [...clients]) c.close(); return; }
      const f = validate(value);
      if (f) for (const c of [...clients]) send(c, `id: ${f.evidenceId}\nevent: quote\ndata: ${JSON.stringify(f)}\n\n`);
    }).then(stop => { unsubscribe = stop; }).finally(() => { subscribing = undefined; release(); });
    await subscribing;
  }
  async function handle(req, res, url, json) {
    if (!['/api/market/snapshot','/api/market/events'].includes(url.pathname)) return false;
    if (req.method !== 'GET') { res.setHeader('Allow','GET'); json(res,405,{error:'method_not_allowed'}); return true; }
    if (!limit()) { res.setHeader('Retry-After','60'); json(res,429,{error:'rate_limited'}); return true; }
    if (stopped || !available()) { json(res,503,{error:'open_data_source_not_configured'}); return true; }
    if (url.pathname === '/api/market/snapshot') {
      const category = url.searchParams.get('category'), cursor = url.searchParams.get('cursor'), size = url.searchParams.get('limit') || '100';
      if ([...url.searchParams.keys()].some(k => !['category','cursor','limit'].includes(k) || url.searchParams.getAll(k).length !== 1) ||
          (category && !assetClasses.includes(category)) || (cursor && !/^[a-f0-9]{64}:[1-9][0-9]{0,3}$/.test(cursor)) || !/^[1-9][0-9]{0,2}$/.test(size) || Number(size)>100) {
        json(res,400,{error:'invalid_page'}); return true;
      }
      const instruments = manifest.filter(i => admitted(i.provider) && (!category || i.category === category));
      if (cursor && !cursor.startsWith(universeId + ':')) { json(res,409,{error:'universe_changed'}); return true; }
      const offset = cursor ? Number(cursor.split(':')[1]) : 0;
      if (offset>instruments.length) { json(res,400,{error:'invalid_cursor'}); return true; }
      if (inflight>=2 || pendingReads>=32) { json(res,429,{error:'busy'}); return true; }
      inflight++;
      try {
        const page = instruments.slice(offset,offset+Number(size)), results = new Array(page.length), deadline = Date.now()+timeoutMs;
        let next = 0;
        await Promise.all(Array.from({length:Math.min(16,page.length)}, async () => {
          while (next<page.length && !res.destroyed && Date.now()<deadline && pendingReads<32) {
            const index = next++; pendingReads++;
            const read = Promise.resolve().then(() => broker.read(page[index].symbol)).catch(() => null).finally(() => { pendingReads--; });
            let timer;
            const value = await Promise.race([read,new Promise(resolve => { timer = setTimeout(() => resolve(null),Math.max(1,deadline-Date.now())); })]);
            clearTimeout(timer);
            const checked = validate(value); results[index] = checked?.symbol===page[index].symbol ? checked : null;
          }
        }));
        if (!res.destroyed) json(res,200,MarketSnapshotSchema.parse({schema:'CAPITAL_AI_MARKET_SNAPSHOT@1',universeId,total:instruments.length,items:results.filter(f=>f&&isFresh(f)),
          nextCursor:offset+page.length<instruments.length ? `${universeId}:${offset+page.length}` : null,
          coverage:assetClasses.map(category=>({category,target:100,registered:new Set(manifest.filter(i=>i.category===category&&admitted(i.provider)).map(i=>i.assetId)).size}))}));
      } catch { if (!res.destroyed) json(res,503,{error:'market_data_unavailable'}); }
      finally { inflight--; }
      return true;
    }
    const lastId = req.headers?.['last-event-id'];
    if (url.search || (lastId && !/^CAPITAL_FACTS:[1-9][0-9]{0,19}:[a-f0-9]{64}$/.test(lastId))) { json(res,400,{error:'invalid_stream_query'}); return true; }
    if (clients.size>=64) { res.setHeader('Retry-After','15'); json(res,429,{error:'connection_limit'}); return true; }
    let heartbeat, expiry, closed = false;
    const c = {res,ready:false,close() {
      if (closed) return; closed=true; clearInterval(heartbeat); clearTimeout(expiry); clients.delete(c);
      if (!res.writableEnded) res.end(); release();
    }};
    clients.add(c); res.once('close',c.close);
    let subscriptionTimer;
    try { await Promise.race([ensureSubscription(),new Promise((_,reject)=>{subscriptionTimer=setTimeout(()=>reject(new Error('SUBSCRIPTION_TIMEOUT')),timeoutMs);})]); }
    catch { clients.delete(c); release(); if (!res.destroyed) json(res,503,{error:'stream_unavailable'}); return true; }
    finally { clearTimeout(subscriptionTimer); }
    if (closed || res.destroyed || stopped) { c.close(); return true; }
    res.writeHead(200,{'Content-Type':'text/event-stream; charset=utf-8','Cache-Control':'no-store, no-transform','X-Accel-Buffering':'no',Connection:'keep-alive'});
    c.ready=true; req.socket.setTimeout(0);
    send(c,'retry: 5000\n\nevent: reset\ndata: {"reason":"snapshot_required"}\n\n');
    if (closed) return true;
    heartbeat=setInterval(()=>{if(!available()) c.close(); else send(c,': heartbeat\n\n');},15000);
    expiry=setTimeout(c.close,300000); heartbeat.unref(); expiry.unref(); return true;
  }
  async function close() { stopped=true; for(const c of [...clients])c.close(); release(); }
  return {handle,close};
}
