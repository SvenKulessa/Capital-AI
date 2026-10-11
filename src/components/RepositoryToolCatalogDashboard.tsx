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
};
type UpdateFinding = {
  id: string; name: string; kind: string; installed: string | null; state: string;
  version?: string; sha?: string; integrity?: string; source?: string; reason?: string;
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
};

const DOMAINS = ['ALL', 'PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'] as const;
const PAGE_SIZE = 40;
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
            getrennt nach Registry-Hash bzw. Repository-Commit-SHA nachgewiesen.
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
        <table className="w-full min-w-[1080px] text-left text-xs">
          <thead className="bg-slate-900/80 text-slate-300"><tr>
            <th scope="col" className="p-3">Tool / Anwendung</th>
            <th scope="col" className="p-3">Version & Quelle</th>
            <th scope="col" className="p-3">Update / SHA-Prüfung</th>
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
              </td>
              <td className="p-3">
                {finding?.state === 'UPDATE_CANDIDATE' ? <div className="text-amber-200">
                  Update {finding.version} · Review erforderlich
                  <p className="mt-1 font-mono text-[10px]" title={finding.sha}>SHA {finding.sha?.slice(0, 12)}…</p>
                  <p className="mt-1 text-[10px] text-slate-400">{finding.verification}</p>
                </div> : finding?.state === 'CURRENT_OR_NEWER' ? <span className="text-emerald-300">Kein neuer stabiler Kandidat</span> :
                  <span className="text-slate-400">{finding?.state || 'NOT_PROVEN'}</span>}
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
