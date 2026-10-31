import { useEffect, useRef, useState, type FormEvent } from 'react';

import { readNotes, saveNotes, NotesClientError, type NotesConflict, type NotesSnapshot } from '../features/account/privateNotesOcc';
import { NotesConflictPanel } from '../features/account/NotesConflictPanel';
type SessionResponse = { authenticated?: boolean; mfaRequired?: boolean; user?: { id?: string } };
type BuddyNote = { line: number; raw: string; color: string; checked: boolean; text: string };
const COLORS = [
  { color: '🟨', label: 'Gelb', background: '#fef3c7' },
  { color: '🟦', label: 'Blau', background: '#dbeafe' },
  { color: '🟩', label: 'Grün', background: '#dcfce7' },
  { color: '🩷', label: 'Rosa', background: '#fce7f3' },
  { color: '🟪', label: 'Violett', background: '#f3e8ff' },
] as const;
const BUDDY_LINE = /^JaJa Buddy · (🟨|🟦|🟩|🩷|🟪) (☑|☐) (.{1,500})$/u;

export function parseBuddyNotes(raw: string): BuddyNote[] {
  return raw.split('\n').flatMap((line, index) => {
    const hit = BUDDY_LINE.exec(line);
    return hit ? [{ line: index, raw: line, color: hit[1], checked: hit[2] === '☑', text: hit[3] }] : [];
  });
}

export function formatBuddyNote(color: string, checked: boolean, text: string): string {
  if (!COLORS.some(item => item.color === color)) throw new Error('INVALID_COLOR');
  const clean = text.replace(/\s+/g, ' ').trim();
  if (!clean || clean.length > 500) throw new Error('INVALID_TEXT');
  return 'JaJa Buddy · ' + color + ' ' + (checked ? '☑' : '☐') + ' ' + clean;
}

async function readAuthorizedNotes(signal?: AbortSignal): Promise<NotesSnapshot> {
  const sessionResponse = await fetch('/api/auth/session', {
    credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
  });
  const session: SessionResponse | null = sessionResponse.ok ? await sessionResponse.json() : null;
  const userId = session?.authenticated === true && session.mfaRequired !== true ? session.user?.id : undefined;
  if (!sessionResponse.ok || typeof userId !== 'string' || !userId) throw new NotesClientError('SESSION_CHANGED');
  return readNotes(userId, signal);
}

function localSummary(text: string): string {
  const sentences = text.split(/[.!?]+/).map(item => item.trim()).filter(Boolean);
  return sentences.slice(0, 2).join('. ') + (sentences.length > 2 ? '…' : '');
}

/**
 * JaJa uses the existing account-scoped /api/profile/notes contract.
 * Human-readable Buddy lines coexist with existing freeform dashboard notes.
 * Never use global browser storage to persist private note contents.
 */
