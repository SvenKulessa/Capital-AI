import { useState } from 'react';
import { BRAND_COLORS, HUB_BRANDING } from '../../../shared/hub-branding.mjs';

const stages = [
  { title: 'Quellen', color: BRAND_COLORS.cyan, description: 'Welche Quelle liefert die Daten? Herkunft, Zeitbezug und Nutzungsrechte bestimmen, ob Werte verwendet werden dürfen.', link: '/marketscreener/dokumentation', action: 'Datenkonzepte ansehen' },
  { title: 'Datenqualität', color: BRAND_COLORS.blue, description: 'Vollständigkeit, Aktualität, Einheiten und Vergleichbarkeit prüfen. Fehlende Evidenz darf nicht als verifizierter Wert behandelt werden.', link: '/marketscreener/dokumentation', action: 'Methodik ansehen' },
  { title: 'Scoring', color: BRAND_COLORS.violet, description: 'Faktoren und Gewichtungen nachvollziehen. Ein Score ist eine methodische Bewertung, keine Vorhersage oder Kaufempfehlung.', link: '/marketscreener?tab=scorer', action: 'Enterprise Scorer öffnen' },
  { title: 'Risiko', color: BRAND_COLORS.rose, description: 'Unsicherheit, Zeitfenster und Grenzen des Vergleichs berücksichtigen. Historische Beispiele belegen keine künftige Rendite.', link: '/marketscreener?tab=terminal', action: 'Screener öffnen' },
  { title: 'Evidenz', color: BRAND_COLORS.green, description: 'Ergebnisse mit Quelle, Methode und Prüfstatus einordnen. Eine nachvollziehbare Analyse unterscheidet Beobachtung und Interpretation.', link: '/marketscreener/dokumentation', action: 'Dokumentation öffnen' },
  { title: 'Marktnews', color: BRAND_COLORS.pink, description: 'Redaktionelle Informationen im Kontext ihrer Quelle und ihres Datums bewerten. Nachrichten ersetzen keine unabhängige Analyse.', link: '/marketscreener?tab=newsArchive', action: 'News-Archiv öffnen' },
  { title: 'Lernen', color: BRAND_COLORS.gold, description: 'Offene Fragen im Learning Hub vertiefen: Begriffe, Methoden und Lernbeispiele helfen, den Analyseprozess zu verstehen.', link: '/learning', action: 'Learning Hub öffnen' },
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
  {
    "input": "Begriffsfragen, Lernziele, Methoden, Lernbeispiele",
    "process": "Zur passenden Lernressource navigieren; Übungen, Beispiele und Marktbezug unterscheiden.",
    "output": "Vertieftes Finanzwissen und Methodenverständnis.",
    "guard": "Keine Lernfortschritte oder Entitlements ohne autorisierten Nachweis ableiten.",
    "metrics": "Nutzbare Lernpfade, Verständlichkeit, consentgebundene Interaktion"
  }
] as const;

