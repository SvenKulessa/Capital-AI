import React from 'react';
import { useLocale } from '../../i18n/LocaleProvider';
import {
  FIRST_X_PILOT_PLAN,
  FIRST_X_PILOT_STATE,
  FIRST_X_PILOT_TEXT,
  GROWTH_SOCIAL_PROCESS_STAGES,
  GROWTH_CONTENT_ADAPTERS,
  GROWTH_X_TEST_BUDGET,
} from '../../data/growthMarketingPilot';

const evidenceRoot = 'https://github.com/SvenKulessa/Capital-AI/blob/main/';
const STATUS_STYLES = {
  REPO_IMPLEMENTED: 'border-emerald-400/25 bg-emerald-400/5 text-emerald-200',
  REVIEW_REQUIRED: 'border-amber-400/35 bg-amber-400/5 text-amber-200',
  NOT_PROVEN: 'border-slate-500/45 bg-slate-600/10 text-slate-200',
} as const;

/** Public, accessible and dated code-evidence projection; never live X telemetry. */
export const SocialContentEngineStatus: React.FC = () => {
  const { locale } = useLocale();
  const de = String(locale).startsWith('de');
  return (
    <section aria-labelledby="social-content-engine-status" className="mt-5 space-y-4 rounded-2xl border border-white/15 bg-slate-950/75 p-4 text-slate-100 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 id="social-content-engine-status" className="text-base font-bold text-white">
            {de ? 'Content + Social Engine · erster X-Pilot' : 'Content + Social Engine · first X pilot'}
          </h3>
          <p className="mt-1 max-w-3xl text-xs leading-relaxed text-slate-300">
            {de
              ? 'Quelle → Entwurf → Rechteprüfung → Vorschau → Budget → Owner-OAuth → Evidence. Dieser Stand ist eine dokumentierte Code-Projektion, kein Echtzeit-Provider-Monitor.'
              : 'Source → draft → rights review → preview → budget → owner OAuth → evidence. This is a documented code snapshot, not a live provider monitor.'}
          </p>
        </div>
        <span className="shrink-0 rounded-lg border border-amber-400/25 bg-amber-400/5 px-3 py-1.5 text-[11px] font-semibold text-amber-100">
          {de ? 'Quellstand' : 'Source snapshot'} · 14.10.2026
        </span>
      </div>

      <div className="rounded-xl border border-amber-400/20 bg-gradient-to-br from-[#171221] to-[#090e1a] p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-amber-400/35 px-2 py-0.5 text-[10px] font-bold text-amber-200">X · {FIRST_X_PILOT_STATE.status}</span>
          <span className="rounded border border-white/20 px-2 py-0.5 text-[10px] font-semibold text-slate-200">{FIRST_X_PILOT_STATE.review}</span>
          <span className="text-[11px] text-slate-400">{FIRST_X_PILOT_STATE.targetHandle}</span>
        </div>
        <h4 className="mt-2 text-sm font-semibold text-white">{FIRST_X_PILOT_STATE.articleTitle}</h4>
        <p className="mt-2 max-w-4xl text-xs leading-relaxed text-slate-300" lang="de">{FIRST_X_PILOT_TEXT}</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-slate-200">
            {de ? 'Content-Plan' : 'Content plan'}: {FIRST_X_PILOT_PLAN.modules.length} {de ? 'Module' : 'modules'}
            {' · '}{de ? 'Artikel-Readback' : 'article readback'}: {FIRST_X_PILOT_STATE.published}
          </span>
          <a className="inline-flex min-h-11 items-center font-semibold text-amber-300 underline underline-offset-4 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
            href={FIRST_X_PILOT_STATE.targetUrl}>
            {de ? 'Learning Portal besuchen' : 'Visit Learning Portal'}
            <span aria-hidden="true" className="ml-1">↗</span>
          </a>
        </div>
      </div>

      <section aria-labelledby="growth-content-source-adapters" className="rounded-xl border border-violet-400/20 bg-[#0a1224] p-4">
        <h4 id="growth-content-source-adapters" className="text-sm font-bold text-white">
          {de ? 'Eine Engine, mehrere Quellen und Ausgabekanäle' : 'One engine, multiple sources and destinations'}
        </h4>
        <p className="mt-1 text-xs leading-relaxed text-slate-300">
          {de
            ? 'X ist URL Context für einen konkret angegebenen Beitrag und separat Ausgabekanal. PR-Blogs, Social Studio, YouTube und Gemini-TTS nutzen vorhandene Contracts und behalten ihre jeweiligen Freigabegrenzen.'
            : 'X is URL context for one explicit post and, separately, a distribution channel. PR blogs, social studio, YouTube and Gemini TTS reuse existing contracts with separate approval boundaries.'}
        </p>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {GROWTH_CONTENT_ADAPTERS.map(adapter => (
            <li key={adapter.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h5 className="text-xs font-semibold text-white">{de ? adapter.titleDe : adapter.titleEn}</h5>
                <span className={`rounded border px-2 py-0.5 text-[9px] font-semibold ${STATUS_STYLES[adapter.status]}`}>
                  {adapter.status}
                </span>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-slate-300">
                {de ? adapter.detailDe : adapter.detailEn}
              </p>
              <a className="mt-2 inline-flex min-h-11 items-center text-xs text-amber-300 underline underline-offset-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
                href={evidenceRoot + adapter.evidencePath} target="_blank" rel="noopener noreferrer">
                {de ? 'Implementierung prüfen' : 'Inspect implementation'} <span className="ml-1" aria-hidden="true">↗</span>
              </a>
            </li>
          ))}
        </ol>
        <a href="/api/social-media/x/url-context"
          className="mt-3 inline-flex min-h-11 items-center rounded-lg border border-amber-400/40 px-4 py-2 text-xs font-bold text-amber-200 hover:bg-amber-400/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
          {de ? 'X-URL-Context testen · Owner-Login erforderlich' : 'Try X URL context · Owner login required'}
        </a>
      </section>

      <div aria-label={de ? 'Technische Prozesskette der Social Content Engine' : 'Social Content Engine processing steps'}>
        <h4 className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-300">
          {de ? 'Technischer Ablauf · Evidence statt erfundener Erfolgsquoten' : 'Technical workflow · evidence instead of unsupported claims'}
        </h4>
        <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {GROWTH_SOCIAL_PROCESS_STAGES.map((stage, index) => (
            <li key={stage.id} className="relative rounded-xl border border-white/10 bg-[#081326] p-3">
              <div className="flex items-start justify-between gap-2">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-amber-400/35 bg-amber-400/10 font-mono text-xs font-bold text-amber-200">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className={`rounded border px-2 py-0.5 text-[9px] font-bold tracking-wide ${STATUS_STYLES[stage.status]}`}>
                  {stage.status}
                </span>
              </div>
              <h5 className="mt-3 text-xs font-bold text-white">{de ? stage.titleDe : stage.titleEn}</h5>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{de ? stage.detailDe : stage.detailEn}</p>
              <a href={evidenceRoot + stage.evidencePath} target="_blank" rel="noopener noreferrer"
                className="mt-3 inline-flex min-h-11 items-center text-[11px] font-semibold text-amber-300 underline underline-offset-4 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
                {de ? 'Quellnachweis' : 'Source evidence'} <span aria-hidden="true" className="ml-1">↗</span>
              </a>
              {index < GROWTH_SOCIAL_PROCESS_STAGES.length - 1 && (
                <span className="pointer-events-none absolute -right-2 top-1/2 z-10 hidden text-amber-300 lg:block" aria-hidden="true">›</span>
              )}
            </li>
          ))}
        </ol>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-white/10 p-3">
          <h4 className="text-xs font-bold text-white">{de ? 'X-Pilotbudget' : 'X pilot budget'}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {de ? 'Vom Owner genannt' : 'Owner-reported'}: ${GROWTH_X_TEST_BUDGET.ownerReportedCreditUsd}.
            {' '}{de ? 'Vorgeschlagene interne Testzuordnung' : 'Proposed internal test allocation'}: ${GROWTH_X_TEST_BUDGET.proposedPilotAllocationUsd}.
          </p>
          <p className="mt-2 text-[11px] text-amber-200">
            {de ? 'Echtes Guthaben, Ausgabenlimit und API-Kosten: NOT_PROVEN' : 'Actual credit, spending cap and API costs: NOT_PROVEN'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <h4 className="text-xs font-bold text-white">{de ? 'OAuth & Datenschutz' : 'OAuth & privacy'}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {de
              ? 'X-Token bleiben serverseitig verschlüsselt. Nur ein bestätigter Owner kann den einmaligen Artikeltest starten; kein Follow-/Reply-Bot.'
              : 'X tokens stay encrypted server-side. Only a verified owner can initiate the one-shot article test; no follow/reply bot.'}
          </p>
        </div>
        <div className="rounded-xl border border-white/10 p-3">
          <h4 className="text-xs font-bold text-white">{de ? 'Weitere Provider & Analytics' : 'Other providers & analytics'}</h4>
          <p className="mt-1 text-xs leading-relaxed text-slate-300">
            {de
              ? 'YouTube: gesonderter privater Test. GA4/GSC: read-only Code; echte Kontorechte und Conversion-Readbacks separat nachweisen.'
              : 'YouTube: separate private test. GA4/GSC: read-only code; verify real account rights and conversion readback separately.'}
          </p>
        </div>
      </div>

      <p className="text-xs leading-relaxed text-slate-300">
        {de
          ? 'Ausstehend: verifizierter X-Artikel-Post, wiederverwendbarer Scheduler, zugelassene Discovery und Conversion-Messung. Eine Codefreigabe oder ein OAuth-Konto bestätigt weder Veröffentlichung noch Reichweite.'
          : 'Pending: verified X article post, reusable scheduler, approved discovery and conversion measurement. Code or OAuth authorization does not prove publication or reach.'}
      </p>
    </section>
  );
};
