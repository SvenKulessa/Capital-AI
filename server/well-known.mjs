import { CONTROLLER } from '../shared/legal-identity.mjs';

export const SECURITY_TXT_EXPIRES = '2027-04-05T00:00:00Z';
export const SECURITY_TXT_CANONICAL = 'https://capital-ai.online/.well-known/security.txt';
export const CHANGE_PASSWORD_TARGET = '/profile/security';

export const securityTxt = [
  `Contact: mailto:${CONTROLLER.supportEmail}`,
  `Expires: ${SECURITY_TXT_EXPIRES}`,
  'Preferred-Languages: de, en',
  `Canonical: ${SECURITY_TXT_CANONICAL}`,
  '',
].join('\n');

export function serveWellKnown(req, res, url) {
  if (url.pathname === '/.well-known/change-password') {
    if (!['GET', 'HEAD'].includes(req.method)) {
      res.writeHead(405, {
        Allow: 'GET, HEAD',
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
      });
      res.end();
      return true;
    }
    res.writeHead(302, {
      Location: CHANGE_PASSWORD_TARGET,
      'Cache-Control': 'no-store',
    });
    res.end();
    return true;
  }

  if (url.pathname !== '/.well-known/security.txt') return false;
  if (!['GET', 'HEAD'].includes(req.method)) {
    res.writeHead(405, {
      Allow: 'GET, HEAD',
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
    });
    res.end();
    return true;
  }

  res.writeHead(200, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'public, max-age=3600',
    'Content-Length': Buffer.byteLength(securityTxt),
  });
  res.end(req.method === 'HEAD' ? undefined : securityTxt);
  return true;
}
