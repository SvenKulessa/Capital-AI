import { renderCadsPrometheusMetrics } from './cads-observability.mjs';
import { createHash, randomUUID, timingSafeEqual } from 'node:crypto';

const SECRET_KEY_PATTERN = /(secret|token|password|authorization|cookie|api[_-]?key|private[_-]?key|credential)/i;
const SECRET_VALUE_PATTERNS = [
  /^Bearer\s+\S+/i,
  /^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /^[a-z][a-z0-9+.-]*:\/\/[^\s/:@]+:[^\s@]+@/i,
];
let telemetryRedactions = 0;
const metrics = {
  requests: new Map(),
  errors: new Map(),
  duration: new Map(),
};

export function sanitizeTelemetry(value, depth = 0) {
  if (depth > 5) return '[depth-limited]';
  if (typeof value === 'string' && SECRET_VALUE_PATTERNS.some(pattern => pattern.test(value))) {
    telemetryRedactions += 1;
    return '[redacted]';
  }
  if (Array.isArray(value)) return value.slice(0, 32).map(item => sanitizeTelemetry(item, depth + 1));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).slice(0, 64).map(([key, raw]) => {
    if (SECRET_KEY_PATTERN.test(key)) {
      telemetryRedactions += 1;
      return [key, '[redacted]'];
    }
    return [key, sanitizeTelemetry(raw, depth + 1)];
  }));
}

export function parseTraceParent(value) {
  if (typeof value !== 'string') return null;
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$/i.exec(value.trim());
  return match ? { traceId: match[1].toLowerCase(), parentSpanId: match[2].toLowerCase(), traceFlags: match[3].toLowerCase() } : null;
}

export function writeOperationalLog(level, scope, requestId, message, meta = {}) {
  const entry = sanitizeTelemetry({
    timestamp: new Date().toISOString(),
    schema: 'CAPITAL_AI_OPERATIONAL_TELEMETRY@1',
    level,
    service: 'capital-ai',
    environment: process.env.NODE_ENV || 'unknown',
    sourceSha: process.env.RENDER_GIT_COMMIT || null,
    scope,
    requestId,
    message,
    ...meta,
  });
  const line = JSON.stringify(entry);
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export function writeAuditEvent(event) {
  const safe = sanitizeTelemetry({
    schema: 'CAPITAL_AI_AUDIT_EVENT@1',
    channel: 'security-audit',
    eventId: event.eventId || randomUUID(),
    occurredAt: new Date().toISOString(),
    ...event,
  });
  // Audit is deliberately a separate non-sampled stream. Runtime log retention remains provider-owned.
  console.log(JSON.stringify(safe));
}

function routeClass(pathname) {
  if (pathname === '/healthz') return '/healthz';
  if (pathname === '/metrics') return '/metrics';
  if (pathname.startsWith('/api/market/')) return '/api/market/*';
  if (pathname.startsWith('/api/auth/')) return '/api/auth/*';
  if (pathname.startsWith('/api/')) return '/api/*';
  return 'static';
}

function bump(map, key, value = 1) { map.set(key, (map.get(key) || 0) + value); }

export function beginRequest(req) {
  const started = process.hrtime.bigint();
  const requestIdHeader = req.headers['x-request-id'];
  const requestId = typeof requestIdHeader === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(requestIdHeader) ? requestIdHeader : randomUUID();
  const trace = parseTraceParent(req.headers.traceparent);
  return { started, requestId, trace };
}

export function finishRequest(req, res, ctx, pathname) {
  if (pathname === '/healthz' || pathname === '/metrics') return;
  const durationMs = Number(process.hrtime.bigint() - ctx.started) / 1e6;
  const route = routeClass(pathname);
  const status = Math.floor(res.statusCode / 100) + 'xx';
  const key = req.method + '|' + route + '|' + status;
  bump(metrics.requests, key);
  if (res.statusCode >= 500) bump(metrics.errors, req.method + '|' + route);
  const durationKey = req.method + '|' + route;
  const current = metrics.duration.get(durationKey) || { count: 0, sumMs: 0, maxMs: 0 };
  current.count += 1; current.sumMs += durationMs; current.maxMs = Math.max(current.maxMs, durationMs);
  metrics.duration.set(durationKey, current);
  const level = res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info';
  writeOperationalLog(level, 'http', ctx.requestId, 'request.completed', {
    method: req.method, route, statusCode: res.statusCode, durationMs: Number(durationMs.toFixed(3)),
    traceId: ctx.trace?.traceId, parentSpanId: ctx.trace?.parentSpanId,
  });
}

function metricNamePart(value) { return value.replace(/[^A-Za-z0-9_]/g, '_').replace(/^([0-9])/, '_$1'); }

export function renderPrometheusMetrics() {
  const lines = [
    '# HELP capital_ai_process_uptime_seconds Process uptime.',
    '# TYPE capital_ai_process_uptime_seconds gauge',
    'capital_ai_process_uptime_seconds ' + process.uptime().toFixed(3),
    '# HELP capital_ai_process_resident_memory_bytes Resident memory.',
    '# TYPE capital_ai_process_resident_memory_bytes gauge',
    'capital_ai_process_resident_memory_bytes ' + process.memoryUsage().rss,
    '# HELP capital_ai_telemetry_redactions_total Values removed before telemetry emission.',
    '# TYPE capital_ai_telemetry_redactions_total counter',
    'capital_ai_telemetry_redactions_total ' + telemetryRedactions,
    '# HELP capital_ai_http_requests_total Completed HTTP requests.',
    '# TYPE capital_ai_http_requests_total counter',
  ];
  for (const [key, value] of metrics.requests) {
    const [method, route, status] = key.split('|');
    lines.push(`capital_ai_http_requests_total{method="${metricNamePart(method)}",route="${route}",status="${status}"} ${value}`);
  }
  lines.push('# HELP capital_ai_http_errors_total HTTP 5xx responses.', '# TYPE capital_ai_http_errors_total counter');
  for (const [key, value] of metrics.errors) {
    const [method, route] = key.split('|');
    lines.push(`capital_ai_http_errors_total{method="${metricNamePart(method)}",route="${route}"} ${value}`);
  }
  lines.push('# HELP capital_ai_http_duration_ms_sum Sum of request duration in milliseconds.', '# TYPE capital_ai_http_duration_ms_sum counter');
  for (const [key, value] of metrics.duration) {
    const [method, route] = key.split('|');
    lines.push(`capital_ai_http_duration_ms_sum{method="${metricNamePart(method)}",route="${route}"} ${value.sumMs.toFixed(3)}`);
    lines.push(`capital_ai_http_duration_ms_count{method="${metricNamePart(method)}",route="${route}"} ${value.count}`);
    lines.push(`capital_ai_http_duration_ms_max{method="${metricNamePart(method)}",route="${route}"} ${value.maxMs.toFixed(3)}`);
  }
  return lines.join('\n') + '\n' + renderCadsPrometheusMetrics();
}

export function metricsAuthorized(req) {
  const expected = process.env.OBSERVABILITY_TOKEN;
  if (!expected || expected.length < 24) return false;
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (supplied.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(supplied), Buffer.from(expected));
}

export function hashAction(input) {
  return createHash('sha256').update(String(input)).digest('hex');
}

export function telemetryRedactionCount() { return telemetryRedactions; }
export function resetTelemetryRedactionsForTests() { telemetryRedactions = 0; }