/** Interactive conceptual map; never fetches market data or emits trading signals. */
export function AnalyticsHubArticle() {
  const [selected, setSelected] = useState(2);
  const stage = stages[selected];
  const report = technicalReports[selected];
  const orbitRadius = 112;
  const circumference = 2 * Math.PI * orbitRadius;
  const star = (x: number, y: number, radius: number) => Array.from({ length: 10 }, (_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI / 5;
    const distance = index % 2 === 0 ? radius : radius * 0.46;
    return `${x + Math.cos(angle) * distance},${y + Math.sin(angle) * distance}`;
  }).join(' ');
  const positions = stages.map((_, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / stages.length;
    return { x: 180 + Math.cos(angle) * orbitRadius, y: 148 + Math.sin(angle) * orbitRadius };
  });
  return (
    <article lang="de" id="analytics-hub-universe-article" aria-labelledby="analytics-article-title" className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-violet-300/40 bg-slate-950 p-4 sm:p-8" style={{ backgroundImage: 'radial-gradient(ellipse at 75% 18%, rgba(183,148,244,.15), transparent 65%)' }}>
      <div className="flex items-center gap-3">
        <img src={HUB_BRANDING.marketscreener.icon} alt="" width={64} height={64} className="h-16 w-16" decoding="async" />
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: HUB_BRANDING.marketscreener.color }}>CAPITAL-AI · Analytics Hub</p>
      </div>
      <h2 id="analytics-article-title" className="mt-4 text-2xl font-bold leading-tight text-white sm:text-4xl">Daten verstehen. Zusammenhänge erkennen. Entscheidungen fundiert vorbereiten.</h2>
      <p className="mt-4 max-w-3xl text-base leading-7 text-slate-300">Finanzmärkte erzeugen täglich Informationen, doch Zahlen allein erklären keinen Zusammenhang. Der Analytics Hub verbindet nachvollziehbare Datenkonzepte, Bewertungsmethoden und redaktionelle Einordnung. Er hilft, die Entstehung von Analysen zu verstehen und ihre Grenzen zu erkennen.</p>
      <section aria-labelledby="analytics-orbit-title" className="mt-7 grid min-w-0 gap-4 lg:grid-cols-2">
        <div className="min-w-0 rounded-2xl border border-slate-700 bg-[#080d1b] p-3">
          <h3 id="analytics-orbit-title" className="text-base font-bold text-violet-200">Das Analyse-Universum</h3>
          <p className="mt-1 text-xs text-slate-300">Konzeptionelle Darstellung · keine Live-Marktdaten</p>
          <div className="relative mx-auto w-full max-w-md">
          <svg viewBox="0 0 360 296" className="block h-auto w-full" role="img" aria-label={`Analyse-Universum, ausgewählt: ${stage.title}. Sieben miteinander verknüpfte Themen.`}>
            <defs>
              <radialGradient id="analytics-universe-core"><stop stopColor="#B794F4" stopOpacity=".42"/><stop offset="1" stopColor="#11162C"/></radialGradient>
              <clipPath id="analytics-core-clip"><circle cx="180" cy="148" r="71"/></clipPath>
            </defs>
            <g fill="none" stroke="#B794F4" strokeOpacity=".22"><ellipse cx="180" cy="148" rx="147" ry="89" transform="rotate(-25 180 148)"/><ellipse cx="180" cy="148" rx="147" ry="89" transform="rotate(25 180 148)"/><circle cx="180" cy="148" r="126" strokeDasharray="2 7"/></g>
            {stages.map((item,i)=><circle key={item.title} cx="180" cy="148" r={orbitRadius} fill="none" stroke={item.color} strokeWidth={selected===i?8:4} strokeLinecap="round" strokeDasharray={`${circumference/7-9} ${circumference-circumference/7+9}`} transform={`rotate(${-90+(i-.5)*360/7+2} 180 148)`} opacity={selected===i?1:.66}/>)}
            {positions.map((point,i)=><line key={stages[i].title} x1="180" y1="148" x2={point.x} y2={point.y} stroke={stages[i].color} strokeWidth={i===selected?2:1} opacity={i===selected?.8:.2}/>)}
            <circle cx="180" cy="148" r="72" fill="url(#analytics-universe-core)" stroke="#B794F4" strokeWidth="1.5"/>
            {/* Existing admitted artwork only. Uploaded reference remains private until rights review. */}
            <image href="/branding/universe/hero-universe-globe.webp" x="109" y="77" width="142" height="142" preserveAspectRatio="xMidYMid slice" clipPath="url(#analytics-core-clip)"/>
            <rect x="129" y="183" width="102" height="21" rx="10" fill="#090D1C" opacity=".92"/>
            <text x="180" y="197" textAnchor="middle" fontSize="10" fill="#F8FAFC" fontWeight="700">ANALYTICS HUB</text>
            {positions.map((point,i)=><g key={stages[i].title}><circle cx={point.x} cy={point.y} r="21" fill="#101329" stroke={stages[i].color} strokeWidth={i===selected?2.5:1} opacity=".95"/><polygon points={star(point.x,point.y,i===selected?18:15)} fill={stages[i].color} stroke="#F8FAFC" strokeWidth={i===selected?1.25:.5}/><text x={point.x} y={point.y+3} textAnchor="middle" fontSize="10" fill="#090D1C" fontWeight="800">{i+1}</text></g>)}
          </svg>
          {positions.map((point,i) => <button key={stages[i].title} type="button" data-analytics-orbit-star={i} aria-label={`Prozessstern ${i+1}: ${stages[i].title}`} aria-pressed={selected===i} onClick={()=>setSelected(i)} className="absolute h-11 w-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-transparent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{left:point.x/360*100+'%',top:point.y/296*100+'%'}} />)}
          </div>
          <div role="group" aria-label="Analyse-Thema auswählen" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {stages.map((item,i)=><button key={item.title} type="button" aria-pressed={i===selected} onClick={()=>setSelected(i)} className="min-h-11 rounded-lg border px-2 py-2 text-left text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white" style={{borderColor:item.color,color:item.color,backgroundColor:i===selected?item.color+'26':'#080d1b'}}><span aria-hidden="true">★ </span>{i+1} · {item.title}</button>)}
          </div>
        </div>
        <div className="min-w-0 rounded-2xl border border-slate-700 p-5" aria-live="polite">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Analyseperspektive {selected+1} / 7</p>
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
      <section className="mt-8 space-y-3">
        <h3 className="text-xl font-bold text-white">Von der Beobachtung zur nachvollziehbaren Bewertung</h3>
        <p className="leading-7 text-slate-300">Der Scorer macht die Idee einer mehrdimensionalen Bewertung verständlich: Einzelne Merkmale können unterschiedlich gewichtet werden. Ein Ergebnis ist nur so belastbar wie seine Eingaben, die dokumentierte Methode und die bekannten Modellgrenzen. Im Screener lassen sich die vorhandenen Analyseoberflächen erkunden; historische und synthetische Beispiele sind als solche zu behandeln.</p>
        <h3 className="text-xl font-bold text-white">Wissen und Analyse verbinden</h3>
        <p className="leading-7 text-slate-300">Wer eine Kennzahl nicht kennt, kann Begriffe im Learning Hub vertiefen. Dokumentation und Quellenprüfung zeigen, welche Aussagen nachvollziehbar sind. Die Growth Intelligence Engine verbindet diese Wissens- und Inhaltsbausteine, ohne aus einer redaktionellen Einordnung ein garantiertes Handelssignal zu machen.</p>
        <p className="rounded-xl border border-slate-700 p-3 text-sm text-slate-300">Keine Anlageberatung, keine Renditeversprechen. Diese Grafik erklärt den Prozess und enthält weder verifizierte Live-Kurse noch einen aktuellen Markt-Score.</p>
      </section>
    </article>
  );
}
