import React from 'react';
import { Mail, RotateCcw } from 'lucide-react';
import { AccountPageShell } from '../features/account/AccountPageShell';
import { AuthSecuritySettings } from '../features/auth/AuthSecuritySettings';

export function SecurityPage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <AccountPageShell
      active="/profile/security"
      title="Sicherheit"
      description="Passkeys, Authenticator und Passwort-Wiederherstellung getrennt vom Profil verwalten."
      onNavigate={onNavigate}
    >
      {session => (
        <div className="space-y-5">
          <AuthSecuritySettings />

          <section className="rounded-2xl border border-white/10 bg-[#070b19]/85 p-5">
            <div className="flex items-start gap-3">
              <div className="rounded-xl border border-amber-400/25 bg-amber-400/10 p-2 text-amber-200">
                <Mail className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-white">Passwort & Wiederherstellung</h2>
                <p className="mt-1 text-xs leading-relaxed text-slate-400">
                  Für Konten mit E-Mail/Passwort kann jederzeit eine neue Recovery-Mail an die verifizierte Adresse gesendet werden.
                </p>
                <p className="mt-2 break-all text-xs text-slate-500">{session.user?.email}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('/login?mode=forgot')}
              className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-4 text-xs font-black text-amber-100 hover:bg-amber-400/15"
            >
              <RotateCcw className="h-4 w-4" />
              Passwort vergessen / zurücksetzen
            </button>
          </section>
        </div>
      )}
    </AccountPageShell>
  );
}
