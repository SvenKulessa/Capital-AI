import React from 'react';
import { motion } from 'motion/react';
import { useLocale } from '../../i18n/LocaleProvider';
import {
  ArrowRight,
  BarChart3,
  Database,
  FileText,
  Image as ImageIcon,
  Layers3,
  Link2,
  Mic2,
  Share2,
  ShieldCheck,
  Sparkles,
  Video,
  Workflow,
} from 'lucide-react';
import {
  planContentCampaign,
  type ContentEngineModuleId,
  type ContentEngineModulePlan,
} from '../../contracts/contentEngine';
import { CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007 } from '../../data/contentCampaigns';

const campaign = CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007;
const plan = planContentCampaign(campaign.brief);

const MODULE_LABELS: Record<ContentEngineModuleId, string> = {
  COPY: 'Copy',
  URL_CONTEXT: 'URL Context',
  IMAGE: 'Image',
  TTS: 'TTS',
  VIDEO: 'Video',
  DISCOVERY: 'Discovery',
  ENRICHMENT: 'Enrichment',
  ATTRIBUTION: 'Attribution',
  PUBLISHER: 'Social Adapter',
};

const STATUS_META: Record<
  ContentEngineModulePlan['state'],
  { label: string; className: string }
> = {
  READY_FOR_DRAFT: {
    label: 'Entwurf bereit',
    className: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-200',
  },
  RESTRICTED: {
    label: 'Begrenzt',
    className: 'border-amber-400/30 bg-amber-400/10 text-amber-200',
  },
  BLOCKED: {
    label: 'Blockiert',
    className: 'border-rose-400/30 bg-rose-400/10 text-rose-200',
  },
  INTEGRATION_PENDING: {
    label: 'Integration folgt',
    className: 'border-violet-400/30 bg-violet-400/10 text-violet-200',
  },
};

function ModuleIcon({ module }: { module: ContentEngineModuleId }) {
  const className = 'h-4 w-4';
  switch (module) {
    case 'COPY':
      return <FileText className={className} />;
    case 'URL_CONTEXT':
      return <Link2 className={className} />;
    case 'IMAGE':
      return <ImageIcon className={className} />;
    case 'TTS':
      return <Mic2 className={className} />;
    case 'VIDEO':
      return <Video className={className} />;
    case 'DISCOVERY':
      return <Database className={className} />;
    case 'ENRICHMENT':
      return <Layers3 className={className} />;
    case 'ATTRIBUTION':
      return <BarChart3 className={className} />;
    case 'PUBLISHER':
      return <Share2 className={className} />;
  }
}

type ContentEngineConceptProps = {
  onNavigate: (path: string) => void;
};

