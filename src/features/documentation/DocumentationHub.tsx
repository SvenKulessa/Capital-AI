import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  BookOpen,
  Boxes,
  FileText,
  KeyRound,
  Layers3,
  ShieldCheck,
} from 'lucide-react';

interface DocumentationHubProps {
  onBackToHome: () => void;
  onNavigate?: (path: string) => void;
}

const presentations = [
  {
    title: 'Blueprint-Dokumentation',
    description:
      'Die kanonischen Datenkonzept-Blueprints mit Architektur-Grafiken, Kaufstatus und BYOK-Dokumentation.',
    href: '/marketscreener/dokumentation',
    internal: true,
    icon: <FileText className="h-5 w-5" />,
    meta: 'Blueprints • Datenkonzepte • BYOK',
  },
  {
    title: 'BYOK – Bring Your Own Key',
    description:
      'Vault-Boundary, private Provider-Credentials, serverseitige Adapter und die Anbindung an Scoring und Analyse.',
    href: '/documentation/byok.html',
    internal: false,
    icon: <KeyRound className="h-5 w-5" />,
    meta: 'Security • Vault • Scoring',
  },
  {
    title: 'Pipeline-Architekturen',
    description:
      'Provider-Auswahl, Ingestion, NATS JetStream, Valkey Hot State, Evidence, Scoring und Client-Verteilung.',
    href: '/documentation/pipeline-architectures.html',
    internal: false,
    icon: <Layers3 className="h-5 w-5" />,
    meta: 'Ingestion • Eventing • Replay',
  },
  {
    title: 'Preiskatalog & Produktpakete',
    description:
      'Starter, Pro, Enterprise und Market Vocabulary mit Stripe-v2 als Preisautorität.',
    href: '/documentation/pricing-models.html',
    internal: false,
    icon: <BadgeEuro className="h-5 w-5" />,
    meta: 'Abonnements • Zusatzprodukte • Stripe',
  },
  {
    title: 'CAPITAL-AI Domains',
    description:
      'PRODUCT, MARKET, PLATFORM, TRUST und GROWTH mit den bestehenden Domain-Badges und technischen Systemgrenzen.',
    href: '/documentation/domains.html',
    internal: false,
    icon: <Boxes className="h-5 w-5" />,
    meta: 'Domain Map • Ownership • Handoffs',
  },
] as const;

const domains = [
  ['PRODUCT', '/documentation/badges/product.svg', 'Frontend, UX, Navigation, Konto, Profil und produktnahe Nutzerflüsse.'],
  ['MARKET', '/documentation/badges/market.svg', 'Provider, Instrumente, Datenrechte, Market Data und Scoring-Evidence.'],
  ['PLATFORM', '/documentation/badges/platform.svg', 'Render, Docker, NATS, Valkey, CI/CD und Runtime-Identität.'],
  ['TRUST', '/documentation/badges/trust.svg', 'Security, Compliance, Governance, QA, Lizenz- und Provenance-Gates.'],
  ['GROWTH', '/documentation/badges/growth.svg', 'Dokumentation, SEO, Social, Branding und veröffentlichungsbezogene Qualität.'],
] as const;

export const DocumentationHub: React.FC<DocumentationHubProps> = ({ onBackToHome, onNavigate }) => (
  <main className="min-h-screen w-full px-3 py-6 text-slate-100 sm:px-6">
    <div className="mx-auto max-w-6xl space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-6">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4 text-amber-400" />
          Zurück
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          HTML/CSS-Präsentationen • bestehende Repository-Assets
        </div>
      </header>

      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/25 bg-violet-500/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-violet-300">
          <BookOpen className="h-4 w-4" />
          Dokumentation
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white sm:text-5xl">
          CAPITAL-AI Dokumentations-Hub
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-slate-400 sm:text-base">
          Zentraler Einstieg in Blueprint-Dokumentation sowie deterministische Präsentationen zu BYOK,
          Pipeline-Architekturen, dem Preiskatalog und dem Aufbau der fünf CAPITAL-AI Domains.
        </p>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {presentations.map((item) => {
          const commonClass =
            'group rounded-2xl border border-slate-800 bg-[#071022]/90 p-5 transition-all hover:border-violet-400/40 hover:bg-[#0a142b]';
          const body = (
            <>
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-violet-400/25 bg-violet-500/10 text-violet-300">
                  {item.icon}
                </div>
                <ArrowRight className="h-4 w-4 text-slate-500 transition-all group-hover:translate-x-0.5 group-hover:text-violet-300" />
              </div>
              <div className="mt-4 text-[10px] font-mono uppercase tracking-widest text-cyan-300">
                {item.meta}
              </div>
              <h2 className="mt-2 text-lg font-black text-white">{item.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
            </>
          );

          if (item.internal) {
            return (
              <button
                key={item.href}
                type="button"
                onClick={() => onNavigate?.(item.href)}
                className={`${commonClass} text-left`}
              >
                {body}
              </button>
            );
          }

          return (
            <a key={item.href} href={item.href} target="_blank" rel="noreferrer" className={commonClass}>
              {body}
            </a>
          );
        })}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[#050b18] p-5 sm:p-7">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
              Domain Architecture
            </div>
            <h2 className="mt-1 text-xl font-black text-white">Die fünf CAPITAL-AI Domains</h2>
          </div>
          <Boxes className="h-6 w-6 text-cyan-300" />
        </div>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
          {domains.map(([name, src, description]) => (
            <div key={name} className="rounded-2xl border border-slate-800 bg-black/20 p-4">
              <img src={src} alt={`${name} Badge`} className="h-16 w-auto max-w-full object-contain" />
              <h3 className="mt-3 text-sm font-black text-white">{name}</h3>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  </main>
);
