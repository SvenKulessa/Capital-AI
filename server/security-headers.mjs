import { createHash } from 'node:crypto';

// Default policy for APIs, redirects and non-HTML responses. External analytics code is
// limited to gtag.js; its execution still requires the separate consent gate in the UI.
const CSP_BASE = [
  "default-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "script-src 'self' https://www.googletagmanager.com/gtag/js",
  "connect-src 'self' https://www.google-analytics.com https://region1.google-analytics.com",
  "frame-src 'self' https://www.youtube-nocookie.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
];

function sha256Source(value) {
  return "'sha256-" + createHash('sha256').update(value, 'utf8').digest('base64') + "'";
}

// Standalone legal documents and server-side SEO fallbacks contain first-party
// inline CSS and a few style attributes. Hash only the exact HTML sent in this
// response. This does not permit arbitrary inline styles or script execution.
// Browser-side dynamic style attributes require CSS-class migration separately.
export function contentSecurityPolicyForHtml(html) {
  const elementStyles = [...html.matchAll(/<style(?:\s[^>]*)?>([\s\S]*?)<\/style\s*>/gi)]
    .map(match => match[1]);
  const attributeStyles = [...html.matchAll(/\sstyle\s*=\s*(["'])(.*?)\1/gi)]
    .map(match => match[2]);
  // First-party SEO JSON-LD blocks are inert but may still be evaluated by CSP.
  // Allow only the exact server-rendered JSON-LD bytes, not arbitrary inline JS.
  const jsonLdHashes = [...html.matchAll(/<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script\s*>/gi)]
    .map(match => sha256Source(match[1]));
  const styleHashes = [...new Set(elementStyles.map(sha256Source))];
  const attrHashes = [...new Set(attributeStyles.map(sha256Source))];
  return [
    ...CSP_BASE.filter(directive => !directive.startsWith('script-src ')),
    ["script-src 'self' https://www.googletagmanager.com/gtag/js", ...new Set(jsonLdHashes)].join(' '),
    ["style-src 'self'", ...styleHashes].join(' '),
    ["style-src-attr 'none'", ...(attrHashes.length ? ["'unsafe-hashes'", ...attrHashes] : [])].join(' ')
      .replace("style-src-attr 'none' 'unsafe-hashes'", "style-src-attr 'unsafe-hashes'"),
  ].join('; ');
}

export const SECURITY_HEADERS = Object.freeze({
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Cross-Origin-Opener-Policy': 'same-origin',
  'Cross-Origin-Resource-Policy': 'same-origin',
  'Content-Security-Policy': [...CSP_BASE, "style-src 'self'", "style-src-attr 'none'"].join('; '),
});