export const ContentEngineConcept: React.FC<ContentEngineConceptProps> = ({
  onNavigate,
}) => {
  const { t } = useLocale();
  return (
    <section
      id="content-engine-concept"
      aria-labelledby="content-engine-heading"
      className="relative px-3 sm:px-5 py-8 sm:py-12 overflow-hidden"
    >
      <div className="absolute inset-x-0 top-12 h-64 bg-[radial-gradient(circle_at_center,rgba(141,38,255,0.10),transparent_68%)] pointer-events-none" />

      <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#071023]/95 via-[#07101d]/95 to-[#10091b]/95 shadow-[0_28px_90px_rgba(0,0,0,0.34)]">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(245,176,20,0.055),transparent_34%,rgba(141,38,255,0.075))] pointer-events-none" />

        <div className="relative p-5 sm:p-7 lg:p-9">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-200">
              <Sparkles className="h-3.5 w-3.5" />
              CAPITAL-AI Content Engine
            </div>

            <h2
              id="content-engine-heading"
              className="text-2xl sm:text-3xl lg:text-[38px] font-extrabold tracking-tight text-white leading-tight"
            >
              {t('contentTitle')}
              <span className="text-[#F5B014]">{t('contentHighlight')}</span>
            </h2>

            <p className="mt-3 max-w-2xl text-sm sm:text-base leading-relaxed text-slate-300">
              {t('contentDescription')}
            </p>
          </div>

          <div className="mt-7 grid gap-4 lg:grid-cols-[0.82fr_1.5fr]">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45 }}
              className="rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5"
            >
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.14em] text-slate-400">
                <Database className="h-4 w-4 text-amber-300" />
                {t('contentSources')}
              </div>

              <div className="mt-4 space-y-2.5">
                {[
                  ['Produkt & Roadmap', 'Repository-gebundene Fakten'],
                  ['Canonical URL', 'Öffentliche CAPITAL-AI Quelle'],
                  ['Claims & Evidence', 'Belegbare Aussagen statt Blackbox'],
                  ['Campaign Brief', 'Ziel, Zielgruppe, Kanäle, Outputs'],
                ].map(([title, detail]) => (
                  <div
                    key={title}
                    className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.025] px-3 py-2.5"
                  >
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                    <div>
                      <p className="text-xs font-semibold text-slate-100">{title}</p>
                      <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                        {detail}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl border border-violet-400/20 bg-violet-400/[0.06] p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-200">
                  {t('contentCampaign')}
                </p>
                <p className="mt-1 text-sm font-bold text-white">{campaign.name}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-slate-400">
                  Scoring first · BYOK · Evidence & Replay · Scale on demand
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-80px' }}
              transition={{ duration: 0.45, delay: 0.08 }}
              className="rounded-2xl border border-white/10 bg-[#07101d]/75 p-4 sm:p-5"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Workflow className="h-4 w-4 text-[#F5B014]" />
                  <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-300">
                    CAPITAL_AI_CONTENT_ENGINE@1
                  </p>
                </div>
                <span className="inline-flex w-fit items-center rounded-full border border-rose-400/25 bg-rose-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-rose-200">
                  {t('contentPublish')}
                </span>
              </div>

              <div className="mt-4 grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {plan.modules.map((modulePlan, index) => {
                  const meta = STATUS_META[modulePlan.state];
                  return (
                    <motion.div
                      key={modulePlan.module}
                      initial={{ opacity: 0, scale: 0.98 }}
                      whileInView={{ opacity: 1, scale: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.3, delay: index * 0.035 }}
                      className="group rounded-xl border border-white/[0.08] bg-white/[0.025] p-3 transition-colors hover:bg-white/[0.045]"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-slate-100">
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/20 text-amber-200">
                            <ModuleIcon module={modulePlan.module} />
                          </span>
                          <span className="text-xs font-bold">
                            {MODULE_LABELS[modulePlan.module]}
                          </span>
                        </div>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.08em] ${meta.className}`}
                        >
                          {meta.label}
                        </span>
                      </div>
                      <p className="mt-2 line-clamp-2 text-[10.5px] leading-relaxed text-slate-500">
                        {modulePlan.module === 'PUBLISHER'
                          ? 'Übergabe an die Social Media Engine nach deren Cutover.'
                          : modulePlan.reason}
                      </p>
                    </motion.div>
                  );
                })}
              </div>

              <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/15 bg-amber-400/[0.045] px-3 py-2.5">
                <ArrowRight className="h-4 w-4 shrink-0 text-amber-300" />
                <p className="text-[11px] leading-relaxed text-slate-300">
                  Ein Campaign Brief wählt nur die Module aus, die für den gewünschten Output
                  nötig sind. Provider-, Rechte- und Publication-Regeln bleiben in den
                  bestehenden Contracts.
                </p>
              </div>
            </motion.div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Kampagnen-Ausgabe
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {campaign.brief.channels.map((channel) => (
                    <span
                      key={channel}
                      className="rounded-full border border-slate-700/80 bg-slate-900/75 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-slate-200"
                    >
                      {channel}
                    </span>
                  ))}
                  <span className="rounded-full border border-violet-400/30 bg-violet-400/10 px-3 py-1.5 text-[10px] font-semibold tracking-wide text-violet-200">
                    Social Media Engine → später
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:min-w-[320px]">
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-white">{plan.modules.length}</p>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500">Module</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-white">{campaign.brief.channels.length}</p>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500">Kanäle</p>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5 text-center">
                  <p className="text-lg font-black text-amber-300">DRAFT</p>
                  <p className="text-[9px] uppercase tracking-[0.12em] text-slate-500">Status</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => onNavigate('/architecture')}
              className="group inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#F5B014] px-4 py-2.5 text-xs font-bold text-black transition hover:bg-[#ffbe26] active:scale-[0.98]"
            >
              Architektur ansehen
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate('/pipeline-builder')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/[0.035] px-4 py-2.5 text-xs font-bold text-slate-200 transition hover:bg-white/[0.07] active:scale-[0.98]"
            >
              <Workflow className="h-4 w-4 text-violet-300" />
              Pipeline Builder öffnen
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};
