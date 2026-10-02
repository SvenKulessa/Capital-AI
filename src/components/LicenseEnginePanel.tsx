import React, { useEffect, useMemo, useState } from 'react';
import { assessExpression, importScannerReport, MAX_REPORT_BYTES } from '../../shared/license-engine.mjs';

type EvidenceStatus = 'VERIFIED' | 'OFFEN' | 'GEHALTEN' | 'UNGEKLÄRT';

type EvidenceRow = {
  subjectType: 'package' | 'asset' | 'provider' | string;
  name: string;
  version: string;
  hash: string;
  spdxId: string;
  expression?: string;
  source: string;
  usageScope: string;
  obligations: string[];
  scanTime: string | null;
  status: string;
  evidenceStatus: EvidenceStatus;
  ownerApproved?: boolean;
};

type ProviderEvidence = EvidenceRow & {
  id: string;
  missingFields: string[];
  nextAction: string;
};

type ToolEvidence = {
  id: string;
  version: string;
  license: string;
  mode: string;
  source: string;
};

type Snapshot = {
  schemaVersion: number;
  evidenceReviewDate: string;
  evidenceSourceSha: string;
  lockfileSha256: string;
  ownerApproved: boolean;
  packages: EvidenceRow[];
  providers: ProviderEvidence[];
  osPackages: EvidenceRow[];
  remainingGates: string[];
  tools: ToolEvidence[];
  documents: EvidenceRow[];
};

const statusStyles: Record<EvidenceStatus, string> = {
  VERIFIED: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-300',
  OFFEN: 'border-amber-400/40 bg-amber-400/10 text-amber-300',
  GEHALTEN: 'border-rose-400/40 bg-rose-400/10 text-rose-300',
  UNGEKLÄRT: 'border-slate-500/50 bg-slate-500/10 text-slate-300',
};

const typeLabels: Record<string, string> = {
  package: 'Paket',
  asset: 'Asset / Datei',
  provider: 'Provider',
};

function safeTime(value: string | null) {
  if (!value) return 'nicht im Nachweis enthalten';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString('de-DE');
}

function SourceValue({ value }: { value: string }) {
  if (!value) return <span>nicht belegt</span>;
  if (/^https:\/\//i.test(value)) {
    return (
      <a
        href={value}
        target="_blank"
        rel="noopener noreferrer"
        className="break-all text-cyan-300 underline underline-offset-2 hover:text-cyan-200"
      >
        {value}
      </a>
    );
  }
  return <span className="break-all">{value}</span>;
}

