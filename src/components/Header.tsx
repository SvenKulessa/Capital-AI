import { accountDisplay, verifiedOwner } from '../../shared/account-display.mjs';
import { hubBrandForRoute } from '../../shared/hub-branding.mjs';
/**
 * ============================================================================
 * [ARCHITEKTUR-MAPPING: GLOBAL NAVIGATION & TERMINAL HEADER]
 * ----------------------------------------------------------------------------
 * 1. GRAFISCHE KOMPONENTE : 
 *    - Vector Brand Logo mit goldenem Glowing-Effekt
 *    - Schnellzugriff-Buttons (Analyse, Sektoren, Whale Radar, Tarife, Login)
 *    - Vollintegriertes Hamburger-Drawer-Menü mit Assetklassen-Hierarchie
 * 2. SCORING-LOGIK        : 
 *    - Price-Alert-Schnellzugriff während Produktpause ausgeblendet
 * 3. DATENANBINDUNG       : 
 *    - Sessionstatus und Navigation
 *    - Google Analytics Event Tracking (`trackLoginClick`, `header-analysis-btn`)
 * 4. DATENQUELLEN / FEEDS : 
 *    - Asset-Klassen-Katalog (ASSET_CLASSES)
 *    - Live-Feed-Latenz-Indikator
 * ============================================================================
 */

import React, { lazy, Suspense, useEffect, useState } from 'react';
import {
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  ShieldCheck,
  BookOpen,
  Coins,
  BarChart3,
  Globe,
  DollarSign,
  Flame,
  LogIn,
  CreditCard,
  Building2,
  LineChart,
  LibraryBig,
  User,
  LogOut,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createPortal } from 'react-dom';
import { BrandLogo } from './BrandLogo';
import { LanguageSwitcher } from './LanguageSwitcher';
import { useLocale } from '../i18n/LocaleProvider';
import { navigationCopy } from '../i18n/navigationCopy';
import { ASSET_CLASSES } from '../data/mockData';
import { MainCategory, AssetSubclass } from '../types';
import { trackLoginClick } from '../utils/analytics';
import { MAIN_HUBS_CONFIG, type MainHubId } from './HubCatalog';



interface HeaderSession {
  authenticated: boolean;
  user?: { name?: string; email?: string } | null;
  account?: {
    available?: boolean;
    iamRole?: string | null;
    subscription?: { tier?: string; status?: string } | null;
    badges?: Array<{ id: string; label: string; asset: string }>;
  } | null;
}

