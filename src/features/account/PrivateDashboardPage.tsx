import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountPageShell } from './AccountPageShell';
import { LearningFavoritesPanel } from '../learning/LearningFavorites';

type NotesResponse = { notes: string; userId: string };
const dashboardTabs = [
  { id: 'learning', label: 'Lernfeld' },
  { id: 'notes', label: 'Notizen' },
  { id: 'saved', label: 'Gespeicherte Notizen' },
] as const;
type DashboardTab = (typeof dashboardTabs)[number]['id'];
const changedSessionMessage = 'Deine Anmeldung hat sich geändert. Lade die Seite erneut, bevor du Notizen bearbeitest.';

function isNotesResponse(value: unknown, userId: string): value is NotesResponse {
  if (!value || typeof value !== 'object') return false;
  const body = value as Partial<NotesResponse>;
  return body.userId === userId && typeof body.notes === 'string';
}

function PrivateDashboardContent({ userId }: { userId: string }) {
  const [tab, setTab] = useState<DashboardTab>('learning');
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const revoked = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    revoked.current = false;
    setText('');
    setSavedText('');
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
        setSavedText(body.notes);
        setLoaded(true);
      }
    }).catch(() => {
      if (!controller.signal.aborted && !revoked.current) {
        setText('');
        setSavedText('');
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
          setSavedText('');
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
      setSavedText(body.notes);
      setStatus('Notizen gespeichert.');
    } catch (reason) {
      if (reason instanceof Error && reason.message === 'SESSION_CHANGED') {
        revoked.current = true;
        setLoaded(false);
        setText('');
        setSavedText('');
        setError(changedSessionMessage);
      } else if (!revoked.current) {
        setError('Speichern fehlgeschlagen. Deine Eingabe bleibt erhalten.');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Privates Dashboard" className="hub-tab-strip"
        onKeyDown={event => {
          if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
          event.preventDefault();
          const index = dashboardTabs.findIndex(item => item.id === tab);
          const next = event.key === 'Home' ? dashboardTabs[0].id :
            event.key === 'End' ? dashboardTabs[dashboardTabs.length - 1].id :
            dashboardTabs[(index + (event.key === 'ArrowRight' ? 1 : -1) + dashboardTabs.length) % dashboardTabs.length].id;
          setTab(next);
          document.getElementById('dashboard-' + next + '-tab')?.focus();
        }}>
        {dashboardTabs.map(item => (
          <button key={item.id} type="button" id={'dashboard-' + item.id + '-tab'}
            role="tab" tabIndex={tab === item.id ? 0 : -1}
            aria-selected={tab === item.id} aria-controls={'dashboard-' + item.id}
            className="hub-tab" onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      <div hidden={tab !== 'learning'} id="dashboard-learning" role="tabpanel" aria-labelledby="dashboard-learning-tab">
        <LearningFavoritesPanel />
      </div>
      <div hidden={tab !== 'notes'} id="dashboard-notes" role="tabpanel" aria-labelledby="dashboard-notes-tab">
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
      </div>
      <div hidden={tab !== 'saved'} id="dashboard-saved" role="tabpanel" aria-labelledby="dashboard-saved-tab">
        <section className="rounded-2xl border border-slate-700 bg-brand-canvas p-5" aria-labelledby="saved-notes-heading">
          <h2 id="saved-notes-heading" className="text-xl font-bold text-white">Gespeicherte Notizen</h2>
          <p className="mt-2 text-sm text-slate-300">Hier siehst du den zuletzt vom Server bestätigten Notizentext. Nicht gespeicherte Änderungen werden nicht angezeigt.</p>
          {!loaded && !error && <p role="status" className="mt-4 text-slate-300">Notizen werden geladen …</p>}
          {error && <p role="alert" className="mt-4 text-rose-200">{error}</p>}
          {loaded && (savedText.trim()
            ? <p className="mt-5 whitespace-pre-wrap break-words rounded-xl border border-slate-600 bg-slate-950 p-4 text-base leading-7 text-white">{savedText}</p>
            : <p role="status" className="mt-4 text-slate-300">Du hast noch keine Notizen gespeichert.</p>)}
          <button type="button" onClick={() => { setTab('notes'); document.getElementById('dashboard-notes-tab')?.focus(); }}
            className="mt-5 min-h-11 rounded-xl border border-amber-400/50 px-4 py-2 text-sm font-semibold text-amber-200 hover:bg-amber-400/10">
            Notizen bearbeiten
          </button>
        </section>
      </div>
    </div>
  );
}

export function PrivateDashboardPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <AccountPageShell active="/profile/dashboard" title="Privates Dashboard"
      description="Dein persönliches Lernfeld sowie bearbeitete und gespeicherte Notizen." onNavigate={onNavigate}>
      {session => <PrivateDashboardContent key={session.user!.id} userId={session.user!.id} />}
    </AccountPageShell>
  );
}
