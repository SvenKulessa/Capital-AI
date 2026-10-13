import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import {
  BASE_ASSETS, BASE_CORRELATIONS, LEARNING_CASES,
  portfolioVolatility, validateWeights, validateVolatilities, validateCorrelationMatrix,
  type CorrelationMatrix,
} from './portfolioMath';

type Numbers = Record<string, number>;
type Scenario = { id: string; name: string; weights: Numbers; vols: Numbers; corrs: CorrelationMatrix };
type Access = 'loading' | 'free' | 'pro' | 'unavailable';

const IDS = BASE_ASSETS.map(asset => asset.id);
const originalWeights = (): Numbers => ({ equity: 0.5, bonds: 0.3, cash: 0.2 });
const originalVols = (): Numbers => Object.fromEntries(BASE_ASSETS.map(asset => [asset.id, asset.volatility]));
const originalCorrs = (): CorrelationMatrix => Object.fromEntries(
  IDS.map(i => [i, { ...BASE_CORRELATIONS[i] }]),
);
const asPercent = (value: number) => (value * 100).toFixed(1);
const csvCell = (text: string) => {
  const escaped = /^[=+\-@\t\r]/.test(text) ? "'" + text : text;
  return '"' + escaped.replaceAll('"', '""') + '"';
};

export function FinancialLearningSimulator() {
  const [weights, setWeights] = useState<Numbers>(originalWeights);
  const [vols, setVols] = useState<Numbers>(originalVols);
  const [corrs, setCorrs] = useState<CorrelationMatrix>(originalCorrs);
  const [access, setAccess] = useState<Access>('loading');
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [scenarioName, setScenarioName] = useState('Meine Simulation');
  const [isBusy, setIsBusy] = useState(false);
  const [storageError, setStorageError] = useState('');
  const [feedback, setFeedback] = useState('');
  const [taskFeedback, setTaskFeedback] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch('/api/learning/simulator/entitlement', {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        if (response.status === 401) {
          if (!controller.signal.aborted) setAccess('free');
          return;
        }
        if (!response.ok) throw new Error('entitlement_unavailable');
        const status: { entitled?: boolean } = await response.json();
        if (!status.entitled) {
          if (!controller.signal.aborted) setAccess('free');
          return;
        }
        if (!controller.signal.aborted) setAccess('pro');
        const saved = await fetch('/api/learning/simulator/scenarios', {
          credentials: 'same-origin', cache: 'no-store', signal: controller.signal,
        });
        if (!saved.ok) throw new Error('storage_unavailable');
        const payload: { scenarios?: Scenario[] } = await saved.json();
        if (!controller.signal.aborted) setScenarios(Array.isArray(payload.scenarios) ? payload.scenarios : []);
      } catch {
        if (!controller.signal.aborted) {
          setAccess(current => current === 'pro' ? 'pro' : 'unavailable');
          setStorageError('Gespeicherte Szenarien konnten nicht geladen werden. Speichern bleibt gesperrt.');
        }
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  const modelError = validateWeights(weights, IDS) ||
    validateVolatilities(vols, IDS) || validateCorrelationMatrix(corrs, IDS);
  const volatility = useMemo(() => {
    if (modelError) return null;
    try { return portfolioVolatility(weights, vols, corrs, IDS); }
    catch { return null; }
  }, [weights, vols, corrs, modelError]);

  function reset() {
    setWeights(originalWeights());
    setVols(originalVols());
    setCorrs(originalCorrs());
    setTaskFeedback('');
    setFeedback('Ausgangsszenario wiederhergestellt.');
  }

  function updateWeight(id: string, raw: string) {
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value)) return;
    setWeights(previous => ({ ...previous, [id]: Math.min(1, Math.max(0, value / 100)) }));
    setTaskFeedback('');
    setFeedback('');
  }

  function updateVol(id: string, raw: string) {
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value)) return;
    setVols(previous => ({ ...previous, [id]: Math.min(2, Math.max(0, value / 100)) }));
    setTaskFeedback('');
  }

  function updateCorrelation(a: string, b: string, raw: string) {
    const value = Number(raw);
    if (raw === '' || !Number.isFinite(value)) return;
    const bounded = Math.max(-1, Math.min(1, value));
    setCorrs(previous => ({
      ...previous,
      [a]: { ...previous[a], [b]: bounded },
      [b]: { ...previous[b], [a]: bounded },
    }));
    setTaskFeedback('');
  }

  function runTask(task: number) {
    const base = portfolioVolatility(weights, originalVols(), originalCorrs(), IDS);
    if (task === 1) {
      const equal = portfolioVolatility(LEARNING_CASES.diversificationVsConcentration.equal,
        originalVols(), originalCorrs(), IDS);
      const concentrated = portfolioVolatility(LEARNING_CASES.diversificationVsConcentration.concentrated,
        originalVols(), originalCorrs(), IDS);
      setTaskFeedback(`Gleichgewichtetes Portfolio: ${asPercent(equal)} %; 90 % Aktien: ${asPercent(concentrated)} %. Diversifikation ist modell- und korrelationsabhängig.`);
    }
    if (task === 2) {
      const higher = portfolioVolatility(weights, LEARNING_CASES.highSingleVol, originalCorrs(), IDS);
      setTaskFeedback(`Basisannahmen bei deinen Gewichten: ${asPercent(base)} %; höhere Aktienvolatilität: ${asPercent(higher)} %. Andere Annahmen bleiben konstant.`);
    }
    if (task === 3) {
      const higher = portfolioVolatility(weights, originalVols(), LEARNING_CASES.risingCorrelations, IDS);
      setTaskFeedback(`Ausgangskorrelationen: ${asPercent(base)} %; erhöhte Korrelationen: ${asPercent(higher)} %. Das ist keine Prognose.`);
    }
  }

  async function persist(method: 'POST' | 'DELETE', id?: string) {
    if (access !== 'pro' || isBusy) return;
    if (method === 'POST' && (modelError || !scenarioName.trim() || scenarios.length >= 10)) return;
    setIsBusy(true);
    setStorageError('');
    setFeedback('');
    try {
      const url = id ? `/api/learning/simulator/scenarios/${encodeURIComponent(id)}` :
        '/api/learning/simulator/scenarios';
      const response = await fetch(url, {
        method, credentials: 'same-origin',
        headers: method === 'POST' ? { 'Content-Type': 'application/json' } : undefined,
        body: method === 'POST' ? JSON.stringify({ name: scenarioName.trim(), weights, vols, corrs }) : undefined,
      });
      if (!response.ok) throw new Error(response.status === 409 ? 'Maximal zehn Szenarien erlaubt.' :
        'Speichern oder Löschen fehlgeschlagen.');
      const listing = await fetch('/api/learning/simulator/scenarios', {
        credentials: 'same-origin', cache: 'no-store',
      });
      if (!listing.ok) throw new Error('Serverzustand konnte nicht gelesen werden.');
      const data: { scenarios?: Scenario[] } = await listing.json();
      setScenarios(Array.isArray(data.scenarios) ? data.scenarios : []);
      if (id) setSelectedIds(current => current.filter(value => value !== id));
      setFeedback(method === 'POST' ? 'Szenario privat gespeichert.' : 'Szenario gelöscht.');
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Speicherung fehlgeschlagen.');
    } finally {
      setIsBusy(false);
    }
  }

  function toggleComparison(id: string) {
    setSelectedIds(current => current.includes(id) ? current.filter(value => value !== id) :
      current.length < 3 ? [...current, id] : current);
  }

  function downloadCsv() {
    if (access !== 'pro' || modelError || volatility === null) return;
    const heading = ['Szenario', 'Assetklasse', 'Gewicht (%)', 'Volatilität (%)', 'Portfolio-Volatilität (%)'];
    const included = [{ name: 'Aktuelles Szenario', weights, vols, corrs },
      ...scenarios.filter(s => selectedIds.includes(s.id))];
    const records = included.flatMap(s => {
      let result: number;
      try { result = portfolioVolatility(s.weights, s.vols, s.corrs, IDS); }
      catch { return []; }
      return BASE_ASSETS.map(a => [
        csvCell(s.name), csvCell(a.name), asPercent(s.weights[a.id]),
        asPercent(s.vols[a.id]), (result * 100).toFixed(2),
      ].join(';'));
    });
    const text = '\uFEFF' + [heading.map(csvCell).join(';'), ...records].join('\r\n');
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'capital-ai-financial-learning-simulator.csv';
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="min-w-0 space-y-5 rounded-xl border border-amber-400/25 bg-slate-950/60 p-3 text-sm text-slate-100 sm:p-5" aria-labelledby="sim-title">
      <h2 id="sim-title" className="text-xl font-semibold text-amber-200">Financial Learning Simulator</h2>
      <p className="leading-relaxed text-slate-300">
        Synthetische Lernsimulation mit drei Assetklassen, annualisierter Volatilität und einem Jahr Modellhorizont.
        Keine Live-Kurse, Renditeprognosen oder Anlageempfehlungen.
      </p>
      {access === 'loading' && <p role="status">Zusatzfunktionen und Berechtigungen werden geprüft …</p>}
      {access === 'unavailable' && <p role="status" className="text-amber-200">Berechtigungen derzeit nicht abrufbar. Der Free-Simulator bleibt nutzbar.</p>}
      <fieldset className="space-y-3">
        <legend className="font-semibold text-amber-200">Portfolio-Gewichte</legend>
        <p className="text-slate-300">Passe alle Gewichte so an, dass ihre Summe 100 % ergibt.</p>
        {BASE_ASSETS.map(asset => (
          <div key={asset.id} className="grid grid-cols-[1fr_6rem] items-end gap-x-3 gap-y-1">
            <label className="col-span-2" htmlFor={`weight-${asset.id}`}>{asset.name}: {asPercent(weights[asset.id])} %</label>
            <input type="range" id={`weight-${asset.id}`} min="0" max="100" step="0.5"
              value={weights[asset.id] * 100} onChange={event => updateWeight(asset.id, event.target.value)}
              className="min-h-11 w-full accent-amber-400" />
            <input type="number" aria-label={`${asset.name} Gewicht in Prozent`} min="0" max="100" step="0.1"
              value={Number(asPercent(weights[asset.id]))}
              onChange={event => updateWeight(asset.id, event.target.value)}
              className="min-h-11 w-full rounded border border-slate-500 bg-slate-900 p-2" />
          </div>
        ))}
      </fieldset>
      <p>Gewichtssumme: <strong>{asPercent(IDS.reduce((sum, id) => sum + weights[id], 0))} %</strong></p>

      {access === 'pro' && (
        <fieldset className="space-y-3 rounded-lg border border-amber-400/30 p-3">
          <legend className="font-semibold text-amber-200">Pro: eigene Annahmen</legend>
          <p className="text-slate-300">Volatilität ist eine annualisierte Dezimalgröße, dargestellt in Prozent. Korrelationen müssen eine positiv semidefinite Matrix ergeben.</p>
          <div className="grid gap-3 sm:grid-cols-3">
            {BASE_ASSETS.map(a => (
              <label key={a.id} className="flex flex-col gap-1">
                {a.name}: Volatilität %
                <input type="number" min="0" max="200" step="0.1" value={Number(asPercent(vols[a.id]))}
                  onChange={event => updateVol(a.id, event.target.value)}
                  className="min-h-11 rounded border border-slate-500 bg-slate-900 p-2" />
              </label>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {([['equity', 'bonds'], ['equity', 'cash'], ['bonds', 'cash']] as const).map(([a, b]) => (
              <label key={a + b} className="flex flex-col gap-1">
                Korrelation {BASE_ASSETS.find(item => item.id === a)?.name} / {BASE_ASSETS.find(item => item.id === b)?.name}
                <input type="number" min="-1" max="1" step="0.05" value={corrs[a][b]}
                  onChange={event => updateCorrelation(a, b, event.target.value)}
                  className="min-h-11 rounded border border-slate-500 bg-slate-900 p-2" />
              </label>
            ))}
          </div>
        </fieldset>
      )}

      {modelError && <p role="alert" className="rounded border border-red-400 bg-red-950/50 p-3 text-red-100">{modelError}</p>}
      {volatility !== null && !modelError && (
        <div className="rounded-lg border border-amber-400/40 p-4" aria-live="polite">
          <p>Modellierte Portfoliovolatilität: <strong className="text-lg text-amber-200">{(volatility * 100).toFixed(2)} %</strong></p>
          <p className="mt-1 text-xs text-slate-300">σₚ = √(wᵀΣw) mit Σᵢⱼ = σᵢσⱼρᵢⱼ. Rundungstoleranz für winzige negative Varianzen: 1e−10.</p>
        </div>
      )}
      <div className="h-44" role="img" aria-label="Säulendiagramm der Portfolio-Gewichte; genaue Werte stehen in der folgenden Tabelle">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={BASE_ASSETS.map(a => ({ name: a.name, gewicht: weights[a.id] * 100 }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
            <XAxis dataKey="name" stroke="#cbd5e1" />
            <YAxis unit="%" domain={[0, 100]} stroke="#cbd5e1" />
            <Tooltip formatter={(value: number | string | undefined) => `${Number(value ?? 0).toFixed(1)} %`} />
            <Bar dataKey="gewicht" name="Gewicht" fill="#F9BF21" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="max-w-full overflow-x-auto">
        <table className="w-full min-w-[20rem] border-collapse text-left">
          <caption className="mb-2 text-left text-slate-300">Eingabedaten des synthetischen Modells</caption>
          <thead><tr><th scope="col" className="p-2">Assetklasse</th><th scope="col" className="p-2">Gewicht</th><th scope="col" className="p-2">Volatilität</th></tr></thead>
          <tbody>{BASE_ASSETS.map(a => <tr key={a.id} className="border-t border-slate-700">
            <th scope="row" className="p-2 font-normal">{a.name}</th>
            <td className="p-2">{asPercent(weights[a.id])} %</td>
            <td className="p-2">{asPercent(vols[a.id])} %</td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="min-h-11 rounded bg-slate-700 px-3 py-2 focus-visible:outline-2 focus-visible:outline-amber-200">Zurücksetzen</button>
        {[1, 2, 3].map(n => (
          <button key={n} type="button" onClick={() => runTask(n)}
            className="min-h-11 rounded bg-amber-500 px-3 py-2 text-slate-950 focus-visible:outline-2 focus-visible:outline-white">
            {['', 'Aufgabe 1: Diversifikation', 'Aufgabe 2: Einzelrisiko', 'Aufgabe 3: Korrelationen'][n]}
          </button>
        ))}
      </div>
      {taskFeedback && <p role="status" className="rounded border border-amber-400/30 p-3 text-amber-100">{taskFeedback}</p>}
      {access !== 'pro' && <p className="text-slate-300">Eigene Volatilitäts- und Korrelationsannahmen, privates Speichern, Szenarienvergleich und CSV-Export benötigen Pro oder Enterprise. Owner-Zugriff wird serverseitig geprüft.</p>}
      {access === 'pro' && (
        <section className="space-y-3 border-t border-amber-400/30 pt-4" aria-labelledby="sim-pro-title">
          <h3 id="sim-pro-title" className="text-lg font-semibold text-amber-200">Pro: Private Szenarien</h3>
          <p>Maximal 10 gespeicherte Szenarien; höchstens 3 gleichzeitig vergleichen.</p>
          {storageError && <p role="alert" className="text-red-200">{storageError}</p>}
          {feedback && <p role="status" className="text-emerald-200">{feedback}</p>}
          <label className="block" htmlFor="sim-name">Szenarioname</label>
          <div className="flex flex-wrap gap-2">
            <input id="sim-name" type="text" maxLength={80} value={scenarioName}
              onChange={event => setScenarioName(event.target.value)}
              className="min-h-11 min-w-0 flex-1 rounded border border-slate-500 bg-slate-900 p-2" />
            <button type="button" onClick={() => void persist('POST')}
              disabled={isBusy || scenarios.length >= 10 || !!modelError || !!storageError}
              className="min-h-11 rounded bg-amber-500 px-3 py-2 text-slate-950 disabled:opacity-50">
              {isBusy ? 'Speichervorgang …' : `Privat speichern (${scenarios.length}/10)`}
            </button>
          </div>
          {scenarios.length === 0 ? <p>Keine gespeicherten Szenarien vorhanden.</p> : (
            <ul className="space-y-2">
              {scenarios.map(s => (
                <li key={s.id} className="flex flex-wrap items-center gap-2 rounded border border-slate-600 p-2">
                  <label className="flex min-h-11 flex-1 items-center gap-2">
                    <input type="checkbox" checked={selectedIds.includes(s.id)}
                      disabled={!selectedIds.includes(s.id) && selectedIds.length >= 3}
                      onChange={() => toggleComparison(s.id)} />
                    <span>{s.name}</span>
                  </label>
                  <button type="button" onClick={() => void persist('DELETE', s.id)}
                    disabled={isBusy} className="min-h-11 rounded border border-slate-500 px-3 py-2">
                    Löschen
                  </button>
                </li>
              ))}
            </ul>
          )}
          {selectedIds.length > 0 && (
            <div className="max-w-full overflow-x-auto">
              <table className="min-w-[20rem] w-full text-left">
                <caption className="mb-2 text-left">Vergleich ausgewählter Szenarien</caption>
                <thead><tr><th scope="col">Szenario</th><th scope="col">Portfolio-Volatilität</th></tr></thead>
                <tbody>{scenarios.filter(s => selectedIds.includes(s.id)).map(s => {
                  let value: number | null = null;
                  try { value = portfolioVolatility(s.weights, s.vols, s.corrs, IDS); } catch { /* Fail closed. */ }
                  return <tr key={s.id} className="border-t border-slate-700">
                    <th scope="row" className="p-2 font-normal">{s.name}</th>
                    <td className="p-2">{value === null ? 'Ungültige gespeicherte Eingaben' : `${(value * 100).toFixed(2)} %`}</td>
                  </tr>;
                })}</tbody>
              </table>
            </div>
          )}
          <button type="button" onClick={downloadCsv} disabled={!!modelError || isBusy}
            className="min-h-11 rounded border border-amber-400 px-3 py-2 text-amber-100 disabled:opacity-50">
            CSV-Export: aktuelles und ausgewählte Szenarien
          </button>
        </section>
      )}
    </section>
  );
}