interface HeaderProps {
  currentRoute?: string;
  onOpenAnalysis?: () => void;
  onOpenSectorAnalysis?: () => void;
  onOpenModule?: (moduleId: string) => void;
  onOpenVocabulary?: () => void;
  onOpenPriceAlerts?: () => void;
  onOpenMonetization?: () => void;
  onOpenWhaleRadar?: () => void;
  onOpenMarketscreener?: () => void;
  onSelectSubclass?: (subclass: AssetSubclass, category: MainCategory) => void;
  onViewAllMarkets?: () => void;
  onNavigateLogin?: () => void;
  onNavigate?: (path: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onOpenAnalysis,
  onOpenSectorAnalysis,
  onOpenModule,
  onOpenVocabulary,
  onOpenPriceAlerts,
  onOpenMonetization,
  onOpenWhaleRadar,
  onOpenMarketscreener,
  onSelectSubclass,
  onViewAllMarkets,
  onNavigateLogin,
  onNavigate,
}) => {

  const { t, locale } = useLocale();
  const nav = navigationCopy[locale];
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [expandedClass, setExpandedClass] = useState<MainCategory | null>('KRYPTO');
  const [authSession, setAuthSession] = useState<HeaderSession | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [sessionRetry, setSessionRetry] = useState(0);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    setAuthStatus('loading');
    setAuthSession(null);
    setIsAccountOpen(false);
    fetch('/api/auth/session', {
      credentials: 'same-origin', cache: 'no-store',
      headers: { Accept: 'application/json' }, signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error('SESSION_UNAVAILABLE');
      const body: unknown = await response.json();
      if (!body || typeof body !== 'object' ||
        !('authenticated' in body) || typeof body.authenticated !== 'boolean') {
        throw new Error('INVALID_SESSION');
      }
      return body as HeaderSession;
    }).then(body => {
      if (controller.signal.aborted) return;
      setAuthSession(body);
      setAuthStatus('ready');
    }).catch(() => {
      if (controller.signal.aborted) return;
      setAuthSession(null);
      setAuthStatus('error');
    });
    return () => controller.abort();
  }, [currentRoute]);

  // Portaled drawer is outside the header's z-index stacking context.
  // Keep background scrolling and keyboard focus from escaping the modal.
  useEffect(() => {
    if (!isMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const dialog = document.getElementById('capital-ai-mobile-navigation');
    dialog?.querySelector<HTMLElement>('#close-menu-btn')?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setIsMenuOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const focusable = Array.from(dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )).filter(element => element.getClientRects().length > 0);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      document.getElementById('mobile-menu-btn')?.focus();
    };
  }, [isMenuOpen]);

  const accountTier = accountDisplay(authSession);
  const isOwner = verifiedOwner(authSession);
  const activeHub = hubBrandForRoute(currentRoute);

  const navigateAccount = (path: '/profile' | '/profile/security' | '/profile/workspace') => {
    setIsAccountOpen(false);
    setIsMenuOpen(false);
    if (onNavigate) onNavigate(path);
    else window.location.assign(path);
  };

  const logout = async () => {
    setIsAccountOpen(false);
    setIsMenuOpen(false);
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      });
      if (!response.ok) throw new Error('LOGOUT_FAILED');
      setAuthSession(previous => previous ? { ...previous, authenticated: false, user: null } : previous);
      setAuthStatus('ready');
      if (onNavigate) onNavigate('/');
      else window.location.assign('/');
    } catch {
      window.location.assign('/login');
    }
  };

  const openHubSidebar = (hubId: MainHubId) => {
    setIsMenuOpen(false);
    const path = MAIN_HUBS_CONFIG[hubId].mainPath;
    if (onNavigate) onNavigate(path); else window.location.assign(path);
  };

  const renderClassIcon = (id: MainCategory) => {
    switch (id) {
      case 'KRYPTO':
        return <Coins className="w-3.5 h-3.5" />;
      case 'AKTIEN':
        return <BarChart3 className="w-3.5 h-3.5" />;
      case 'INDIZIES':
        return <Globe className="w-3.5 h-3.5" />;
      case 'FOREX':
        return <DollarSign className="w-3.5 h-3.5" />;
      case 'ROHSTOFFE':
        return <Flame className="w-3.5 h-3.5" />;
      default:
        return <Coins className="w-3.5 h-3.5" />;
    }
  };

  return (
    <header className="relative z-30 w-full px-3 sm:px-6 pt-3.5 pb-2.5 flex items-center justify-between select-none">
      {/* LEFT SIDE: Hamburger Navigation Button & Brand Logo */}
      <div className="flex items-center space-x-3">
        {/* Hamburger Menu Button on the Left */}
        <button
          id="mobile-menu-btn"
          type="button"
          aria-label={t('navOpen')}
          aria-expanded={isMenuOpen}
          aria-controls="capital-ai-mobile-navigation"
          aria-haspopup="dialog"
          onClick={() => setIsMenuOpen(true)}
          className="w-10 h-10 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 active:bg-white/15 text-amber-300 border border-amber-500/20 hover:border-amber-500/40 transition-all shadow-[0_0_12px_rgba(249,191,33,0.12)] cursor-pointer shrink-0"
        >
          <Menu className="w-5 h-5 stroke-[2]" />
        </button>

        {/* Capital-AI globe branding */}
        <BrandLogo
          variant="vendor"
          size="md"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      </div>

      <nav aria-label={nav.main} className="hidden xl:flex items-center gap-1 rounded-xl border border-slate-700 bg-black/40 p-1">
        {Object.values(MAIN_HUBS_CONFIG).filter(hub => hub.id !== 'control-center' || isOwner).map(hub => <button key={hub.id} type="button" data-hub={hub.id} aria-current={activeHub === hub.id ? 'page' : undefined} className="hub-tab hub-switch !px-3 !text-xs" onClick={() => openHubSidebar(hub.id)}><span aria-hidden="true">{hub.icon}</span>{hub.name}</button>)}
      </nav>

      {/* RIGHT SIDE: Live Status Chip & Login Button */}
      <div className="flex items-center space-x-2">
        {/* STUDIO HUB BUTTON */}
        <button
          type="button"
          onClick={() => onNavigate?.('/studio')}
          className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-green-500/15 hover:bg-green-500/25 border border-green-400/40 text-green-300 text-xs font-semibold transition-all cursor-pointer shadow-[0_0_10px_rgba(74,222,128,0.15)] shrink-0"
          title="Studio Hub: Pipeline Architektur, Blueprints, Pipeline Builder, AI Kauf-Berater, Data & Providers, Analytics & Scoring, Benchmark Lab, Configurator Console (/studio)"
        >
          <Building2 className="w-3.5 h-3.5 text-green-400" />
          <span>Studio Hub</span>
        </button>

        {/* Language selector stays next to Login and Account. */}
        <LanguageSwitcher />
        {/* Session errors are not evidence of a logout. */}
        {authStatus === 'loading' ? (
          <span role="status" className="px-3 text-xs text-slate-300">{nav.loading}</span>
        ) : authStatus === 'error' ? (
          <button type="button" onClick={() => setSessionRetry(value => value + 1)}
            aria-label={nav.retryLabel}
            className="min-h-11 rounded-xl border border-amber-400/40 px-3 text-xs text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300">
            {nav.retry}
          </button>
        ) : authSession?.authenticated ? (
          <div className="relative shrink-0">
            <button
              id="header-profile-btn"
              type="button"
              onClick={() => setIsAccountOpen(value => !value)}
              className={`flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${isOwner ? "bg-red-500/10 hover:bg-red-500/15 border border-red-400/40 hover:border-red-300 text-red-100" : "bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-400/30 hover:border-emerald-300 text-emerald-100"}`}
              aria-controls="header-account-navigation"
              aria-expanded={isAccountOpen}
              aria-label={t('navAccount')}
              title="Kontomenü"
            >
              <ShieldCheck className={`w-3.5 h-3.5 ${isOwner ? "text-red-300" : "text-emerald-300"}`} />
              <span className="flex min-w-0 flex-col items-start leading-tight">
                <span className="max-w-28 truncate">{authSession.user?.name || 'Profil'}</span>
                {accountTier && (
                  <span className={`font-mono text-[9px] ${isOwner ? "text-red-300" : "text-amber-300"}`}>{accountTier}{!isOwner && authSession.account?.subscription?.status === 'active' && <span className="ml-2 text-emerald-300 drop-shadow-[0_0_4px_#34d399]">● Aktiv</span>}</span>
                )}
              </span>
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOwner ? "text-red-300" : "text-emerald-300"} ${isAccountOpen ? 'rotate-180' : ''}`} />
            </button>

            {isAccountOpen && (
              <div
                id="header-account-navigation"
                role="group"
                aria-label="Kontonavigation"
                onKeyDown={event => {
                  if (event.key === 'Escape') {
                    setIsAccountOpen(false);
                    document.getElementById('header-profile-btn')?.focus();
                  }
                }}
                className="absolute right-0 top-full z-[70] mt-2 w-52 overflow-hidden rounded-2xl border border-white/10 bg-[#080d1b]/98 p-2 shadow-2xl backdrop-blur-xl"
              >
                <button
                  type="button"
                  
                  onClick={() => navigateAccount('/profile')}
                  className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-bold text-slate-100 hover:bg-white/10"
                >
                  <User className="h-4 w-4 text-amber-300" /> {nav.profile}
                </button>
                <button
                  type="button"
                  
                  onClick={() => navigateAccount('/profile/security')}
                  className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-bold text-slate-100 hover:bg-white/10"
                >
                  <ShieldCheck className="h-4 w-4 text-cyan-300" /> {nav.security}
                </button>

                <div className="my-1 border-t border-white/10" />
                <button
                  type="button"
                  
                  onClick={() => void logout()}
                  className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-left text-xs font-bold text-rose-200 hover:bg-rose-500/10"
                >
                  <LogOut className="h-4 w-4" /> {nav.logout}
                </button>
              </div>
            )}
          </div>
        ) : (
          <a
            id="header-login-btn"
            href="/login"
            onClick={(e) => {
              e.preventDefault();
              trackLoginClick('header_top_right');
              onNavigateLogin?.();
            }}
            className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400/15 via-[#FF2E93]/15 to-[#8D26FF]/20 hover:from-amber-400/25 hover:via-[#FF2E93]/25 hover:to-[#8D26FF]/35 border border-amber-400/40 hover:border-amber-300 text-amber-200 hover:text-white text-xs font-bold transition-all shadow-[0_0_14px_rgba(249,191,33,0.18)] hover:shadow-[0_0_20px_rgba(255,46,147,0.3)] active:scale-95 cursor-pointer group shrink-0"
            data-analytics="login-click"
            data-ga-category="authentication"
            data-ga-action="click_login"
            data-ga-label="header_top_right"
            aria-label="Zum Capital-AI Login /login"
            title="Terminal Anmeldung (/login)"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-400 group-hover:text-amber-200 group-hover:scale-110 transition-all" />
            <span>{t('login')}</span>
          </a>
        )}
      </div>

      {/* Body portal ensures footer / hero imagery cannot cover the open navigation. */}
      {typeof document !== 'undefined' && createPortal(
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop Overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[100] cursor-pointer"
            />

            {/* Left Slide-in Drawer */}
            <motion.div
              id="capital-ai-mobile-navigation"
              role="dialog"
              aria-modal="true"
              aria-label={nav.main}
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 280 }}
              className="fixed inset-y-0 left-0 w-full max-w-none sm:w-[85%] sm:max-w-[320px] bg-[#090D1C] border-r border-amber-500/25 shadow-[0_0_40px_rgba(0,0,0,0.8)] z-[110] flex flex-col justify-between overflow-y-auto overscroll-contain text-slate-200"
            >
              {/* Drawer Top / Header */}
              <div className="p-5">
                <div className="flex items-center justify-between pb-4 border-b border-amber-500/15">
                  <BrandLogo variant="vendor" size="sm" />
                  <button
                    id="close-menu-btn"
                    type="button"
                    aria-label={nav.close}
                    onClick={() => setIsMenuOpen(false)}
                    className="w-11 h-11 rounded-xl flex items-center justify-center bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Mobile Drawer Account / Login CTA */}
                <div className="mt-4">
                  {authStatus === 'loading' ? (
                    <p role="status" className="p-3 text-xs text-slate-300">{nav.loading}</p>
                  ) : authStatus === 'error' ? (
                    <button type="button" onClick={() => setSessionRetry(value => value + 1)}
                      className="min-h-11 w-full rounded-xl border border-amber-400/40 px-3 text-left text-xs text-amber-200">
                      {nav.retry}
                    </button>
                  ) : authSession?.authenticated ? (
                    <div className={`space-y-1 rounded-2xl border p-2 ${isOwner ? "border-red-400/35 bg-red-500/5" : "border-emerald-400/25 bg-emerald-500/5"}`}>
                      <div className="px-2 py-2">
                        <div className="flex items-center gap-2">
                          <ShieldCheck className={`h-4 w-4 ${isOwner ? "text-red-300" : "text-emerald-300"}`} />
                          <span className={`truncate text-xs font-black ${isOwner ? "text-red-100" : "text-emerald-100"}`}>{authSession.user?.name || 'Konto'}</span>
                        </div>
                        {accountTier && <p className={`mt-1 pl-6 font-mono text-[9px] ${isOwner ? "text-red-300" : "text-amber-300"}`}>{accountTier}{!isOwner && authSession.account?.subscription?.status === 'active' && <span className="ml-2 text-emerald-300">● Aktiv</span>}</p>}
                      </div>
                      {[
                        { path: '/profile' as const, label: nav.profile, icon: User },
                        { path: '/profile/security' as const, label: nav.security, icon: ShieldCheck },
                      ].map(item => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            type="button"
                            onClick={() => navigateAccount(item.path)}
                            className="flex min-h-10 w-full items-center justify-between rounded-xl px-3 text-xs font-bold text-slate-200 hover:bg-white/10"
                          >
                            <span className="flex items-center gap-2"><Icon className="h-4 w-4" /> {item.label}</span>
                            <ChevronRight className="h-3.5 w-3.5 text-slate-500" />
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => void logout()}
                        className="flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-xs font-bold text-rose-200 hover:bg-rose-500/10"
                      >
                        <LogOut className="h-4 w-4" /> {nav.logout}
                      </button>
                    </div>
                  ) : (
                    <a
                      id="drawer-login-btn"
                      href="/login"
                      onClick={(e) => {
                        e.preventDefault();
                        setIsMenuOpen(false);
                        trackLoginClick('drawer');
                        onNavigateLogin?.();
                      }}
                      className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-amber-400/15 via-[#FF2E93]/15 to-[#8D26FF]/20 border border-amber-400/40 text-amber-200 hover:text-white font-bold text-xs transition-all shadow-[0_0_12px_rgba(249,191,33,0.15)] group"
                      data-analytics="drawer-login-click"
                      data-ga-category="authentication"
                      data-ga-action="click_login"
                      data-ga-label="drawer_menu"
                    >
                      <span className="flex items-center gap-2">
                        <LogIn className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
                        <span>{nav.login}</span>
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                    </a>
                  )}
                </div>

                {/* Navigation Sections: DIE 4 HAUPTHUBS (RUNDE LEUCHTENDE ACTION BUTTONS MIT AUFKLAPPBARER SIDEBAR) */}
                <div className="mt-2.5 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400/90 px-1 mb-1">
                    {nav.hubs}
                  </div>

                  <div className="grid grid-cols-1 gap-1.25">
                    {Object.values(MAIN_HUBS_CONFIG).map(hub => ({...hub, glow:hub.glowColor, tagline:hub.description})).filter(hub => hub.id !== 'control-center' || isOwner).map((hub) => (
                      <button
                        key={hub.id}
                        data-hub={hub.id}
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          openHubSidebar(hub.id);
                        }}
                        className="hub-switch hub-sidebar-card min-h-11 w-full flex items-center justify-between gap-1.5 px-1.5 py-1.5 border transition-all cursor-pointer group text-left shadow-sm"
                        style={{
                          backgroundColor: `${hub.color}14`,
                          borderColor: `${hub.color}45`,
                          boxShadow: `0 0 8px ${hub.glow}`,
                        }}
                      >
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div
                            className="hub-card-symbol w-6 h-6 rounded-full flex items-center justify-center shrink-0 border shadow-sm group-hover:scale-105 transition-transform"
                            style={{
                              backgroundColor: `${hub.color}25`,
                              borderColor: `${hub.color}60`,
                              boxShadow: `0 0 6px ${hub.glow}`,
                            }}
                          >
                            {hub.icon}
                          </div>
                          <div className="min-w-0">
                            <span className="text-[11px] font-bold text-white block truncate group-hover:text-amber-300 transition-colors">
                              {hub.name}
                            </span>
                            <span className="text-[9px] text-slate-400 block truncate">
                              {hub.tagline}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0 pl-1">
                          <span
                            className="text-[9px] font-mono font-bold px-1 py-0.5 rounded border"
                            style={{
                              color: hub.color,
                              backgroundColor: `${hub.color}15`,
                              borderColor: `${hub.color}35`,
                            }}
                          >
                            {hub.badge}
                          </span>
                          <ChevronRight className="w-3 h-3 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                  {/* SECTION 5: SYSTEM & MEHR */}
                  <div className="pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-1 mb-2">
                      System &amp; Mehr
                    </div>

                    <div className="space-y-1">
                      {/* MONETARISIERUNGSKONZEPT & TARIFE */}
                      {onOpenMonetization && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsMenuOpen(false);
                            onOpenMonetization();
                          }}
                          className="w-full flex items-center justify-between py-2 px-3 rounded-lg text-xs text-slate-300 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                        >
                          <span className="flex items-center gap-2">
                            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
                            <span>Preiskatalog</span>
                          </span>
                          <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                        </button>
                      )}

                    </div>
                  </div>

                  {/* ASSETKLASSEN & UNTERKLASSEN (KRYPTO, AKTIEN, INDIZIES, FOREX, ROHSTOFFE) */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="flex items-center justify-between px-1">
                      <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400/80">
                        Assetklassen & Unterklassen
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setIsMenuOpen(false);
                          onViewAllMarkets?.();
                        }}
                        className="text-[10px] font-semibold text-amber-300 hover:text-amber-200 cursor-pointer flex items-center gap-0.5"
                      >
                        <span>Alle Märkte</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="space-y-1 pt-0.5">
                      {ASSET_CLASSES.map((cls) => {
                        const isExpanded = expandedClass === cls.id;
                        return (
                          <div
                            key={cls.id}
                            className="rounded-xl border border-slate-800/80 bg-[#060c1d]/90 overflow-hidden transition-all"
                            style={{
                              borderColor: isExpanded ? `${cls.color}50` : undefined,
                            }}
                          >
                            {/* Asset Class Header Button */}
                            <button
                              type="button"
                              onClick={() => setExpandedClass(isExpanded ? null : cls.id)}
                              className="hub-asset-card min-h-11 w-full flex items-center justify-between px-1.5 py-1 text-left hover:bg-white/5 transition-colors cursor-pointer"
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <div
                                  className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 border"
                                  style={{
                                    backgroundColor: `${cls.color}18`,
                                    borderColor: `${cls.color}35`,
                                    color: cls.color,
                                  }}
                                >
                                  {renderClassIcon(cls.id)}
                                </div>
                                <div className="min-w-0">
                                  <span className="text-xs font-bold text-white block truncate">
                                    {cls.name}
                                  </span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1 shrink-0">
                                <span
                                  className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded border"
                                  style={{
                                    color: cls.color,
                                    backgroundColor: `${cls.color}10`,
                                    borderColor: `${cls.color}30`,
                                  }}
                                >
                                  {cls.subclasses.length} Klassen
                                </span>
                                <ChevronDown
                                  className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${
                                    isExpanded ? 'rotate-180 text-white' : ''
                                  }`}
                                />
                              </div>
                            </button>

                            {/* Subclasses List Accordion */}
                            <AnimatePresence initial={false}>
                              {isExpanded && (
                                <motion.div
                                  initial={{ height: 0, opacity: 0 }}
                                  animate={{ height: 'auto', opacity: 1 }}
                                  exit={{ height: 0, opacity: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden border-t border-slate-800/60 bg-black/25"
                                >
                                  <div className="p-2 space-y-1.5">
                                    {cls.subclasses.map((sub) => (
                                      <button
                                        key={sub.id}
                                        type="button"
                                        onClick={() => {
                                          setIsMenuOpen(false);
                                          onSelectSubclass?.(sub, cls.id);
                                        }}
                                        className="hub-subclass-card min-h-11 w-full p-1 text-left rounded-lg bg-slate-900/70 hover:bg-slate-800/90 border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer group focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-300"
                                      >
                                        <div className="flex items-center justify-between">
                                          <span className="text-[11.5px] font-bold text-slate-200 group-hover:text-amber-300 transition-colors">
                                            {sub.name}
                                          </span>
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-0.5 leading-snug line-clamp-2">
                                          {sub.shortDesc}
                                        </p>
                                        <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                                          {sub.examples.map((ex) => (
                                            <span
                                              key={ex}
                                              className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/5 border border-white/5 text-slate-300"
                                            >
                                              {ex}
                                            </span>
                                          ))}
                                        </div>
                                      </button>
                                    ))}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

              {/* Drawer Bottom */}
              <div className="p-5 border-t border-slate-800/80 bg-[#060914]">
                {/* Direct Legal & FAQ Routing Links in Drawer */}
                <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate?.('/faq');
                    }}
                    className="hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    FAQ
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate?.('/datenschutz');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Datenschutz
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate?.('/agb');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    AGB
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsMenuOpen(false);
                      onNavigate?.('/impressum');
                    }}
                    className="hover:text-white transition-colors cursor-pointer"
                  >
                    Impressum
                  </button>
                </div>

                <div className="mt-2 text-center text-[10px] text-slate-500">
                  <span>© {new Date().getFullYear()} Capital-AI</span>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>, document.body)}


    </header>
  );
};
