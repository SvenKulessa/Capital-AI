type Dimension = { score: number; maxScore: number; status: string };
export type PublicChatBenchmark = {
  schemaVersion: string;
  evaluatedAt: string;
  taskClass: string;
  score: number;
  coverage: number;
  dimensions: Record<string, Dimension>;
};

const LABELS: Record<string, string> = {
  taskCompletion: 'Auftragserfüllung', evidenceQuality: 'Evidence-Qualität', executionEfficiency: 'Ausführungseffizienz', technicalQuality: 'Technische Qualität', trustAndSafety: 'Trust & Safety', communicationAndAccessibility: 'Kommunikation & Barrierefreiheit',
};

export function VerifiedAiQuality({ benchmark }: { benchmark?: PublicChatBenchmark | null }) {
  const valid = benchmark?.schemaVersion === 'SOLO2_CHAT_BENCHMARK@1' && benchmark.coverage === 100;
  return <section aria-labelledby="verified-ai-quality-title" className="mx-auto max-w-7xl px-5 py-6">
    <div className="rounded-3xl border border-violet-300/30 bg-slate-950/80 p-5 shadow-xl sm:p-7">
      <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">CAPITAL-AI · VERIFIED AI QUALITY</p>
      <h2 id="verified-ai-quality-title" className="mt-2 text-2xl font-bold text-white">Nachvollziehbare Qualität statt unbelegter KI-Versprechen</h2>
      {!valid ? <div className="mt-5 rounded-2xl border border-amber-300/30 bg-amber-950/20 p-4" role="status"><strong className="text-amber-100">NOT_PROVEN</strong><p className="mt-2 text-sm leading-6 text-slate-200">Es liegt noch kein vollständig belegter, veröffentlichungsfähiger Chat-Benchmark vor. Deshalb werden keine Beispielwerte oder Rankings angezeigt.</p></div> : <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="rounded-2xl border border-blue-300/25 bg-blue-950/25 p-5"><span className="text-sm text-blue-100">Verifizierter Score</span><strong className="mt-2 block text-5xl text-white">{benchmark.score}<span className="text-xl text-slate-300">/100</span></strong><p className="mt-3 text-sm text-slate-300">Evidence Coverage: {benchmark.coverage}%</p><p className="mt-1 text-xs text-slate-400">{benchmark.schemaVersion}</p></div>
        <ul className="grid gap-3">{Object.entries(benchmark.dimensions).map(([id, value]) => { const percent = Math.round(100 * value.score / value.maxScore); return <li key={id}><div className="mb-1 flex justify-between gap-3 text-sm"><span className="text-slate-100">{LABELS[id] ?? id}</span><span className="text-blue-100">{value.score}/{value.maxScore}</span></div><div className="h-3 overflow-hidden rounded-full bg-slate-800" role="meter" aria-label={LABELS[id] ?? id} aria-valuemin={0} aria-valuemax={value.maxScore} aria-valuenow={value.score}><div className="h-full rounded-full bg-gradient-to-r from-blue-400 to-violet-400" style={{ width: `${percent}%` }} /></div></li>; })}</ul>
      </div>}
      <p className="mt-5 text-xs leading-5 text-slate-400">Benchmark-Evidence erzeugt keine Produktions-, Sicherheits- oder Freigabeentscheidung. Öffentliche Projektionen enthalten keine privaten Chats oder Evidence-Referenzen.</p>
    </div>
  </section>;
}
