import React, { useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { BASE_ASSETS, BASE_CORRELATIONS, portfolioVolatility, validateWeights, LEARNING_CASES } from './portfolioMath';

type Scenario = {
  id: string;
  name: string;
  weights: Record<string, number>;
  vols?: Record<string, number>;
  corrs?: typeof BASE_CORRELATIONS;
};

const ASSET_COLORS = { equity: '#F5B014', bonds: '#60A5FA', cash: '#34D399' };

export function FinancialLearningSimulator({ entitled = false }: { entitled?: boolean }) {
  const [weights, setWeights] = useState({ equity: 0.5, bonds: 0.3, cash: 0.2 });
  const [vols, setVols] = useState(Object.fromEntries(BASE_ASSETS.map(a => [a.id, a.volatility])));
  const [corrs, setCorrs] = useState(BASE_CORRELATIONS);
  const [error, setError] = useState<string | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [taskFeedback, setTaskFeedback] = useState<string | null>(null);

  const assetIds = BASE_ASSETS.map(a => a.id);
  const weightError = validateWeights(weights, assetIds);
  const vol = useMemo(() => {
    if (weightError) return null;
    try { return portfolioVolatility(weights, vols, corrs, assetIds); } catch { return null; }
  }, [weights, vols, corrs, weightError]);

  function updateWeight(id: string, value: number) {
    const next = { ...weights, [id]: Math.max(0, Math.min(1, value)) };
    setWeights(next);
    setError(validateWeights(next, assetIds));
  }

  function reset() {
    setWeights({ equity: 0.5, bonds: 0.3, cash: 0.2 });
    setVols(Object.fromEntries(BASE_ASSETS.map(a => [a.id, a.volatility])));
    setCorrs(BASE_CORRELATIONS);
    setError(null);
    setTaskFeedback(null);
  }

  function runTask(task: number) {
    if (task === 1) setTaskFeedback('Diversifikation reduziert die Portfoliovolatilität, wenn Korrelationen unter 1 liegen. Gleichgewichtetes Portfolio oft niedriger als Einzelasset.');
    if (task === 2) setTaskFeedback('Höhere Einzelvolatilität erhöht die Portfoliovolatilität proportional zur Gewichtung.');
    if (task === 3) setTaskFeedback('Steigende Korrelationen verringern den Diversifikationseffekt. Bei ρ=1 ist die Volatilität gewichteter Durchschnitt.');
  }

  const chartData = BASE_ASSETS.map(a => ({ name: a.name, weight: (weights[a.id] ?? 0) * 100, color: ASSET_COLORS[a.id as keyof typeof ASSET_COLORS] }));

  return (
    <section className="space-y-4 p-3 text-sm text-slate-200" aria-labelledby="sim-title">
      <h2 id="sim-title" className="text-lg font-semibold text-amber-300">Financial Learning Simulator</h2>
      <p className="text-xs text-slate-400">Synthetische Lernsimulation. Keine Renditeprognosen, Kaufempfehlungen oder Live-Marktdaten. Zeithorizont: 1 Jahr (annualisierte Volatilität).</p>
      {error && <div role="alert" className="rounded border border-red-500/50 bg-red-950/40 p-2 text-red-200">{error}</div>}
      <div className="grid gap-3">
        {BASE_ASSETS.map(a => (
          <div key={a.id} className="space-y-1">
            <label htmlFor={`w-${a.id}`} className="flex justify-between text-xs">
              <span>{a.name}</span><span>{((weights[a.id] ?? 0) * 100).toFixed(1)} %</span>
            </label>
            <input id={`w-${a.id}`} type="range" min="0" max="100" step="0.5" value={(weights[a.id] ?? 0) * 100}
              onChange={e => updateWeight(a.id, Number(e.target.value) / 100)} className="w-full accent-amber-400" aria-valuemin={0} aria-valuemax={100} />
            <input type="number" min="0" max="100" step="0.1" value={((weights[a.id] ?? 0) * 100).toFixed(1)}
              onChange={e => updateWeight(a.id, Number(e.target.value) / 100)} className="w-20 rounded border border-slate-600 bg-slate-900 px-1 py-0.5 text-xs" aria-label={`${a.name} Gewicht in Prozent`} />
          </div>
        ))}
      </div>
      {vol !== null && !weightError && (
        <div className="rounded border border-amber-400/30 p-3">
          <p className="text-xs">Modellierte Portfoliovolatilität: <strong className="text-amber-300">{(vol * 100).toFixed(2)} %</strong></p>
          <p className="mt-1 text-[10px] text-slate-500">Berechnung: σ_p = √(wᵀ Σ w), Σ_ij = σ_i σ_j ρ_ij. Rundungstoleranz für kleine negative Varianzen: 1e-10.</p>
        </div>
      )}
      <div className="h-40">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
            <XAxis dataKey="name" stroke="#94a3b8" />
            <YAxis stroke="#94a3b8" />
            <Tooltip />
            <Line type="monotone" dataKey="weight" stroke="#F5B014" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="w-full text-xs">
        <caption className="sr-only">Gewichte und Volatilitäten der Assetklassen</caption>
        <thead><tr><th>Asset</th><th>Gewicht %</th><th>Volatilität %</th></tr></thead>
        <tbody>
          {BASE_ASSETS.map(a => (
            <tr key={a.id}><td>{a.name}</td><td>{((weights[a.id] ?? 0) * 100).toFixed(1)}</td><td>{((vols[a.id] ?? 0) * 100).toFixed(1)}</td></tr>
          ))}
        </tbody>
      </table>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={reset} className="rounded bg-slate-700 px-3 py-1 text-xs">Zurücksetzen</button>
        <button type="button" onClick={() => runTask(1)} className="rounded bg-amber-600 px-3 py-1 text-xs text-black">Aufgabe 1: Diversifikation</button>
        <button type="button" onClick={() => runTask(2)} className="rounded bg-amber-600 px-3 py-1 text-xs text-black">Aufgabe 2: Einzelvolatilität</button>
        <button type="button" onClick={() => runTask(3)} className="rounded bg-amber-600 px-3 py-1 text-xs text-black">Aufgabe 3: Korrelationen</button>
      </div>
      {taskFeedback && <p role="status" className="text-xs text-amber-200">{taskFeedback}</p>}
      {!entitled && <p className="text-xs text-slate-500">Pro-Funktionen (editierbare Volatilitäten, Korrelationen, Szenarienvergleich, Speicherung, CSV) erfordern Pro- oder Enterprise-Abonnement. Free bleibt vollständig nutzbar.</p>}
      {entitled && (
        <div className="space-y-2 border-t border-slate-700 pt-3">
          <h3 className="text-sm font-medium text-amber-300">Pro: Szenarien & Export</h3>
          <button type="button" onClick={() => setScenarios(s => s.length < 10 ? [...s, { id: crypto.randomUUID(), name: `Szenario ${s.length + 1}`, weights: { ...weights } }] : s)} className="rounded bg-amber-500 px-3 py-1 text-xs text-black" disabled={scenarios.length >= 10}>Szenario speichern (max. 10)</button>
          <ul className="text-xs">{scenarios.map(s => <li key={s.id}>{s.name} – σ {(portfolioVolatility(s.weights, vols, corrs, assetIds) * 100).toFixed(2)} %</li>)}</ul>
          <button type="button" onClick={() => {
            const rows = ['Asset,Gewicht,Volatilitaet', ...BASE_ASSETS.map(a => `${a.name},${weights[a.id]},${vols[a.id]}`)];
            const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = 'simulator-szenario.csv'; a.click();
            URL.revokeObjectURL(url);
          }} className="rounded bg-slate-600 px-3 py-1 text-xs">CSV-Export (Eingaben)</button>
        </div>
      )}
    </section>
  );
}
