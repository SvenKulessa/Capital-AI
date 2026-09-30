import React, { useEffect, useState } from 'react';
import { BrandLogo } from './BrandLogo';
import { ArrowLeft, Lock, LogIn } from 'lucide-react';

interface LoginPageProps {
  onBackToHome: () => void;
  onNavigateFaq?: () => void;
  onNavigateLegal?: (path: string) => void;
}
interface SessionState { configured: boolean; authenticated: boolean; user: { subject: string; name: string } | null }

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToHome, onNavigateFaq, onNavigateLegal }) => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/auth/session', { credentials: 'same-origin', cache: 'no-store', signal: abort.signal })
      .then(async res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(value => { if (typeof value.configured !== 'boolean' || typeof value.authenticated !== 'boolean') throw new Error(); setSession(value); })
      .catch(() => { if (!abort.signal.aborted) setError('Der Anmeldedienst ist derzeit nicht erreichbar.'); });
    return () => abort.abort();
  }, []);
  const logout = async () => {
    setBusy(true); setError('');
    try {
      const res = await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}', signal: AbortSignal.timeout(7000) });
      if (!res.ok) throw new Error();
      setSession(prev => prev ? { ...prev, authenticated: false, user: null } : prev);
    } catch { setError('Abmeldung konnte nicht bestätigt werden.'); }
    finally { setBusy(false); }
  };
  return (
    <main className="min-h-screen bg-[#02050e] text-slate-100 px-4 py-8 flex justify-center">
      <section className="w-full max-w-lg">
        <button onClick={onBackToHome} className="flex gap-2 items-center min-h-11 text-amber-300"><ArrowLeft size={18} /> Zur Übersicht</button>
        <div className="mt-6 rounded-3xl border border-amber-500/20 bg-slate-900/80 p-5 sm:p-8">
          <BrandLogo />
          <h1 className="text-2xl font-bold mt-6">Anmeldung</h1>
          <p className="text-sm text-slate-300 mt-3">Melden Sie sich über den eingerichteten Identitätsanbieter an. Dort verwalten Sie auch Ihr Konto, Passwort und Ihre zusätzlichen Sicherheitsverfahren.</p>
          {error && <p role="alert" className="mt-4 text-sm text-red-300">{error}</p>}
          {!session && !error && <p role="status" className="mt-4 text-sm text-slate-400">Anmeldedienst wird geprüft …</p>}
          {session && !session.configured && <p role="status" className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">Die Anmeldung ist noch nicht eingerichtet.</p>}
          {session?.authenticated ? (
            <div className="mt-5">
              <p role="status" className="text-emerald-300">Angemeldet als {session.user?.name || 'Benutzer'}.</p>
              <button onClick={logout} disabled={busy} className="mt-4 min-h-12 w-full rounded-xl bg-slate-700 disabled:opacity-50">{busy ? 'Abmeldung läuft …' : 'Abmelden'}</button>
              <button onClick={onBackToHome} className="mt-3 min-h-12 w-full rounded-xl bg-amber-400 text-black font-bold">Zur Plattform</button>
            </div>
          ) : (
            <button disabled={!session?.configured || busy} onClick={() => { setBusy(true); window.location.assign('/api/auth/login'); }} className="mt-5 min-h-12 w-full rounded-xl bg-amber-400 text-black font-bold flex gap-2 items-center justify-center disabled:opacity-40"><LogIn size={18} /> {busy ? 'Weiterleitung …' : 'Beim Identitätsanbieter anmelden'}</button>
          )}
          <p className="mt-4 flex gap-2 text-xs text-slate-400"><Lock size={16} /> Eine Anmeldung wird erst nach verifizierter Anbieter-Antwort bestätigt.</p>
          <nav className="mt-6 flex flex-wrap gap-4 text-sm text-amber-300">
            {onNavigateFaq && <button onClick={onNavigateFaq} className="min-h-11">Hilfe</button>}
            {onNavigateLegal && <button onClick={() => onNavigateLegal('/privacy')} className="min-h-11">Datenschutz</button>}
          </nav>
        </div>
      </section>
    </main>
  );
};
