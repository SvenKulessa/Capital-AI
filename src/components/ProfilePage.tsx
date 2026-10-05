import React from 'react';
import { ShieldCheck, User } from 'lucide-react';
import { AccountPageShell } from '../features/account/AccountPageShell';

export function ProfilePage({ onNavigate }: { onNavigate: (path: string) => void }) {
  return (
    <AccountPageShell
      active="/profile"
      title="Profil"
      description="Persönliche Kontoinformationen, Abo-Status und serverseitig verifizierte Rollen."
      onNavigate={onNavigate}
    >
      {session => (
        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-[#070b19]/80 p-5 md:col-span-1">
            <div className="flex items-center gap-2 text-amber-300">
              <User className="h-4 w-4" />
              <span className="text-xs font-black uppercase tracking-wider">Konto</span>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <p className="font-bold text-white">{session.user?.name || 'Benutzer'}</p>
              <p className="break-all text-slate-400">{session.user?.email}</p>
              <p className="break-all font-mono text-[10px] text-slate-500">{session.user?.id}</p>
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <ShieldCheck className="mb-2 h-4 w-4" />
              Identität wird serverseitig über Supabase Auth verifiziert.
            </div>
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-[#070b19]/90 p-5 md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Abo & Berechtigungen</p>
            {session.account?.available ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-bold text-amber-100">
                    {session.account.subscription?.tier || 'Kein Tarif'}
                  </span>
                  {session.account.subscription?.status && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-slate-300">
                      {session.account.subscription.status}
                    </span>
                  )}
                  {session.account.iamRole && (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-1 font-mono text-cyan-200">
                      IAM {session.account.iamRole}
                    </span>
                  )}
                </div>

                {session.account.badges?.length ? (
                  <div className="mt-4 flex flex-wrap gap-3" aria-label="Kontobadges">
                    {session.account.badges.map(badge => (
                      <figure key={badge.id} className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <img
                          src={badge.asset}
                          alt={badge.label + ' Badge'}
                          className="h-14 w-14 rounded-xl object-contain"
                          width={56}
                          height={56}
                        />
                        <figcaption className="text-xs font-black tracking-wider text-slate-100">{badge.label}</figcaption>
                      </figure>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-xs text-slate-500">Für dieses Konto sind keine zusätzlichen Badges hinterlegt.</p>
                )}
              </>
            ) : (
              <p className="mt-3 text-sm text-slate-400">Abo- und Rollenstatus konnte nicht sicher geladen werden.</p>
            )}
          </div>
        </section>
      )}
    </AccountPageShell>
  );
}
