import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountPageShell } from './AccountPageShell';
import { LearningFavoritesPanel } from '../learning/LearningFavorites';

type NotesResponse = { notes: string; userId: string };
const changedSessionMessage = 'Deine Anmeldung hat sich geändert. Lade die Seite erneut, bevor du Notizen bearbeitest.';

function isNotesResponse(value: unknown, userId: string): value is NotesResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Partial<NotesResponse>;
  return body.userId === userId && typeof body.notes === 'string';
}

function PrivateNotes({ userId }: { userId: string }) {
  const [text, setText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const revoked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    revoked.current = false;
    setText('');
    setLoaded(false);
    setStatus('');
    setError('');
    fetch('/api/profile/notes', {
      credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('NOTES_UNAVAILABLE');
      const body: unknown = await response.json();
      if (!isNotesResponse(body, userId)) throw new Error('NOTES_IDENTITY_MISMATCH');
      return body;
    }).then(body => {
      if (!controller.signal.aborted && !revoked.current) {
        setText(body.notes);
        setLoaded(true);
      }
    }).catch(() => {
      if (!controller.signal.aborted && !revoked.current) {
        setText('');
        setLoaded(false);
        setError('Notizen konnten nicht sicher geladen werden. Bitte lade die Seite erneut.');
      }
    });
    return () => controller.abort();
  }, [userId]);

  // Browser cookies can change in another tab. Clear private state on a stale identity.
  useEffect(() => {
    const controller = new AbortController();
    const checkIdentity = async () => {
      try {
        const response = await fetch('/api/auth/session', {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        const body = response.ok ? await response.json() : null;
        if (!response.ok || body?.authenticated !== true ||
            body?.mfaRequired === true || body?.user?.id !== userId) {
          throw new Error('SESSION_CHANGED');
        }
      } catch {
        if (!controller.signal.aborted) {
          revoked.current = true;
          setLoaded(false);
          setText('');
          setStatus('');
          setError(changedSessionMessage);
        }
      }
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void checkIdentity();
    };
    window.addEventListener('focus', checkIdentity);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      window.removeEventListener('focus', checkIdentity);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [userId]);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!loaded || busy || revoked.current) return;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      const response = await fetch('/api/profile/notes', {
        method: 'PUT',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: text, expectedUserId: userId }),
        signal: AbortSignal.timeout(10000),
      });
      if (response.status === 409 || response.status === 401) throw new Error('SESSION_CHANGED');
      if (!response.ok) throw new Error('SAVE_FAILED');
      const body: unknown = await response.json();
      if (!isNotesResponse(body, userId) || body.notes !== text || revoked.current) {
        throw new Error('SESSION_CHANGED');
      }
      setStatus('Notizen gespeichert.');
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'SESSION_CHANGED') {
        revoked.current = true;
        setLoaded(false);
        setText('');
        setError(changedSessionMessage);
      } else if (!revoked.current) {
        setError('Speichern fehlgeschlagen. Deine Eingabe bleibt erhalten.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-2xl border border-slate-700 bg-brand-canvas p-5" aria-labelledby="private-notes-heading">
      <h2 id="private-notes-heading" className="text-xl font-bold text-white">Meine Notizen</h2>
      <form onSubmit={save} className="mt-4 space-y-3">
        <label htmlFor="private-notes" className="block text-base text-slate-300">
          Gedanken und Lernnotizen (maximal 10.000 Zeichen)
        </label>
        <textarea id="private-notes" rows={10} maxLength={10000} disabled={!loaded || busy}
          value={text} onChange={event => { setText(event.target.value); setStatus(''); }}
          className="w-full rounded-xl border border-slate-500 bg-slate-950 p-4 text-base leading-7 text-white focus-visible:outline-2 focus-visible:outline-brand-gold" />
        <button disabled={!loaded || busy}
          className="min-h-11 rounded-xl bg-brand-gold px-5 py-3 font-semibold text-black disabled:opacity-50">
          {busy ? 'Speichern …' : 'Notizen speichern'}
        </button>
        {!loaded && !error && <p role="status" className="text-slate-300">Notizen werden geladen …</p>}
        {status && <p role="status" className="text-emerald-200">{status}</p>}
        {error && <p role="alert" className="text-rose-200">{error}</p>}
      </form>
    </section>
  );
}

export function PrivateDashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <AccountPageShell active="/profile/dashboard" title="Privates Dashboard"
      description="Deine markierten Begriffe und persönlichen Notizen." onNavigate={onNavigate}>
      {session => (
        <div className="space-y-5">
          <LearningFavoritesPanel />
          <PrivateNotes key={session.user!.id} userId={session.user!.id} />
        </div>
      )}
    </AccountPageShell>
  );
}
