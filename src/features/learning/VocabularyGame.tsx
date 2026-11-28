import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react';
import { vocabularyMetadata } from '../../../shared/vocabulary-metadata.mjs';
import { vocabularySwipeDirection } from '../../components/VocabularyFlashcards';
import { useLearningFavorites } from './LearningFavorites';

import { vocabularyGameEndpoint as endpoint, vocabularyReview } from './vocabularyReview';
const actionClass = 'min-h-11 rounded-xl border border-amber-300/40 px-3 py-2 font-semibold text-amber-100 hover:bg-amber-300/10 focus-visible:outline-2 focus-visible:outline-amber-300 disabled:opacity-50';
const panel = 'rounded-3xl border border-brand-gold/30 bg-brand-canvas p-4 sm:p-6';

type Round = { id: string; position: number; size: number; correct: number; last: 'right' | 'wrong' | 'timeout' | null;
  question?: { id: string; term: string; remainingMs: number; options: { id: string; label: string }[] } };
type Progress = { right: number; wrong: number; timedOut: number; rounds: number;
  earned: { id: string; learnedAt: number }[];
  outcomes: { id: string; result: 'known' | 'missed'; at: number }[];
  reviews: { id: string; result: 'known' | 'missed'; swiped: boolean; at: number }[];
  recent: { correct: number }[]; badge: { id: string; earnedAt: number } | null; round?: Round | null };
type Action = { type: 'start' } | { type: 'answer'; round: string; word: string; option: string | null } | ReturnType<typeof vocabularyReview>;
class GameRequestError extends Error {
  constructor(readonly status: number) { super('vocabulary_game_request_failed'); }
}

async function progressRequest(view: string, action?: Action, signal?: AbortSignal): Promise<Progress> {
  const response = await fetch(endpoint + view, {
    cache: 'no-store', credentials: 'same-origin', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(15_000)]) : AbortSignal.timeout(15_000),
    ...(action && { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(action) }),
  });
  if (!response.ok) throw new GameRequestError(response.status);
  return response.json();
}

function useProgress(quiz = false) {
  const [value, setValue] = useState<Progress>();
  const [status, setStatus] = useState(0);
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const view = quiz ? '?view=quiz' : '';
  useEffect(() => {
    const request = new AbortController();
    controller.current = request;
    void progressRequest(view, undefined, request.signal)
      .then(data => { if (!request.signal.aborted) setValue(data); })
      .catch(error => { if (!request.signal.aborted) setStatus(error.status ?? 503); });
    return () => request.abort();
  }, [view]);
  async function act(action: Action) {
    const signal = controller.current?.signal;
    if (!signal || signal.aborted || pending.current) return;
    pending.current = true;
    setBusy(true);
    setStatus(0);
    try {
      const updated = await progressRequest(view, action, signal);
      if (!signal.aborted) setValue(updated);
    } catch (error) {
      if (signal.aborted) return;
      setStatus(error instanceof GameRequestError ? error.status : 503);
      if (error instanceof GameRequestError && error.status === 409) {
        const updated = await progressRequest(view, undefined, signal).catch(() => undefined);
        if (updated && !signal.aborted) setValue(updated);
      }
      if (error instanceof GameRequestError && error.status === 401) setValue(undefined);
    } finally {
      pending.current = false;
      if (!signal.aborted) setBusy(false);
    }
  }
  return { value, status, busy, act };
}

function RequestFeedback({ status }: { status: number }) {
  if (status === 401) return <p><a href="/login" className="text-amber-200 underline">Anmelden</a>, um deinen Lernfortschritt im privaten Dashboard zu speichern.</p>;
  if (status === 409) return <p role="status">Der Spielstand wurde neu geladen. Wiederhole die Aktion bei Bedarf.</p>;
  if (status) return <p role="alert" className="text-rose-200">Der Server konnte den Lernfortschritt gerade nicht bestätigen.</p>;
  return null;
}

