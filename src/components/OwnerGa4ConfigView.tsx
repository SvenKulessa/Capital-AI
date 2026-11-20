import { ga4ConfigRecommendation, type Ga4ConfigResult } from './ownerGa4ConfigModel';

export function OwnerGa4ConfigView({ config, unavailable = false }: {
  config: Ga4ConfigResult | null;
  unavailable?: boolean;
}) {
  return <section aria-labelledby="owner-ga4-config-heading" className="rounded-2xl border border-indigo-400/30 bg-[#0b1428] p-4 sm:p-5">
    <h3 id="owner-ga4-config-heading" className="mb-3 text-base font-bold text-white">GA4 · Sichere Konfigurationsdiagnose</h3>
    <div aria-hidden="true" className="mb-3 flex h-1 overflow-hidden rounded-full">
      {['#6366f1','#8b5cf6','#06b6d4','#22c55e','#eab308','#f97316','#ec4899'].map(color =>
        <span key={color} className="flex-1" style={{ backgroundColor: color }}/>)}
    </div>
    <p className="mb-3 text-xs text-slate-300">
      Owner-only · ausschließlich JSON-Prüfung und Projektabgleich · keine Secrets oder Render-API-Schlüssel
    </p>
    <div aria-live="polite" aria-atomic="true">
      {config ? <>
        <dl className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="rounded-xl border border-indigo-300/20 bg-[#111f36] p-3">
            <dt className="text-xs text-slate-300">JSON_VALID</dt>
            <dd className="mt-1 text-base font-bold">{config.JSON_VALID === null ? 'NOT_PROVEN' : String(config.JSON_VALID).toUpperCase()}</dd>
          </div>
          <div className="rounded-xl border border-cyan-300/20 bg-[#111f36] p-3">
            <dt className="text-xs text-slate-300">PROJECT_MATCH</dt>
            <dd className="mt-1 text-base font-bold">{config.PROJECT_MATCH === null ? 'NOT_PROVEN' : String(config.PROJECT_MATCH).toUpperCase()}</dd>
          </div>
        </dl>
        <p className="mt-3 break-all text-xs font-semibold text-amber-100">Diagnosecode: {config.reason}</p>
        <p className="mt-2 rounded-xl border border-amber-300/20 bg-amber-300/5 p-3 text-sm text-slate-100">
          {ga4ConfigRecommendation(config.reason)}
        </p>
        <p className="mt-2 text-xs text-slate-400">
          Konfiguration geprüft – GA4-Property-Zugriff und Messwerte dadurch noch nicht bestätigt.
        </p>
      </> : <p role="status" className="text-sm text-amber-100">
        {unavailable ? 'Konfigurationsdiagnose nicht verfügbar – keine Ersatzwerte.' : 'NOT_PROVEN – noch keine Konfigurationsdiagnose.'}
      </p>}
    </div>
  </section>;
}
