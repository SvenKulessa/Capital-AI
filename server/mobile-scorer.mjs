import { randomUUID } from 'node:crypto';
import { scorerBus } from './scorer-bus.mjs';

const MAX_BODY_BYTES = 4096;
const UNIVERSE_LIMIT = 400;
const CACHE_MS = 5 * 60 * 1000;
let universeCache = null;

function safeOrigin(value, fallback) {
  try {
    const url = new URL(value || fallback);
    if (url.protocol !== 'https:') return null;
    return url.origin;
  } catch {
    return null;
  }
}

function normalizeAsset(value, rank = null, source = 'capital-ai-registry') {
  if (!value || typeof value !== 'object') return null;
  const symbol = String(value.symbol || '').toUpperCase().trim();
  const name = String(value.name || value.asset_name || '').trim();
  if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(symbol) || !name || name.length > 160) return null;
  return {
    symbol,
    name,
    type: 'crypto',
    marketCapRank: Number.isInteger(rank) && rank > 0 ? rank : null,
    source,
  };
}

async function fetchJson(url, options = {}, maxBytes = 2 * 1024 * 1024) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    signal: AbortSignal.timeout(5000),
  });
  if (!response.ok || !response.body) throw new Error(`UPSTREAM_${response.status}`);
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > maxBytes) throw new Error('UPSTREAM_TOO_LARGE');
  const reader = response.body.getReader();
  const chunks = [];
  let bytes = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > maxBytes) throw new Error('UPSTREAM_TOO_LARGE');
      chunks.push(value);
    }
  } finally {
    await reader.cancel().catch(() => {});
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function fromCanonicalRegistry(env) {
  const origin = safeOrigin(env.CAPITAL_AI_SCORER_ORIGIN, 'https://capital-ai.online');
  if (!origin) return [];
  try {
    const body = await fetchJson(new URL('/api/registry/assets', origin));
    if (!Array.isArray(body)) return [];
    const seen = new Set();
    return body
      .filter(item => item?.type === 'crypto')
      .map(item => normalizeAsset(item, item.marketCapRank ?? item.rank ?? null))
      .filter(item => item && !seen.has(item.symbol) && seen.add(item.symbol));
  } catch {
    return [];
  }
}

async function fromCoinGecko(env) {
  if (env.MOBILE_CRYPTO_UNIVERSE_FALLBACK === 'false') return [];
  const headers = { Accept: 'application/json' };
  if (env.COINGECKO_DEMO_API_KEY?.trim()) headers['x-cg-demo-api-key'] = env.COINGECKO_DEMO_API_KEY.trim();
  const all = [];
  for (const page of [1, 2]) {
    const url = new URL('https://api.coingecko.com/api/v3/coins/markets');
    url.searchParams.set('vs_currency', 'usd');
    url.searchParams.set('order', 'market_cap_desc');
    url.searchParams.set('per_page', '250');
    url.searchParams.set('page', String(page));
    url.searchParams.set('sparkline', 'false');
    const body = await fetchJson(url, { headers });
    if (!Array.isArray(body)) throw new Error('COINGECKO_SCHEMA_INVALID');
    for (const item of body) {
      const normalized = normalizeAsset(item, Number(item.market_cap_rank), 'coingecko-market-cap');
      if (normalized) all.push(normalized);
    }
  }
  return all.sort((a, b) => (a.marketCapRank ?? 999999) - (b.marketCapRank ?? 999999));
}

async function loadUniverse(env = process.env) {
  if (universeCache && Date.now() - universeCache.loadedAt < CACHE_MS) return universeCache;
  const canonical = await fromCanonicalRegistry(env);
  const bySymbol = new Map(canonical.map(asset => [asset.symbol, asset]));

  if (bySymbol.size < UNIVERSE_LIMIT) {
    try {
      for (const asset of await fromCoinGecko(env)) {
        if (!bySymbol.has(asset.symbol)) bySymbol.set(asset.symbol, asset);
        if (bySymbol.size >= UNIVERSE_LIMIT) break;
      }
    } catch {}
  }

  const assets = [...bySymbol.values()]
    .sort((a, b) => {
      if (a.marketCapRank && b.marketCapRank) return a.marketCapRank - b.marketCapRank;
      if (a.marketCapRank) return -1;
      if (b.marketCapRank) return 1;
      return a.symbol.localeCompare(b.symbol);
    })
    .slice(0, UNIVERSE_LIMIT);

  universeCache = {
    contractVersion: 'mobile-crypto-universe/1.0.0',
    requested: UNIVERSE_LIMIT,
    count: assets.length,
    status: assets.length === UNIVERSE_LIMIT ? 'READY' : 'DEGRADED',
    sources: [...new Set(assets.map(asset => asset.source))],
    attribution: assets.some(asset => asset.source === 'coingecko-market-cap')
      ? 'CoinGecko data used for private top-400 universe fallback; attribution required.'
      : null,
    loadedAt: Date.now(),
    assets,
  };
  return universeCache;
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('BODY_TOO_LARGE');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function html(res, headers) {
  res.writeHead(200, { ...headers, 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><title>Capital-AI Private Scorer</title><style>
  :root{color-scheme:dark;font-family:Inter,system-ui,sans-serif;background:#02050e;color:#eef2ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at top,#172033,#02050e 42%);min-height:100vh}.app{max-width:860px;margin:auto;padding:20px 14px 40px}.brand{color:#f5b014;font-size:12px;font-weight:900;letter-spacing:.18em}.card{background:#090e21;border:1px solid #243047;border-radius:18px;padding:16px;margin-top:14px;box-shadow:0 18px 60px #0008}.row{display:flex;gap:10px;align-items:center;flex-wrap:wrap}input,button,select{min-height:46px;border-radius:12px;border:1px solid #2b3955;background:#070b19;color:#fff;padding:0 12px;font:inherit}input{flex:1;min-width:180px}button{background:#f5b014;color:#07101d;font-weight:900;cursor:pointer}.pill{font-size:11px;border:1px solid #31405f;border-radius:999px;padding:5px 9px;color:#b8c3d8}.ok{color:#55df95}.warn{color:#ffd166}.score{font:900 52px ui-monospace,monospace;color:#f5b014}.muted{color:#8e9ab2;font-size:12px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.metric{background:#050914;border:1px solid #1c2941;border-radius:12px;padding:10px;overflow-wrap:anywhere}.metric b{display:block;color:#fff;margin-top:4px}#assets{max-height:300px;overflow:auto;margin-top:10px}.asset{width:100%;display:flex;justify-content:space-between;background:#060b17;color:#fff;margin:5px 0;border-color:#1c2941}.asset small{color:#8e9ab2}@media(min-width:700px){.grid{grid-template-columns:repeat(4,minmax(0,1fr))}}</style></head><body><main class="app"><div class="brand">CAPITAL-AI · PRIVATE ANDROID</div><h1>Enterprise Scorer</h1><p class="muted">Top-400 Krypto-Universum · NATS JetStream Evidence · Valkey/Redis Pub/Sub · keine Trade-Authority</p>
  <section class="card"><div class="row"><span class="pill" id="universeState">Universe lädt…</span><span class="pill" id="busState">Bus prüft…</span></div><div class="row" style="margin-top:12px"><input id="search" placeholder="Kryptowährung suchen…"><button id="reload">Aktualisieren</button></div><div id="assets"></div></section>
  <section class="card"><div class="row"><div><div class="muted">Ausgewählt</div><h2 id="assetTitle">—</h2></div><div style="margin-left:auto"><button id="scoreButton" disabled>Score laden</button></div></div><div id="scoreBox"><p class="muted">Asset auswählen.</p></div></section>
  <footer class="muted" style="margin-top:18px">Private Research App · Scores sind Analyseergebnisse und keine Anlageberatung.</footer></main><script src="/mobile-scorer/app.js" defer></script></body></html>`);
}

function javascript(res, headers) {
  res.writeHead(200, { ...headers, 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(`(()=>{let universe=[],selected=null,eventSource=null;const q=s=>document.querySelector(s),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));const render=()=>{const term=q('#search').value.trim().toLowerCase();const rows=universe.filter(a=>!term||a.symbol.toLowerCase().includes(term)||a.name.toLowerCase().includes(term)).slice(0,80);q('#assets').innerHTML=rows.map(a=>'<button class="asset" data-symbol="'+esc(a.symbol)+'"><span><b>'+esc(a.symbol)+'</b><br><small>'+esc(a.name)+'</small></span><small>#'+esc(a.marketCapRank??'—')+'</small></button>').join('');document.querySelectorAll('.asset').forEach(b=>b.onclick=()=>select(b.dataset.symbol));};const select=s=>{selected=universe.find(a=>a.symbol===s)||null;q('#assetTitle').textContent=selected?selected.name+' ('+selected.symbol+')':'—';q('#scoreButton').disabled=!selected;startEvents();};const scoreHtml=d=>{const p=d?.payload||d||{};const value=p.final_score??p.score??p.rank_score??null;return '<div class="score">'+esc(value??'—')+'</div><div class="grid"><div class="metric">Status<b>'+esc(p.status??'—')+'</b></div><div class="metric">Eligible<b>'+esc(p.eligible_for_top10===true?'JA':p.eligible_for_top10===false?'NEIN':'—')+'</b></div><div class="metric">Modell<b>'+esc(p.modelRegistry?.modelId??p.model??'—')+'</b></div><div class="metric">Evidence<b>'+esc(d?.evidenceId??p.lineage?.evidenceId??'—')+'</b></div></div><pre class="muted" style="white-space:pre-wrap;max-height:280px;overflow:auto">'+esc(JSON.stringify(p,null,2))+'</pre>';};const startEvents=()=>{eventSource?.close();if(!selected)return;eventSource=new EventSource('/api/mobile/scorer/events?symbol='+encodeURIComponent(selected.symbol));eventSource.onmessage=e=>{try{const d=JSON.parse(e.data);if(d.symbol===selected.symbol)q('#scoreBox').innerHTML=scoreHtml(d)}catch{}};};const load=async()=>{const [u,s]=await Promise.all([fetch('/api/mobile/crypto-universe').then(r=>r.json()),fetch('/api/mobile/scorer/status').then(r=>r.json())]);universe=Array.isArray(u.assets)?u.assets:[];q('#universeState').textContent='Universe '+u.count+'/'+u.requested+' · '+u.status;q('#universeState').className='pill '+(u.status==='READY'?'ok':'warn');q('#busState').textContent='NATS '+s.nats+' · Valkey '+s.valkey+' · Pub/Sub '+s.pubsub;q('#busState').className='pill '+(s.status==='connected'?'ok':'warn');render();};q('#search').oninput=render;q('#reload').onclick=load;q('#scoreButton').onclick=async()=>{if(!selected)return;q('#scoreBox').innerHTML='<p class="muted">Kanonischer Score wird berechnet und als JetStream-Evidence bestätigt…</p>';const r=await fetch('/api/mobile/enterprise-score',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({symbol:selected.symbol,name:selected.name})});const d=await r.json();q('#scoreBox').innerHTML=scoreHtml(d);};load().catch(e=>{q('#universeState').textContent='Universe nicht verfügbar';q('#busState').textContent=String(e)});})();`);
}

export function createMobileScorer(env = process.env) {
  const origin = safeOrigin(env.CAPITAL_AI_SCORER_ORIGIN, 'https://capital-ai.online');

  async function score(symbol, name, authorization) {
    if (!origin) return [503, { error: 'scorer_origin_unavailable' }];
    const universe = await loadUniverse(env);
    const asset = universe.assets.find(item => item.symbol === symbol);
    if (!asset) return [400, { error: 'symbol_not_in_top400_universe', symbol }];
    const upstream = new URL('/api/crypto/score', origin);
    const headers = { 'Content-Type': 'application/json', Accept: 'application/json', 'x-correlation-id': randomUUID() };
    if (authorization?.startsWith('Bearer ')) headers.Authorization = authorization;
    try {
      const response = await fetch(upstream, {
        method: 'POST',
        headers,
        body: JSON.stringify({ symbol, asset_name: name || asset.name }),
        signal: AbortSignal.timeout(15000),
        redirect: 'error',
      });
      const payload = await response.json().catch(() => ({ error: 'invalid_upstream_response' }));
      if (!response.ok) return [response.status, payload];
      const delivery = await scorerBus.persist(symbol, payload, response.headers.get('x-correlation-id'));
      return [200, delivery];
    } catch {
      return [503, { error: 'canonical_scorer_unavailable', symbol }];
    }
  }

  return {
    async handle(req, res, url, json, headers) {
      if (req.method === 'GET' && url.pathname === '/mobile-scorer') { html(res, headers); return true; }
      if (req.method === 'GET' && url.pathname === '/mobile-scorer/app.js') { javascript(res, headers); return true; }

      if (req.method === 'GET' && url.pathname === '/api/mobile/crypto-universe') {
        const universe = await loadUniverse(env);
        json(res, universe.status === 'READY' ? 200 : 206, universe);
        return true;
      }

      if (req.method === 'GET' && url.pathname === '/api/mobile/scorer/status') {
        await scorerBus.start();
        json(res, 200, scorerBus.status());
        return true;
      }

      if (req.method === 'GET' && url.pathname === '/api/mobile/enterprise-score') {
        const symbol = String(url.searchParams.get('symbol') || '').toUpperCase().trim();
        const cached = await scorerBus.read(symbol);
        json(res, cached ? 200 : 404, cached || { error: 'score_not_cached', symbol });
        return true;
      }

      if (req.method === 'POST' && url.pathname === '/api/mobile/enterprise-score') {
        let body;
        try { body = await readBody(req); } catch { json(res, 400, { error: 'invalid_request_body' }); return true; }
        const symbol = String(body.symbol || '').toUpperCase().trim();
        const name = String(body.name || '').trim();
        if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(symbol)) { json(res, 400, { error: 'invalid_symbol' }); return true; }
        const [status, response] = await score(symbol, name, req.headers.authorization);
        json(res, status, response);
        return true;
      }

      if (req.method === 'GET' && url.pathname === '/api/mobile/scorer/events') {
        const symbol = String(url.searchParams.get('symbol') || '').toUpperCase().trim();
        if (!/^[A-Z0-9][A-Z0-9._-]{0,31}$/.test(symbol)) { json(res, 400, { error: 'invalid_symbol' }); return true; }
        res.writeHead(200, {
          ...headers,
          'Content-Type': 'text/event-stream; charset=utf-8',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        });
        res.write(': scorer-events\n\n');
        let unsubscribe = null;
        try {
          unsubscribe = await scorerBus.subscribe(delivery => {
            if (delivery.symbol === symbol && !res.writableEnded) res.write(`data: ${JSON.stringify(delivery)}\n\n`);
          });
        } catch {
          res.write(`event: error\ndata: {"error":"pubsub_unavailable"}\n\n`);
          res.end();
          return true;
        }
        const timer = setInterval(() => { if (!res.writableEnded) res.write(': keepalive\n\n'); }, 15000);
        timer.unref();
        req.once('close', () => { clearInterval(timer); void unsubscribe?.(); });
        return true;
      }

      return false;
    },
  };
}
