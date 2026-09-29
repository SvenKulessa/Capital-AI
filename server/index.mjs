import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { quote, health, startStreams } from './market.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const headers = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Content-Security-Policy': "default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self' https: wss:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" };
function json(res, status, body) { res.writeHead(status, { ...headers, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(body)); }

const server = http.createServer(async (req, res) => {
  let url;
  try { url = new URL(req.url, 'http://localhost'); } catch { res.writeHead(400); return res.end(); }
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  if (url.pathname === '/healthz') return json(res, 200, health());
  if (url.pathname === '/api/market/quote') { const [status, body] = await quote(url.searchParams.get('symbol') || ''); return json(res, status, body); }
  let asset;
  try { asset = path.resolve(root, '.' + decodeURIComponent(url.pathname)); } catch { res.writeHead(400); return res.end(); }
  if (asset !== root && !asset.startsWith(root + path.sep)) { res.writeHead(400); return res.end(); }
  try {
    const file = await stat(asset).then(s => s.isFile() ? asset : path.join(root, 'index.html')).catch(() =>
      path.extname(asset) || url.pathname.startsWith('/api/') ? asset : path.join(root, 'index.html'));
    const body = await readFile(file);
    res.writeHead(200, { ...headers, 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(body);
  } catch { res.writeHead(404, headers); res.end(); }
});
const stop = startStreams();
server.listen(Number(process.env.PORT || 10000), '0.0.0.0');
process.on('SIGTERM', () => { stop(); server.close(); });
