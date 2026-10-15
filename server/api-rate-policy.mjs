import { createLimiter } from './http-security.mjs';

// Defense-in-depth budgets across ALL /api/* handlers, before dispatch.
// Process-local only: these limits are not a substitute for a shared Valkey /
// ingress rate limiter across replicas. Never use untrusted X-Forwarded-For.
export const API_RATE_GROUPS = Object.freeze({
  password_recovery: { limit: 30, windowMs: 900_000, retryAfterSeconds: 900 },
  password_login: { limit: 60, windowMs: 60_000, retryAfterSeconds: 60 },
  authentication: { limit: 180, windowMs: 60_000, retryAfterSeconds: 60 },
  ai_compute: { limit: 120, windowMs: 60_000, retryAfterSeconds: 60 },
  api_other: { limit: 2400, windowMs: 60_000, retryAfterSeconds: 60 },
});

// Match exact authentication/recovery boundaries before generic API routing.
// They include callback and step-up endpoints even if individual modules have
// their own stricter rate limits.
export function apiRateGroup(pathname) {
  if (!pathname.startsWith('/api/')) return null;
  if (/^\/api\/auth\/(?:.*(?:reset|recover|forgot|password)|password\/.*)$/i.test(pathname)) return 'password_recovery';
  if (/^\/api\/auth\/(?:login\/email|mobile-login)(?:\/|$)/i.test(pathname)) return 'password_login';
  if (/^\/api\/auth(?:\/|$)/i.test(pathname)) return 'authentication';
  if (/^\/api\/(?:.*(?:ai|chat|score|scorer|benchmark|research|simulat|generate).*)/i.test(pathname)) return 'ai_compute';
  return 'api_other';
}

export function createApiRateGate(now = Date.now) {
  const limits = Object.fromEntries(
    Object.entries(API_RATE_GROUPS).map(([name, policy]) =>
      [name, createLimiter(policy.limit, policy.windowMs, 1024, now)]),
  );
  // Independent per-transport-client ceiling prevents a caller alternating all route groups.
  const aggregate = createLimiter(2500, 60_000, 1024, now);
  return (pathname, clientKey = 'unknown') => {
    const group = apiRateGroup(pathname);
    if (!group) return { allowed: true, group: null, retryAfterSeconds: 0 };
    const policy = API_RATE_GROUPS[group];
    const allowed = aggregate(clientKey) && limits[group](clientKey);
    return { allowed, group, retryAfterSeconds: policy.retryAfterSeconds };
  };
}