function EvidenceCard({ row }: { row: EvidenceRow }) {
  return (
    <article className="rounded-2xl border border-slate-800/90 bg-[#081126]/80 p-4 shadow-[0_12px_30px_rgba(0,0,0,0.2)]">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-slate-500">
            {typeLabels[row.subjectType] || row.subjectType}
          </p>
          <h4 className="mt-1 break-all text-sm font-bold text-white">{row.name}</h4>
        </div>
        <span className={`rounded-full border px-2 py-1 text-[10px] font-mono font-bold ${statusStyles[row.evidenceStatus]}`}>
          {row.evidenceStatus}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Version</dt>
          <dd className="mt-1 break-all text-slate-200">{row.version || 'nicht belegt'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">SPDX-ID / Ausdruck</dt>
          <dd className="mt-1 break-all text-slate-200">{row.spdxId || row.expression || 'nicht zugeordnet'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Hash / Integrität</dt>
          <dd className="mt-1 break-all font-mono text-[11px] text-slate-300">{row.hash || 'nicht im Nachweis enthalten'}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Nutzungsscope</dt>
          <dd className="mt-1 break-all text-slate-200">{row.usageScope || 'nicht belegt'}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-slate-500">Fundstelle</dt>
          <dd className="mt-1 text-slate-200"><SourceValue value={row.source} /></dd>
        </div>
        <div>
          <dt className="text-slate-500">Scan-/Prüfzeitpunkt</dt>
          <dd className="mt-1 text-slate-200">{safeTime(row.scanTime)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Owner-Freigabe</dt>
          <dd className="mt-1 text-slate-200">{row.ownerApproved ? 'separat dokumentiert' : 'nicht erteilt / nicht aus Scan ableitbar'}</dd>
        </div>
      </dl>

      <details className="mt-4 border-t border-slate-800 pt-3">
        <summary className="cursor-pointer text-xs font-semibold text-amber-300">Pflichten & nächste Prüfung</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-slate-400">
          {(row.obligations.length ? row.obligations : ['Keine belastbare Pflichtenzuordnung im Nachweis enthalten.']).map((item, index) => (
            <li key={`${item}-${index}`}>{item}</li>
          ))}
        </ul>
      </details>
    </article>
  );
}

export function LicenseEnginePanel() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [imported, setImported] = useState<ReturnType<typeof importScannerReport> | null>(null);
  const [expression, setExpression] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const abort = new AbortController();
    fetch('/license-engine/report.json', { signal: abort.signal, cache: 'no-store' })
      .then(response => {
        if (!response.ok) throw new Error('Lizenzinventar ist momentan nicht verfügbar.');
        return response.json();
      })
      .then(report => {
        if (
          report.schemaVersion !== 2 ||
          report.deployEligible !== false ||
          report.ownerApproved !== false ||
          !Array.isArray(report.packages) ||
          !Array.isArray(report.providers) ||
          !Array.isArray(report.tools)
        ) {
          throw new Error('Ungültiger oder zu alter Lizenzbericht.');
        }
        setSnapshot(report);
      })
      .catch(caught => {
        if (!abort.signal.aborted) setError(caught instanceof Error ? caught.message : 'Lizenzinventar konnte nicht geladen werden.');
      });
    return () => abort.abort();
  }, []);

  const assessment = assessExpression(expression);

  async function onImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setImported(null);
    setError('');
    if (!file) return;
    try {
      if (file.size > MAX_REPORT_BYTES) throw new Error('Maximal 2 MiB pro Bericht.');
      setImported(importScannerReport(await file.text()));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Import fehlgeschlagen.');
    }
    event.target.value = '';
  }

  function download() {
    if (!imported) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(imported, null, 2)], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'lizenzpruefung.json';
    link.click();
    URL.revokeObjectURL(url);
  }

  const repositoryRows = useMemo(
    () => snapshot ? [...snapshot.providers, ...snapshot.packages, ...snapshot.osPackages] : [],
    [snapshot]
  );
  const rows = useMemo(() => {
    const candidateRows = (imported?.rows || repositoryRows) as EvidenceRow[];
    const needle = query.trim().toLowerCase();
    if (!needle) return candidateRows;
    return candidateRows.filter(row =>
      [row.subjectType, row.name, row.version, row.spdxId, row.source, row.usageScope, row.evidenceStatus]
        .join(' ')
        .toLowerCase()
        .includes(needle)
    );
  }, [imported, query, repositoryRows]);

  return (
    <section aria-labelledby="license-engine-heading" className="space-y-5 rounded-3xl border border-amber-400/20 bg-[#050b1b]/95 p-4 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-amber-400/80">Control Center · Evidence</p>
          <h2 id="license-engine-heading" className="mt-1 text-xl font-bold text-white">Lizenzen & Nachweise</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Technische Lizenz- und Herkunftsevidenz für Pakete, Assets und Provider. Scannerbefund und Owner-Freigabe bleiben strikt getrennt.
          </p>
        </div>
        <span className="rounded-full border border-rose-400/30 bg-rose-400/10 px-3 py-1 text-[10px] font-mono font-bold text-rose-300">
          KEINE AUTO-FREIGABE
        </span>
      </div>

      <div className="grid gap-2 sm:grid-cols-4" aria-label="Evidence-Status Legende">
        {([
          ['VERIFIED', 'Technisch verifiziert'],
          ['OFFEN', 'Prüfung offen'],
          ['GEHALTEN', 'Durch offene Evidenz gehalten'],
          ['UNGEKLÄRT', 'Nicht korreliert'],
        ] as const).map(([status, description]) => (
          <div key={status} className={`rounded-xl border p-3 ${statusStyles[status]}`}>
            <strong className="block text-[11px] font-mono">{status}</strong>
            <span className="mt-1 block text-[10px] opacity-90">{description}</span>
          </div>
        ))}
      </div>

      <p className="rounded-xl border border-slate-800 bg-black/20 p-3 text-xs leading-5 text-slate-400">
        <strong className="text-slate-200">VERIFIED</strong> bezeichnet hier ausschließlich die technische Bindung eines konkreten Nachweises, z. B. einen geprüften Hash.
        Es ist weder eine Vertrags-, Nutzungs-, Provider- noch Deployment-Freigabe.
      </p>

      <nav aria-label="Lizenzressourcen" className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <a href="/THIRD_PARTY_NOTICES.txt" className="min-h-11 rounded-xl border border-amber-400/20 bg-amber-400/5 px-3 py-3 text-xs font-semibold text-amber-300 hover:border-amber-400/50">
          Open-Source-Lizenztexte
        </a>
        <a href="/frontend-license-inventory.json" className="min-h-11 rounded-xl border border-cyan-400/20 bg-cyan-400/5 px-3 py-3 text-xs font-semibold text-cyan-300 hover:border-cyan-400/50">
          Frontend-Lizenzinventar
        </a>
        <a href="/license-engine/report.json" className="min-h-11 rounded-xl border border-slate-600/40 bg-slate-800/40 px-3 py-3 text-xs font-semibold text-slate-200 hover:border-slate-500">
          Maschinenlesbarer Prüfbericht
        </a>
        <a href="/lizenz" className="min-h-11 rounded-xl border border-amber-400/20 bg-black/20 px-3 py-3 text-xs text-slate-300 hover:text-amber-300">
          Design-/Asset-Lizenzseite
        </a>
        <a href="/datenprovider-lizenzen" className="min-h-11 rounded-xl border border-cyan-400/20 bg-black/20 px-3 py-3 text-xs text-slate-300 hover:text-cyan-300">
          Datenprovider-Lizenzen
        </a>
        <a href="/opensource-lizenzen" className="min-h-11 rounded-xl border border-blue-400/20 bg-black/20 px-3 py-3 text-xs text-slate-300 hover:text-blue-300">
          Open-Source-Übersicht
        </a>
      </nav>

      {error && <p role="alert" className="rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-300">{error}</p>}
      {!snapshot && !error && <p role="status" className="text-sm text-slate-400">Lizenzinventar wird geladen …</p>}

      {snapshot && (
        <>
          <p className="break-all text-xs leading-5 text-slate-500">
            Rechte-Snapshot vom {snapshot.evidenceReviewDate} · Referenz {snapshot.evidenceSourceSha}. Lockfile SHA-256: {snapshot.lockfileSha256}.
            Aktive Laufzeit, Image-Digest und Owner-Entscheidung sind separat zu validieren.
          </p>

          <div>
            <h3 className="text-sm font-bold text-white">Aktuelle Nachweislücken</h3>
            <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">
              {snapshot.remainingGates.map(gate => <li key={gate}>{gate}</li>)}
            </ul>
          </div>

          <details className="rounded-2xl border border-slate-800 bg-black/20 p-4">
            <summary className="cursor-pointer text-sm font-bold text-white">Kostenlose Werkzeuge & archivierte Originaltexte</summary>
            <ul className="my-3 space-y-2 text-sm">
              {snapshot.tools.map(tool => (
                <li key={tool.id}>
                  <a className="text-amber-300 underline underline-offset-2" href={tool.source} target="_blank" rel="noopener noreferrer">
                    {tool.id} {tool.version}
                  </a>
                  <span className="text-slate-400"> · {tool.license} · {tool.mode === 'REPORT_IMPORT_ONLY' ? 'Berichtsimport; Scanner separat ausführen' : 'lokal integriert'}</span>
                </li>
              ))}
            </ul>
            <p className="text-xs text-slate-400">
              Keine Lizenzgebühren, Abos oder neuen Cloud-Dienste. ORT und ScanCode werden über Berichte angebunden; das Browsermodul startet keine Scanner- oder Shell-Befehle.
            </p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {snapshot.documents.map(document => (
                <div key={document.name} className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <a href={'/license-engine/' + document.name} className="break-all text-xs font-semibold text-emerald-300 underline" download>
                      {document.name}
                    </a>
                    <span className="rounded-full border border-emerald-400/30 px-2 py-0.5 text-[9px] font-mono text-emerald-300">VERIFIED</span>
                  </div>
                  <span className="mt-1 block break-all font-mono text-[10px] text-slate-500">SHA-256 {document.hash}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      <div className="space-y-3 border-t border-slate-800 pt-5">
        <h3 className="font-bold text-white">SPDX-Ausdruck prüfen</h3>
        <label className="block text-sm text-slate-300">
          SPDX-Ausdruck
          <input
            maxLength={400}
            value={expression}
            onChange={event => setExpression(event.target.value)}
            placeholder="MIT OR Apache-2.0"
            className="mt-2 block min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 p-3"
          />
        </label>
        {expression && (
          <div aria-live="polite" className="rounded-xl border border-slate-800 bg-black/20 p-3 text-sm">
            <p className={assessment.status === 'MISSING_OR_INVALID' ? 'text-rose-300' : 'text-amber-300'}>
              {assessment.status === 'MISSING_OR_INVALID' ? 'Ausdruck fehlt oder ist ungültig' : 'SPDX erkannt · Rechteprüfung bleibt offen'}
            </p>
            <ul className="mt-2 list-disc pl-5 text-xs text-slate-400">
              {assessment.obligations.map(obligation => <li key={obligation}>{obligation}</li>)}
            </ul>
          </div>
        )}

        <h3 className="font-bold text-white">Scannerbericht lokal auswerten</h3>
        <p className="text-sm leading-6 text-slate-400">
          ScanCode, ORT, Trivy, SPDX oder CycloneDX JSON · maximal 2 MiB. Die Datei bleibt im Browser, wird nicht hochgeladen und beim Verlassen verworfen.
          Importierte Befunde erhalten immer den Status UNGEKLÄRT, bis sie separat mit Quelle, Scope und Produktionsartefakt korreliert wurden.
        </p>
        <label className="block text-sm text-slate-300">
          JSON-Bericht auswählen
          <input type="file" accept=".json,application/json" onChange={onImport} className="my-2 block min-h-11 max-w-full" />
        </label>
        {imported && (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-800 bg-black/20 p-3">
            <span className="text-sm text-slate-300">{imported.tool}: {imported.rows.length} Einträge · Owner-Freigabe: nein</span>
            <button type="button" onClick={download} className="min-h-11 rounded-lg bg-amber-400 px-3 py-2 text-xs font-bold text-black">
              Prüfbericht herunterladen
            </button>
            <button type="button" onClick={() => setImported(null)} className="min-h-11 px-2 text-xs text-slate-300 underline">
              Import verwerfen
            </button>
          </div>
        )}

        <label className="block text-sm text-slate-300">
          Paket, Asset, Provider oder Lizenz filtern
          <input
            value={query}
            onChange={event => setQuery(event.target.value)}
            className="mt-2 block min-h-11 w-full rounded-xl border border-slate-700 bg-slate-900 p-3"
            placeholder="z. B. MIT, Provider, Paketname oder Fundstelle"
          />
        </label>
        <p className="text-xs text-slate-500">
          {rows.length} Einträge · {imported ? 'lokaler, unbestätigter Scannerbericht' : 'Repository-Evidence-Snapshot; kein Runtime-SBOM'} · Anzeige auf 200 Treffer begrenzt.
        </p>

        <div className="grid gap-3 xl:grid-cols-2">
          {rows.slice(0, 200).map((row, index) => <EvidenceCard key={`${row.subjectType}-${row.name}-${index}`} row={row} />)}
        </div>
      </div>
    </section>
  );
}
