import { useEffect, useRef, useState, type FormEvent } from 'react';
import { AccountPageShell } from './AccountPageShell';
import { LearningFavoritesPanel } from '../learning/LearningFavorites';
import { readNotes, saveNotes, NotesClientError, type NotesConflict, type NotesSnapshot } from './privateNotesOcc';
import { NotesConflictPanel } from './NotesConflictPanel';

const dashboardTabs = [
  { id: 'learning', label: 'Lernfeld' },
  { id: 'notes', label: 'Notizen' },
  { id: 'saved', label: 'Gespeicherte Notizen' },
] as const;
type DashboardTab = (typeof dashboardTabs)[number]['id'];
const changedSessionMessage = 'Deine Anmeldung hat sich geändert. Lade die Seite erneut, bevor du Notizen bearbeitest.';

function PrivateDashboardContent({ userId }: { userId: string }) {
  const [tab, setTab] = useState<DashboardTab>('learning');
  const [text, setText] = useState('');
  const [savedText, setSavedText] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [revision, setRevision] = useState<string | null>(null);
  const [conflict, setConflict] = useState<NotesConflict | null>(null);
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
    setRevision(null);
    setConflict(null);
    setStatus('');
    setError('');
    readNotes(userId, controller.signal).then(body => {
      if (!controller.signal.aborted && !revoked.current) {
        setText(body.notes);
        setSavedText(body.notes);
        setRevision(body.revision);
        setLoaded(true);
      }
    }).catch(() => {
      if (!controller.signal.aborted && !revoked.current) {
        setText('');
        setSavedText('');
        setRevision(null);
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
          setRevision(null);
          setConflict(null);
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
    if (!loaded || busy || revoked.current || revision === null || conflict) return;
    setBusy(true);
    setError('');
    setStatus('');
    const submitted = text;
    const base: NotesSnapshot = { userId, notes: savedText, revision };
    try {
      const result = await saveNotes(base, submitted);
      if (revoked.current) return;
      if (result.kind === 'conflict') {
        setConflict(result.conflict);
        setTab('notes');
        setError('Notizen wurden in einem anderen Fenster geändert. Dein Entwurf bleibt erhalten.');
        return;
      }
      setRevision(result.snapshot.revision);
      setSavedText(result.snapshot.notes);
      // A new edit made during the request must not be overwritten.
      setText(current => current === submitted ? result.snapshot.notes : current);
      setStatus('Notizen gespeichert.');
    } catch (reason) {
      if (reason instanceof NotesClientError && reason.code === 'SESSION_CHANGED') {
        revokeSession();
      } else if (!revoked.current) {
        setError('Speichern nicht bestätigt. Deine Eingabe bleibt erhalten. Bitte Serverstand prüfen.');
      }
    } finally {
      setBusy(false);
    }
  }

  function revokeSession() {
    revoked.current = true;
    setLoaded(false);
    setRevision(null);
    setConflict(null);
    setText('');
    setSavedText('');
    setStatus('');
    setError(changedSessionMessage);
  }

  async function mergeConflict(merged: string) {
    if (!conflict || busy || revoked.current) return;
    setBusy(true);
    setError('');
    const base: NotesSnapshot = { userId, notes: conflict.serverNotes, revision: conflict.serverRevision };
    try {
      const result = await saveNotes(base, merged);
      if (revoked.current) return;
      if (result.kind === 'conflict') {
        setConflict(result.conflict);
        setError('Weitere Änderung erkannt. Bitte neue Serverfassung prüfen.');
      } else {
        setRevision(result.snapshot.revision);
        setSavedText(result.snapshot.notes);
        setText(result.snapshot.notes);
        setConflict(null);
        setStatus('Zusammenführung gespeichert.');
      }
    } catch (reason) {
      if (reason instanceof NotesClientError && reason.code === 'SESSION_CHANGED') {
        revokeSession();
      } else {
        setError('Zusammenführung nicht bestätigt. Dein Entwurf bleibt erhalten.');
      }
    } finally {
      setBusy(false);
    }
  }

  function acceptServer() {
    if (!conflict || revoked.current) return;
    setText(conflict.serverNotes);
    setSavedText(conflict.serverNotes);
    setRevision(conflict.serverRevision);
    setConflict(null);
    setStatus('Serverfassung übernommen.');
    setError('');
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
            <textarea id="private-notes" rows={10} maxLength={10000} disabled={!loaded || busy || !!conflict}
              value={text} onChange={event => { setText(event.target.value); setStatus(''); }}
              className="w-full rounded-xl border border-slate-500 bg-slate-950 p-4 text-base leading-7 text-white focus-visible:outline-2 focus-visible:outline-brand-gold" />
            <button disabled={!loaded || busy}
              className="min-h-11 rounded-xl bg-brand-gold px-5 py-3 font-semibold text-black disabled:opacity-50">
              {busy ? 'Speichern …' : 'Notizen speichern'}
            </button>
            {!loaded && !error && <p role="status" className="text-slate-300">Notizen werden geladen …</p>}
            {status && <p role="status" className="text-emerald-200">{status}</p>}
            {error && <p role="alert" className="text-rose-200">{error}</p>}
            {conflict && <NotesConflictPanel conflict={conflict}
              onUseServer={acceptServer} onMerge={text => void mergeConflict(text)} />}
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
