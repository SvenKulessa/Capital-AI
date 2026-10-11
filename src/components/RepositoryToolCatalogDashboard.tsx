import React from 'react';

type Domain = 'PRODUCT' | 'MARKET' | 'PLATFORM' | 'TRUST' | 'GROWTH';
type Freshness = 'LIVE' | 'CACHED' | 'STALE';
type CatalogEntry = {
  id: string;
  name: string;
  kind: string;
  path: string;
  application: string;
  version: string | null;
  versionBasis: string;
  domain: Domain;
  digest: string | null;
  revisionSha?: string | null;
  sourceBlobSha?: string | null;
  integrity?: string | null;
  inventoryVersion?: string | null;
  inventoryVersionBasis?: string | null;
  license?: { declared: string | null; source: string | null; commercial: string; redistribution: string; approval: string };
  commercialServiceRights?: string;
  priceModel?: string;
  freeTier?: string;
  paidTier?: string;
  dailyQuota?: number | null;
  use?: {
    state: string; actualCallsPerDay: number | null; actualCallsEvidence: string;
    scheduledRunsPerDay: number | null; scheduledCrons: string[]; measurementWindow: string | null;
  };
  alternatives?: { name: string; role: string; licenseDeclared: string }[];
  alternativesBasis?: string;
};
type UpdateFinding = {
  id: string; name: string; kind: string; installed: string | null; state: string;
  version?: string; latestVersion?: string | null; latestLicenseDeclared?: string | null;
  checkedVersion?: string; sha?: string; integrity?: string; source?: string; reason?: string; evidencePath?: string;
  verification?: string;
};
type Updates = {
  schema: 'CAPITAL_AI_TOOL_UPDATES@1'; sourceSha: string; observedAt: string;
  freshness: Freshness; candidates: number; requiresReview: number;
  coverage: { npmTotal: number; npmChecked: number; actionTotal: number; actionChecked: number };
  findings: UpdateFinding[];
};
type CatalogSnapshot = {
  schema: 'CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1';
  repository: string;
  branch: string;
  sourceSha: string;
  deployedSha: string | null;
  observedAt: string;
  freshness: Freshness;
  total: number;
  entries: CatalogEntry[];
  error?: string;
  counts?: { byKind: Record<string, number>; byDomain: Record<string, number>; declaredExternal: number;
    runtimeConsumptionVerified: number; dailyUsageMeasurements: number; unresolvedCommercialRights: number };
};

