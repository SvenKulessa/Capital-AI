import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Copy, Fingerprint, KeyRound, Loader2, QrCode, ShieldCheck, Trash2 } from 'lucide-react';
import {
  prepareRegistrationOptions,
  serializeRegistrationCredential,
  type PublicKeyCredentialCreationOptionsJSON,
} from './webauthn';

interface PasskeyItem {
  id: string;
  friendlyName: string;
  createdAt: string | null;
  lastUsedAt: string | null;
}

interface TotpFactor {
  id: string;
  type: 'totp';
  friendlyName: string;
  createdAt: string | null;
  updatedAt: string | null;
}

interface TotpEnrollment {
  factorId: string;
  friendlyName: string;
  qrCode: string;
  secret: string;
  uri: string;
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { response, body: await readJson(response) };
}

export function AuthSecuritySettings() {
  const [passkeys, setPasskeys] = useState<PasskeyItem[]>([]);
  const [factors, setFactors] = useState<TotpFactor[]>([]);
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [totpCode, setTotpCode] = useState('');
  const [passkeyName, setPasskeyName] = useState('CAPITAL-AI Passkey');
  const [factorName, setFactorName] = useState('CAPITAL-AI Authenticator');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const passkeySupported = useMemo(
    () => typeof window !== 'undefined' && 'PublicKeyCredential' in window && !!navigator.credentials,
    [],
  );

  const refresh = async () => {
    const [passkeyResponse, factorResponse] = await Promise.all([
      fetch('/api/auth/passkeys', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }),
      fetch('/api/auth/mfa/factors', {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      }),
    ]);
    const passkeyBody = await readJson(passkeyResponse);
    const factorBody = await readJson(factorResponse);
    if (passkeyResponse.ok) setPasskeys(Array.isArray(passkeyBody?.passkeys) ? passkeyBody.passkeys : []);
    if (factorResponse.ok) setFactors(Array.isArray(factorBody?.factors) ? factorBody.factors : []);
  };

  useEffect(() => {
    void refresh().catch(() => setError('Sicherheitsmethoden konnten nicht geladen werden.'));
  }, []);

  const updatePasskeyName = (value: string) => setPasskeyName(value.slice(0, 120));
  const updateFactorName = (value: string) => setFactorName(value.slice(0, 120));

  const addPasskey = async () => {
    if (!passkeySupported) {
      setError('Dieser Browser oder dieses Gerät unterstützt WebAuthn/Passkeys nicht.');
      return;
    }
    setBusy('passkey-add');
    setError('');
    setNotice('');
    try {
      const start = await postJson('/api/auth/passkeys/register/options', {});
      if (!start.response.ok || !start.body?.options || !start.body?.challengeId) {
        throw new Error(start.body?.code || start.body?.error || 'passkey_options_failed');
      }
      const credential = await navigator.credentials.create({
        publicKey: prepareRegistrationOptions(start.body.options as PublicKeyCredentialCreationOptionsJSON),
      });
      if (!(credential instanceof PublicKeyCredential)) throw new Error('passkey_ceremony_cancelled');
      const finish = await postJson('/api/auth/passkeys/register/verify', {
        challengeId: start.body.challengeId,
        credential: serializeRegistrationCredential(credential),
        friendlyName: passkeyName.trim(),
      });
      if (!finish.response.ok) throw new Error(finish.body?.code || finish.body?.error || 'passkey_registration_failed');
      setNotice('Passkey wurde erfolgreich registriert.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Passkey konnte nicht registriert werden.');
    } finally {
      setBusy('');
    }
  };

  const removePasskey = async (passkeyId: string) => {
    setBusy('passkey-remove');
    setError('');
    setNotice('');
    try {
      const result = await postJson('/api/auth/passkeys/remove', { passkeyId });
      if (!result.response.ok) throw new Error(result.body?.code || result.body?.error || 'passkey_remove_failed');
      setNotice('Passkey wurde entfernt.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Passkey konnte nicht entfernt werden.');
    } finally {
      setBusy('');
    }
  };

  const startTotp = async () => {
    setBusy('totp-enroll');
    setError('');
    setNotice('');
    try {
      const result = await postJson('/api/auth/mfa/totp/enroll', { friendlyName: factorName });
      if (!result.response.ok || !result.body?.factorId || !result.body?.secret) {
        throw new Error(result.body?.code || result.body?.error || 'totp_enrollment_failed');
      }
      setEnrollment(result.body as TotpEnrollment);
      setTotpCode('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authenticator konnte nicht vorbereitet werden.');
    } finally {
      setBusy('');
    }
  };

  const verifyTotp = async () => {
    if (!enrollment) return;
    setBusy('totp-verify');
    setError('');
    setNotice('');
    try {
      const result = await postJson('/api/auth/mfa/totp/verify', {
        factorId: enrollment.factorId,
        code: totpCode.trim(),
      });
      if (!result.response.ok) throw new Error(result.body?.code || result.body?.error || 'totp_verification_failed');
      setEnrollment(null);
      setTotpCode('');
      setNotice('Authenticator wurde aktiviert. Die aktuelle Sitzung ist jetzt AAL2-verifiziert.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authenticator-Code konnte nicht verifiziert werden.');
    } finally {
      setBusy('');
    }
  };

  const removeTotp = async (factorId: string) => {
    setBusy('totp-remove');
    setError('');
    setNotice('');
    try {
      const result = await postJson('/api/auth/mfa/totp/remove', { factorId });
      if (!result.response.ok) throw new Error(result.body?.code || result.body?.error || 'totp_remove_failed');
      setNotice('Authenticator wurde deaktiviert.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Authenticator konnte nicht deaktiviert werden.');
    } finally {
      setBusy('');
    }
  };

  const copySecret = async () => {
    if (!enrollment?.secret || !navigator.clipboard) return;
    await navigator.clipboard.writeText(enrollment.secret);
    setNotice('Manueller Authenticator-Code wurde kopiert.');
  };

  return (
    <section className="rounded-2xl border border-violet-500/20 bg-[#070b19]/85 p-5">
      <div className="flex items-start gap-3">
        <div className="rounded-xl border border-violet-400/25 bg-violet-400/10 p-2 text-violet-200">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-base font-black text-white">Anmeldesicherheit</h2>
          <p className="mt-1 text-xs leading-relaxed text-slate-400">
            Passkeys ermöglichen passwortlose WebAuthn-Anmeldung. Der Authenticator ist ein optionaler TOTP-Zweitfaktor und kann per QR-Code oder manuellem Secret eingerichtet werden.
          </p>
        </div>
      </div>

      {error && <div role="alert" className="mt-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-200">{error}</div>}
      {notice && <div role="status" className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">{notice}</div>}

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-black text-white">Passkeys</h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Phishing-resistente Anmeldung über Gerätebiometrie, PIN oder Hardware-Sicherheitsschlüssel.
          </p>

          <label className="mt-4 block text-[11px] font-bold text-slate-300">
            Anzeigename
            <input
              value={passkeyName}
              onChange={event => updatePasskeyName(event.target.value)}
              maxLength={120}
              className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-xs text-white"
            />
          </label>
          <button
            type="button"
            disabled={!passkeySupported || !!busy}
            onClick={() => void addPasskey()}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-3 text-xs font-black text-black disabled:opacity-40"
          >
            {busy === 'passkey-add' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fingerprint className="h-4 w-4" />}
            Passkey hinzufügen
          </button>

          <div className="mt-4 space-y-2">
            {passkeys.length ? passkeys.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-200">{item.friendlyName || 'Passkey'}</p>
                  <p className="mt-1 font-mono text-[9px] text-slate-500">
                    {item.lastUsedAt ? 'Zuletzt genutzt: ' + item.lastUsedAt : 'Noch nicht genutzt'}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void removePasskey(item.id)}
                  className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-rose-200 disabled:opacity-40"
                  aria-label="Passkey entfernen"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )) : (
              <p className="rounded-xl border border-white/10 bg-black/20 p-3 text-[11px] text-slate-500">Noch kein Passkey registriert.</p>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-black/25 p-4">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-amber-300" />
            <h3 className="text-sm font-black text-white">Authenticator (TOTP)</h3>
          </div>
          <p className="mt-1 text-[11px] text-slate-500">
            Kompatibel mit Google Authenticator, 1Password, Authy und anderen TOTP-Apps.
          </p>

          {!enrollment && (
            <>
              <label className="mt-4 block text-[11px] font-bold text-slate-300">
                Anzeigename
                <input
                  value={factorName}
                  onChange={event => updateFactorName(event.target.value)}
                  maxLength={120}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-xs text-white"
                />
              </label>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => void startTotp()}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-3 text-xs font-black text-black disabled:opacity-40"
              >
                {busy === 'totp-enroll' ? <Loader2 className="h-4 w-4 animate-spin" /> : <QrCode className="h-4 w-4" />}
                Authenticator aktivieren
              </button>
            </>
          )}

          {enrollment && (
            <div className="mt-4 rounded-xl border border-amber-400/25 bg-amber-400/5 p-3">
              <p className="text-xs font-bold text-amber-200">QR-Code scannen oder Secret manuell eintragen</p>
              {enrollment.qrCode && (
                <img
                  src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(enrollment.qrCode)}`}
                  alt="QR-Code zur Einrichtung des CAPITAL-AI Authenticators"
                  className="mx-auto mt-3 h-44 w-44 rounded-xl bg-white p-2"
                />
              )}
              <div className="mt-3 flex items-center gap-2 rounded-lg border border-white/10 bg-black/40 p-2">
                <code className="min-w-0 flex-1 break-all text-[10px] text-cyan-200">{enrollment.secret}</code>
                <button type="button" onClick={() => void copySecret()} className="rounded p-1.5 text-slate-300" aria-label="Secret kopieren">
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <label className="mt-3 block text-[11px] font-bold text-slate-300">
                Code aus Authenticator-App
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={totpCode}
                  onChange={event => setTotpCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 font-mono text-sm tracking-[0.25em] text-white"
                  placeholder="123456"
                />
              </label>
              <button
                type="button"
                disabled={!!busy || totpCode.length < 6}
                onClick={() => void verifyTotp()}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-3 text-xs font-black text-black disabled:opacity-40"
              >
                {busy === 'totp-verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Code bestätigen
              </button>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {factors.map(item => (
              <div key={item.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-black/30 p-3">
                <div className="min-w-0">
                  <p className="truncate text-xs font-bold text-slate-200">{item.friendlyName || 'Authenticator'}</p>
                  <p className="mt-1 text-[10px] text-emerald-300">Aktiv · TOTP</p>
                </div>
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={() => void removeTotp(item.id)}
                  className="rounded-lg border border-rose-500/25 bg-rose-500/10 p-2 text-rose-200 disabled:opacity-40"
                  aria-label="Authenticator deaktivieren"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
        Passkeys werden vom Gerät bzw. Passwortmanager verwaltet; CAPITAL-AI speichert nur die von Supabase verwaltete öffentliche WebAuthn-Credential. TOTP-Secrets werden nur während der Einrichtung angezeigt.
      </p>
    </section>
  );
}
