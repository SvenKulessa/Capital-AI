import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Fingerprint,
  KeyRound,
  Lock,
  LogIn,
  Mail,
  RotateCcw,
  ShieldCheck,
  UserPlus,
} from 'lucide-react';
import { BrandLogo } from '../../components/BrandLogo';
import {
  prepareAuthenticationOptions,
  serializeAuthenticationCredential,
  type PublicKeyCredentialRequestOptionsJSON,
} from './webauthn';

interface LoginPageProps {
  onBackToHome: () => void;
  onNavigateFaq?: () => void;
  onNavigateLegal?: (path: string) => void;
}

interface SessionState {
  configured: boolean;
  authenticated: boolean;
  currentLevel?: 'aal1' | 'aal2';
  mfaRequired?: boolean;
  user: { id: string; subject: string; email: string; name: string } | null;
}

interface AuthResponseBody {
  error?: string;
  code?: string;
  authenticated?: boolean;
  mfaRequired?: boolean;
  accepted?: boolean;
  reset?: boolean;
  factors?: Array<{ id: string; type: 'totp'; friendlyName: string }>;
  challengeId?: string;
  options?: PublicKeyCredentialRequestOptionsJSON;
}

type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'mfa';

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
  const parsed = payload && typeof payload === 'object' ? (payload as AuthResponseBody) : null;
  return { response, body: parsed };
}

function initialMode(): Mode {
  const params = new URLSearchParams(window.location.search);
  if (params.get('mode') === 'reset') return 'reset';
  if (params.get('mode') === 'forgot') return 'forgot';
  if (params.get('mfa') === '1') return 'mfa';
  return 'login';
}

