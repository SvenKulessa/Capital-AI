import React, { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2, Lock, LogIn, Mail, UserPlus } from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';

interface LoginPageProps {
  onBackToHome: () => void;
  onNavigateFaq?: () => void;
  onNavigateLegal?: (path: string) => void;
}

interface SessionState {
  configured: boolean;
  authenticated: boolean;
  user: { id: string; subject: string; email: string; name: string } | null;
}

interface AuthResponseBody {
  error?: string;
  authenticated?: boolean;
}

async function postJson(
  path: string,
  body: Record<string, unknown>,
): Promise<{ response: Response; body: AuthResponseBody | null }> {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const payload: unknown = await response.json().catch(() => null);
  const parsed =
    payload && typeof payload === 'object'
      ? (payload as AuthResponseBody)
      : null;
  return { response, body: parsed };
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToHome, onNavigateFaq, onNavigateLegal }) => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const abort = new AbortController();
    fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: abort.signal,
    })
      .then(async response => {
        if (!response.ok) throw new Error();
        return response.json();
      })
      .then(value => {
        if (typeof value?.configured !== 'boolean' || typeof value?.authenticated !== 'boolean') throw new Error();
        if (!abort.signal.aborted) setSession(value);
      })
      .catch(() => {
        if (!abort.signal.aborted) setError('Der Supabase-Anmeldedienst ist derzeit nicht erreichbar.');
      });
    return () => abort.abort();
  }, []);

  const submitEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'login') {
        const result = await postJson('/api/auth/login/email', { email, password });
        if (!result.response.ok) throw new Error(result.body?.error || 'authentication_failed');
        window.location.replace('/profile');
        return;
      }

      const result = await postJson('/api/auth/register', { name, email, password });
      if (!result.response.ok) throw new Error(result.body?.error || 'registration_failed');
      if (result.body?.authenticated) {
        window.location.replace('/profile');
        return;
      }
      setNotice('Registrierung angenommen. Bitte bestätige die E-Mail-Adresse und melde dich danach an.');
      setMode('login');
      setPassword('');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'authentication_failed';
      setError(
        message === 'weak_password'
          ? 'Das Passwort erfüllt die Supabase-Sicherheitsanforderungen nicht. Verwende mindestens 14 Zeichen.'
          : message === 'registration_failed'
            ? 'Registrierung fehlgeschlagen. Bitte Eingaben prüfen oder später erneut versuchen.'
            : message,
      );
    } finally {
      setBusy(false);
    }
  };

  const logout = async () => {
    setBusy(true);
    setError('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error();
      setSession(previous => previous ? { ...previous, authenticated: false, user: null } : previous);
    } catch {
      setError('Abmeldung konnte nicht bestätigt werden.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#02050e] px-4 py-8 text-slate-100 flex justify-center">
      <section className="w-full max-w-lg">
        <button onClick={onBackToHome} className="flex min-h-11 items-center gap-2 text-amber-300">
          <ArrowLeft size={18} /> Zur Übersicht
        </button>

        <div className="mt-6 rounded-3xl border border-amber-500/20 bg-slate-900/80 p-5 sm:p-8">
          <BrandLogo variant="stacked" size="lg" showSubtitle={false} />
          <div className="mt-6 flex items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Supabase Anmeldung</h1>
              <p className="mt-2 text-sm text-slate-300">
                Backend-first Session mit Redirect auf dein persönliches Profil und API-Vault.
              </p>
            </div>
            <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 font-mono text-[10px] text-emerald-300">
              SUPABASE AUTH
            </span>
          </div>

          {error && <p role="alert" className="mt-4 rounded-xl bg-rose-500/10 p-3 text-sm text-rose-200">{error}</p>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-200">{notice}</p>}
          {!session && !error && <p role="status" className="mt-4 text-sm text-slate-400">Supabase Session wird geprüft …</p>}
          {session && !session.configured && (
            <p role="status" className="mt-4 rounded-xl bg-amber-500/10 p-3 text-sm text-amber-200">
              Supabase Auth ist serverseitig noch nicht vollständig konfiguriert.
            </p>
          )}

          {session?.authenticated ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> Angemeldet als {session.user?.name || 'Benutzer'}
                </p>
                <p className="mt-1 break-all text-xs text-emerald-100/70">{session.user?.email}</p>
              </div>
              <button
                type="button"
                onClick={() => window.location.assign('/profile')}
                className="min-h-12 w-full rounded-xl bg-amber-400 font-black text-black"
              >
                Zum persönlichen Profil & Vault
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                disabled={busy}
                className="min-h-12 w-full rounded-xl bg-slate-700 disabled:opacity-50"
              >
                {busy ? 'Abmeldung läuft …' : 'Abmelden'}
              </button>
            </div>
          ) : (
            <>
              <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'login' ? 'bg-amber-400 text-black' : 'text-slate-400'}`}
                >
                  Anmelden
                </button>
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'register' ? 'bg-[#8D26FF] text-white' : 'text-slate-400'}`}
                >
                  Registrieren
                </button>
              </div>

              <form onSubmit={submitEmail} className="mt-4 space-y-3">
                {mode === 'register' && (
                  <label className="block text-xs font-bold text-slate-300">
                    Name
                    <input
                      value={name}
                      onChange={event => setName(event.target.value)}
                      required
                      maxLength={120}
                      className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white"
                    />
                  </label>
                )}
                <label className="block text-xs font-bold text-slate-300">
                  E-Mail
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      required
                      autoComplete="email"
                      className="w-full rounded-xl border border-white/15 bg-black/40 py-3 pl-10 pr-3 text-sm text-white"
                    />
                    {mode === 'register' && (
                      <p className="mt-1 text-[11px] text-slate-500">Mindestens 14 Zeichen.</p>
                    )}
                  </div>
                </label>
                <label className="block text-xs font-bold text-slate-300">
                  Passwort
                  <div className="relative mt-1">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      type="password"
                      value={password}
                      onChange={event => setPassword(event.target.value)}
                      required
                      minLength={mode === 'login' ? 1 : 14}
                      maxLength={256}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full rounded-xl border border-white/15 bg-black/40 py-3 pl-10 pr-3 text-sm text-white"
                    />
                  </div>
                </label>
                <button
                  type="submit"
                  disabled={busy || !session?.configured}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 font-black text-black disabled:opacity-40"
                >
                  {mode === 'login' ? <LogIn size={18} /> : <UserPlus size={18} />}
                  {busy ? 'Bitte warten …' : mode === 'login' ? 'Mit E-Mail anmelden' : 'Konto registrieren'}
                </button>
              </form>

              <div className="my-4 flex items-center gap-3 text-[10px] uppercase tracking-widest text-slate-600">
                <span className="h-px flex-1 bg-white/10" /> oder <span className="h-px flex-1 bg-white/10" />
              </div>

              <a
                href="/api/auth/login/google?next=%2Fprofile"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                aria-label="Mit Google anmelden"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5 shrink-0"
                >
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z" />
                  <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
                </svg>
                Mit Google anmelden
              </a>
            </>
          )}

          <p className="mt-4 flex gap-2 text-xs text-slate-400">
            <Lock size={16} /> Access- und Refresh-Tokens verbleiben in signierten HttpOnly-Secure-Cookies.
          </p>

          <nav className="mt-6 flex flex-wrap gap-4 text-sm text-amber-300">
            {onNavigateFaq && <button onClick={onNavigateFaq} className="min-h-11">Hilfe</button>}
            {onNavigateLegal && <button onClick={() => onNavigateLegal('/datenschutz')} className="min-h-11">Datenschutz</button>}
          </nav>
        </div>
      </section>
    </main>
  );
};