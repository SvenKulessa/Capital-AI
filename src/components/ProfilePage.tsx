import React from 'react';
import { LearningEntitlementBadge } from '../features/learning/LearningEntitlementBadge';
import { ShieldCheck, User } from 'lucide-react';
import { AccountPageShell } from '../features/account/AccountPageShell';
import { openHeroBuddy } from './HeroBuddy';

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
            </div>
            <div className="mt-5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <ShieldCheck className="mb-2 h-4 w-4" />
              Dein Konto ist sicher angemeldet.
            </div>
            <button
              type="button"
              onClick={openHeroBuddy}
              className="mt-3 min-h-10 w-full rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-3 text-xs font-bold text-cyan-200"
            >
              Hero Buddy anzeigen
            </button>
            <nav aria-label="Rechtliche Informationen" className="mt-4 flex flex-wrap gap-3 border-t border-white/10 pt-3 text-xs text-slate-300">
              <a href="/agb" className="underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300">AGB</a>
              <a href="/datenschutz" className="underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300">Datenschutz</a>
              <a href="/impressum" className="underline underline-offset-4 hover:text-white focus-visible:outline-2 focus-visible:outline-amber-300">Impressum</a>
            </nav>
          </div>

          <div className="rounded-2xl border border-amber-500/25 bg-[#070b19]/90 p-5 md:col-span-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">Abo & Berechtigungen</p>
            {session.account?.available ? (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-bold text-amber-100">
                    <span className="mr-2 text-emerald-300">Rolle: {session.account.iamRole?.toUpperCase() || 'Unbekannt'}</span> Tarif: {session.account.subscription?.tier || 'Kein Tarif'}
                  </span>
                  {session.account.subscription?.status && (
                    <span className={session.account.subscription.status === 'active' ? "rounded-full border border-emerald-400/50 bg-emerald-500/15 px-2 py-1 text-emerald-300 shadow-[0_0_12px_rgba(52,211,153,0.3)]" : "rounded-full border border-white/10 px-2 py-1 text-slate-300"}>
                      {session.account.subscription.status === 'active' ? '● Aktiv' : session.account.subscription.status}
                    </span>
                  )}
                </div>
                {session.account.iamRole === 'owner' && <p className="mt-2 text-xs text-slate-300">OWNER ist die Verwaltungsrolle, kein bezahlter Tarif. Produktrechte werden separat geprüft.</p>}
                <LearningEntitlementBadge />

                {session.account.badges?.filter(badge => !/vault/i.test(badge.id) && !/vault/i.test(badge.label)).length ? (
                  <div className="mt-4 flex flex-wrap gap-3" aria-label="Kontobadges">
                    {session.account.badges.filter(badge => !/vault/i.test(badge.id) && !/vault/i.test(badge.label)).map(badge => (
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
                  <p className="mt-4 text-xs text-slate-300">Für dieses Konto sind keine zusätzlichen Badges hinterlegt.</p>
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