export function VocabularySoloQuiz() {
  const { value, status, busy, act } = useProgress(true);
  const round = value?.round;
  const remaining = round?.question?.remainingMs;
  const [seconds, setSeconds] = useState(90);
  const clock = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (remaining === undefined) return;
    clock.current = performance.now() + remaining;
    const tick = () => setSeconds(Math.max(0, Math.ceil((clock.current - performance.now()) / 1000)));
    tick();
    const interval = window.setInterval(tick, 250);
    heading.current?.focus();
    return () => window.clearInterval(interval);
  }, [round?.id, round?.position, remaining]);
  const question = round?.question;
  const completed = round && !question;
  function answer(option: string | null) {
    if (round && question) void act({ type: 'answer', round: round.id, word: question.id, option });
  }
  return <section className={panel + ' space-y-4'} aria-labelledby="word-quiz-heading">
    <h3 id="word-quiz-heading" className="text-2xl font-bold text-amber-200">Wörter-Quiz · Einzelspieler</h3>
    <RequestFeedback status={status} />
    {!value && !status && <p role="status">Spielstand wird geladen …</p>}
    {value && (!round || completed) && <>
      {completed ? <p role="status">Runde abgeschlossen. {round.correct} von {round.size} richtig.</p>
        : <p>10 Fachbegriffe. Pro Frage hast du 90 Sekunden.</p>}
      <button type="button" className={actionClass} disabled={busy} onClick={() => void act({ type: 'start' })}>
        {completed ? 'Neue Runde starten' : 'Einzelspieler starten'}
      </button>
    </>}
    {round && question && <>
      <div className="flex flex-wrap justify-between gap-2 text-sm text-slate-300">
        <p>Frage {round.position + 1} von {round.size}</p>
        <p role="timer">{seconds} Sekunden übrig</p>
      </div>
      {round.last && <p role="status" className="text-amber-200">{round.last === 'right' ? 'Richtig. Karte verdient.' : round.last === 'timeout' ? 'Zeit abgelaufen.' : 'Die vorige Antwort war falsch.'}</p>}
      <h4 ref={heading} tabIndex={-1} className="text-xl font-bold">{question.term}</h4>
      {seconds > 0 ? <ul className="grid gap-2">{question.options.map(option =>
        <li key={option.id}><button type="button" className={actionClass + ' w-full text-left'} disabled={busy}
          onClick={() => answer(option.id)}>{option.label}</button></li>)}</ul>
        : <button type="button" className={actionClass} disabled={busy} onClick={() => answer(null)}>Zeit abgelaufen · Weiter</button>}
    </>}
  </section>;
}

const terms = new Map(vocabularyMetadata.map(term => [term.id, term]));
type Term = (typeof vocabularyMetadata)[number];

function EarnedCard({ term, onReview, busy, marked, onMark }: {
  term: Term; onReview: (known: boolean, swipe: boolean) => void; busy: boolean; marked: boolean; onMark: () => void;
}) {
  const [flipped, setFlipped] = useState(false);
  const pointer = useRef<{ x: number; y: number } | null>(null);
  const didSwipe = useRef(false);
  function end(event: PointerEvent<HTMLButtonElement>) {
    const start = pointer.current;
    pointer.current = null;
    if (!start) return;
    const direction = vocabularySwipeDirection(event.clientX - start.x, event.clientY - start.y);
    if (!direction) return;
    didSwipe.current = true;
    if (!busy) onReview(direction === 'right', true);
  }

  return <article className="min-w-0 rounded-2xl border-2 border-amber-300/75 bg-[#111a32] p-3">
    <button type="button" className="vocabulary-turn w-full touch-pan-y text-left focus-visible:outline-2 focus-visible:outline-amber-300"
      aria-pressed={flipped} aria-label={flipped ? `${term.term}: Definition. ${term.description} Vorderseite anzeigen` :
        `${term.term}: Thesaurus. ${term.thesaurus?.join(', ') || 'Keine Synonyme'}. Definition anzeigen`}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0) return;
        didSwipe.current = false;
        pointer.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
      }} onPointerUp={end} onPointerCancel={() => { pointer.current = null; didSwipe.current = false; }}
      onClick={event => { if (!didSwipe.current || event.detail === 0) setFlipped(!flipped); didSwipe.current = false; }}>
      <span className="vocabulary-turn-inner" data-flipped={flipped}>
        <span className="vocabulary-face" aria-hidden={flipped}>
          <strong className="block break-words text-amber-100">{term.term}</strong>
          <span className="mt-2 block text-sm text-slate-200">Thesaurus · {term.thesaurus?.join(' · ') || 'Keine Synonyme hinterlegt'}</span>
          <span className="mt-3 block text-xs text-amber-200">Definition anzeigen ↻</span>
        </span>
        <span className="vocabulary-face vocabulary-face-back" aria-hidden={!flipped}>
          <strong className="block text-amber-100">Definition</strong>
          <span className="mt-2 block text-sm text-slate-200">{term.description}</span>
          <span className="mt-3 block text-xs text-amber-200">Karte zurückdrehen ↻</span>
        </span>
      </span>
    </button>
    <div className="mt-2 flex flex-wrap gap-2">
      <button type="button" className={actionClass + ' text-xs'} disabled={busy} onClick={() => onReview(false, false)}>Noch üben</button>
      <button type="button" className={actionClass + ' text-xs'} disabled={busy} onClick={() => onReview(true, false)}>Bekannt</button>
      <button type="button" className={actionClass + ' text-xs'} aria-pressed={marked}
        aria-label={term.term + ': ' + (marked ? 'Merken rückgängig machen' : 'Merken')}
        disabled={busy} onClick={onMark}>{marked ? 'Gemerkt' : 'Merken'}</button>
    </div>
  </article>;
}

