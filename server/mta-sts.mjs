// Preserve the existing production policy during the hostname migration.
export const mtaStsPolicy = 'version: STSv1\nmode: testing\nmx: mx00.emig.kundenserver.de\nmx: mx01.emig.kundenserver.de\nmax_age: 86400\n';

export function serveMtaSts(req, res, url) {
  if (url.pathname !== '/.well-known/mta-sts.txt') return false;
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' });
    res.end(); return true;
  }
  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Content-Length': Buffer.byteLength(mtaStsPolicy),
  });
  res.end(req.method === 'HEAD' ? undefined : mtaStsPolicy);
  return true;
}
