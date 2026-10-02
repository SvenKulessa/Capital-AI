import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTraceParent, sanitizeTelemetry, renderPrometheusMetrics } from './observability.mjs';

test('redacts secret-like telemetry keys recursively', () => {
  assert.deepEqual(sanitizeTelemetry({ token:'x', nested:{ apiKey:'y', safe:'ok' } }), { token:'[redacted]', nested:{ apiKey:'[redacted]', safe:'ok' } });
});

test('accepts only W3C v00 traceparent shape', () => {
  assert.equal(parseTraceParent('00-0123456789abcdef0123456789abcdef-0123456789abcdef-01')?.traceId, '0123456789abcdef0123456789abcdef');
  assert.equal(parseTraceParent('garbage'), null);
});

test('renders bounded process metrics without secrets', () => {
  const metrics=renderPrometheusMetrics();
  assert.match(metrics,/capital_ai_process_uptime_seconds/);
  assert.doesNotMatch(metrics,/authorization|password|token/i);
});