const DOMAINS = ['ALL', 'PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'] as const;
const PAGE_SIZE = 40;
const CATALOG_KINDS_NPM = new Set(['NPM_RUNTIME', 'NPM_DEVTOOL', 'NPM_PRODUCTION_BOUNDARY', 'NPM_SECURITY_PATCH']);
function updateReason(item: CatalogEntry, finding: UpdateFinding | undefined, updates: Updates | null): string {
  if (!updates) return 'NOT_PROVEN: Update-Quelle nicht bestätigt';
  if (!finding) {
    if (CATALOG_KINDS_NPM.has(item.kind) || item.kind === 'GITHUB_ACTION_PIN')
      return 'NOT_PROVEN: Nicht in der begrenzten Registry-/Release-Stichprobe';
    if (item.kind === 'EXTERNER_DIENST')
      return 'NOT_PROVEN: Kein verifizierter Provider-Versionsendpunkt';
    return 'Keine separat prüfbare externe Release-Version im Repository belegt';
  }
  if (finding.state === 'BLOCKED') return 'BLOCKED: ' + (finding.reason || 'Sicherheits-Evidence');
  if (finding.state === 'UPDATE_CANDIDATE') return 'Nicht installiert: Binär-/CVE-/Kompatibilitäts- und Lizenzprüfung offen';
  if (finding.state === 'CURRENT_OR_NEWER') return 'Kein neuer stabiler, SHA-belegter Kandidat';
  if (finding.state === 'REVIEW_REQUIRED') return 'REVIEW_REQUIRED: ' + (finding.reason || 'Version/Fingerprint unklar');
  return 'NOT_PROVEN: ' + (finding.reason || 'Registry-/Commit-Nachweis fehlt');
}
function commercialLabel(item: CatalogEntry): string {
  switch (item.license?.commercial) {
    case 'GENERALLY_ALLOWED_WITH_CONDITIONS': return 'Software: kommerziell grundsätzlich zulässig; Hinweise/Pflichten';
    case 'CONDITIONAL_COPYLEFT': return 'Copyleft: kommerziell bedingt möglich; Redistribution prüfen';
    default: return 'NOT_PROVEN: kommerzielle Rechte nicht abschließend belegt';
  }
}
function priceLabel(item: CatalogEntry): string {
  if (item.priceModel === 'OSS_PACKAGE_NO_LICENSE_FEE_ASSUMED')
    return 'Paket: OSS / Lizenzgebühr nicht ausgewiesen; Betriebs-/Servicekosten offen';
  if (item.priceModel === 'PROVIDER_TARIFF_NOT_PROVEN')
    return 'Provider: Free/Freemium/Bezahlmodell NOT_PROVEN';
  return 'Internes Repo-Modul; kein separater Tarif belegt';
}
function formatDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'unbekannt' : date.toLocaleString('de-DE');
}
function repoLink(snapshot: CatalogSnapshot, path: string) {
  const firstPath = path.split(' → ')[0];
  if (!/^[a-zA-Z0-9_@./+ -]+$/.test(firstPath)) return null;
  return 'https://github.com/' + snapshot.repository + '/blob/' + snapshot.sourceSha + '/' +
    firstPath.split('/').map(encodeURIComponent).join('/');
}

