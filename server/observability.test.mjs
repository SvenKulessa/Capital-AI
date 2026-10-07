import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTraceParent, sanitizeTelemetry, operationalSnapshot, renderPrometheusMetrics, telemetryRedactionCount, resetTelemetryRedactionsForTests } from './observability.mjs';

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


test('redacts obvious secret values without exposing the original and counts the event', () => {
  resetTelemetryRedactionsForTests();
  const value = sanitizeTelemetry({
    header: 'Bearer super-secret-value',
    jwt: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signature',
    url: 'redis://user:password@example.internal:6379',
    harmless: 'sha256:abcdef',
  });
  assert.equal(value.header, '[redacted]');
  assert.equal(value.jwt, '[redacted]');
  assert.equal(value.url, '[redacted]');
  assert.equal(value.harmless, 'sha256:abcdef');
  assert.equal(telemetryRedactionCount(), 3);
  const metrics = renderPrometheusMetrics();
  assert.match(metrics, /capital_ai_telemetry_redactions_total 3/);
  assert.doesNotMatch(metrics, /super-secret-value|user:password/);
});


test('owner snapshot exposes aggregates only and no credential-shaped fields', () => {
  const snapshot = operationalSnapshot();
  assert.equal(snapshot.schema, 'CAPITAL_AI_OPERATIONAL_SNAPSHOT@1');
  assert.ok(Array.isArray(snapshot.requests));
  assert.ok(Array.isArray(snapshot.durations));
  assert.equal(typeof snapshot.uptimeSeconds, 'number');
  assert.equal(typeof snapshot.residentMemoryBytes, 'number');
  const serialized = JSON.stringify(snapshot);
  assert.doesNotMatch(serialized, /authorization|cookie|api[_-]?key|private[_-]?key|password|credential/i);
});
