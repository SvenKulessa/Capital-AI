import { accountDisplay } from '../../../shared/account-display.mjs';
import React, { useEffect, useState, type ReactNode } from 'react';
import { CreditCard, ArrowLeft, LayoutDashboard, Loader2, LogOut, ShieldCheck, User } from 'lucide-react';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { useLocale } from '../../i18n/LocaleProvider';
import { accountCopy } from '../../i18n/accountWorkspaceCopy';

export interface AccountBadge {
  id: string;
  label: string;
  asset: string;
}

export interface AccountSession {
  configured: boolean;
  authenticated: boolean;
  currentLevel?: 'aal1' | 'aal2';
  mfaRequired?: boolean;
  user: {
    id: string;
    subject: string;
    email: string;
    name: string;
  } | null;
  account?: {
    available: boolean;
    iamRole: string | null;
    subscription: {
      tier: string;
      status: string | null;
      currentPeriodEnd: string | null;
    } | null;
    badges: AccountBadge[];
  } | null;
}

type AccountPageShellProps = {
  active: '/profile/rights' | '/profile/subscription' | '/profile' | '/profile/security' | '/profile/key-vault' | '/profile/workspace' | '/profile/render-dashboard' | '/profile/dashboard';
  title: string;
  description: string;
  onNavigate: (path: string) => void;
  children: (session: AccountSession) => ReactNode;
};

async function readSession(signal?: AbortSignal): Promise<AccountSession> {
  const response = await fetch('/api/auth/session', {
    credentials: 'same-origin',
    cache: 'no-store',
    headers: { Accept: 'application/json' },
    signal,
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body || typeof body.authenticated !== 'boolean') {
    throw new Error('SESSION_UNAVAILABLE');
  }
  return body as AccountSession;
}

export function AccountPageShell({
  active,
  title,
  description,
  onNavigate,
  children,
}: AccountPageShellProps) {
  const {locale} = useLocale();
  const tr = accountCopy[locale];
  const [session, setSession] = useState<AccountSession | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    readSession(controller.signal)
      .then(value => {
        if (controller.signal.aborted) return;
        if (!value.authenticated || !value.user?.id) {
          window.location.replace('/login');
          return;
        }
        if (value.mfaRequired) {
          window.location.replace('/login?mfa=1');
          return;
        }
        setSession(value);
      })
      .catch(() => {
        if (!controller.signal.aborted) setError(tr.accountSessionError);
      });
    return () => controller.abort();
  }, []);

  const logout = async () => {
    setError('');
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error('LOGOUT_FAILED');
      window.location.replace('/');
    } catch {
      setError(tr.accountLogoutError);
    }
  };

  if (!session && !error) {
    return (
      <div className="min-h-screen bg-[#02050e] text-white flex items-center justify-center">
        <div className="flex items-center gap-3 text-sm text-slate-300">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          {tr.accountVerifying}
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-[#02050e] px-4 py-8 text-white">
        <div role="alert" className="mx-auto max-w-xl rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-200">
          {error}
        </div>
      </div>
    );
  }

  const items = [
    { path: '/profile' as const, label: tr.accountProfile, icon: User },
    { path: '/profile/security' as const, label: tr.accountSecurity, icon: ShieldCheck },
    { path: '/profile/rights' as const, label: 'Konto & Rechte', icon: ShieldCheck },
    { path: '/profile/subscription' as const, label: 'Abo verwalten', icon: CreditCard },
    { path: '/profile/dashboard' as const, label: 'Privates Dashboard', icon: LayoutDashboard },
  ];

  return (
    <div className="min-h-screen bg-[#02050e] px-4 py-6 text-white sm:px-6">
      <div className="mx-auto max-w-5xl space-y-5">
        <header className="rounded-2xl border border-white/10 bg-[#070b19]/90 p-4 shadow-2xl">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="font-mono text-[10px] font-black uppercase tracking-[0.24em] text-amber-300">
                CAPITAL-AI / {tr.accountName}
              </p>
              <h1 className="mt-1 text-2xl font-black">{title}</h1>
              <p className="mt-1 max-w-2xl text-sm text-slate-400">{description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                <span className="font-bold text-white">{session.user?.name || tr.accountUser}</span>
                {accountDisplay(session) && (
                  <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-1 font-mono text-amber-200">
                    {accountDisplay(session)}
                  </span>
                )}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LanguageSwitcher />

              <button
                type="button"
                onClick={() => onNavigate('/')}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 text-xs font-bold hover:bg-white/10"
              >
                <ArrowLeft className="h-4 w-4" /> {tr.accountLanding}
              </button>
              <button
                type="button"
                onClick={() => void logout()}
                className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 text-xs font-bold text-rose-100"
              >
                <LogOut className="h-4 w-4" /> {tr.accountLogout}
              </button>
            </div>
          </div>

          <nav aria-label={tr.accountSections} className="hub-tab-strip mt-5" data-hub="learning">
            {items.map(item => {
              const Icon = item.icon;
              const selected = active === item.path;
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => onNavigate(item.path)}
                  aria-current={selected ? 'page' : undefined}
                  className={`hub-tab !text-sm ${
                    selected
                      ? ''
                      : 'border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        {error && (
          <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-200">
            {error}
          </div>
        )}

        {children(session)}
      </div>
    </div>
  );
}