export function RepositoryToolCatalogDashboard() {
  const [snapshot, setSnapshot] = React.useState<CatalogSnapshot | null>(null);
  const [updates, setUpdates] = React.useState<Updates | null>(null);
  const [updatesError, setUpdatesError] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [domain, setDomain] = React.useState<string>('ALL');
  const [kind, setKind] = React.useState('ALL');
  const [limit, setLimit] = React.useState(PAGE_SIZE);

  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    try {
      const response = await fetch('/api/internal/repository-tools', {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
      });
      if (!response.ok) throw new Error('catalog_unavailable');
      const data: unknown = await response.json();
      if (!data || typeof data !== 'object' ||
        (data as CatalogSnapshot).schema !== 'CAPITAL_AI_REPOSITORY_TOOL_CATALOG@1' ||
        !Array.isArray((data as CatalogSnapshot).entries)) throw new Error('invalid_catalog');
      if (!signal?.aborted) {
        setSnapshot(data as CatalogSnapshot);
        setError(false);
      }
    } catch {
      if (!signal?.aborted) setError(true);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  const refreshUpdates = React.useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await fetch('/api/internal/repository-tool-updates', {
        credentials: 'same-origin', cache: 'no-store', headers: { Accept: 'application/json' }, signal,
      });
      if (!response.ok) throw new Error('updates_unavailable');
      const data: Updates = await response.json();
      if (data?.schema !== 'CAPITAL_AI_TOOL_UPDATES@1' || !Array.isArray(data.findings)) throw new Error('invalid_updates');
      if (!signal?.aborted) { setUpdates(data); setUpdatesError(false); }
    } catch {
      if (!signal?.aborted) { setUpdates(null); setUpdatesError(true); }
    }
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    void refresh(controller.signal);
    void refreshUpdates(controller.signal);
    const interval = window.setInterval(() => {
      if (!document.hidden) {
        void refresh(controller.signal);
        void refreshUpdates(controller.signal);
      }
    }, 10 * 60 * 1000);
    const onVisible = () => {
      if (!document.hidden) {
        void refresh(controller.signal);
        void refreshUpdates(controller.signal);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      controller.abort();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, refreshUpdates]);

  const currentUpdates = updates?.sourceSha === snapshot?.sourceSha ? updates : null;
  const updateById = React.useMemo(() =>
    new Map(currentUpdates?.findings.map(item => [item.id, item]) || []), [currentUpdates]);
  const downloadReport = () => {
    if (!snapshot) return;
    const header = ['Name', 'Domain', 'Typ', 'Anwendung', 'Repo-Pfad', 'Version_Repo',
      'Version_kuratiert_nicht_live', 'Version_latest_geprueft', 'Update_Status', 'Update_Grund',
      'Lizenz_deklariert', 'Commercial_Use', 'Weiterverbreitung', 'Provider_Rechte',
      'Preismodell', 'Freikontingent', 'Bezahlmodell', 'Ist_Aufrufe_pro_Tag', 'Ist_Evidence',
      'Cron_Laeufe_pro_Tag_nur_plan', 'Alternativen', 'Main_SHA'];
    const safe = (v: unknown) => {
      const raw = String(v ?? 'NOT_PROVEN').replace(/[\r\n\t]/g, ' ').trim();
      // Prevent spreadsheet formula execution from registry/inventory-origin strings.
      const escaped = /^[=+@-]/.test(raw) ? "'" + raw : raw;
      return '"' + escaped.replace(/"/g, '""') + '"';
    };
    const lines = [header.map(safe).join(';')];
    for (const item of filtered) {
      const finding = updateById.get(item.id);
      const values = [item.name, item.domain, item.kind, item.application, item.path, item.version,
        item.inventoryVersion, finding?.latestVersion || finding?.checkedVersion,
        finding?.state, updateReason(item, finding, currentUpdates), item.license?.declared,
        item.license?.commercial, item.license?.redistribution, item.commercialServiceRights,
        item.priceModel, item.freeTier, item.paidTier, item.use?.actualCallsPerDay,
        item.use?.actualCallsEvidence, item.use?.scheduledRunsPerDay,
        item.alternatives?.map(a => a.name + ' (' + a.role + ')').join(', '), snapshot.sourceSha];
      lines.push(values.map(safe).join(';'));
    }
    const link = document.createElement('a');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    link.href = url;
    link.download = 'capital-ai-tool-katalog-' + snapshot.sourceSha.slice(0, 12) + '.csv';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };
  const kinds = React.useMemo(() => Array.from(new Set(snapshot?.entries.map(item => item.kind) || [])).sort(), [snapshot]);
  const filtered = React.useMemo(() => {
    const query = search.trim().toLocaleLowerCase('de');
    return (snapshot?.entries || []).filter(item =>
      (domain === 'ALL' || item.domain === domain) &&
      (kind === 'ALL' || item.kind === kind) &&
      (!query || [item.name, item.path, item.application, item.version || '', item.domain].some(value =>
        value.toLocaleLowerCase('de').includes(query))));
  }, [snapshot, domain, kind, search]);

  return <section className="space-y-5" aria-labelledby="repo-catalog-title">
    <header className="rounded-2xl border border-rose-400/20 bg-slate-950/80 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] font-mono uppercase tracking-widest text-rose-300">Owner Control Center · Read only</p>
          <h2 id="repo-catalog-title" className="mt-1 text-xl font-bold">Tools & Anwendungen — Repository-Katalog</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Automatisch aus dem aktuellen GitHub-main: npm-/Rust-Direktabhängigkeiten,
            OCI-Basisimages, interne Anwendungen, API-/UI-Module, Skripte, Workflows und
            deklarierte externe Dienste und GitHub Actions mit SHA-Pins. Verfügbare Updates werden
            getrennt nach Registry-Hash bzw. Repository-Commit-SHA nachgewiesen. Neue Spalten
            trennen Lizenzdeklarationen, kommerzielle Service-Rechte, Kosten, Nutzungsnachweis,
            Update-Gründe und Alternativen.
          </p>
        </div>
        <button type="button" disabled={loading} onClick={() => { void refresh(); void refreshUpdates(); }}
          className="min-h-11 rounded-xl border border-rose-300/40 px-4 py-2 text-xs font-bold text-rose-100 hover:bg-rose-500/10 disabled:opacity-50">
          {loading ? 'Prüfe Repository …' : 'GitHub-Abgleich'}
        </button>
      </div>
      {snapshot && <div className="mt-4 space-y-1 text-xs text-slate-400" aria-live="polite">
        <p>Quelle: <a className="text-cyan-300 underline underline-offset-2" href={'https://github.com/' + snapshot.repository + '/tree/' + snapshot.sourceSha} target="_blank" rel="noopener noreferrer">
          {snapshot.repository} · main@{snapshot.sourceSha.slice(0, 12)}
        </a> · {snapshot.freshness} · gelesen {formatDate(snapshot.observedAt)}</p>
        <p>Web-Deployment: {snapshot.deployedSha ? snapshot.deployedSha.slice(0, 12) : 'Build-SHA nicht belegt'}
          {snapshot.deployedSha && snapshot.deployedSha !== snapshot.sourceSha ? ' · GitHub-main und Deployment weichen ab' : ''}
        </p>
        {snapshot.freshness === 'STALE' && <p className="text-amber-300">GitHub derzeit nicht erreichbar. Angezeigt wird der letzte erfolgreiche Snapshot.</p>}
      </div>}
      <p className="mt-3 text-xs text-slate-500">
        Versionsstand bezeichnet den Source-Lock, die App-Releaseversion oder einen Image-Pin —
        niemals automatisch den produktiv laufenden Stand. Für SaaS ohne belastbare Versionsangabe steht „unbekannt“.
        GitHub-Antworten werden serverseitig höchstens fünf Minuten zwischengespeichert.
        Bei geöffneter Katalogansicht erfolgt alle zehn Minuten ein neuer Abgleich; nach Rückkehr in den Tab sofort.
        Update-Metadaten werden serverseitig eine Stunde zwischengespeichert. Kein automatisches Installieren, Mergen oder Freigeben.
      </p>
    </header>

    {error && <div role="alert" className="rounded-xl border border-amber-500/30 p-4 text-sm text-amber-200">
      GitHub-Katalog momentan nicht abrufbar. Es werden keine unbestätigten Live-Daten erzeugt.
      {snapshot && ' Der letzte erfolgreich geladene Stand bleibt sichtbar.'}
    </div>}
    {!snapshot && loading && <p role="status" className="text-sm text-slate-400">Repository-Dateien und Versions-Lock werden gelesen …</p>}
    {snapshot && <>
      <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4 text-sm" aria-live="polite">
        <h3 className="font-semibold text-white">Update-Kandidaten mit SHA-Nachweis</h3>
        {currentUpdates ? <p className="mt-1 text-slate-300">
          {currentUpdates.candidates} Kandidaten · {currentUpdates.requiresReview} Review-Fälle ·
          npm {currentUpdates.coverage.npmChecked}/{currentUpdates.coverage.npmTotal} ·
          GitHub Actions {currentUpdates.coverage.actionChecked}/{currentUpdates.coverage.actionTotal}
          {' · '}Metadaten {formatDate(currentUpdates.observedAt)} ({currentUpdates.freshness})
        </p> : <p className="mt-1 text-amber-200">
          {updatesError ? 'Update-Schnittstelle nicht erreichbar (NOT_PROVEN).' :
            'Update-Metadaten werden geprüft (NOT_PROVEN bis zum Ergebnis).'}
        </p>}
        <p className="mt-2 text-xs text-slate-400">
          npm: SHA-1 und SHA-512 werden aus Registry-Metadaten geprüft; GitHub Actions: aufgelöste
          Release-Commit-SHA im Originalrepository. Kandidat bedeutet weder geprüften Tarball noch
          sicheren Upgrade-Pfad. Versionen werden nur nach Code-Review und CI verändert.
        </p>
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-slate-400">
          {snapshot.counts?.declaredExternal ?? snapshot.entries.filter(item => item.kind === 'EXTERNER_DIENST').length} deklarierte externe Integrationen
          {' · '}tatsächlich gemessene Tagesverbräuche: {snapshot.counts?.dailyUsageMeasurements ?? 0}
          {' · '}kommerziell freigegebene Provider-Rechte: NOT_PROVEN
        </p>
        <button type="button" onClick={downloadReport}
          className="min-h-11 rounded-xl border border-cyan-300/40 px-4 py-2 text-xs font-semibold text-cyan-200 hover:bg-slate-800">
          Vollständige gefilterte Liste als CSV
        </button>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs text-slate-400">Katalogeinträge</p><p className="mt-1 text-2xl font-bold">{snapshot.total}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs text-slate-400">Mit Versionsnachweis</p><p className="mt-1 text-2xl font-bold">{snapshot.entries.filter(item => item.version !== null).length}</p></div>
        <div className="rounded-xl border border-slate-700 bg-slate-950/60 p-4"><p className="text-xs text-slate-400">Externe Dienste ohne Repo-Version</p><p className="mt-1 text-2xl font-bold">{snapshot.entries.filter(item => item.kind === 'EXTERNER_DIENST' && item.version === null).length}</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="text-xs text-slate-400">Suche
          <input value={search} onChange={event => { setSearch(event.target.value); setLimit(PAGE_SIZE); }}
            placeholder="Name, Pfad, Version, Bereich …" aria-label="Repository-Katalog durchsuchen"
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white" />
        </label>
        <label className="text-xs text-slate-400">Domäne
          <select value={domain} onChange={event => { setDomain(event.target.value); setLimit(PAGE_SIZE); }}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white">
            {DOMAINS.map(value => <option key={value} value={value}>{value === 'ALL' ? 'Alle Domänen' : value}</option>)}
          </select>
        </label>
        <label className="text-xs text-slate-400">Art
          <select value={kind} onChange={event => { setKind(event.target.value); setLimit(PAGE_SIZE); }}
            className="mt-1 w-full rounded-xl border border-slate-700 bg-slate-900 p-3 text-sm text-white">
            <option value="ALL">Alle Arten</option>
            {kinds.map(value => <option key={value}>{value}</option>)}
          </select>
        </label>
      </div>
      <p className="text-xs text-slate-400" aria-live="polite">{filtered.length} Treffer · {Math.min(limit, filtered.length)} sichtbar</p>
      <div className="overflow-x-auto rounded-2xl border border-slate-700 bg-slate-950/70">
        <table className="w-full min-w-[1900px] text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-300"><tr>
            <th scope="col" className="p-3">Tool / Anwendung</th>
            <th scope="col" className="p-3">Version & Quelle</th>
            <th scope="col" className="p-3">Update / SHA-Prüfung</th>
            <th scope="col" className="p-3">Einsatz / Verbrauch pro Tag</th>
            <th scope="col" className="p-3">Lizenz / kommerzielle Weitergabe</th>
            <th scope="col" className="p-3">Kosten / Freemium / Bezahlung</th>
            <th scope="col" className="p-3">Alternativen</th>
            <th scope="col" className="p-3">Repository-Pfad</th>
            <th scope="col" className="p-3">Anwendungsbereich</th>
            <th scope="col" className="p-3">Domäne / Typ</th>
          </tr></thead>
          <tbody>{filtered.slice(0, limit).map(item => {
            const link = repoLink(snapshot, item.path);
            const finding = updateById.get(item.id);
            return <tr key={item.id} className="border-t border-slate-800 align-top">
              <td className="p-3 font-semibold text-white">{item.name}</td>
              <td className="p-3"><span className="font-mono text-amber-200">{item.version ?? 'unbekannt'}</span>
                <p className="mt-1 text-[10px] text-slate-500">{item.versionBasis}</p>
                {item.digest && <p className="mt-1 font-mono text-[10px] text-slate-500" title={item.digest}>sha256:{item.digest.slice(0, 16)}…</p>}
                {item.revisionSha && <p className="mt-1 font-mono text-[10px] text-cyan-300" title={item.revisionSha}>Commit {item.revisionSha.slice(0, 12)}…</p>}
                {item.integrity && <p className="mt-1 font-mono text-[10px] text-slate-500" title={item.integrity}>Lock SHA-512 vorhanden</p>}
                {item.sourceBlobSha && <p className="mt-1 font-mono text-[10px] text-slate-500" title={item.sourceBlobSha}>Source-Blob {item.sourceBlobSha.slice(0, 12)}…</p>}
                {item.inventoryVersion && <p className="mt-1 text-[10px] text-slate-400" title={item.inventoryVersionBasis || ''}>
                  Historisches Komponentenregister: {item.inventoryVersion} (nicht live bestätigt)
                </p>}
              </td>
              <td className="p-3">
                {finding?.state === 'UPDATE_CANDIDATE' ? <div className="text-amber-200">
                  Update {finding.version} · Review erforderlich
                  <p className="mt-1 font-mono text-[10px]" title={finding.sha}>SHA {finding.sha?.slice(0, 12)}…</p>
                  <p className="mt-1 text-[10px] text-slate-400">{finding.verification}</p>
                </div> : finding?.state === 'CURRENT_OR_NEWER' ? <span className="text-emerald-300">Kein neuer stabiler Kandidat</span> :
                  <span className="text-slate-400">{finding?.state || 'NOT_PROVEN'}</span>}
                <p className="mt-1 text-[10px] text-slate-300">
                  Neueste geprüfte Version: {finding?.latestVersion || finding?.checkedVersion || 'NOT_PROVEN'}
                </p>
                <p className="mt-1 text-[10px] text-slate-400">{updateReason(item, finding, currentUpdates)}</p>
              </td>
              <td className="p-3 text-slate-300">
                <p>{item.use?.state || 'NOT_PROVEN'}</p>
                <p className="mt-1">Ist-Aufrufe/Tag: {item.use?.actualCallsPerDay ?? 'NOT_PROVEN'}</p>
                <p className="mt-1 text-slate-400">Cron-Plan/Tag: {item.use?.scheduledRunsPerDay ?? 'NOT_PROVEN'}</p>
                {!!item.use?.scheduledCrons?.length && <p className="mt-1 font-mono text-[10px]">{item.use.scheduledCrons.join(', ')}</p>}
              </td>
              <td className="p-3 text-slate-300">
                <p>{item.license?.declared || 'NOT_PROVEN'}</p>
                <p className="mt-1 text-[10px]">{commercialLabel(item)}</p>
                <p className="mt-1 text-[10px]">Verbreitung: {item.license?.redistribution || 'NOT_PROVEN'}</p>
                <p className="mt-1 text-[10px] text-amber-200">Service-/Datenrechte: {item.commercialServiceRights || 'NOT_PROVEN'}</p>
              </td>
              <td className="p-3 text-slate-300">
                {priceLabel(item)}
                <p className="mt-1 text-[10px]">Free-Tier: {item.freeTier || 'NOT_PROVEN'}</p>
                <p className="mt-1 text-[10px]">Paid: {item.paidTier || 'NOT_PROVEN'}</p>
              </td>
              <td className="p-3 text-slate-300">
                {item.alternatives?.length ? item.alternatives.map(a => a.name).join(' · ') : 'NOT_PROVEN'}
                <p className="mt-1 text-[10px] text-slate-400">Alternativen sind Kandidaten, keine geprüften Ersatzprodukte</p>
              </td>
              <td className="p-3 font-mono break-all">
                {link ? <a href={link} target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline underline-offset-2">{item.path}</a> : item.path}
              </td>
              <td className="p-3 text-slate-300">{item.application}</td>
              <td className="p-3 text-slate-400">{item.domain}<p className="mt-1 text-[10px]">{item.kind}</p></td>
            </tr>;
          })}</tbody>
        </table>
        {!filtered.length && <p className="p-5 text-sm text-slate-400">Keine Treffer für die gewählten Filter.</p>}
      </div>
      {limit < filtered.length && <button type="button" onClick={() => setLimit(previous => previous + PAGE_SIZE)}
        className="min-h-11 rounded-xl border border-slate-600 px-4 py-2 text-sm text-white hover:bg-slate-800">
        Weitere {Math.min(PAGE_SIZE, filtered.length - limit)} Einträge anzeigen
      </button>}
    </>}
  </section>;
}