export function VocabularyAchievementPanel() {
  const { value, status, busy, act } = useProgress();
  const favorites = useLearningFavorites();
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(0);
  const [mix, setMix] = useState(0);
  const [width, setWidth] = useState(1);
  useEffect(() => {
    const two = window.matchMedia('(min-width: 640px)');
    const three = window.matchMedia('(min-width: 1024px)');
    const sync = () => { setWidth(three.matches ? 3 : two.matches ? 2 : 1); setPage(0); };
    sync();
    for (const breakpoint of [two, three]) breakpoint.addEventListener('change', sync);
    return () => { for (const breakpoint of [two, three]) breakpoint.removeEventListener('change', sync); };
  }, []);
  const ordered = useMemo(() => {
    const cards = (value?.earned ?? []).filter(card => terms.has(card.id));
    if (sort === 'name') return cards.sort((a, b) => terms.get(a.id)!.term.localeCompare(terms.get(b.id)!.term, 'de'));
    if (sort === 'practice') {
      const reviews = new Map(value?.reviews.map(review => [review.id, review]));
      return cards.sort((a, b) => Number(reviews.get(b.id)?.result === 'missed') - Number(reviews.get(a.id)?.result === 'missed') ||
        (reviews.get(a.id)?.at ?? 0) - (reviews.get(b.id)?.at ?? 0));
    }
    if (sort === 'mix') {
      let seed = mix;
      for (let i = cards.length - 1; i > 0; i--) {
        seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
        const j = seed % (i + 1);
        [cards[i], cards[j]] = [cards[j], cards[i]];
      }
      return cards;
    }
    return cards.sort((a, b) => b.learnedAt - a.learnedAt);
  }, [value, sort, mix]);
  if (!value) return <div className={panel}>{status ? <RequestFeedback status={status} /> : <p role="status">Lernfortschritt wird geladen …</p>}</div>;
  const latest = new Map(value.outcomes.map(outcome => [outcome.id, outcome]));
  for (const review of value.reviews) {
    if (review.at >= (latest.get(review.id)?.at ?? 0)) latest.set(review.id, review);
  }
  const known = [...latest.values()].filter(item => item.result === 'known').length;
  const swiped = value.reviews.filter(review => review.swiped).length;
  const perPage = 5 * width;
  const pages = Math.max(1, Math.ceil(ordered.length / perPage));
  const visiblePage = Math.min(page, pages - 1);
  const rows = [
    ['Gewusste Wörter', known], ['Noch zu übende Wörter', latest.size - known],
    ['Gemerkte Wörter', favorites.error || !favorites.authenticated || !favorites.loaded ? null : favorites.ids.length], ['Gewischte Wörter', swiped],
  ] as const;
  return <section className={panel + ' space-y-5'} aria-labelledby="my-vocabulary-achievements">
    <h2 id="my-vocabulary-achievements" className="text-2xl font-bold text-amber-200">Meine Erfolge</h2>
    <RequestFeedback status={status} />
    {favorites.error && <p role="alert" className="text-rose-200">{favorites.error}</p>}
    <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
      ['Richtig', value.right], ['Falsch', value.wrong], ['Davon Zeit abgelaufen', value.timedOut], ['Gespielte Runden', value.rounds],
    ].map(([label, count]) => <div key={label} className="rounded-xl border border-violet-300/30 bg-violet-300/5 p-3">
      <dt className="text-sm text-slate-300">{label}</dt><dd className="mt-1 text-xl font-bold text-white">{count}</dd></div>)}</dl>
    <div className="grid gap-5 sm:grid-cols-2">
      <figure className="grid content-start gap-2">
        <figcaption className="font-bold text-violet-200">Wörter nach Lernstand</figcaption>
        {rows.map(([label, count]) => <div key={label}>
          <p className="text-sm">{label} · {count ?? 'Nicht verfügbar'}</p>
          {count !== null && <meter aria-hidden="true" className="w-full" min={0} max={Math.max(1, ...rows.map(([, n]) => n ?? 0))} value={count} />}
        </div>)}
      </figure>
      <figure className="grid content-start gap-2">
        <figcaption className="font-bold text-violet-200">Spielverlauf · letzte 10 Runden</figcaption>
        {value.recent.length ? value.recent.map(({ correct }, index) => <div key={index}>
          <p className="text-sm">Runde {value.rounds - value.recent.length + index + 1} · {correct} von 10 richtig</p>
          <meter aria-hidden="true" className="w-full" min={0} max={10} value={correct} />
        </div>) : <p className="text-sm text-slate-300">Deine erste abgeschlossene Runde erscheint hier.</p>}
      </figure>
    </div>
    <h3 className="text-xl font-bold text-amber-200">Verdiente Karteikarten</h3>
    {ordered.length === 0 ? <p>Richtige Antworten im Wörter-Quiz schalten hier Karteikarten frei.</p> : <>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex flex-wrap items-center gap-2">Sortierung
          <select className={actionClass + ' bg-slate-950'} value={sort}
            onChange={event => { setSort(event.target.value); setPage(0); }}>
            <option value="recent">Zuletzt gelernt</option><option value="name">Alphabetisch</option>
            <option value="practice">Wiederholung zuerst</option><option value="mix">Gemischt</option>
          </select>
        </label>
        <button type="button" className={actionClass} onClick={() => {
          setMix(crypto.getRandomValues(new Uint32Array(1))[0]); setSort('mix'); setPage(0);
        }}>Neu mischen</button>
      </div>
      <div className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.slice(visiblePage * perPage, (visiblePage + 1) * perPage).map(({ id }) =>
          <EarnedCard key={id} term={terms.get(id)!} busy={busy || favorites.pending} marked={favorites.ids.includes(id)}
            onMark={() => void favorites.toggle(id)} onReview={(known, swipe) =>
            void act(vocabularyReview(id, known, swipe))} />)}
      </div>
      {pages > 1 && <nav aria-label="Karteikartenseiten" className="flex flex-wrap items-center gap-3">
        <button type="button" className={actionClass} disabled={visiblePage === 0} onClick={() => setPage(visiblePage - 1)}>Zurück</button>
        <p role="status">Seite {visiblePage + 1} von {pages}</p>
        <button type="button" className={actionClass} disabled={visiblePage + 1 === pages} onClick={() => setPage(visiblePage + 1)}>Weiter</button>
      </nav>}
    </>}
  </section>;
}

export function VocabularyAchievementBadge() {
  const { value } = useProgress();
  if (!value?.badge) return null;
  return <figure className="grid grid-cols-[auto_1fr] items-center gap-3 rounded-2xl border border-amber-300/50 bg-amber-300/5 p-3 text-amber-100">
    <img src={endpoint + '/preview'} width={48} height={48} alt="" className="rounded-lg" />
    <figcaption className="font-bold">Vocabulary · 100 richtige Antworten</figcaption>
    <div className="col-span-2 flex flex-wrap gap-2 text-xs">
      {Object.entries({ badge: 'Abzeichen', license: 'Lizenz', certificate: 'Zertifikat' }).map(([path, label]) =>
        <a className={actionClass + ' inline-flex items-center'} key={path} href={endpoint + '/' + path} download>{label} herunterladen</a>)}
    </div>
  </figure>;
}
