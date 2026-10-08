import React from 'react';
import {
  BarChart3,
  CheckCircle2,
  FileCheck2,
  Layers3,
  Radio,
  Share2,
  ShieldCheck,
  Workflow,
} from 'lucide-react';

import {
  CONTENT_ENGINE_CONTRACT_VERSION,
  planContentCampaign,
} from '../../contracts/contentEngine.ts';
import { CONTENT_SOCIAL_PACKAGE_VERSION } from '../../contracts/contentSocialPackage.ts';
import {
  CONTENT_SOCIAL_PUBLISHER_ADAPTER_VERSION,
  CURRENT_SOCIAL_PUBLISHER_ADAPTERS,
} from '../../contracts/socialPublisherAdapter.ts';
import { CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007 } from '../../data/contentCampaigns.ts';

const campaign = CAPITAL_AI_SCORE_BUILDER_CAMPAIGN_20261007;
const plan = planContentCampaign(campaign.brief);

const stateLabel = {
  READY_FOR_DRAFT: 'Entwurf bereit',
  RESTRICTED: 'Begrenzt',
  BLOCKED: 'Blockiert',
  INTEGRATION_PENDING: 'Integration folgt',
} as const;

export const ContentStudioPanel: React.FC = () => {
  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-violet-400/20 bg-gradient-to-br from-violet-500/10 via-[#0b1020] to-amber-500/5 p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200">
              <Workflow className="h-4 w-4" />
              Content Studio · Contract Binding
            </div>
            <h2 className="mt-2 text-xl sm:text-2xl font-bold text-white">
              Content Engine, Review und Social Delivery auf einer Identität
            </h2>
            <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-300">
              Das Studio visualisiert die bestehenden Content-Engine- und Growth-Contracts.
              Es erzeugt keine eigene Provider- oder Publishing-Authority. Öffentliche
              Veröffentlichung bleibt an einen hashgebundenen Approval-Ref und einen
              tatsächlich portierten Social-Publisher gebunden.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[10px] sm:min-w-[330px]">
            {[
              ['Engine', CONTENT_ENGINE_CONTRACT_VERSION],
              ['Package', CONTENT_SOCIAL_PACKAGE_VERSION],
              ['Publisher', CONTENT_SOCIAL_PUBLISHER_ADAPTER_VERSION],
              ['Publish', 'FAIL-CLOSED'],
            ].map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-black/20 p-3">
                <div className="uppercase tracking-[0.12em] text-slate-500">{label}</div>
                <div className="mt-1 break-all font-mono text-slate-200">{value}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <section className="rounded-2xl border border-white/10 bg-[#080d1c] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-amber-300" />
            <h3 className="text-sm font-bold text-white">Campaign Identity</h3>
          </div>

          <dl className="mt-4 space-y-3 text-xs">
            <div>
              <dt className="text-slate-500">Kampagne</dt>
              <dd className="mt-0.5 font-semibold text-slate-100">{campaign.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Campaign-ID</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-300">
                {campaign.brief.campaignId}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Source-SHA</dt>
              <dd className="mt-0.5 break-all font-mono text-slate-300">
                {campaign.brief.sourceSha}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">Canonical</dt>
              <dd className="mt-0.5 break-all text-slate-300">
                {campaign.brief.canonicalUrl}
              </dd>
            </div>
          </dl>

          <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-3">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
              <p className="text-[11px] leading-relaxed text-slate-300">
                Freigaben werden später an die exakten Asset-Bytes über
                <code className="mx-1 text-emerald-200">assetSha256</code>
                und
                <code className="mx-1 text-emerald-200">approvalRef</code>
                gebunden.
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#080d1c] p-4 sm:p-5">
          <div className="flex items-center gap-2">
            <Layers3 className="h-4 w-4 text-violet-300" />
            <h3 className="text-sm font-bold text-white">Content Engine Module</h3>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {plan.modules.map((module) => (
              <div
                key={module.module}
                className="rounded-xl border border-white/[0.08] bg-white/[0.025] px-3 py-2.5"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-100">{module.module}</span>
                  <span className="text-[9px] font-bold uppercase tracking-[0.08em] text-slate-400">
                    {stateLabel[module.state]}
                  </span>
                </div>
                <p className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-slate-500">
                  {module.reason}
                </p>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="rounded-2xl border border-white/10 bg-[#080d1c] p-4 sm:p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-bold text-white">Social Publisher Adapter</h3>
          </div>
          <div className="inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-400/25 bg-rose-400/[0.07] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.1em] text-rose-200">
            <Radio className="h-3 w-3" />
            Public Publish gesperrt
          </div>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {Object.entries(CURRENT_SOCIAL_PUBLISHER_ADAPTERS).map(([channel, state]) => (
            <div
              key={channel}
              className="rounded-xl border border-white/[0.08] bg-white/[0.025] p-3"
            >
              <div className="text-xs font-bold text-slate-100">{channel}</div>
              <div className="mt-1 text-[9px] font-bold uppercase tracking-[0.08em] text-amber-300">
                {state === 'READY' ? 'Ready' : 'Integration folgt'}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <CheckCircle2 className="h-4 w-4 text-emerald-300" />
            <p className="mt-2 text-xs font-semibold text-white">1 · Review</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Konkrete Asset-Bytes, Claims, Rechte und Kanäle werden geprüft.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <Share2 className="h-4 w-4 text-violet-300" />
            <p className="mt-2 text-xs font-semibold text-white">2 · Delivery</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Nur READY-Adapter erhalten einen hashgebundenen Publisher-Handoff.
            </p>
          </div>
          <div className="rounded-xl border border-white/[0.08] bg-black/20 p-3">
            <BarChart3 className="h-4 w-4 text-amber-300" />
            <p className="mt-2 text-xs font-semibold text-white">3 · Attribution</p>
            <p className="mt-1 text-[10px] leading-relaxed text-slate-500">
              Provider-Delivery-ID wird auf Campaign-ID und Content-ID zurückgeführt.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
