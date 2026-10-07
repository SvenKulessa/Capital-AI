import React from 'react';

interface RequestMetric {
  method: string;
  route: string;
  status: string;
  count: number;
}

interface DurationMetric {
  method: string;
  route: string;
  count: number;
  avgMs: number;
  maxMs: number;
}

interface CadsMetric {
  layer: string;
  service: string;
  operation: string;
  count: number;
  errors: number;
  errorRate: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  errorClasses?: Record<string, number>;
}

interface ObservabilitySnapshot {
  schema: 'CAPITAL_AI_OPERATIONAL_SNAPSHOT@1';
  generatedAt: string;
  sourceSha?: string | null;
  uptimeSeconds: number;
  residentMemoryBytes: number;
  telemetryRedactions: number;
  requests: RequestMetric[];
  durations: DurationMetric[];
  infrastructure?: { status?: string; redis?: string; nats?: string };
  cads?: CadsMetric[];
}

async function readJson(response: Response) {
  return response.json().catch(() => null);
}

function mib(bytes: number) {
  return Number.isFinite(bytes) ? (bytes / 1024 / 1024).toFixed(1) : '0.0';
}

export function ObservabilityDashboard() {
  const [snapshot, setSnapshot] = React.useState<ObservabilitySnapshot | null>(null);
  const [state, setState] = React.useState<'loading' | 'ready' | 'unavailable'>('loading');

  const refresh = React.useCallback(async (signal?: AbortSignal) => {
    const response = await fetch('/api/internal/observability', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal,
    });
    const body = await readJson(response);
    if (!response.ok || body?.schema !== 'CAPITAL_AI_OPERATIONAL_SNAPSHOT@1') {
      throw new Error('OBSERVABILITY_UNAVAILABLE');
    }
    setSnapshot(body as ObservabilitySnapshot);
    setState('ready');
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    refresh(controller.signal).catch(() => {
      if (!controller.signal.aborted) setState('unavailable');
    });
    const timer = window.setInterval(() => {
      refresh().catch(() => setState('unavailable'));
    }, 15000);
    return () => {
      controller.abort();
      window.clearInterval(timer);
    };
  }, [refresh]);

  if (state === 'loading') {
    return <section className="rounded-2xl border border-slate-800 bg-[#070b19]/80 p-5 text-sm text-slate-400">Observability wird geladen …</section>;
  }

  if (state === 'unavailable' || !snapshot) {
    return (
      <section className="rounded-2xl border border-amber-500/25 bg-amber-500/5 p-5">
        <h2 className="text-base font-black text-amber-100">Observability nicht verfügbar</h2>
        <p className="mt-2 text-xs text-slate-300">
          Die Owner-Projektion ist fail-closed. Prometheus-Token, Secrets und Rohlogs werden nicht an den Browser ausgegeben.
        </p>
      </section>
    );
  }

  const errors = snapshot.requests
    .filter(row => row.status.startsWith('5'))
    .reduce((sum, row) => sum + row.count, 0);
  const total = snapshot.requests.reduce((sum, row) => sum + row.count, 0);
  const errorRate = total ? (errors / total) * 100 : 0;

  return (
    <section className="space-y-5">
      <div className="rounded-2xl border border-cyan-400/20 bg-[#070b19]/90 p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono uppercase tracking-[0.18em] text-cyan-300">Owner-only · Redacted runtime evidence</p>
            <h2 className="mt-1 text-xl font-black text-white">Observability & Telemetry</h2>
            <p className="mt-2 max-w-3xl text-xs leading-relaxed text-slate-400">
              Aggregierte Betriebsmetriken ohne Request-Bodies, Credentials, Tokens oder Vault-Inhalte.
              Das Prometheus-Token verbleibt ausschließlich serverseitig.
            </p>
          </div>
          <button type="button" onClick={() => void refresh()} className="min-h-10 rounded-xl border border-cyan-400/25 bg-cyan-400/10 px-3 text-xs font-bold text-cyan-100">
            Aktualisieren
          </button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Metric label="Uptime" value={Math.floor(snapshot.uptimeSeconds) + ' s'} />
          <Metric label="RSS" value={mib(snapshot.residentMemoryBytes) + ' MiB'} />
          <Metric label="Requests" value={String(total)} />
          <Metric label="5xx Rate" value={errorRate.toFixed(2) + ' %'} />
          <Metric label="Redactions" value={String(snapshot.telemetryRedactions)} />
        </div>

        <div className="mt-3 text-[10px] font-mono text-slate-500">
          Snapshot {snapshot.generatedAt} · Source {snapshot.sourceSha?.slice(0, 12) || 'unbound'} · Infra {snapshot.infrastructure?.status || 'unknown'}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-black text-white">HTTP Runtime</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-xs">
            <thead className="text-slate-500"><tr><th>Route</th><th>Methode</th><th>Samples</th><th>Ø ms</th><th>Max ms</th></tr></thead>
            <tbody>
              {snapshot.durations.map(row => (
                <tr key={row.method + row.route} className="border-t border-white/5">
                  <td className="py-2 font-mono text-slate-300">{row.route}</td>
                  <td>{row.method}</td>
                  <td>{row.count}</td>
                  <td>{row.avgMs.toFixed(1)}</td>
                  <td>{row.maxMs.toFixed(1)}</td>
                </tr>
              ))}
              {!snapshot.durations.length && <tr><td colSpan={5} className="py-3 text-slate-500">Noch keine Runtime-Samples.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
        <h3 className="text-sm font-black text-white">CADS Evidence</h3>
        <p className="mt-1 text-[11px] text-slate-500">p50/p95/p99 der instrumentierten CADS-Operationen; keine Payload-Daten.</p>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="text-slate-500"><tr><th>Layer</th><th>Service</th><th>Operation</th><th>Count</th><th>Errors</th><th>p50</th><th>p95</th><th>p99</th></tr></thead>
            <tbody>
              {(snapshot.cads || []).map(row => (
                <tr key={row.layer + row.service + row.operation} className="border-t border-white/5">
                  <td className="py-2">{row.layer}</td>
                  <td>{row.service}</td>
                  <td className="font-mono text-slate-300">{row.operation}</td>
                  <td>{row.count}</td>
                  <td>{row.errors}</td>
                  <td>{row.p50Ms.toFixed(1)} ms</td>
                  <td>{row.p95Ms.toFixed(1)} ms</td>
                  <td>{row.p99Ms.toFixed(1)} ms</td>
                </tr>
              ))}
              {!(snapshot.cads || []).length && <tr><td colSpan={8} className="py-3 text-slate-500">Noch keine CADS-Samples im aktuellen Prozess.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/25 p-3">
      <div className="text-[9px] font-mono uppercase text-slate-500">{label}</div>
      <div className="mt-1 text-lg font-black text-white">{value}</div>
    </div>
  );
}