export function BuddyStickyNotes({ initialText = '' }: { initialText?: string }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<NotesSnapshot | null>(null);
  const [conflict, setConflict] = useState<NotesConflict | null>(null);
  const busyRef = useRef(false);
  const conflictRef = useRef(false);
  const [notes, setNotes] = useState<BuddyNote[]>([]);
  const [draft, setDraft] = useState(initialText);
  const [color, setColor] = useState<string>(COLORS[0].color);
  const [summaryLine, setSummaryLine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');

  useEffect(() => { setDraft(initialText); }, [initialText]);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (busyRef.current || conflictRef.current) return;
      try {
        const data = await readAuthorizedNotes(controller.signal);
        if (!controller.signal.aborted) {
          setUserId(data.userId);
          setSnapshot(data);
          setNotes(parseBuddyNotes(data.notes));
          setError('');
        }
      } catch {
        if (!controller.signal.aborted) {
          setUserId(null);
          setSnapshot(null);
          setNotes([]);
          setDraft('');
          setError('Private Notizen benötigen eine verifizierte Anmeldung und eine erreichbare Notizablage.');
        }
      }
    };
    void refresh();
    const onFocus = () => { void refresh(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') void refresh(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      controller.abort();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const mutate = async (transform: (raw: string) => string, successMessage: string): Promise<boolean> => {
    if (!userId || !snapshot || busyRef.current || conflictRef.current) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      // Fresh snapshot for this operation; SQL still atomically checks its revision.
      const current = await readAuthorizedNotes();
      if (current.userId !== userId) throw new NotesClientError('SESSION_CHANGED');
      const updated = transform(current.notes);
      if (updated.length > 10000) throw new NotesClientError('INVALID_NOTES');
      const result = await saveNotes(current, updated);
      if (result.kind === 'conflict') {
        conflictRef.current = true;
        setConflict(result.conflict);
        setError('Ein anderes Fenster hat die Notizen geändert. Bitte Zusammenführung prüfen.');
        return false;
      }
      setSnapshot(result.snapshot);
      setNotes(parseBuddyNotes(result.snapshot.notes));
      setStatus(successMessage);
      return true;
    } catch (reason) {
      if (reason instanceof NotesClientError && reason.code === 'SESSION_CHANGED') {
        setUserId(null);
        setSnapshot(null);
        setNotes([]);
        setDraft('');
        setConflict(null);
        conflictRef.current = false;
        setError('Anmeldung geändert. Bitte erneut anmelden.');
      } else {
        // Keep local input and last confirmed notes on uncertain backend results.
        setError('Notiz nicht bestätigt. Deine Eingabe bleibt erhalten. Bitte Serverstand erneut prüfen.');
      }
      return false;
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const resolveMerge = async (text: string) => {
    if (!conflict || !userId || busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const base: NotesSnapshot = {
        userId, notes: conflict.serverNotes, revision: conflict.serverRevision,
      };
      const result = await saveNotes(base, text);
      if (result.kind === 'conflict') {
        setConflict(result.conflict);
        setError('Weitere Änderung erkannt. Bitte die neue Serverfassung prüfen.');
      } else {
        setSnapshot(result.snapshot);
        setNotes(parseBuddyNotes(result.snapshot.notes));
        setConflict(null);
        conflictRef.current = false;
        setStatus('Zusammengeführte Notizen gespeichert.');
      }
    } catch (reason) {
      if (reason instanceof NotesClientError && reason.code === 'SESSION_CHANGED') {
        setUserId(null);
        setSnapshot(null);
        setNotes([]);
        setDraft('');
        setConflict(null);
        conflictRef.current = false;
        setError('Anmeldung geändert. Bitte erneut anmelden.');
      } else {
        setError('Speicherung nicht bestätigt. Dein Entwurf bleibt im Konfliktfenster erhalten.');
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const acceptServer = () => {
    if (!conflict || !userId || busyRef.current) return;
    setSnapshot({ userId, notes: conflict.serverNotes, revision: conflict.serverRevision });
    setNotes(parseBuddyNotes(conflict.serverNotes));
    setConflict(null);
    conflictRef.current = false;
    setError('');
    setStatus('Serverfassung übernommen.');
  };

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    let line: string;
    try { line = formatBuddyNote(color, false, draft); }
    catch { setError('Bitte höchstens 500 Zeichen eingeben.'); return; }
    void mutate(raw => (raw ? raw.replace(/\s*$/, '') + '\n' : '') + line, 'Notiz im privaten Dashboard gespeichert.').then(saved => {
      // Keep unsaved text on failure so it can be recovered.
      if (saved) setDraft(current => current === draft ? '' : current);
    });
  };
  const updateOne = (note: BuddyNote, action: 'check' | 'remove') => {
    void mutate(raw => {
      const lines = raw.split('\n');
      if (lines[note.line] !== note.raw) throw new Error('CONCURRENT_NOTE_CHANGE');
      if (action === 'remove') lines.splice(note.line, 1);
      else lines[note.line] = formatBuddyNote(note.color, !note.checked, note.text);
      return lines.join('\n');
    }, action === 'remove' ? 'Notiz gelöscht.' : 'Notiz aktualisiert.');
  };

  return (
    <div className="space-y-3 text-xs" aria-label="JaJa Buddy Notizen">
      <p className="text-slate-300">Nur für dein angemeldetes Konto. Speicherung über das private Dashboard, keine Drittanbieter-KI.</p>
      <form onSubmit={add} className="space-y-2">
        <label htmlFor="buddy-note-draft" className="block text-slate-200">Notiz oder Chat-Vokabel</label>
        <textarea id="buddy-note-draft" rows={2} maxLength={500} disabled={!userId || busy || !!conflict}
          value={draft} onChange={event => setDraft(event.target.value)}
          className="w-full rounded border border-slate-500 bg-slate-900 p-2 text-sm text-white" />
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="buddy-note-color" className="text-slate-200">Farbe</label>
          <select id="buddy-note-color" value={color} onChange={event => setColor(event.target.value)}
            disabled={!userId || busy} className="min-h-10 rounded border border-slate-500 bg-slate-900 px-2 text-white">
            {COLORS.map(item => <option key={item.color} value={item.color}>{item.label}</option>)}
          </select>
          <button type="submit" disabled={!userId || busy || !!conflict || !draft.trim()}
            className="min-h-10 rounded bg-amber-400 px-3 font-bold text-black disabled:opacity-40">
            {busy ? 'Speichere …' : 'Notiz speichern'}
          </button>
        </div>
      </form>
      {error && <p role="alert" className="text-rose-200">{error} <a href="/login" className="underline">Anmelden</a></p>}
      {status && <p role="status" className="text-emerald-200">{status}</p>}
      {conflict && <NotesConflictPanel conflict={conflict} busy={busy} onUseServer={acceptServer} onMerge={text => void resolveMerge(text)} />}
      {userId && notes.length === 0 && <p role="status" className="text-slate-300">Noch keine JaJa-Notizen.</p>}
      <ul className="grid gap-2">
        {notes.map(note => {
          const selection = COLORS.find(item => item.color === note.color) ?? COLORS[0];
          return (
            <li key={note.line} className="rounded border border-slate-300/30 p-2" style={{ backgroundColor: selection.background, color: '#111827' }}>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={note.checked} onChange={() => updateOne(note, 'check')}
                  disabled={busy || !!conflict} aria-label="Notiz erledigt" className="mt-1 h-4 w-4" />
                <p className={'min-w-0 flex-1 whitespace-pre-wrap break-words text-sm ' + (note.checked ? 'line-through' : '')}>{note.text}</p>
              </div>
              {summaryLine === note.line && <p className="mt-2 text-xs italic">Kurzfassung: {localSummary(note.text)}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSummaryLine(value => value === note.line ? null : note.line)}
                  className="min-h-9 underline" aria-pressed={summaryLine === note.line}>Lokal zusammenfassen</button>
                <button type="button" disabled={busy} onClick={() => updateOne(note, 'remove')}
                  className="min-h-9 text-red-700 underline" aria-label="Notiz löschen">Löschen</button>
              </div>
            </li>
          );
        })}
      </ul>
      <a href="/profile/dashboard" className="inline-block min-h-9 pt-2 font-semibold text-amber-200 underline">
        Gespeicherte Notizen im privaten Dashboard ansehen
      </a>
    </div>
  );
}
