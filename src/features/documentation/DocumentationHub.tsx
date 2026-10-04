import React from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Boxes,
  KeyRound,
  Layers3,
  BadgeEuro,
  ShieldCheck,
} from 'lucide-react';

interface DocumentationHubProps {
  onBackToHome: () => void;
}

const presentations = [
  {
    title: 'BYOK – Bring Your Own Key',
    description:
      'Vom persönlichen API-Key im Vault über serverseitige Adapter bis zur privaten Scoring-Nutzung – mit klarer Trust Boundary und ohne Key-Exposure im Browser.',
    href: '/documentation/byok.html',
    icon: <KeyRound className="w-5 h-5" />,
    meta: 'Security • Vault • Scoring',
  },
  {
    title: 'Pipeline-Architekturen',
    description:
      'Provider-Auswahl, Normalisierung, NATS JetStream, Valkey Hot State, Scoring, Evidence und Client-Verteilung als nachvollziehbare Layer.',
    href: '/documentation/pipeline-architectures.html',
    icon: <Layers3 className="w-5 h-5" />,
    meta: 'Ingestion • Eventing • Replay',
  },
  {
    title: 'Preismodelle & Produktpakete',
    description:
      'Starter, Pro, Enterprise, Market Vocabulary und monetarisierbare Studio-Bausteine mit Stripe-v2 als Preisautorität.',
    href: '/documentation/pricing-models.html',
    icon: <BadgeEuro className="w-5 h-5" />,
    meta: 'SaaS • Add-ons • Stripe',
  },
  {
    title: 'CAPITAL-AI Domains',
    description:
      'PRODUCT, MARKET, PLATFORM, TRUST und GROWTH mit den bestehenden Domain-Badges und ihren Systemgrenzen.',
    href: '/documentation/domains.html',
    icon: <Boxes className="w-5 h-5" />,
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

export const DocumentationHub: React.FC<DocumentationHubProps> = ({ onBackToHome }) => (
  <main className="w-full min-h-screen text-slate-100 px-3 sm:px-6 py-6">
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-wrap items-center justify-between gap-3 pb-6 border-b border-slate-800/80">
        <button
          type="button"
          onClick={onBackToHome}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-amber-400" />
          Zurück
        </button>
        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-500/10 px-3 py-1 text-[11px] font-mono text-emerald-300">
          <ShieldCheck className="w-3.5 h-3.5" />
          Statische HTML/CSS-Präsentationen • keine externen Medien
        </div>
      </header>

      <section className="space-y-3">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-300">
          <BookOpen className="w-4 h-4" />
          Dokumentation
        </div>
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          CAPITAL-AI Dokumentations-Hub
        </h1>
        <p className="max-w-3xl text-sm sm:text-base leading-relaxed text-slate-400">
          Produktnahe, deterministische Präsentationen im HTML/CSS-Format. Die Inhalte sind für Website,
          Review und Social-Weiterverarbeitung strukturiert und enthalten keine ungeprüften generativen
          Fremd-Assets.
        </p>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {presentations.map((item) => (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="group rounded-2xl border border-slate-800 bg-[#071022]/90 p-5 hover:border-amber-400/40 hover:bg-[#0a142b] transition-all"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="w-10 h-10 rounded-xl bg-amber-400/10 border border-amber-400/25 text-amber-300 flex items-center justify-center">
                {item.icon}
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-300 group-hover:translate-x-0.5 transition-all" />
            </div>
            <div className="mt-4 text-[10px] font-mono uppercase tracking-widest text-cyan-300">
              {item.meta}
            </div>
            <h2 className="mt-2 text-lg font-black text-white">{item.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">{item.description}</p>
          </a>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-800 bg-[#050b18] p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3 mb-5">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-amber-300">
              Domain Architecture
            </div>
            <h2 className="mt-1 text-xl font-black text-white">Die fünf CAPITAL-AI Domains</h2>
          </div>
          <Boxes className="w-6 h-6 text-cyan-300" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
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
