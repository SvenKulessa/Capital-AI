import { useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { BRAND_COLORS, HUB_BRANDING } from '../../../shared/hub-branding.mjs';

const stages = [
  { title: 'Quellen', color: BRAND_COLORS.cyan, description: 'Welche Quelle liefert die Daten? Herkunft, Zeitbezug und Nutzungsrechte bestimmen, ob Werte verwendet werden dürfen.', link: '/marketscreener/dokumentation', action: 'Datenkonzepte ansehen' },
  { title: 'Datenqualität', color: BRAND_COLORS.violet, description: 'Vollständigkeit, Aktualität, Einheiten und Vergleichbarkeit prüfen. Fehlende Evidenz darf nicht als verifizierter Wert behandelt werden.', link: '/marketscreener/dokumentation', action: 'Methodik ansehen' },
  { title: 'Scoring', color: BRAND_COLORS.cyan, description: 'Faktoren und Gewichtungen nachvollziehen. Ein Score ist eine methodische Bewertung, keine Vorhersage oder Kaufempfehlung.', link: '/marketscreener?tab=scorer', action: 'Enterprise Scorer öffnen' },
  { title: 'Risiko', color: BRAND_COLORS.rose, description: 'Unsicherheit, Zeitfenster und Grenzen des Vergleichs berücksichtigen. Historische Beispiele belegen keine künftige Rendite.', link: '/marketscreener?tab=terminal', action: 'Screener öffnen' },
  { title: 'Evidenz', color: BRAND_COLORS.cyan, description: 'Ergebnisse mit Quelle, Methode und Prüfstatus einordnen. Eine nachvollziehbare Analyse unterscheidet Beobachtung und Interpretation.', link: '/marketscreener/dokumentation', action: 'Dokumentation öffnen' },
  { title: 'Marktnews', color: BRAND_COLORS.gold, description: 'Redaktionelle Informationen im Kontext ihrer Quelle und ihres Datums bewerten. Nachrichten ersetzen keine unabhängige Analyse.', link: '/marketscreener?tab=newsArchive', action: 'News-Archiv öffnen' },
] as const;

const technicalReports = [
  {
    "input": "Quellen-ID, Asset-Klasse, Zeitstempel, Nutzungsstatus",
    "process": "Allowlist und Datenschema prüfen, Rohdaten mit Herkunft und Zeitpunkt verknüpfen.",
    "output": "Datensatz mit Quellenreferenz und Abdeckung.",
    "guard": "Unbekannte Herkunft oder Rechte sperren; keine stillschweigende Substitution.",
    "metrics": "Quellenabdeckung, Datenalter, Ablehnungsquote"
  },
  {
    "input": "Zugelassene Daten, Einheiten, Währungen, Zeitfenster",
    "process": "Datentypen, Zeitachsen, Duplikate und Ausreißer prüfen; fehlende Werte markieren.",
    "output": "Vergleichbarer Datensatz mit dokumentierten Lücken.",
    "guard": "Fehlende Werte nicht als Null interpretieren; fehlerhafte Einheiten ausschließen.",
    "metrics": "Vollständigkeit, Duplikatrate, Aktualität"
  },
  {
    "input": "Validierte Faktoren, Methodenversion und Gewichte",
    "process": "Faktoren nach dokumentierter Methode normalisieren und gewichten; Sensitivität und Abdeckung betrachten.",
    "output": "Erklärbare Bewertung mit Faktoren und Einschränkungen.",
    "guard": "Keine Kursprognose oder Kaufempfehlung; unbekannte Methoden nicht als verifiziert ausweisen.",
    "metrics": "Abdeckung, Reproduzierbarkeit, Sensitivität"
  },
  {
    "input": "Historische oder synthetische Beispiele, Annahmen, Zeitfenster",
    "process": "Schwankungen, Konzentration, Datenlücken und alternative Szenarien einordnen.",
    "output": "Risikokontext und explizite Modellgrenzen.",
    "guard": "Keine garantierte Verlustgrenze oder Rendite; Beispiele nicht als aktuelle Marktdaten darstellen.",
    "metrics": "Szenarioabdeckung, dokumentierte Annahmen"
  },
  {
    "input": "Quellenreferenzen, Methodenversion, Prüfresultate und Zeitstempel",
    "process": "Beobachtung, Berechnung und Interpretation trennen; Nachweis und Prüfstatus zuordnen.",
    "output": "Überprüfbare Ergebnisreferenz mit VERIFIED, NOT_PROVEN oder BLOCKED.",
    "guard": "Fehlende Nachweise nicht hochstufen; private Daten nicht veröffentlichen.",
    "metrics": "Provenienzabdeckung, reproduzierbare Ergebnisse"
  },
  {
    "input": "Datierte Meldungen, Quellen, Rechte, Themen und Asset-Zuordnung",
    "process": "Relevanz, Aktualität, Duplikate und Quellenqualität prüfen; Nachricht und Interpretation trennen.",
    "output": "Datierter redaktioneller Kontext mit Quellenlink.",
    "guard": "Unbestätigte oder unzulässige Meldungen nicht als Fakt oder Handelssignal veröffentlichen.",
    "metrics": "Aktualität, Quellenabdeckung, redaktionelle Prüfquote"
  },
] as const;


// Imported numerical examples from owner-supplied analytics-main.zip,
// src/data/analyticsData.ts MODULES_DE (CC BY 4.0, CAPITAL-AI).
// These are static design fixtures, not actual operational measurements.
const breakdowns = [
  [["Markt- & Kursfeeds",99],["Fundamentaldaten",96],["Makro-Indikatoren",95],["Regulatorik & Filings",98]],
  [["Vollständigkeit",98],["Konsistenz",93],["Aktualität",96],["Plausibilität",91]],
  [["Qualität & Marge",92],["Wachstumsdynamik",86],["Bewertungsdisziplin",84],["Trend-Momentum",90]],
  [["Volatilitäts-Fit",94],["Tail-Risk-Abdeckung",91],["Liquiditäts-Modell",95],["Stresstest-Validität",89]],
  [["Datenabdeckung",96],["Backtest-Robustheit",89],["Signifikanz (p<0.05)",92],["Quellen-Diversität",87]],
  [["Primärquellen-Anteil",95],["Entity-Zuordnung",92],["Duplikat-Bereinigung",97],["Sentiment-Treue",84]],
] as const;
const examples = [
  {title:'Quellen-Abdeckung',score:97,label:'Verfügbar',volume:'318 Feeds',series:[298,302,305,308,311,315,318],metric:'Aktive Datenstreams',checks:[['Synchronisiert','312','98,1 %'],['Verzögert (>2s)','5','1,6 %'],['Offline / Failover','1','0,3 %']]},
  {title:'Datenqualitäts-Score',score:94,label:'Qualität',volume:'142,8 Mio.',series:[112.4,118.9,115.2,124.8,129.6,135.4,142.8],metric:'Datenvolumen',checks:[['Erfolgreich','1.248.320','98,6 %'],['Auffälligkeiten','16.480','1,3 %'],['Fehler','1.260','0,1 %']]},
  {title:'Modell-Kalibrierung',score:88,label:'Konfidenz',volume:'8.420 Titel',series:[7940,8050,8120,8210,8290,8360,8420],metric:'Bewertete Titel',checks:[['Vollständig berechnet','8.314','98,7 %'],['Eingeschränkte Historie','92','1,1 %'],['Gesperrt (Qualität <80%)','14','0,2 %']]},
  {title:'Risiko-Modellgüte',score:92,label:'Kalibriert',volume:'24,6 Mio.',series:[19.2,20.1,21.4,22,22.9,23.7,24.6],metric:'Simulierte Szenarien',checks:[['Im Zielkorridor','7.910','93,9 %'],['Erhöhte Volatilität','442','5,3 %'],['Limit-Überschreitung','68','0,8 %']]},
  {title:'Evidenz-Integrität',score:91,label:'Belegt',volume:'18.940',series:[17100,17420,17880,18150,18440,18710,18940],metric:'Geprüfte Hypothesen',checks:[['Bestätigt (A/A+)','15.890','83,9 %'],['In Überprüfung','2.540','13,4 %'],['Widerlegt / Abgelaufen','510','2,7 %']]},
  {title:'Signal-Relevanz',score:89,label:'Präzision',volume:'412 Tsd.',series:[345,360,352,378,391,403,412],metric:'Verarbeitete Meldungen',checks:[['Relevant & verifiziert','14.210','71,4 %'],['Duplikate gefiltert','5.190','26,1 %'],['Unbestätigt / Verworfen','495','2,5 %']]},
] as const;
function AnalyticsExampleCards({selected,color}:{selected:number;color:string}) {
  const example=examples[selected];
  const low=Math.min(...example.series),high=Math.max(...example.series);
  const points=example.series.map((value,i)=>`${10+i*280/6},${78-(value-low)/Math.max(high-low,1)*62}`).join(' ');
  return <section data-analytics-example-cards aria-label="Statische Demonstrationsdaten" className="mt-5 space-y-3 rounded-2xl border border-violet-300/30 bg-[#080d1b] p-4">
    <p className="rounded-lg border border-amber-300/40 px-3 py-2 text-sm font-semibold text-amber-200">DEMO · Statische Beispieldaten aus dem bereitgestellten Analytics-Entwurf. Keine Betriebskennzahlen, Live-Kurse oder Backtest-Ergebnisse.</p>
    <div className="grid min-w-0 gap-3 lg:grid-cols-3">
      <div className="min-w-0 rounded-xl border border-slate-700 p-3"><h4 className="font-semibold text-slate-100">{example.title}</h4>
        <svg viewBox="0 0 120 120" className="mx-auto h-32 w-32" role="img" aria-label={`Beispielwert ${example.score} Prozent`}><circle cx="60" cy="60" r="48" stroke="#253047" strokeWidth="10" fill="none"/><circle cx="60" cy="60" r="48" pathLength="100" stroke={color} strokeWidth="10" strokeDasharray={`${example.score} ${100-example.score}`} strokeLinecap="round" fill="none" transform="rotate(-90 60 60)"/><text x="60" y="59" textAnchor="middle" fill="#F8FAFC" fontSize="25" fontWeight="700">{example.score}%</text><text x="60" y="77" textAnchor="middle" fill="#CBD5E1" fontSize="10">{example.label}</text></svg><dl className="space-y-2 text-sm">{breakdowns[selected].map(([label,value])=><div key={label} className="flex flex-wrap items-baseline justify-between gap-2"><dt className="min-w-0 break-words text-slate-300">{label}</dt><dd className="font-semibold tabular-nums text-white">{value} %</dd></div>)}</dl>
      </div>
      <div className="min-w-0 rounded-xl border border-slate-700 p-3"><h4 className="font-semibold text-slate-100">{example.metric}</h4><strong className="mt-2 block text-2xl text-white">{example.volume}</strong><p className="text-xs text-slate-400">Beispielzeitraum · Tag 1–30</p><svg viewBox="0 0 300 90" className="mt-3 w-full" role="img" aria-label="Synthetische Beispielreihe"><path d="M10 78H290 M10 46H290 M10 16H290" stroke="#334155" fill="none"/><polygon points={`10,78 ${points} 290,78`} fill={color} opacity=".15"/><polyline points={points} fill="none" stroke={color} strokeWidth="3" strokeLinejoin="round"/></svg><details className="mt-2 text-xs text-slate-300"><summary className="min-h-11 cursor-pointer">Beispielwerte</summary><p>{example.series.join(' · ')}</p></details></div>
      <div className="min-w-0 rounded-xl border border-slate-700 p-3"><h4 className="font-semibold text-slate-100">Beispiel-Prüfungen · 24 h</h4><dl className="mt-3 space-y-3 text-sm">{example.checks.map(([label,count,share])=><div key={label} className="border-b border-slate-800 pb-2"><dt className="text-slate-300">{label}</dt><dd className="mt-1 font-mono text-white">{count} · {share}</dd></div>)}</dl></div>
    </div><p className="text-xs text-slate-400">Quelle: CAPITAL-AI, analytics-main.zip, MODULES_DE · CC BY 4.0 laut mitgeliefertem Lizenzdokument · gekürzte, neu visualisierte Beispiele.</p>
  </section>;
}

const processSteps = [
  [['Primärfeeds verbinden','Quellrechte und autorisierte Schnittstellen prüfen.'],['Schema normalisieren','Einheiten, Währungen und Zeitbezug zuordnen.'],['Quellen abgleichen','Abweichende Werte kennzeichnen.'],['Herkunft taggen','Provider und Zeitstempel dokumentieren.'],['Qualitätsgate übergeben','Nur zugelassene Datensätze weitergeben.']],
  [['Daten erfassen','Inkrementelle Übernahme aller geprüften Rohfeeds inklusive Schema-Versionierung.'],['Qualität prüfen','Regelbasierte und statistische Z-Score-Prüfung auf Lücken, Sprünge und Duplikate.'],['Bereinigen & standardisieren','Split-Adjustments, Währungsharmonisierung und Ausreißer-Quarantäne.'],['Qualität bewerten','Berechnung des modularen Qualitäts-Scores je Asset und Zeitreihe.'],['An Analysen übergeben','Freigabe ausschließlich qualitätsgeprüfter Datensätze an Scoring & Risikomodelle.']],
  [['Faktoren extrahieren','Verfügbare Merkmale erfassen.'],['Sektor normalisieren','Vergleichsgruppen und Methodengrenzen dokumentieren.'],['Scores gewichten','Versionierte Gewichte anwenden.'],['Stabilität prüfen','Sensitivität und Datenabdeckung untersuchen.'],['An Risiko & Evidenz','Faktorbeiträge dokumentieren.']],
  [['Renditeverteilung laden','Zeitfenster und Datenherkunft prüfen.'],['Kovarianz schätzen','Annahmen und Vergleichsgrenzen dokumentieren.'],['Stresstests fahren','Historische oder synthetische Szenarien kennzeichnen.'],['Risikobudget bewerten','Konzentration und Unsicherheit einordnen.'],['Evidenz-Check speisen','Methodik und Ergebnisse referenzieren.']],
  [['Signale bündeln','Qualitäts- und Bewertungsinformationen verbinden.'],['Backtest prüfen','Historische Testdaten von synthetischen Daten trennen.'],['Gegenhypothesen testen','Widersprechende Befunde erfassen.'],['Evidenzgrad vergeben','Nur belegte Prüfstatus verwenden.'],['Dossier bereitstellen','Quellen und Methodik dokumentieren.']],
  [['Nachrichten erfassen','Nur zugelassene Quellen berücksichtigen.'],['Quellen verifizieren','Datum, Rechte und Herkunft prüfen.'],['Kontext zuordnen','Themen und betroffene Asset-Klassen zuordnen.'],['Relevanz bewerten','Duplikate und unbelegte Aussagen abgrenzen.'],['Feed & Alerts speisen','Redaktionell freigegebene Informationen darstellen.']],
] as const;
function AnalyticsProcessFlow({selected,color}:{selected:number;color:string}) {
  const [step,setStep]=useState(selected===1?1:0);
  const items=processSteps[selected];
  return <section aria-label="Technischer Prozessablauf" className="mt-5 rounded-2xl border border-slate-700 bg-[#080d1b] p-4">
    <h3 className="text-lg font-bold text-white">Prozessablauf · {stages[selected].title}</h3>
    <p className="mt-1 text-sm text-slate-300">Konzeptionelle Prozessbeschreibung, kein Nachweis laufender Automatisierung.</p>
    <div className="mt-4 grid gap-2 lg:grid-cols-5">{items.map(([label],i)=><button key={label} type="button" aria-pressed={step===i} onClick={()=>setStep(i)} className="min-h-11 rounded-xl border p-3 text-left text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{borderColor:color,backgroundColor:step===i?color+'25':'#080d1b',color:step===i?color:'#e2e8f0'}}>{i+1}. {label}</button>)}</div>
    <p aria-live="polite" className="mt-3 border-t border-slate-700 pt-3 text-sm leading-6 text-slate-200">{items[step][1]}</p>
  </section>;
}

/** Interactive conceptual map; never fetches market data or emits trading signals. */
export function AnalyticsHubArticle() {
  const [selected, setSelected] = useState(1);
  const stage = stages[selected];
  const report = technicalReports[selected];
  const orbitX = 133;
  const orbitY = 79;
  const orbitCenter = { x: 180, y: 158 };
  const orbitPoint = (angle: number) => ({ x: orbitCenter.x + Math.cos(angle) * orbitX, y: orbitCenter.y + Math.sin(angle) * orbitY });
  const arc = (index: number) => {
    const middle = -Math.PI / 2 + index * Math.PI * 2 / stages.length;
    const half = Math.PI / stages.length - 0.055;
    const a = orbitPoint(middle - half), b = orbitPoint(middle + half);
    return `M ${a.x} ${a.y} A ${orbitX} ${orbitY} 0 0 1 ${b.x} ${b.y}`;
  };
  const star = (x: number, y: number, radius: number) => Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const distance = index % 2 === 0 ? radius : radius * 0.46;
    return `${x + Math.cos(angle) * distance},${y + Math.sin(angle) * distance}`;
  }).join(' ');
  const positions = stages.map((_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / stages.length;
    return orbitPoint(angle);
  });
  return (
    <article lang="de" id="analytics-hub-universe-article" aria-labelledby="analytics-article-title" className="mx-auto max-w-[1440px] overflow-hidden rounded-3xl border border-violet-300/40 bg-slate-950 p-3 sm:p-8" style={{ backgroundImage: 'radial-gradient(ellipse at 75% 18%, rgba(183,148,244,.15), transparent 65%), radial-gradient(ellipse at 12% 90%, rgba(249,191,33,.10), transparent 55%)' }}>
      <div className="flex items-center gap-3">
        <BarChart3 aria-hidden="true" className="h-10 w-10 shrink-0" style={{color:HUB_BRANDING.marketscreener.color}} />
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: HUB_BRANDING.marketscreener.color }}>CAPITAL-AI · Analytics Hub</p>
      </div>
      <h2 id="analytics-article-title" className="mt-4 text-2xl font-bold leading-tight text-white sm:text-4xl">Daten verstehen. Zusammenhänge erkennen. Entscheidungen fundiert vorbereiten.</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Finanzmärkte erzeugen täglich Informationen, doch Zahlen allein erklären keinen Zusammenhang. Der Analytics Hub verbindet nachvollziehbare Datenkonzepte, Bewertungsmethoden und redaktionelle Einordnung. Er hilft, die Entstehung von Analysen zu verstehen und ihre Grenzen zu erkennen.</p>
      <section aria-labelledby="analytics-orbit-title" className="mt-7 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-slate-700 bg-[#080d1b] p-3">
          <h3 id="analytics-orbit-title" className="text-base font-bold text-cyan-200">Das Analyse-Universum</h3>
          <p className="mt-1 text-xs text-slate-300">Konzeptionelle Darstellung · keine Live-Marktdaten</p>
          <div className="relative mx-auto w-full max-w-xl">
          <svg viewBox="0 0 360 296" className="block h-auto w-full" role="img" aria-label={`Analyse-Universum, ausgewählt: ${stage.title}. Sechs miteinander verknüpfte Themen.`}>
            {/* Owner-approved v4 overview illustration; independent vector process controls, not measured market data. */}
            <image href="/branding/universe/analytics-overview-v4.webp" x="0" y="13" width="360" height="270" preserveAspectRatio="xMidYMid meet"/>
            {stages.map((item,i)=><path key={item.title} d={arc(i)} fill="none" stroke={item.color} strokeWidth={selected===i?3:1.3} strokeLinecap="round" opacity={selected===i?1:.6}/>)}
            {positions.map((point,i)=><g key={stages[i].title}><circle cx={point.x} cy={point.y} r="21" fill="#090D1C" stroke={stages[i].color} strokeWidth={i===selected?2.5:1} opacity=".94"/><polygon points={star(point.x,point.y,i===selected?18:15)} fill={stages[i].color} stroke="#F8FAFC" strokeWidth={i===selected?1.25:.5}/><text x={point.x} y={point.y+3} textAnchor="middle" fontSize="10" fill="#090D1C" fontWeight="800">{i+1}</text></g>)}
          </svg>
          {positions.map((point,i) => <button key={stages[i].title} type="button" data-analytics-orbit-star={i} aria-label={`Prozessstern ${i+1}: ${stages[i].title}`} aria-pressed={selected===i} onClick={()=>setSelected(i)} className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{left:point.x/360*100+'%',top:point.y/296*100+'%'}} />)}
          </div>
          <div role="group" aria-label="Analyse-Thema auswählen" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stages.map((item,i)=><button key={item.title} type="button" aria-pressed={i===selected} onClick={()=>setSelected(i)} className="min-h-11 rounded-lg border px-2 py-2 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{borderColor:item.color,color:item.color,backgroundColor:i===selected?item.color+'26':'#080d1b'}}><span aria-hidden="true">★ </span>{i+1} · {item.title}</button>)}
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-700 p-5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Analyseperspektive {selected+1} / {stages.length}</p>
          <h3 className="mt-3 text-xl font-bold" style={{color:stage.color}}>{stage.title}</h3>
          <p className="mt-3 text-sm leading-7 text-slate-200">{stage.description}</p>
          <h4 className="mt-4 font-semibold text-slate-100">Technischer Prozessbericht</h4>
          <dl data-analytics-technical-report className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">
            {([['Eingaben',report.input],['Verarbeitung',report.process],['Ergebnis',report.output],['Prüfgrenze',report.guard],['Prüfindikatoren',report.metrics]] as const).map(([label,detail]) => <div key={label}><dt className="font-semibold" style={{color:stage.color}}>{label}</dt><dd>{detail}</dd></div>)}
          </dl>
          <p className="mt-3 text-xs text-slate-400">Technisches Zielmodell und Prüfindikatoren, keine gemessenen KPIs oder Live-Evidence.</p>
          <a href={stage.link} className="mt-5 inline-flex min-h-11 items-center rounded-xl border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{borderColor:stage.color,color:stage.color}}>{stage.action} →</a>
        </div>
      </section>
      <AnalyticsExampleCards selected={selected} color={stage.color} />
      <AnalyticsProcessFlow key={selected} selected={selected} color={stage.color} />
      <section className="mt-8 space-y-3">
        <h3 className="text-xl font-bold text-white">Von der Beobachtung zur nachvollziehbaren Bewertung</h3>
        <p className="leading-7 text-slate-300">Der Scorer macht die Idee einer mehrdimensionalen Bewertung verständlich: Einzelne Merkmale können unterschiedlich gewichtet werden. Ein Ergebnis ist nur so belastbar wie seine Eingaben, die dokumentierte Methode und die bekannten Modellgrenzen. Im Screener lassen sich die vorhandenen Analyseoberflächen erkunden; historische und synthetische Beispiele sind als solche zu behandeln.</p>
        <h3 className="text-xl font-bold text-white">Quellen und Analyse verbinden</h3>
        <p className="leading-7 text-slate-300">Dokumentation und Quellenprüfung zeigen, welche Aussagen nachvollziehbar sind. Redaktionelle Einordnung und analytische Bewertung bleiben getrennt.</p>
        <p className="rounded-xl border border-slate-700 p-3 text-sm text-slate-300">Keine Anlageberatung, keine Renditeversprechen. Diese Grafik erklärt den Prozess und enthält weder verifizierte Live-Kurse noch einen aktuellen Markt-Score.</p>
      </section>
    </article>
  );
}
