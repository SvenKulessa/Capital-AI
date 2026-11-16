import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BuddyCapturePanel, type BuddyPrivateImage } from './BuddyCapturePanel';
import { buildFrontendDesignPrompt, FRONTEND_FEATURES } from './buddyFrontendPrompt.mjs';

import { readNotes, saveNotes, NotesClientError, type NotesConflict, type NotesSnapshot } from '../features/account/privateNotesOcc';
import { NotesConflictPanel } from '../features/account/NotesConflictPanel';
type SessionResponse = { authenticated?: boolean; mfaRequired?: boolean; user?: { id?: string }; account?: { available?: boolean; iamRole?: string | null } };
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

async function verifiedNotesUser(signal?: AbortSignal): Promise<{ userId: string; isOwner: boolean }> {
  try {
    const response = await fetch('/api/auth/session', {
      credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
    });
    if (!response.ok) {
      throw new NotesClientError(response.status === 401 ? 'SESSION_CHANGED' : 'NOTES_UNAVAILABLE');
    }
    const session: SessionResponse = await response.json();
    const userId = session.authenticated === true && session.mfaRequired !== true ? session.user?.id : undefined;
    if (typeof userId !== 'string' || !userId) throw new NotesClientError('SESSION_CHANGED');
    return { userId, isOwner: session.account?.available === true && session.account?.iamRole === 'owner' };
  } catch (reason) {
    if (reason instanceof NotesClientError) throw reason;
    throw new NotesClientError('NOTES_UNAVAILABLE');
  }
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
export function BuddyStickyNotes({ initialText = '', captureRequest = 0 }: { initialText?: string; captureRequest?: number }) {
  const [userId, setUserId] = useState<string | null>(null);
  const [ownerPromptAllowed, setOwnerPromptAllowed] = useState(false);
  const [selectedLines, setSelectedLines] = useState<number[]>([]);
  const confirmedNotesRef = useRef<string | null>(null);
  const [featureIds, setFeatureIds] = useState<string[]>(['responsive','universe','accessibility']);
  const [prompt, setPrompt] = useState('');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [images, setImages] = useState<BuddyPrivateImage[]>([]);
  const imageRef = useRef<BuddyPrivateImage[]>([]);
  useEffect(() => { if (captureRequest > 0) setCaptureOpen(true); }, [captureRequest]);
  useEffect(() => () => { imageRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl)); }, []);
  const clearPrivateImages = () => {
    imageRef.current.forEach(image => URL.revokeObjectURL(image.previewUrl));
    imageRef.current=[];setImages([]);setCaptureOpen(false);setSelectedLines([]);setPrompt('');
  };
  const attachImage = (image: BuddyPrivateImage) => {
    if (imageRef.current.length >= 3) {
      URL.revokeObjectURL(image.previewUrl);
      setError('Maximal drei lokale Bildreferenzen pro Entwurf.');
      return;
    }
    imageRef.current=[...imageRef.current,image];setImages(imageRef.current);
  };

  const [snapshot, setSnapshot] = useState<NotesSnapshot | null>(null);
  const [conflict, setConflict] = useState<NotesConflict | null>(null);
  const busyRef = useRef(false);
  const conflictRef = useRef(false);
  const pendingAddRef = useRef(false);
  const currentUserRef = useRef<string | null>(null);
  const [notes, setNotes] = useState<BuddyNote[]>([]);
  const [draft, setDraft] = useState(initialText);
  const [color, setColor] = useState<string>(COLORS[0].color);
  const [summaryLine, setSummaryLine] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [writeLocked, setWriteLocked] = useState(false);
  const [status, setStatus] = useState('');

  useEffect(() => { setDraft(initialText); }, [initialText]);
  useEffect(() => {
    const controller = new AbortController();
    const revoke = () => {
      currentUserRef.current = null;
      confirmedNotesRef.current = null;
      setUserId(null);
      setOwnerPromptAllowed(false);
      clearPrivateImages();
      setSnapshot(null);
      setNotes([]);
      setDraft('');
      pendingAddRef.current = false;
      setConflict(null);
      conflictRef.current = false;
      setStatus('');
      setWriteLocked(false);
      setError('Anmeldung geändert. Bitte JaJa Buddy erneut öffnen.');
    };
    const refresh = async () => {
      try {
        // Always verify identity, even while a conflict is open.
        const verifiedAccount = await verifiedNotesUser(controller.signal);
        const verifiedUserId = verifiedAccount.userId;
        if (controller.signal.aborted) return;
        if (currentUserRef.current && currentUserRef.current !== verifiedUserId) {
          revoke();
          return;
        }
        if (busyRef.current || conflictRef.current) return;
        const data = await readNotes(verifiedUserId, controller.signal);
        if (controller.signal.aborted) return;
        // Prevent a delayed fetch from restoring data after an account switch.
        if (currentUserRef.current && currentUserRef.current !== data.userId) {
          revoke();
          return;
        }
        currentUserRef.current = data.userId;
        setOwnerPromptAllowed(verifiedAccount.isOwner);
        setUserId(data.userId);
        if (confirmedNotesRef.current !== data.notes) {
          // A changed remote revision invalidates line-number selections.
          setSelectedLines([]);
          setPrompt('');
        }
        confirmedNotesRef.current = data.notes;
        setSnapshot(data);
        setNotes(parseBuddyNotes(data.notes));
        setError('');
      } catch (reason) {
        if (controller.signal.aborted) return;
        if (reason instanceof NotesClientError && reason.code === 'SESSION_CHANGED') {
          revoke();
        } else {
          // An unavailable backend is not proof of a changed identity.
          // Preserve the draft and any unresolved conflict on network failures.
          setError('Notizablage vorübergehend nicht erreichbar. Deine Eingabe bleibt erhalten.');
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
    if (!userId || !snapshot || busyRef.current || conflictRef.current || writeLocked) return false;
    busyRef.current = true;
    setBusy(true);
    setError('');
    setStatus('');
    try {
      // Transform only the revision last shown to this user.
      // A concurrent server change is reported by SQL as HTTP 409.
      const updated = transform(snapshot.notes);
      if (updated.length > 10000) throw new NotesClientError('INVALID_NOTES');
      const result = await saveNotes(snapshot, updated);
      if (currentUserRef.current !== userId) throw new NotesClientError('SESSION_CHANGED');
      if (result.kind === 'conflict') {
        conflictRef.current = true;
        setConflict(result.conflict);
        setError('Ein anderes Fenster hat die Notizen geändert. Bitte Zusammenführung prüfen.');
        return false;
      }
      confirmedNotesRef.current = result.snapshot.notes;
      setSelectedLines([]);
      setPrompt('');
      setSnapshot(result.snapshot);
      setNotes(parseBuddyNotes(result.snapshot.notes));
      setStatus(successMessage);
      return true;
    } catch (reason) {
      if (reason instanceof NotesClientError && reason.code === 'SESSION_CHANGED') {
        currentUserRef.current = null;
        setUserId(null);
        setSnapshot(null);
        setNotes([]);
        setDraft('');
        pendingAddRef.current = false;
        setConflict(null);
        conflictRef.current = false;
        setError('Anmeldung geändert. Bitte erneut anmelden.');
      } else if (reason instanceof NotesClientError && reason.code === 'NOTES_WRITE_LOCKED') {
        setWriteLocked(true);
        setError('Notizablage ist serverseitig schreibgeschützt. Deine Eingabe bleibt zum Kopieren erhalten.');
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
    if (!conflict || !userId || busyRef.current || writeLocked) return;
    busyRef.current = true;
    setBusy(true);
    setError('');
    try {
      const base: NotesSnapshot = {
        userId, notes: conflict.serverNotes, revision: conflict.serverRevision,
      };
      const result = await saveNotes(base, text);
      if (currentUserRef.current !== userId) throw new NotesClientError('SESSION_CHANGED');
      if (result.kind === 'conflict') {
        setConflict(result.conflict);
        setError('Weitere Änderung erkannt. Bitte die neue Serverfassung prüfen.');
      } else {
        confirmedNotesRef.current = result.snapshot.notes;
        setSelectedLines([]);
        setPrompt('');
        setSnapshot(result.snapshot);
        setNotes(parseBuddyNotes(result.snapshot.notes));
        setConflict(null);
        conflictRef.current = false;
        if (pendingAddRef.current) setDraft('');
        pendingAddRef.current = false;
        setStatus('Zusammengeführte Notizen gespeichert.');
      }
    } catch (reason) {
      if (reason instanceof NotesClientError && reason.code === 'SESSION_CHANGED') {
        currentUserRef.current = null;
        setUserId(null);
        setSnapshot(null);
        setNotes([]);
        setDraft('');
        pendingAddRef.current = false;
        setConflict(null);
        conflictRef.current = false;
        setError('Anmeldung geändert. Bitte erneut anmelden.');
      } else if (reason instanceof NotesClientError && reason.code === 'NOTES_WRITE_LOCKED') {
        setWriteLocked(true);
        setError('Zusammenführung ist serverseitig gesperrt. Bitte kopiere deinen Entwurf.');
      } else {
        setError('Speicherung nicht bestätigt. Dein Entwurf bleibt im Konfliktfenster erhalten.');
      }
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const acceptServer = () => {
    if (!conflict || !userId || currentUserRef.current !== userId || busyRef.current) return;
    confirmedNotesRef.current = conflict.serverNotes;
    setSelectedLines([]);
    setPrompt('');
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
    pendingAddRef.current = true;
    void mutate(raw => (raw ? raw.replace(/\s*$/, '') + '\n' : '') + line, 'Notiz im privaten Dashboard gespeichert.').then(saved => {
      // Keep unsaved text on failure so it can be recovered.
      if (saved) { pendingAddRef.current = false; setDraft(current => current === draft ? '' : current); }
    });
  };
  const updateOne = (note: BuddyNote, action: 'check' | 'remove') => {
    pendingAddRef.current = false;
    void mutate(raw => {
      const lines = raw.split('\n');
      if (lines[note.line] !== note.raw) throw new Error('CONCURRENT_NOTE_CHANGE');
      if (action === 'remove') lines.splice(note.line, 1);
      else lines[note.line] = formatBuddyNote(note.color, !note.checked, note.text);
      return lines.join('\n');
    }, action === 'remove' ? 'Notiz gelöscht.' : 'Notiz aktualisiert.');
  };

  const selectedNotes=notes.filter(note=>selectedLines.includes(note.line));
  const toggleSelected=(line:number)=>{setSelectedLines(current=>current.includes(line)?current.filter(n=>n!==line):[...current,line]);setPrompt('');};
  const toggleFeature=(id:string)=>{setFeatureIds(current=>current.includes(id)?current.filter(n=>n!==id):[...current,id]);setPrompt('');};
  const makePrompt=()=>{
    if(!ownerPromptAllowed||!userId||!snapshot||conflict||busy)return;
    try {setPrompt(buildFrontendDesignPrompt({notes:selectedNotes.map(note=>note.text),featureIds,images:images.map(image=>image.name)}));setError('');}
    catch {setError('Wähle mindestens eine gespeicherte Notiz und ein Design-Feature aus.');}
  };
  const copyToNotion=async()=>{
    if(!userId||!snapshot||conflict||busy||!selectedNotes.length)return;
    // This is an intentional manual fallback. The separate user-scoped Notion OAuth
    // backend has NOT been admitted. Never impersonate an export success.
    try{
      await navigator.clipboard.writeText(selectedNotes.map(n=>n.text).join('\n\n'));
      setStatus('Notizen kopiert. Öffne dein Notion-Konto und füge sie selbst ein. Kein automatischer Export.');
    }catch{setError('Zwischenablage nicht verfügbar. Bitte Notiztext manuell kopieren.');}
  };
  const exportLocalPromptPackage=async()=>{
    if(!ownerPromptAllowed||!prompt||!userId||busy||conflict)return;
    const escapeHtml=(value:string)=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]||char));
    try{
      const figures=await Promise.all(images.map(async image=>{
        const encoded=await new Promise<string>((resolve,reject)=>{
          const reader=new FileReader();
          reader.onload=()=>resolve(String(reader.result||''));
          reader.onerror=()=>reject(new Error('IMAGE_READ_FAILED'));
          reader.readAsDataURL(image.blob);
        });
        return `<figure><img src="${escapeHtml(encoded)}" alt="Annotierter Screenshot" style="max-width:100%"><figcaption>${escapeHtml(image.name)}</figcaption></figure>`;
      }));
      const documentHtml='<!doctype html><html lang="de"><meta charset="utf-8"><title>Privater CAPITAL-AI Frontend-Prompt</title><body><main><pre style="white-space:pre-wrap">'+escapeHtml(prompt)+'</pre>'+figures.join('')+'</main></body></html>';
      const fileUrl=URL.createObjectURL(new Blob([documentHtml],{type:'text/html;charset=utf-8'}));
      const a=document.createElement('a');a.href=fileUrl;a.download='capital-ai-frontend-prompt-privat.html';a.click();
      setTimeout(()=>URL.revokeObjectURL(fileUrl),1000);
      setStatus('HTML-Entwurf einschließlich lokaler Bildreferenzen gespeichert. Keine Notion-Übertragung.');
    }catch{setError('Bild-Paket konnte nicht exportiert werden. Die lokalen Bilder bleiben erhalten.');}
  };
  const removeImage=(id:string)=>{
    const image=imageRef.current.find(item=>item.id===id);
    if(image)URL.revokeObjectURL(image.previewUrl);
    imageRef.current=imageRef.current.filter(item=>item.id!==id);
    setImages(imageRef.current);setPrompt('');
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
          <button type="submit" disabled={!userId || busy || !!conflict || writeLocked || !draft.trim()}
            className="min-h-10 rounded bg-amber-400 px-3 font-bold text-black disabled:opacity-40">
            {busy ? 'Speichere …' : 'Notiz speichern'}
          </button>
        </div>
      </form>
      {error && <p role="alert" className="text-rose-200">{error} {!userId && <a href="/login" className="underline">Anmelden</a>}</p>}
      {status && <p role="status" className="text-emerald-200">{status}</p>}
      {conflict && <NotesConflictPanel conflict={conflict} busy={busy || writeLocked} onUseServer={acceptServer} onMerge={text => void resolveMerge(text)} />}
      {userId && notes.length === 0 && <p role="status" className="text-slate-300">Noch keine JaJa-Notizen.</p>}
      <ul className="grid gap-2">
        {notes.map(note => {
          const selection = COLORS.find(item => item.color === note.color) ?? COLORS[0];
          return (
            <li key={note.line} className="rounded border border-slate-300/30 p-2" style={{ backgroundColor: selection.background, color: '#111827' }}>
              <div className="flex items-start gap-2">
                <input type="checkbox" checked={selectedLines.includes(note.line)}
                  onChange={()=>toggleSelected(note.line)} aria-label="Notiz für Export oder Frontend-Prompt auswählen"
                  className="mt-1 h-4 w-4" />
                <input type="checkbox" checked={note.checked} onChange={() => updateOne(note, 'check')}
                  disabled={busy || !!conflict || writeLocked} aria-label="Notiz erledigt" className="mt-1 h-4 w-4" />
                <p className={'min-w-0 flex-1 whitespace-pre-wrap break-words text-sm ' + (note.checked ? 'line-through' : '')}>{note.text}</p>
              </div>
              {summaryLine === note.line && <p className="mt-2 text-xs italic">Kurzfassung: {localSummary(note.text)}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                <button type="button" onClick={() => setSummaryLine(value => value === note.line ? null : note.line)}
                  className="min-h-9 underline" aria-pressed={summaryLine === note.line}>Lokal zusammenfassen</button>
                <button type="button" disabled={busy || writeLocked} onClick={() => updateOne(note, 'remove')}
                  className="min-h-9 text-red-700 underline" aria-label="Notiz löschen">Löschen</button>
              </div>
            </li>
          );
        })}
      </ul>
      <section aria-label="Private Bildreferenzen" className="space-y-2 rounded-xl border border-cyan-300/20 p-2">
        <button type="button" onClick={()=>setCaptureOpen(open=>!open)}
          className="min-h-11 rounded-lg border border-cyan-300/40 px-3 font-medium text-cyan-100">JaJa CAM · Screenshot / Markieren</button>
        {captureOpen && <BuddyCapturePanel onAttach={attachImage} onClose={()=>setCaptureOpen(false)} />}
        {images.length>0&&<ul className="grid gap-2">
          {images.map(image=><li key={image.id} className="rounded border border-slate-700 p-2">
            <img src={image.previewUrl} alt="Lokaler markierter Screenshot" className="max-h-40 w-full object-contain"/>
            <p className="truncate text-[11px] text-slate-300">{image.name}</p>
            <button type="button" onClick={()=>removeImage(image.id)} className="min-h-11 underline">Bild entfernen</button>
          </li>)}
        </ul>}
        <p className="text-[11px] text-slate-400">Bilder verbleiben in dieser Sitzung und werden nicht serverseitig gespeichert. Bei Kontowechsel/Schließen gehen sie verloren.</p>
      </section>
      {ownerPromptAllowed&&<section aria-label="Owner Frontend-Prompt" className="space-y-2 rounded-xl border border-violet-400/40 bg-violet-950/20 p-2">
        <h3 className="text-sm font-bold text-violet-100">Frontend-Prompt · Nur Owner</h3>
        <p className="text-slate-300">Wähle oben einzelne bestätigte JaJa-Notizen aus. Der Text wird lokal mit passenden Fachbegriffen erzeugt und nicht an externe KI-Dienste übertragen.</p>
        <fieldset className="space-y-2"><legend className="font-medium">Design-Features auswählen</legend>
          {FRONTEND_FEATURES.map(feature=><label key={feature.id} className="flex min-h-9 items-center gap-2">
            <input type="checkbox" checked={featureIds.includes(feature.id)} onChange={()=>toggleFeature(feature.id)}/>
            <span>{feature.label}</span>
          </label>)}
        </fieldset>
        <button type="button" disabled={selectedNotes.length===0||featureIds.length===0||busy||!!conflict}
          onClick={makePrompt} className="min-h-11 rounded-lg bg-violet-500 px-3 font-bold text-white disabled:opacity-50">Frontend-Prompt erzeugen</button>
        {prompt&&<><label htmlFor="buddy-owner-design-prompt" className="block">Finaler Prompt-Entwurf</label>
          <textarea id="buddy-owner-design-prompt" readOnly rows={10} value={prompt}
            className="w-full rounded border border-violet-300/50 bg-slate-950 p-2 text-xs text-white"/>
          <button type="button" onClick={()=>void navigator.clipboard.writeText(prompt)}
            className="min-h-11 rounded border border-violet-400 px-3">Prompt kopieren</button>
          <button type="button" onClick={()=>void exportLocalPromptPackage()}
            className="min-h-11 rounded border border-violet-400 px-3">Finales Prompt-Paket mit Bildern speichern</button></>}
      </section>}
      <section aria-label="Notion Export" className="space-y-1 rounded-xl border border-slate-700 p-2">
        <p className="font-bold text-slate-200">Notion · Privatnotizen</p>
        <button type="button" onClick={()=>void copyToNotion()} disabled={!selectedNotes.length||!!conflict||busy}
          className="min-h-11 rounded border border-slate-500 px-3 text-slate-100 disabled:opacity-50">Ausgewählte Notizen für Notion kopieren</button>
        <p className="text-[11px] text-slate-400">Der automatische Notion-Export ist bis zum nachgewiesenen personenbezogenen OAuth-/Vault- und Seitenfreigabe-Vertrag gesperrt. Diese Taste kopiert nur die Auswahl und schreibt nichts nach Notion.</p>
      </section>
      <a href="/profile/dashboard" className="inline-block min-h-9 pt-2 font-semibold text-amber-200 underline">
        Gespeicherte Notizen im privaten Dashboard ansehen
      </a>
    </div>
  );
}