export const LoginPage: React.FC<LoginPageProps> = ({ onBackToHome, onNavigateFaq, onNavigateLegal }) => {
  const [session, setSession] = useState<SessionState | null>(null);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAcknowledged, setPrivacyAcknowledged] = useState(false);
  const [marketingConsent, setMarketingConsent] = useState(false);
  const [mfaFactors, setMfaFactors] = useState<Array<{ id: string; type: 'totp'; friendlyName: string }>>([]);
  const [selectedFactorId, setSelectedFactorId] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const recoveryError = new URLSearchParams(window.location.search).get('recovery_error');
    if (recoveryError === 'invalid_link') {
      setError('Der Passwort-Reset-Link ist ungültig oder unvollständig. Fordere bitte eine neue Reset-Mail an.');
    } else if (recoveryError === 'verification_failed') {
      setError('Der Passwort-Reset-Link ist abgelaufen oder wurde bereits verwendet. Fordere bitte eine neue Reset-Mail an.');
    }
  }, []);

  const passkeySupported = useMemo(
    () => typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials,
    [],
  );

  const loadSession = async (signal?: AbortSignal) => {
    const response = await fetch('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    });
    if (!response.ok) throw new Error('SESSION_UNAVAILABLE');
    const value = await response.json();
    if (typeof value?.configured !== 'boolean' || typeof value?.authenticated !== 'boolean') throw new Error('INVALID_SESSION');
    setSession(value);
    return value as SessionState;
  };

  const loadMfaFactors = async () => {
    const response = await fetch('/api/auth/mfa/factors', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(body?.error || 'mfa_factors_unavailable');
    const factors = Array.isArray(body?.factors) ? body.factors : [];
    setMfaFactors(factors);
    setSelectedFactorId(previous => previous || factors[0]?.id || '');
    return factors;
  };

  useEffect(() => {
    const abort = new AbortController();
    loadSession(abort.signal)
      .then(async value => {
        if (abort.signal.aborted || mode !== 'mfa') return;

        if (!value.authenticated) {
          window.history.replaceState(null, '', '/login');
          setMode('login');
          return;
        }

        if (!value.mfaRequired) {
          window.location.replace('/');
          return;
        }

        try {
          const factors = await loadMfaFactors();
          if (!factors.length && !abort.signal.aborted) {
            const refreshed = await loadSession(abort.signal);
            if (refreshed.authenticated && !refreshed.mfaRequired) {
              window.location.replace('/');
              return;
            }
            setError('Der MFA-Zustand ist inkonsistent. Bitte wähle eine andere Anmeldemethode oder melde dich neu an.');
          }
        } catch {
          if (!abort.signal.aborted) setError('Authenticator-Faktoren konnten nicht geladen werden.');
        }
      })
      .catch(() => {
        if (!abort.signal.aborted) setError('Der Supabase-Anmeldedienst ist derzeit nicht erreichbar.');
      });
    return () => abort.abort();
  }, []);

  const showError = (reason: unknown) => {
    const message = reason instanceof Error ? reason.message : 'authentication_failed';
    if (message === 'weak_password' || message === 'invalid_new_password') {
      setError('Das neue Passwort muss mindestens 14 Zeichen lang sein und die Supabase-Sicherheitsanforderungen erfüllen.');
    } else if (message === 'passwords_do_not_match') {
      setError('Die beiden Passwörter stimmen nicht überein.');
    } else if (message === 'registration_consents_required') {
      setError('Nutzungsbedingungen und Datenschutzhinweis müssen für die Registrierung bestätigt werden.');
    } else if (message === 'registration_failed') {
      setError('Registrierung konnte serverseitig nicht abgeschlossen werden. Das Passwort allein ist nicht automatisch die Ursache.');
    } else if (message === 'passkey_unavailable') {
      setError('Passkey-Anmeldung ist im Supabase-Projekt noch nicht freigeschaltet.');
    } else {
      setError(message);
    }
  };

  const submitEmail = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (mode === 'login') {
        const result = await postJson('/api/auth/login/email', { email, password });
        if (!result.response.ok) throw new Error(result.body?.error || 'authentication_failed');
        if (result.body?.mfaRequired) {
          setMode('mfa');
          setPassword('');
          await loadMfaFactors();
          return;
        }
        window.location.replace('/');
        return;
      }

      if (password !== passwordConfirm) throw new Error('passwords_do_not_match');
      if (!termsAccepted || !privacyAcknowledged) throw new Error('registration_consents_required');
      const result = await postJson('/api/auth/register', {
        name,
        email,
        password,
        passwordConfirm,
        termsAccepted,
        privacyAcknowledged,
        marketingConsent,
      });
      if (!result.response.ok) throw new Error(result.body?.error || 'registration_failed');
      if (result.body?.authenticated) {
        window.location.replace('/');
        return;
      }
      setNotice('Registrierung angenommen. Bitte bestätige die E-Mail-Adresse über die CAPITAL-AI Bestätigungsmail.');
      setMode('login');
      setPassword('');
      setPasswordConfirm('');
      setTermsAccepted(false);
      setPrivacyAcknowledged(false);
      setMarketingConsent(false);
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const submitForgot = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const result = await postJson('/api/auth/password/forgot', { email });
      if (!result.response.ok) throw new Error(result.body?.error || 'password_recovery_failed');
      setNotice('Falls ein Konto zu dieser E-Mail existiert, wurde eine CAPITAL-AI Passwort-Reset-Mail versendet.');
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (password.length < 14 || password !== passwordConfirm) {
        throw new Error(password !== passwordConfirm ? 'passwords_do_not_match' : 'invalid_new_password');
      }
      const result = await postJson('/api/auth/password/reset', { password });
      if (!result.response.ok) throw new Error(result.body?.code || result.body?.error || 'password_reset_failed');
      setPassword('');
      setPasswordConfirm('');
      setNotice('Passwort wurde geändert. Alle Sitzungen wurden beendet; melde dich jetzt mit dem neuen Passwort an.');
      setMode('login');
      await loadSession();
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const verifyMfa = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    setNotice('');
    try {
      if (!selectedFactorId) throw new Error('mfa_factor_missing');
      const result = await postJson('/api/auth/mfa/totp/verify', {
        factorId: selectedFactorId,
        code: totpCode,
      });
      if (!result.response.ok) throw new Error(result.body?.code || result.body?.error || 'totp_verification_failed');
      window.location.replace('/');
    } catch (reason) {
      showError(reason);
    } finally {
      setBusy(false);
    }
  };

  const loginWithPasskey = async () => {
    if (!passkeySupported) {
      setError('Dieser Browser oder dieses Gerät unterstützt Passkeys nicht.');
      return;
    }
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const start = await postJson('/api/auth/passkey/options', {});
      if (!start.response.ok || !start.body?.options || !start.body?.challengeId) {
        throw new Error(start.body?.code || start.body?.error || 'passkey_unavailable');
      }
      const credential = await navigator.credentials.get({
        publicKey: prepareAuthenticationOptions(start.body.options),
      });
      if (!(credential instanceof PublicKeyCredential)) throw new Error('passkey_ceremony_cancelled');

      const finish = await postJson('/api/auth/passkey/verify', {
        challengeId: start.body.challengeId,
        credential: serializeAuthenticationCredential(credential),
      });
      if (!finish.response.ok) throw new Error(finish.body?.code || finish.body?.error || 'passkey_authentication_failed');
      if (finish.body?.mfaRequired) {
        setMode('mfa');
        await loadMfaFactors();
        return;
      }
      window.location.replace('/');
    } catch (reason) {
      showError(reason);
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
      setSession(previous => previous ? { ...previous, authenticated: false, mfaRequired: false, user: null } : previous);
      setMfaFactors([]);
      setSelectedFactorId('');
      setTotpCode('');
      window.history.replaceState(null, '', '/login');
      setMode('login');
    } catch {
      setError('Abmeldung konnte nicht bestätigt werden.');
    } finally {
      setBusy(false);
    }
  };

  const specialMode = mode === 'reset' || mode === 'mfa';

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
              <h1 className="text-2xl font-bold">
                {mode === 'forgot' ? 'Passwort vergessen' : mode === 'reset' ? 'Neues Passwort setzen' : mode === 'mfa' ? 'Authenticator bestätigen' : 'CAPITAL-AI Anmeldung'}
              </h1>
              <p className="mt-2 text-sm text-slate-300">
                Passkey, Google, E-Mail/Passwort und optionaler TOTP-Authenticator über eine serverseitige Supabase-Session.
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

          {mode === 'mfa' && (
            <form onSubmit={verifyMfa} className="mt-5 space-y-3">
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-100">
                <ShieldCheck className="mb-2 h-4 w-4" />
                Dieses Konto verlangt einen zweiten Faktor. Öffne deine Authenticator-App und gib den aktuellen Code ein.
              </div>
              {mfaFactors.length > 1 && (
                <label className="block text-xs font-bold text-slate-300">
                  Authenticator
                  <select
                    value={selectedFactorId}
                    onChange={event => setSelectedFactorId(event.target.value)}
                    className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white"
                  >
                    {mfaFactors.map(factor => <option key={factor.id} value={factor.id}>{factor.friendlyName || 'Authenticator'}</option>)}
                  </select>
                </label>
              )}
              <label className="block text-xs font-bold text-slate-300">
                Einmalcode
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={event => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  required
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 font-mono text-lg tracking-[0.3em] text-white"
                  placeholder="123456"
                />
              </label>
              <button type="submit" disabled={busy || totpCode.length < 6} className="min-h-12 w-full rounded-xl bg-amber-400 font-black text-black disabled:opacity-40">
                {busy ? 'Wird geprüft …' : 'Authenticator bestätigen'}
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                disabled={busy}
                className="min-h-11 w-full rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-xs font-bold text-cyan-100 disabled:opacity-40"
              >
                Andere Anmeldemethode wählen
              </button>
              <p className="text-[11px] leading-relaxed text-slate-500">
                Die Auswahl beendet die angefangene Sitzung und zeigt E-Mail, Google und Passkey erneut an. Ein aktivierter TOTP-Faktor wird dadurch nicht umgangen.
              </p>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={submitReset} className="mt-5 space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                Neues Passwort
                <input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={14} maxLength={256} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white" />
              </label>
              <label className="block text-xs font-bold text-slate-300">
                Neues Passwort wiederholen
                <input type="password" value={passwordConfirm} onChange={event => setPasswordConfirm(event.target.value)} required minLength={14} maxLength={256} autoComplete="new-password" className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white" />
              </label>
              <p className="text-[11px] text-slate-500">Mindestens 14 Zeichen. Nach dem Reset werden alle Sitzungen beendet.</p>
              <button type="submit" disabled={busy} className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 font-black text-black disabled:opacity-40">
                <RotateCcw size={18} /> {busy ? 'Wird geändert …' : 'Passwort neu setzen'}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={submitForgot} className="mt-5 space-y-3">
              <label className="block text-xs font-bold text-slate-300">
                E-Mail
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                  <input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-xl border border-white/15 bg-black/40 py-3 pl-10 pr-3 text-sm text-white" />
                </div>
              </label>
              <button type="submit" disabled={busy || !session?.configured} className="min-h-12 w-full rounded-xl bg-amber-400 font-black text-black disabled:opacity-40">
                {busy ? 'Wird versendet …' : 'Passwort-Reset-Mail senden'}
              </button>
              <button type="button" onClick={() => setMode('login')} className="min-h-11 w-full text-xs font-bold text-slate-400 hover:text-white">
                Zurück zur Anmeldung
              </button>
            </form>
          )}

          {!specialMode && mode !== 'forgot' && session?.authenticated ? (
            <div className="mt-5 space-y-3">
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                <p className="flex items-center gap-2 text-sm font-bold text-emerald-200">
                  <CheckCircle2 className="h-4 w-4" /> Angemeldet als {session.user?.name || 'Benutzer'}
                </p>
                <p className="mt-1 break-all text-xs text-emerald-100/70">{session.user?.email}</p>
              </div>
              <button type="button" onClick={() => window.location.assign('/profile')} className="min-h-12 w-full rounded-xl bg-amber-400 font-black text-black">
                Zum persönlichen Profil & Vault
              </button>
              <button type="button" onClick={() => void logout()} disabled={busy} className="min-h-12 w-full rounded-xl bg-slate-700 disabled:opacity-50">
                {busy ? 'Abmeldung läuft …' : 'Abmelden'}
              </button>
            </div>
          ) : !specialMode && mode !== 'forgot' ? (
            <>
              <div className="mt-5 grid grid-cols-2 gap-1 rounded-xl border border-white/10 bg-black/30 p-1">
                <button type="button" onClick={() => setMode('login')} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'login' ? 'bg-amber-400 text-black' : 'text-slate-400'}`}>
                  Anmelden
                </button>
                <button type="button" onClick={() => setMode('register')} className={`rounded-lg px-3 py-2 text-xs font-bold ${mode === 'register' ? 'bg-[#8D26FF] text-white' : 'text-slate-400'}`}>
                  Registrieren
                </button>
              </div>

              <form onSubmit={submitEmail} className="mt-4 space-y-3">
                {mode === 'register' && (
                  <label className="block text-xs font-bold text-slate-300">
                    Name
                    <input value={name} onChange={event => setName(event.target.value)} required maxLength={120} className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-3 text-sm text-white" />
                  </label>
                )}
                <label className="block text-xs font-bold text-slate-300">
                  E-Mail
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" className="w-full rounded-xl border border-white/15 bg-black/40 py-3 pl-10 pr-3 text-sm text-white" />
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
                      minLength={mode === 'register' ? 14 : 1}
                      maxLength={256}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      className="w-full rounded-xl border border-white/15 bg-black/40 py-3 pl-10 pr-3 text-sm text-white"
                    />
                  </div>
                </label>
                {mode === 'register' && (
                  <>
                    <label className="block text-xs font-bold text-slate-300">
                      Passwort wiederholen
                      <div className="relative mt-1">
                        <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                        <input
                          type="password"
                          value={passwordConfirm}
                          onChange={event => setPasswordConfirm(event.target.value)}
                          required
                          minLength={14}
                          maxLength={256}
                          autoComplete="new-password"
                          className="w-full rounded-xl border border-white/15 bg-black/40 py-3 pl-10 pr-3 text-sm text-white"
                        />
                      </div>
                    </label>
                    <div className="rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] leading-relaxed text-slate-400">
                      <p>Mindestens 14 Zeichen. Eine lange, einzigartige Passphrase oder ein Passwortmanager wird empfohlen.</p>
                      <p className="mt-1">CAPITAL-AI erzwingt keine künstlichen Groß-/Kleinbuchstaben- oder Sonderzeichenregeln.</p>
                    </div>
                    <label className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-300">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={event => setTermsAccepted(event.target.checked)}
                        required
                        className="mt-0.5 h-4 w-4 accent-amber-400"
                      />
                      <span>
                        Ich akzeptiere die Nutzungsbedingungen.
                        {onNavigateLegal && (
                          <button type="button" onClick={() => onNavigateLegal('/agb')} className="ml-1 text-amber-300 underline">
                            Anzeigen
                          </button>
                        )}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-300">
                      <input
                        type="checkbox"
                        checked={privacyAcknowledged}
                        onChange={event => setPrivacyAcknowledged(event.target.checked)}
                        required
                        className="mt-0.5 h-4 w-4 accent-amber-400"
                      />
                      <span>
                        Ich habe den Datenschutzhinweis gelesen.
                        {onNavigateLegal && (
                          <button type="button" onClick={() => onNavigateLegal('/datenschutz')} className="ml-1 text-amber-300 underline">
                            Anzeigen
                          </button>
                        )}
                      </span>
                    </label>
                    <label className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-400">
                      <input
                        type="checkbox"
                        checked={marketingConsent}
                        onChange={event => setMarketingConsent(event.target.checked)}
                        className="mt-0.5 h-4 w-4 accent-amber-400"
                      />
                      <span>Optional: Produkt- und Forschungsupdates per E-Mail erhalten.</span>
                    </label>
                  </>
                )}
                {mode === 'login' && (
                  <button type="button" onClick={() => { setMode('forgot'); setError(''); setNotice(''); }} className="min-h-8 text-xs font-bold text-amber-300 hover:text-amber-200">
                    Passwort vergessen?
                  </button>
                )}
                <button
                  type="submit"
                  disabled={
                    busy ||
                    !session?.configured ||
                    (mode === 'register' && (!termsAccepted || !privacyAcknowledged || password !== passwordConfirm))
                  }
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
                href="/api/auth/login/google?next=%2F"
                className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-white/15 bg-white text-sm font-bold text-slate-900 transition hover:bg-slate-100"
                aria-label="Mit Google anmelden"
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 shrink-0">
                  <path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.4-.18-2.07H12v3.92h5.38a4.6 4.6 0 0 1-2 3.02v2.54h3.24c1.9-1.75 2.98-4.32 2.98-7.41Z" />
                  <path fill="#34A853" d="M12 22c2.7 0 4.97-.9 6.62-2.36l-3.24-2.54c-.9.6-2.05.96-3.38.96-2.61 0-4.82-1.76-5.61-4.13H3.04v2.62A10 10 0 0 0 12 22Z" />
                  <path fill="#FBBC05" d="M6.39 13.93A6.02 6.02 0 0 1 6.08 12c0-.67.11-1.32.31-1.93V7.45H3.04A10 10 0 0 0 2 12c0 1.61.39 3.14 1.04 4.55l3.35-2.62Z" />
                  <path fill="#EA4335" d="M12 5.94c1.47 0 2.79.5 3.82 1.5l2.87-2.87A9.64 9.64 0 0 0 12 2a10 10 0 0 0-8.96 5.45l3.35 2.62C7.18 7.7 9.39 5.94 12 5.94Z" />
                </svg>
                Mit Google anmelden
              </a>

              <button
                type="button"
                onClick={() => void loginWithPasskey()}
                disabled={busy || !passkeySupported || !session?.configured}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-3 rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-sm font-black text-cyan-100 transition hover:bg-cyan-400/15 disabled:opacity-40"
              >
                <Fingerprint className="h-5 w-5" />
                Mit Passkey anmelden
              </button>
            </>
          ) : null}

          <p className="mt-4 flex gap-2 text-xs text-slate-400">
            <Lock size={16} /> Access- und Refresh-Tokens verbleiben in signierten HttpOnly-Secure-Cookies.
          </p>
          <p className="mt-2 flex gap-2 text-[11px] text-slate-500">
            <KeyRound size={15} /> Passkey ist passwortlos; TOTP wird bei aktivierter MFA als zweiter Faktor angefordert.
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
