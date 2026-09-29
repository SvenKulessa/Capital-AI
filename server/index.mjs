import http from 'node:http';
import { readFile, stat, realpath } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quote, health, startStreams } from './market.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', 'Strict-Transport-Security': 'max-age=31536000', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; script-src 'self'; connect-src 'self' https://api.telegram.org wss://stream.binance.com:9443 wss://ws.kraken.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" };
function json(res, status, body) { res.writeHead(status, { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }

export function createApp(root = defaultRoot) {
  let inflight = 0;
  const server = http.createServer({ maxHeaderSize: 8192, requestTimeout: 10000, headersTimeout: 10000, keepAliveTimeout: 5000 }, async (req, res) => {
  let url;
  if ((req.url?.length || 0) > 2048) return json(res, 414, { error: 'uri_too_long' });
  try { url = new URL(req.url, 'http://localhost'); } catch { return json(res, 400, { error: 'bad_request' }); }
  if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return json(res, 405, { error: 'method_not_allowed' }); }
  if (url.pathname === '/healthz') return json(res, 200, health());
  if (url.pathname === '/api/market/quote') {
    if (inflight >= 8) { res.setHeader('Retry-After', '5'); return json(res, 429, { error: 'busy' }); }
    inflight++;
    try { const [status, body] = await quote(url.searchParams.get('symbol') || ''); return json(res, status, body); }
    catch { return json(res, 503, { error: 'market_data_unavailable' }); }
    finally { inflight--; }
  }
  if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'not_found' });
  let asset;
  try { asset = path.resolve(root, '.' + decodeURIComponent(url.pathname)); } catch { return json(res, 400, { error: 'bad_request' }); }
  if (!asset.startsWith(root + path.sep) && asset !== root) return json(res, 400, { error: 'bad_path' });
  if (path.relative(root, asset).split(path.sep).some(part => part.startsWith('.'))) return json(res, 404, { error: 'not_found' });
  try {
    const file = await stat(asset).then(s => s.isFile() ? asset : path.join(root, 'index.html')).catch(() =>
      path.extname(asset) || url.pathname.startsWith('/api/') ? asset : path.join(root, 'index.html'));
    const resolved = await realpath(file);
    if (!resolved.startsWith(root + path.sep) || (await stat(resolved)).size > 20 * 1024 * 1024) return json(res, 404, { error: 'not_found' });
    const body = await readFile(resolved);
    res.writeHead(200, { ...headers, 'Cache-Control': path.extname(file) === '.html' ? 'no-store' : 'public, max-age=3600', 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404, headers); res.end(); }
});
  server.maxConnections = 256;
  return server;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = createApp();
  const stop = startStreams();
  server.listen(Number(process.env.PORT || 10000), '0.0.0.0');
  const shutdown = () => {
    stop(); server.close(() => process.exit(0));
    setTimeout(() => { server.closeAllConnections(); process.exit(1); }, 10000).unref();
  };
  process.once('SIGTERM', shutdown);
  process.once('SIGINT', shutdown);
}
