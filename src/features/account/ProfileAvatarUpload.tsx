import React, { useEffect, useRef, useState } from 'react';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function ProfileAvatarUpload() {
  const picker = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/profile/logo', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(r => { if (r.ok && !controller.signal.aborted) setUploaded(true); })
      .catch(() => {});
    return () => controller.abort();
  }, []);
  async function upload(file: File) {
    if (!TYPES.includes(file.type) || file.size < 1 || file.size > MAX_BYTES) {
      setMessage('Nur PNG, JPEG oder WebP bis 2 MB sind erlaubt.'); return;
    }
    setBusy(true); setMessage('');
    try {
      const response = await fetch('/api/profile/upload-logo', {
        method: 'POST', credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': file.type }, body: file,
      });
      if (!response.ok) throw new Error('UPLOAD_REJECTED');
      setUploaded(true); setRevision(x => x + 1);
      setMessage('Profilbild geprüft und gespeichert. Bei einem Seitenwechsel wird es auch im Profilkopf angezeigt.');
    } catch { setMessage('Upload nicht verfügbar oder durch die Sicherheitsprüfung abgelehnt.'); }
    finally { setBusy(false); if (picker.current) picker.current.value = ''; }
  }
  async function remove() {
    setBusy(true); setMessage('');
    try {
      const result = await fetch('/api/profile/logo', {
        method: 'DELETE', credentials: 'same-origin', cache: 'no-store',
      });
      if (!result.ok) throw new Error('DELETE_FAILED');
      setUploaded(false); setRevision(x => x + 1);
      setMessage('Gespeichertes Profilbild entfernt. Das Anmeldeanbieter-Bild wird wieder verwendet.');
    } catch { setMessage('Profilbild konnte nicht gelöscht werden.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3" aria-label="Privates Profilbild">
      <p className="text-sm font-bold text-violet-100">Profilbild oder Logo</p>
      <p className="mt-1 text-xs text-slate-300">Privater Upload mit lokaler Malware-Prüfung. Ohne Upload gilt das verifizierte Bild des aktiven Anmeldeanbieters.</p>
      {uploaded && <img src={'/api/profile/avatar/current?revision=' + revision} alt="Gespeichertes Profilbild" width={64} height={64} className="mt-2 h-16 w-16 rounded-xl object-cover" />}
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp"
        disabled={busy} className="mt-3 block w-full text-xs text-slate-200"
        aria-label="Profilbild auswählen"
        onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      {uploaded && <button type="button" disabled={busy} onClick={() => void remove()}
        className="mt-3 rounded-lg border border-white/30 px-3 py-2 text-xs text-white">Profilbild entfernen</button>}
      {message && <p role="status" className="mt-2 text-xs text-slate-200">{message}</p>}
    </section>
  );
}
