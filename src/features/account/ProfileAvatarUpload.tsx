import React, { useEffect, useRef, useState } from 'react';

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp'];

export function ProfileAvatarUpload() {
  const picker = useRef<HTMLInputElement>(null);
  const [uploaded, setUploaded] = useState(false);
  const [available, setAvailable] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/profile/logo', { credentials: 'same-origin', cache: 'no-store', signal: controller.signal })
      .then(r => {
        if (controller.signal.aborted) return;
        if (r.ok) {
          setUploaded(true);
          setAvailable(true);
        } else if (r.status === 404) {
          // Avatar absent, but the private upload service is available.
          setAvailable(true);
        } else {
          // Never present a working upload picker while ClamAV/storage are unavailable.
          setMessage('Profilbild kann momentan nicht geändert werden.');
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) setMessage('Profilbild-Upload momentan nicht erreichbar. Bitte später erneut prüfen.');
      });
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
      window.dispatchEvent(new Event('capital-ai:profile-avatar-updated'));
      setMessage('Profilbild geprüft und gespeichert. Bei einem Seitenwechsel wird es auch im Profilkopf angezeigt.');
    } catch { setMessage('Das Profilbild konnte nicht gespeichert werden.'); }
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
      window.dispatchEvent(new Event('capital-ai:profile-avatar-updated'));
      setMessage('Gespeichertes Profilbild entfernt. Das Anmeldeanbieter-Bild wird wieder verwendet.');
    } catch { setMessage('Profilbild konnte nicht gelöscht werden.'); }
    finally { setBusy(false); }
  }
  return (
    <section className="mt-4 rounded-xl border border-violet-400/30 bg-violet-500/10 p-3" aria-label="Privates Profilbild">
      <p className="text-sm font-bold text-violet-100">Profilbild</p>

      {uploaded && <img src={'/api/profile/avatar/current?revision=' + revision} alt="Gespeichertes Profilbild" width={64} height={64} className="mt-2 h-16 w-16 rounded-xl object-cover" />}
      <input ref={picker} type="file" accept="image/png,image/jpeg,image/webp"
        disabled={busy || !available} className="mt-3 block w-full text-xs text-slate-200"
        aria-label="Profilbild auswählen" aria-describedby="avatar-upload-availability"
        onChange={e => { const file = e.target.files?.[0]; if (file) void upload(file); }} />
      <p id="avatar-upload-availability" className="mt-2 text-xs text-slate-300">{available ? 'Upload verfügbar: PNG, JPEG oder WebP, maximal 2 MB.' : 'Profilbild ändern derzeit nicht verfügbar.'}</p>
      {uploaded && <button type="button" disabled={busy} onClick={() => void remove()}
        className="mt-3 rounded-lg border border-white/30 px-3 py-2 text-xs text-white">Profilbild entfernen</button>}
      {message && <p role="status" className="mt-2 text-xs text-slate-200">{message}</p>}
    </section>
  );
}
