import { createHash, randomInt, randomUUID } from 'node:crypto';
import { vocabularyMetadata } from '../shared/vocabulary-metadata.mjs';

export const QUESTION_MS = 90_000;
const ROUND_SIZE = 10;
const BADGE_THRESHOLD = 100;
const words = new Map(vocabularyMetadata.map(term => [term.id, term]));
const pool = [...new Map([...words.values()].filter(term => term.description && term.term)
  .map(term => [term.description, term])).values()];

function sample(items, size) {
  const available = [...items];
  return Array.from({ length: size }, () => available.splice(randomInt(available.length), 1)[0]);
}

export const vocabularyGameInitial = () => ({
  right: 0, wrong: 0, timedOut: 0, rounds: 0, earned: {}, outcomes: {}, reviews: {},
  round: null, badge: null, recent: [],
});

const problem = (status, error) => ({ status, error });

export function projectVocabularyGame(state, now) {
  const round = state.round;
  const item = round?.questions[round.answers.length];
  return {
    right: state.right, wrong: state.wrong, timedOut: state.timedOut, rounds: state.rounds,
    recent: state.recent, badge: state.badge, earned: Object.entries(state.earned).map(([id, learnedAt]) => ({ id, learnedAt })),
    outcomes: Object.entries(state.outcomes).map(([id, outcome]) => ({ id, ...outcome })),
    reviews: Object.entries(state.reviews).map(([id, { result, swiped, at }]) => ({ id, result, swiped, at })),
    round: round && {
      id: round.id, position: round.answers.length, size: ROUND_SIZE, correct: round.answers.filter(x => x === 'right').length,
      last: round.answers.at(-1) ?? null,
      question: item && {
        id: item.word, term: item.term, remainingMs: Math.max(0, round.deadline - now),
        options: item.options.map(({ id, label }) => ({ id, label })),
      },
    },
  };
}

export function advanceVocabularyGame(state, action, now = Date.now()) {
  const round = state.round;
  if (action.type === 'start') {
    if (round?.answers.length < ROUND_SIZE) return problem(409, 'round_in_progress');
    const questions = sample(pool, ROUND_SIZE).map(term => ({
      word: term.id, term: term.term,
      options: sample([term, ...sample(pool.filter(word => word.id !== term.id), 3)], 4)
        .map(word => ({ id: randomUUID(), label: word.description, correct: word.id === term.id })),
    }));
    state.round = { id: randomUUID(), questions, deadline: now + QUESTION_MS, answers: [] };
    return { changed: true };
  }
  if (action.type === 'review') {
    if (typeof action.word !== 'string' || !words.has(action.word) ||
      !['known', 'missed'].includes(action.result) || typeof action.swipe !== 'boolean') return problem(400, 'invalid_review');
    // Only previously earned cards can change the private learning statistics.
    // Public vocabulary IDs must never grant learning progress on their own.
    if (!Object.hasOwn(state.earned, action.word)) return problem(403, 'card_not_earned');
    const previous = state.reviews[action.word];
    if (previous?.receipt === action.receipt) return { changed: false };
    state.reviews[action.word] = { result: action.result, swiped: action.swipe || previous?.swiped === true,
      at: now, receipt: action.receipt };
    return { changed: true };
  }
  if (action.type !== 'answer') return problem(400, 'invalid_action');
  const question = round?.questions[round.answers.length];
  if (!question || round.id !== action.round || question.word !== action.word ||
    (question.options.every(({ id }) => id !== action.option) && action.option !== null)) return problem(409, 'stale_question');
  const timedOut = now >= round.deadline;
  if (!timedOut && action.option === null) return problem(409, 'question_still_open');
  const right = !timedOut && question.options.some(({ id, correct }) => id === action.option && correct);
  round.answers.push(timedOut ? 'timeout' : right ? 'right' : 'wrong');
  state.outcomes[question.word] = { result: right ? 'known' : 'missed', at: now };
  if (right) {
    state.right++;
    state.earned[question.word] ??= now;
    if (state.right === BADGE_THRESHOLD) state.badge = { id: randomUUID(), earnedAt: now };
  } else {
    state.wrong++;
    if (timedOut) state.timedOut++;
  }
  if (round.answers.length === ROUND_SIZE) {
    state.rounds++;
    state.recent = [...state.recent.slice(-9), { correct: round.answers.filter(x => x === 'right').length }];
  } else {
    round.deadline = now + QUESTION_MS;
  }
  return { changed: true };
}

const badgeSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="480" viewBox="0 0 480 480"><rect width="480" height="480" rx="72" fill="#0b1429"/><circle cx="240" cy="240" r="176" fill="#1b2041" stroke="#f5c453" stroke-width="7"/><circle cx="240" cy="240" r="154" fill="none" stroke="#c4b5fd" stroke-width="2"/><g fill="#f5c453" text-anchor="middle" font-family="sans-serif"><text x="240" y="162" font-size="24">CAPITAL-AI</text><text x="240" y="275" font-size="120" font-weight="bold">100</text><text x="240" y="324" font-size="24">RICHTIGE ANTWORTEN</text></g></svg>`;
const badgeSha = createHash('sha256').update(badgeSvg).digest('hex');
const downloads = {
  badge: ['svg', 'image/svg+xml; charset=utf-8', () => badgeSvg],
  certificate: ['json', 'application/json; charset=utf-8', badge => JSON.stringify({
    issuer: 'CAPITAL-AI Learning Hub', type: 'Persönlicher Lernnachweis', certificateId: badge.id,
    earnedAt: new Date(badge.earnedAt).toISOString(), achievement: '100 richtige Vocabulary-Quiz-Antworten',
    badgeSha256: badgeSha, recognition: 'Interner Lernnachweis',
  }, null, 2)],
  license: ['txt', 'text/plain; charset=utf-8', () => [
    'CAPITAL-AI · Vocabulary-Lernabzeichen', 'SHA-256: ' + badgeSha,
    'Persönliche, nicht übertragbare Nutzung durch das berechtigte Konto.',
    'Gestattet sind der unveränderte Download, die Aufbewahrung und die Verwendung als persönlicher Lernnachweis.',
    'Markenrechte und weitergehende Nutzungsrechte verbleiben beim Rechteinhaber.',
  ].join('\n')],
};

export async function handleVocabularyGame({ req, res, url, json, userId, store, readJson, now = Date.now }) {
  const part = url.pathname.split('/').at(-1);
  if (req.method === 'GET' && part !== 'word-game' && part !== 'preview' && !Object.hasOwn(downloads, part)) {
    json(res, 404, { error: 'unknown_download' });
    return;
  }
  let action;
  if (req.method === 'POST') {
    if (part !== 'word-game') return json(res, 405, { error: 'method_not_allowed' });
    try { action = await readJson(req, 1024); } catch { return json(res, 400, { error: 'invalid_action' }); }
    if (!action || typeof action !== 'object' || Array.isArray(action) ||
        Object.keys(action).some(key => !['type', 'round', 'word', 'option', 'result', 'swipe', 'receipt'].includes(key)) ||
        (action.type === 'review' && !/^[a-f0-9-]{36}$/i.test(action.receipt ?? ''))) {
      return json(res, 400, { error: 'invalid_action' });
    }
  } else if (req.method !== 'GET') return json(res, 405, { error: 'method_not_allowed' });

  const row = await store({ _user_id: userId });
  if (!row || !Object.hasOwn(row, 'revision') || !Object.hasOwn(row, 'state')) throw new Error('invalid_vocabulary_game_store');
  const state = row.state ?? vocabularyGameInitial();
  if (part !== 'word-game') {
    if (!state.badge) return json(res, 403, { error: 'achievement_required' });
    const preview = part === 'preview';
    const [extension, type, content] = downloads[preview ? 'badge' : part];
    res.writeHead(200, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; sandbox",
      ...(preview ? {} : { 'Content-Disposition': `attachment; filename="capital-ai-vocabulary-100-${part}.${extension}"` }) });
    return res.end(content(state.badge));
  }
  if (action) {
    const result = advanceVocabularyGame(state, action, now());
    if (result.error) return json(res, result.status, { error: result.error });
    if (result.changed && await store({ _user_id: userId, _expected: row.revision, _state: state }) !== true)
      return json(res, 409, { error: 'progress_changed' });
  }
  const response = projectVocabularyGame(state, now());
  // The progress read is shared by the dashboard and the quiz. Only the latter requests questions.
  if (req.method === 'GET' && url.searchParams.get('view') !== 'quiz') delete response.round;
  return json(res, 200, response);
}
