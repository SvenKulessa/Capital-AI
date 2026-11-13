// Anonymous, bounded, read-only HTTPS readback. Never retain response bodies, cookies or raw header values.
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const ALLOWED_ORIGINS = new Set([
  'https://capital-ai.online',
  'https://capital-ai-uvsl.onrender.com',
]);
const TARGET_PATHS = ['/', '/healthz'];

export function validatePublicOrigin(value) {
  const parsed = new URL(value);
  if (!ALLOWED_ORIGINS.has(parsed.origin) || parsed.href !== parsed.origin + '/' ||
      parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('unapproved_https_origin');
  }
  return parsed.origin;
}

export function assessSecurityHeaders(headers) {
  const get = key => String(headers.get(key) || '');
  const hsts = get('strict-transport-security');
  const maxAge = /(?:^|;)\s*max-age=(\d+)(?:\s*;|\s*$)/i.exec(hsts)?.[1];
  const csp = get('content-security-policy');
  const directives = new Map(csp.split(';').map(s => s.trim()).filter(Boolean).map(s => {
    const [name, ...values] = s.split(/\s+/);
    return [name.toLowerCase(), values];
  }));
  const scripts = directives.get('script-src') || [];
  const permissions = get('permissions-policy');
  const pass = {
    HSTS_1Y: maxAge !== undefined && Number(maxAge) >= 31536000,
    NOSNIFF: get('x-content-type-options').toLowerCase() === 'nosniff',
    FRAME_DENY: get('x-frame-options').toUpperCase() === 'DENY',
    REFERRER_POLICY: ['no-referrer', 'strict-origin', 'strict-origin-when-cross-origin', 'same-origin'].includes(get('referrer-policy').toLowerCase()),
    CSP_DEFAULT_SELF: directives.get('default-src')?.includes("'self'") === true,
    CSP_OBJECT_NONE: directives.get('object-src')?.includes("'none'") === true,
    CSP_FRAME_ANCESTORS_NONE: directives.get('frame-ancestors')?.includes("'none'") === true,
    CSP_SCRIPT_NO_UNSAFE: scripts.length > 0 && !scripts.includes("'unsafe-inline'") && !scripts.includes("'unsafe-eval'"),
    PERMISSIONS_DEVICE_DENY: ['camera', 'microphone', 'geolocation'].every(k => new RegExp('(?:^|,)\\s*' + k + '=\\(\\)', 'i').test(permissions)),
  };
  return {
    checks: Object.entries(pass).map(([check, ok]) => ({ check, status: ok ? 'PASS' : 'FAIL' })),
    styleInlineAllowed: (directives.get('style-src') || []).includes("'unsafe-inline'"),
  };
}

export async function publicSecurityHeaderReadback({ origin = 'https://capital-ai.online', fetchImpl = fetch, now = () => new Date().toISOString() } = {}) {
  const validatedOrigin = validatePublicOrigin(origin);
  if (process.env.NODE_TLS_REJECT_UNAUTHORIZED === '0') throw new Error('tls_certificate_verification_disabled');
  const paths = [];
  for (const path of TARGET_PATHS) {
    try {
      const response = await fetchImpl(validatedOrigin + path, {
        method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(15000),
        headers: { Accept: '*/*', 'User-Agent': 'CAPITAL-AI-ReadOnly-Security-Readback/1.0' },
      });
      const assessed = assessSecurityHeaders(response.headers);
      paths.push({ path, httpStatus: response.status,
        checks: [{ check: 'HTTP_200_NO_REDIRECT', status: response.status === 200 ? 'PASS' : 'FAIL' }, ...assessed.checks],
        styleInlineAllowed: assessed.styleInlineAllowed });
      try { await response.body?.cancel(); } catch { /* no body needed */ }
    } catch {
      paths.push({ path, httpStatus: null, checks: [{ check: 'HTTPS_RESPONSE_AVAILABLE', status: 'NOT_PROVEN' }],
        styleInlineAllowed: null });
    }
  }
  const statuses = paths.flatMap(item => item.checks.map(check => check.status));
  return {
    schema: 'CAPITAL_AI_PUBLIC_SECURITY_HEADER_READBACK@1',
    observedAt: now(), origin: validatedOrigin,
    status: statuses.includes('NOT_PROVEN') ? 'NOT_PROVEN' : statuses.includes('FAIL') ? 'FAIL' : 'PASS',
    sourceCommitCorrelated: false,
    noAuthentication: true, rawHeadersRetained: false, responseBodiesRetained: false,
    paths,
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const args = process.argv.slice(2);
    const flag = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
    const report = await publicSecurityHeaderReadback({ origin: flag('--origin') });
    if (flag('--output')) await writeFile(flag('--output'), JSON.stringify(report, null, 2) + '\n');
    console.log(JSON.stringify(report));
    if (report.status !== 'PASS') process.exitCode = 1;
  } catch {
    console.error('PUBLIC_SECURITY_HEADER_READBACK_NOT_PROVEN');
    process.exitCode = 1;
  }
}
