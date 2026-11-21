import assert from 'node:assert/strict';
import test from 'node:test';
import { CHAT_BENCHMARK_DIMENSIONS, CHAT_BENCHMARK_VERSION, createChatBenchmark, createPublicChatBenchmarkProjection } from './chat-quality.mjs';

const dimensions = Object.fromEntries(Object.entries(CHAT_BENCHMARK_DIMENSIONS).map(([id, maxScore]) => [id, {
  score: maxScore,
  status: 'VERIFIED',
  evidenceRefs: [`evidence://${id}`],
  findings: [],
  improvementActions: [],
}]));

test('chat quality score and coverage are deterministic', () => {
  const value = createChatBenchmark({ benchmarkId: 'chat-1', taskClass: 'PRODUCT', evaluatedAt: '2026-11-20T06:00:00.000Z', dimensions });
  assert.equal(value.schemaVersion, CHAT_BENCHMARK_VERSION);
  assert.equal(value.score, 100);
  assert.equal(value.coverage, 100);
  assert.equal(value.publishable, true);
  assert.equal(value.decision.productionEligible, false);
});

test('not proven evidence reduces coverage and cannot be published', () => {
  const partial = structuredClone(dimensions);
  partial.evidenceQuality = { score: 0, status: 'NOT_PROVEN', evidenceRefs: ['evidence://missing'], findings: [], improvementActions: ['Collect evidence'] };
  const value = createChatBenchmark({ benchmarkId: 'chat-2', dimensions: partial });
  assert.equal(value.coverage, 80);
  assert.equal(value.publishable, false);
  assert.equal(createPublicChatBenchmarkProjection(value), null);
});

test('verified dimensions require an evidence reference before they can be published', () => {
  const missing = structuredClone(dimensions);
  missing.evidenceQuality.evidenceRefs = [];
  assert.throws(() => createChatBenchmark({ benchmarkId: 'chat-5', dimensions: missing }),
    /VERIFIED_CHAT_BENCHMARK_EVIDENCE_REQUIRED/);
});

test('scores outside their dimension budget fail closed', () => {
  const invalid = structuredClone(dimensions);
  invalid.communicationAndAccessibility.score = 11;
  assert.throws(() => createChatBenchmark({ benchmarkId: 'chat-3', dimensions: invalid }), /INVALID_CHAT_BENCHMARK_SCORE/);
});

test('public projection strips evidence references and findings', () => {
  const value = createChatBenchmark({ benchmarkId: 'chat-4', dimensions });
  const projection = createPublicChatBenchmarkProjection(value);
  assert.equal(projection.score, 100);
  assert.equal('evidenceRefs' in projection.dimensions.taskCompletion, false);
});
