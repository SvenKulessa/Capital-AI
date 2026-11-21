import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { randomUUID } from 'node:crypto';
import { advanceVocabularyGame, projectVocabularyGame, QUESTION_MS, vocabularyGameInitial } from './vocabulary-game.mjs';
import { createVocabularyCheckout } from './vocabulary-checkout.mjs';
import { vocabularyMetadata } from '../shared/vocabulary-metadata.mjs';

const answerFor = (state, option) => {
  const round = state.round;
  const q = round.questions[round.answers.length];
  return { type: 'answer', round: round.id, word: q.word, option: option(q.options) };
};
const correct = options => options.find(option => option.correct).id;

test('single-player clock is server enforced and starts anew for every question', () => {
  const state = vocabularyGameInitial();
  const now = 1_000;
  advanceVocabularyGame(state, { type: 'start' }, now);
  assert.equal(new Set(state.round.questions.map(q => q.word)).size, 10);
  assert.ok(state.round.questions.every(q => new Set(q.options.map(option => option.label)).size === 4));
  const view = projectVocabularyGame(state, now);
  assert.equal(view.round.question.remainingMs, QUESTION_MS);
  assert.ok(view.round.question.options.every(option => !Object.hasOwn(option, 'correct')));
  assert.equal(advanceVocabularyGame(state, { type: 'start' }, now).status, 409);
  const first = answerFor(state, () => null);
  assert.equal(advanceVocabularyGame(state, first, now + QUESTION_MS - 1).status, 409);
  const late = answerFor(state, correct);
  advanceVocabularyGame(state, late, now + QUESTION_MS);
  assert.equal(state.wrong, 1);
  assert.equal(state.timedOut, 1);
  assert.equal(state.right, 0);
  assert.equal(state.outcomes[late.word].result, 'missed');
  assert.equal(projectVocabularyGame(state, now + QUESTION_MS).round.question.remainingMs, QUESTION_MS);
  assert.equal(advanceVocabularyGame(state, late, now + QUESTION_MS).status, 409);
});

test('earned words deduplicate while real correct answers unlock a persistent 100-answer badge', () => {
  const state = vocabularyGameInitial();
  for (let round = 0; round < 11; round++) {
    advanceVocabularyGame(state, { type: 'start' }, 1_000);
    for (let i = 0; i < 10; i++) advanceVocabularyGame(state, answerFor(state, correct), 1_001 + i);
    if (round === 8) assert.equal(state.badge, null);
    if (round === 9) assert.ok(state.badge.id);
  }
  const summary = projectVocabularyGame(state, 2_000);
  assert.equal(summary.right, 110);
  assert.equal(summary.rounds, 11);
  assert.equal(summary.recent.length, 10);
  assert.equal(summary.badge.earnedAt, 1_010);
  assert.ok(summary.earned.length <= 110);
  const id = summary.earned[0].id;
  const swipe = { type: 'review', word: id, result: 'missed', swipe: true, receipt: randomUUID() };
  assert.equal(advanceVocabularyGame(state, swipe, 2_000).changed, true);
  assert.equal(advanceVocabularyGame(state, swipe, 2_001).changed, false);
  assert.deepEqual(projectVocabularyGame(state, 2_002).reviews[0], { id, at: 2_000, swiped: true, result: 'missed' });
  const unearned = vocabularyMetadata.find(term => !Object.hasOwn(state.earned, term.id) && term.description);
  assert.ok(unearned, 'fixture must include a legitimate term that was not earned');
  const before = JSON.stringify(state);
  assert.deepEqual(advanceVocabularyGame(state, {
    type: 'review', word: unearned.id, result: 'known', swipe: true, receipt: randomUUID(),
  }, 2_003), { status: 403, error: 'card_not_earned' });
  assert.equal(JSON.stringify(state), before, 'forbidden review must not mutate progress');
  assert.equal(state.right, 110);
});

function fixture() {
  const records = new Map();
  const writes = [];
  const handler = createVocabularyCheckout({
    env: { SUPABASE_URL: 'https://test.supabase.co', SUPABASE_SECRET_KEY: 'x'.repeat(32) },
    auth: { sameOrigin: req => req.sameOrigin, verify: async req => req.session },
    fetchImpl: async (url, { body }) => {
      assert.equal(url.pathname, '/rest/v1/rpc/capital_ai_vocabulary_game');
      const request = JSON.parse(body);
      const row = records.get(request._user_id) ?? { revision: null, state: null };
      if (!request._state) return Response.json(row);
      if (row.revision !== request._expected) return Response.json(false);
      records.set(request._user_id, { revision: randomUUID(), state: request._state });
      writes.push(request._user_id);
      return Response.json(true);
    },
  });
  async function request(path = '', userId, body, sameOrigin = true) {
    const req = Readable.from(body ? [Buffer.from(JSON.stringify(body))] : []);
    req.method = body ? 'POST' : 'GET';
    req.headers = { 'content-type': 'application/json' };
    req.sameOrigin = sameOrigin;
    req.session = userId && { userId };
    const out = {};
    const res = { setHeader() {}, writeHead(status, headers) { Object.assign(out, { status, headers }); },
      end(payload) { out.payload = payload; } };
    await handler.handle(req, res, new URL('https://capital-ai.online/api/learning/word-game' + path),
      (_res, status, payload) => Object.assign(out, { status, payload }));
    return out;
  }
  return { records, writes, request };
}

test('account isolation, origin, duplicate writes and download authorization hold at the HTTP handler', async () => {
  const { request, writes, records } = fixture();
  assert.equal((await request()).status, 401);
  assert.equal((await request('', 'alice', { type: 'start' }, false)).status, 403);
  assert.equal((await request('', 'alice', { type: 'start', userId: 'bob' })).status, 400);
  const starts = await Promise.all([request('', 'alice', { type: 'start' }), request('', 'alice', { type: 'start' })]);
  assert.deepEqual(starts.map(result => result.status).sort(), [200, 409]);
  assert.deepEqual(writes, ['alice']);
  assert.equal((await request('?view=quiz', 'bob')).payload.round, null);
  assert.equal((await request('', 'alice')).payload.round, undefined);
  assert.equal((await request('/badge', 'alice')).status, 403);
  assert.equal((await request('', 'bob', {
    type: 'review', word: vocabularyMetadata[0].id,
    result: 'known', swipe: false, receipt: randomUUID(),
  })).status, 403);
  const row = records.get('alice');
  row.state.badge = { id: randomUUID(), earnedAt: 1_234 };
  const certificate = await request('/certificate', 'alice');
  assert.equal(certificate.status, 200);
  assert.equal(certificate.headers['Cache-Control'], 'no-store');
  assert.equal(JSON.parse(certificate.payload).certificateId, row.state.badge.id);
  const badge = await request('/badge', 'alice');
  assert.equal(badge.status, 200);
  assert.match(badge.headers['Content-Disposition'], /attachment/);
  const preview = await request('/preview', 'alice');
  assert.equal(preview.payload, badge.payload);
  assert.equal(preview.headers['Content-Disposition'], undefined);
  assert.equal((await request('/license', 'alice')).status, 200);
  assert.equal((await request('/certificate', 'bob')).status, 403);
});
