import React from 'react';
import {
  createSolo2Profile, validateSolo2Profile, solo2ConfigReadiness,
  SOLO2_DOMAINS, SOLO2_MODES, SOLO2_RESOURCES, SOLO2_SKILLS,
} from '../../shared/solo2-config.mjs';

/**
 * Owner-only catalog child. Profile is an untrusted local draft, not saved to
 * server/localStorage, not passed to any executor, and never contains secrets.
 */
export function Solo2RuntimeConfigurator({
  sourceSha, freshness,
}: {
  sourceSha: string;
  freshness: 'LIVE' | 'CACHED' | 'STALE';
}) {
  const [profile, setProfile] = React.useState(() => createSolo2Profile(sourceSha));
  const [notice, setNotice] = React.useState('');
  React.useEffect(() => {
    setProfile(createSolo2Profile(sourceSha));
    setNotice('');
  }, [sourceSha]);
  const change = (update: (draft: ReturnType<typeof createSolo2Profile>) => void) => {
    try {
      const next = JSON.parse(JSON.stringify(profile)) as ReturnType<typeof createSolo2Profile>;
      update(next);
      setProfile(validateSolo2Profile(next));
      setNotice('');
    } catch {
      setNotice('BLOCKED: Konfigurationsfeld verletzt den sicheren Vertrag');
    }
  };
  const readiness = solo2ConfigReadiness(profile);
  const exportProfile = () => {
    if (freshness === 'STALE' || profile.sourceSha !== sourceSha) {
      setNotice('REVALIDATE: Quellstand veraltet');
      return;
    }
    const data = JSON.stringify(validateSolo2Profile(profile), null, 2) + '\n';
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'capital-ai-solo2-' + profile.sourceSha.slice(0, 12) + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setNotice('Konfigurationsentwurf lokal exportiert – keine Aktivierung oder Server-Speicherung');
  };

  return (
    <section aria-labelledby="solo2-config-title" data-solo2-config="local-draft"
      className="rounded-2xl border border-cyan-400/30 bg-slate-950/80 p-4 sm:p-5 space-y-4">
      <header className="space-y-2">
        <p className="font-mono text-xs uppercase tracking-wider text-cyan-300">Owner · SOLO2 Runtime Profile @1</p>
        <h4 id="solo2-config-title" className="text-lg font-bold text-white">
          Offline-Root-Agent und Online-Loop konfigurieren
        </h4>
        <p className="text-sm text-slate-300">
          Dieselben deklarativen Variablen wie im CLI. Die Auswahl fordert Fähigkeiten an,
          vergibt aber weder Providerrechte noch Lizenzen oder Ausführungsautorität.
          Keine Tokens, API-Keys, Webhook-Adressen oder Kundengeheimnisse eingeben.
        </p>
      </header>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm text-slate-100">
          <span>Loop-Betriebsmodus</span>
          <select aria-label="Loop-Betriebsmodus" value={profile.mode}
            onChange={event => change(draft => { draft.mode = event.target.value; })}
            className="min-h-11 w-full rounded-lg border border-slate-500 bg-slate-900 p-2">
            {SOLO2_MODES.map(mode => <option key={mode} value={mode}>{mode}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm text-slate-100">
          <span>Mandantenkennung (nur Entwurf)</span>
          <input aria-label="Mandantenkennung" value={profile.tenantRef} maxLength={96}
            onChange={event => change(draft => { draft.tenantRef = event.target.value; })}
            className="min-h-11 w-full rounded-lg border border-slate-500 bg-slate-900 p-2" />
        </label>
      </div>
      <fieldset className="rounded-lg border border-slate-700 p-3">
        <legend className="px-1 text-sm font-semibold text-white">Domains</legend>
        <div className="flex flex-wrap gap-3">
          {SOLO2_DOMAINS.map(domain => (
            <label key={domain} className="flex min-h-11 items-center gap-2 text-xs text-slate-200">
              <input type="checkbox" checked={profile.domains.includes(domain)}
                disabled={domain === 'TRUST'}
                onChange={event => change(draft => {
                  draft.domains = event.target.checked
                    ? [...draft.domains, domain] : draft.domains.filter(id => id !== domain);
                })} />
              {domain}
            </label>
          ))}
        </div>
      </fieldset>
      <details className="rounded-lg border border-slate-700 p-3">
        <summary className="cursor-pointer min-h-11 text-sm font-semibold text-white">
          Skill-Routing · {profile.skills.length}/{SOLO2_SKILLS.length}
        </summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {SOLO2_SKILLS.map(skill => (
            <label key={skill} className="flex min-h-11 items-center gap-2 text-xs text-slate-200">
              <input type="checkbox" checked={profile.skills.includes(skill)}
                onChange={event => change(draft => {
                  draft.skills = event.target.checked
                    ? [...draft.skills, skill] : draft.skills.filter(id => id !== skill);
                })}/>
              {skill}
            </label>
          ))}
        </div>
      </details>
      <details className="rounded-lg border border-slate-700 p-3">
        <summary className="cursor-pointer min-h-11 text-sm font-semibold text-white">
          Ressourcen, Plugins, Engines und Lizenznachweise
        </summary>
        <p className="mt-1 text-xs text-amber-200">
          n8n ist nur als interner Kandidat vorgesehen; TinyFish als Browser-Adapter-Kandidat.
          Social/Media/CADS bleiben DRAFT_ONLY. Kundenressourcen niemals automatisch verbinden.
        </p>
        <div className="mt-3 space-y-3">
          {SOLO2_RESOURCES.map(spec => {
            const item = profile.resources.find(r => r.id === spec.id)!;
            return <fieldset key={item.id} className="rounded-lg border border-slate-700 bg-slate-900/70 p-3">
              <legend className="px-1 text-xs font-bold text-white">{item.id} · {item.kind}</legend>
              <label className="flex min-h-11 items-center gap-2 text-xs text-slate-200">
                <input type="checkbox" checked={item.selected} onChange={event => change(draft => {
                  draft.resources.find(r => r.id === item.id)!.selected = event.target.checked;
                })}/>
                In Konfigurationsentwurf aufnehmen
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label className="text-xs text-slate-300">
                  Quelle
                  <select aria-label={item.id + ' Quelle'} value={item.owner} onChange={event => change(draft => {
                    draft.resources.find(r => r.id === item.id)!.owner = event.target.value;
                  })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">
                    <option value="PROJECT_OPERATOR">Projektbetreiber</option>
                    <option value="CUSTOMER_RESOURCE">Kundenressource</option>
                  </select>
                </label>
                <label className="text-xs text-slate-300">
                  Gewünschtes Recht (keine Freigabe)
                  <select aria-label={item.id + ' Ausführungsrecht'} value={item.requestedRight}
                    onChange={event => change(draft => {
                      draft.resources.find(r => r.id === item.id)!.requestedRight = event.target.value;
                    })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">
                    <option value="NONE">Kein Recht</option>
                    <option value="READ_REQUESTED">Read-only anfragen</option>
                    <option value="EXECUTE_REQUESTED">Ausführung anfragen</option>
                  </select>
                </label>
                <label className="text-xs text-slate-300">
                  Lizenz-Evidence
                  <select aria-label={item.id + ' Lizenzstatus'} value={item.licenseEvidence}
                    onChange={event => change(draft => {
                      draft.resources.find(r => r.id === item.id)!.licenseEvidence = event.target.value;
                    })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">
                    <option value="NOT_PROVEN">NOT_PROVEN</option>
                    <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                  </select>
                </label>
                <label className="text-xs text-slate-300">
                  Providerrechte
                  <select aria-label={item.id + ' Rechtestatus'} value={item.rightsEvidence}
                    onChange={event => change(draft => {
                      draft.resources.find(r => r.id === item.id)!.rightsEvidence = event.target.value;
                    })} className="mt-1 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2">
                    <option value="NOT_PROVEN">NOT_PROVEN</option>
                    <option value="REVIEW_REQUIRED">REVIEW_REQUIRED</option>
                  </select>
                </label>
              </div>
            </fieldset>;
          })}
        </div>
      </details>
      <div className="rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-xs text-slate-300">
        <p>Profil: <code>{profile.schema}</code></p>
        <p>Readiness: <strong>{readiness.state}</strong></p>
        <p>Offline: {readiness.offline} · Online: {readiness.online}</p>
        <p>Root: {profile.offline.rootAgent} · 30s Minimum-Polling · Budget 0 EUR</p>
        <p>Ausführung: {profile.safeguard.execution} · Publikation: BLOCKED</p>
        <p>Source: {sourceSha.slice(0, 12)} · {freshness}</p>
      </div>
      <button type="button" onClick={exportProfile} disabled={freshness === 'STALE'}
        className="min-h-11 rounded-lg border border-cyan-400/60 px-4 py-2 text-sm font-semibold text-cyan-200 disabled:opacity-50">
        JSON für CLI exportieren
      </button>
      {notice && <p role="status" className="text-xs text-amber-200">{notice}</p>}
      <p className="text-xs text-slate-400">
        Der Download ist ein lokales Konfigurationsdokument. Import und Änderungen über
        <code> scripts/solo2-config.mjs</code> führen keine Agenten- oder Provideraktion aus.
      </p>
    </section>
  );
}
