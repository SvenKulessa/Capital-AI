import React, { useState } from 'react';
import { CHART_LESSONS, CHART_LEARNING_DISCLOSURE, CHART_LEARNING_SOURCES, lessonPost } from '../../data/chartLearning.ts';
import { ChartLessonGraphic } from './ChartLessonGraphic.tsx';

export function ChartLearningAtlas({ studio = false }: { studio?: boolean }) {
  const [category, setCategory] = useState('Alle');
  const [selectedId, setSelectedId] = useState(() => typeof window === 'undefined' ? CHART_LESSONS[0].id :
    CHART_LESSONS.find(lesson => lesson.id === new URLSearchParams(window.location.search).get('lesson'))?.id ?? CHART_LESSONS[0].id);
  const [revealed, setRevealed] = useState(false);
  const [copyState, setCopyState] = useState('');
  const visible = CHART_LESSONS.filter(lesson => category === 'Alle' || lesson.category === category);
  const lesson = visible.find(item => item.id === selectedId) ?? visible[0];
  function select(id: string) { setSelectedId(id); setRevealed(false); setCopyState(''); }
  async function copyPost() {
    try { await navigator.clipboard.writeText(lessonPost(lesson)); setCopyState('Beitragsentwurf kopiert.'); }
    catch { setCopyState('Kopieren nicht verfügbar. Den Text im Entwurf markieren.'); }
  }
  return <section lang="de" aria-label="Chart-Lernatlas" className="space-y-5 rounded-2xl border border-cyan-400/20 bg-[#0b1020] p-4 sm:p-6">
    <div><p className="text-xs font-semibold uppercase tracking-widest text-cyan-200">Erkennen · einordnen · hinterfragen</p>
      <h2 className="mt-2 text-2xl font-bold text-white">Chart-Lernatlas</h2>
      <p className="mt-2 text-sm text-slate-300">Zwölf grafische Beispiele für Flags, Patterns und Indikatoren. Vergleiche die Struktur mit ihrer möglichen Bestätigung und Widerlegung.</p>
      <p className="mt-2 text-xs text-amber-200">{CHART_LEARNING_DISCLOSURE}</p></div>
    <div className="flex flex-wrap gap-2" role="group" aria-label="Kategorie filtern">
      {['Alle','Flags','Patterns','Indikatoren'].map(value => <button key={value} type="button" aria-pressed={category === value}
        onClick={() => { setCategory(value); select(CHART_LESSONS.find(item=>value==='Alle'||item.category===value)!.id); }}
        className={`rounded-lg border px-4 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300 ${category===value?'border-cyan-300 bg-cyan-300 text-slate-950':'border-slate-600 text-slate-200'}`}>{value}</button>)}
    </div>
    <label className="block text-sm text-slate-200">Beispiel auswählen
      <select value={lesson.id} onChange={event=>select(event.target.value)} className="mt-2 block w-full rounded-lg border border-slate-600 bg-slate-900 p-3 text-white">
        {visible.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}
      </select>
    </label>
    <figure><ChartLessonGraphic lesson={lesson} /><figcaption className="mt-2 text-xs text-slate-300">Eigene schematische Illustration. Indikatorlinien sind keine aus Kursdaten berechneten Werte.</figcaption></figure>
    <dl className="grid gap-4 md:grid-cols-3">{[['Erkennen',lesson.recognition],['Bestätigung beobachten',lesson.confirmation],['Fehlersignal prüfen',lesson.invalidation]].map(([label,text])=>
      <div key={label} className="rounded-xl border border-slate-700 p-4"><dt className="font-semibold text-cyan-200">{label}</dt><dd className="mt-2 text-sm leading-relaxed text-slate-200">{text}</dd></div>)}</dl>
    <div className="rounded-xl border border-slate-700 p-4"><h3 className="font-semibold text-white">Selbstcheck</h3><p className="mt-2 text-sm text-slate-200">{lesson.checkpoint}</p>
      <button type="button" aria-expanded={revealed} onClick={()=>setRevealed(!revealed)} className="mt-3 rounded-lg border border-cyan-300 px-4 py-2 text-sm text-cyan-200">{revealed?'Erklärung verbergen':'Erklärung anzeigen'}</button>
      {revealed&&<p className="mt-3 text-sm text-slate-200">{lesson.answer}</p>}</div>
    <details className="rounded-xl border border-slate-700 p-4"><summary className="cursor-pointer font-semibold text-white">Beitragsentwurf & Grafik herunterladen</summary>
      <pre className="mt-3 whitespace-pre-wrap break-words text-sm text-slate-200">{lessonPost(lesson)}</pre>
      <div className="mt-4 flex flex-wrap gap-3"><button type="button" onClick={copyPost} className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-white">Beitrag kopieren</button>
        <a href={`/learning/charts/${lesson.id}.svg`} download className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-slate-950">SVG herunterladen</a>
        <a href={`/learning/charts/${lesson.id}.png`} download className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-white">PNG herunterladen</a>
        {studio&&<a href={`/learning/charts/${lesson.id}.media-project.json`} download className="rounded-lg border border-slate-500 px-4 py-2 text-sm text-white">MediaProject herunterladen</a>}
      </div><p role="status" className="mt-2 text-xs text-slate-300">{copyState}</p>
      {studio&&<p className="mt-2 text-xs text-amber-200">Redaktionsentwurf. Export ist kein gerendertes Video und keine Social-Veröffentlichung.</p>}
    </details>
    <div className="text-xs text-slate-300"><p>Methodische Quellen · geprüft am 09.10.2026 · eigene Texte und Grafikgeometrie</p>
      {CHART_LEARNING_SOURCES.map(source=><a key={source.url} href={source.url} target="_blank" rel="noopener noreferrer" className="mr-4 mt-2 inline-block underline">{source.title}</a>)}</div>
  </section>;
}
