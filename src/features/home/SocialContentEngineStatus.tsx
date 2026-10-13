import React from 'react';
import { useLocale } from '../../i18n/LocaleProvider';

const evidenceRoot = 'https://github.com/SvenKulessa/Capital-AI/blob/4d1ae5e48de000804b826635954f4f496a365d23/';

/** Dated public code/evidence snapshot. Never represented as live provider telemetry. */
export const SocialContentEngineStatus: React.FC = () => {
  const { locale } = useLocale();
  const de = String(locale).startsWith('de');
  const items = de ? [
    { name: 'PR-Merge → Content-Entwurf', state: 'REPO_IMPLEMENTED', description: 'Quellgebundene Merge-Entwürfe, Domain-/Skill-Routing und Plattformvarianten. Laufzeit nach Merge separat prüfen.', path: '.github/workflows/merge-milestones.yml' },
    { name: 'YouTube OAuth und privater Test', state: 'PRIVATE_TEST_EVIDENCE', description: 'Privater Upload und Kanal-Readback in getrennten Tests nachgewiesen. Kein autonomer Publisher.', path: 'server/social-media/youtube-private-upload.mjs' },
    { name: 'Google OAuth-Prüfung', state: 'IN_PROGRESS', description: 'Branding laut Owner-Nachweis geprüft, Datenzugriff weiterhin in Prüfung. Keine bestätigte Google-Scope-Freigabe.', path: 'server/social-media/youtube-oauth-exchange.mjs' },
    { name: 'GA4 / Search Console', state: 'READONLY_CODE', description: 'GitHub-OIDC/WIF mit 900-s-Token und lesenden Scopes implementiert. Live-IAM- und Propertyrechte nicht nachgewiesen.', path: '.github/workflows/google-readback.yml' },
    { name: 'Öffentliche Social-Verteilung', state: 'BLOCKED', description: 'Publisher standardmäßig deaktiviert. Rechte, Zielgruppen, Workload-Identität und Providerfreigabe noch nicht vollständig belegt.', path: 'src/contracts/socialPublisherAdapter.ts' },
  ] : [
    { name: 'PR merge → content draft', state: 'REPO_IMPLEMENTED', description: 'Source-linked merge drafts, domain/skill routing and platform variations. Post-merge execution needs separate verification.', path: '.github/workflows/merge-milestones.yml' },
    { name: 'YouTube OAuth and private test', state: 'PRIVATE_TEST_EVIDENCE', description: 'Private upload and channel readback demonstrated in separate sessions. Not autonomous publishing.', path: 'server/social-media/youtube-private-upload.mjs' },
    { name: 'Google OAuth review', state: 'IN_PROGRESS', description: 'Branding verified in owner evidence; data-access review pending. No verified Google scope approval.', path: 'server/social-media/youtube-oauth-exchange.mjs' },
    { name: 'GA4 / Search Console', state: 'READONLY_CODE', description: 'GitHub OIDC/WIF with 900-second tokens and read-only scopes. Live IAM/property rights not proven.', path: '.github/workflows/google-readback.yml' },
    { name: 'Public social delivery', state: 'BLOCKED', description: 'Publisher disabled by default. Rights, audiences, workload identity and provider approval still unproven.', path: 'src/contracts/socialPublisherAdapter.ts' },
  ];
  return (
    <section aria-labelledby="social-content-engine-status" className="mt-5 rounded-2xl border border-white/15 bg-slate-950/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="social-content-engine-status" className="text-base font-bold text-white">
          {de ? 'Social Content Engine · Entwicklungsstand' : 'Social Content Engine · Development status'}
        </h3>
        <span className="text-xs font-medium text-slate-300">{de ? 'Stand' : 'Snapshot'}: 13.10.2026</span>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-slate-300">
        {de ? 'Code, Tests und Providerfreigaben sind getrennte Nachweise. Diese Ansicht zeigt den dokumentierten Entwicklungsstand, keine Live-Telemetrie.' : 'Code, tests and provider approval are separate evidence. This shows a documented development snapshot, not live provider telemetry.'}
      </p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {items.map(item => (
          <li key={item.name} className="min-w-0 rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <h4 className="text-xs font-semibold text-white">{item.name}</h4>
              <span className="rounded border border-slate-500/60 px-2 py-0.5 text-[10px] font-semibold text-slate-200">{item.state}</span>
            </div>
            <p className="mt-2 text-xs leading-relaxed text-slate-300">{item.description}</p>
            <a href={evidenceRoot + item.path} target="_blank" rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-11 items-center text-xs font-semibold text-amber-300 underline underline-offset-4 hover:text-amber-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300">
              {de ? 'Code-Evidence ansehen' : 'View code evidence'} <span aria-hidden="true" className="ml-1">↗</span>
            </a>
          </li>
        ))}
      </ol>
      <p className="mt-4 text-xs font-semibold text-amber-200">
        {de ? 'Nächste Stufe: Quellen und Claims prüfen → freigegebene Zielgruppen → private Ausgabe → gesonderte Providerfreigabe → Consent-konforme Conversion-Messung.' : 'Next: review sources and claims → authorized audiences → private output → separate provider approval → consent-aware conversion measurement.'}
      </p>
    </section>
  );
};
