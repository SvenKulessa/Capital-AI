/**
 * First-party deterministic design-brief formatter. No AI/network calls.
 * Private source notes and images are never logged or persisted here.
 */
export const FRONTEND_FEATURES = Object.freeze([
  {id:'responsive',label:'Responsive / Mobile first',spec:'Mobile-first Layout: CSS Grid/Flexbox, fluide Container, Breakpoints 320/390/1440 CSS-px, keine horizontalen Scrollbars.'},
  {id:'universe',label:'CAPITAL-AI Universe',spec:'Bestehenden Hero-Globus und Hub-Navigation unverändert lassen. Sieben kanonische Akzentfarben mit CSS-Variablen, typografischer Hierarchie und diskreten orbitalen HUD-Details nutzen.'},
  {id:'accessibility',label:'Barrierefreiheit',spec:'Semantisches HTML, ARIA-Status für aufklappbare Controls, sichtbare Tastatur-Fokusmarken, mindestens 44px Touch-Ziele, WCAG-2.2-AA-Kontrast, prefers-reduced-motion.'},
  {id:'charts',label:'News / Daten-Grafiken',spec:'Diagramme und Infografiken quellengebunden mit Zeitstempel, Daten-Provenienz, erklärenden Legenden und fehlwertsicherem Stale-Fallback umsetzen. Keine erfundenen Marktkurse.'},
  {id:'components',label:'Designsystem / Komponenten',spec:'Wiederverwendbare React-Komponenten, Design-Tokens, Zustandsmodell, konsistente Spacing-/Radius-Skala und deterministische Testfälle erstellen.'},
  {id:'interaction',label:'Interaktion / Micro-UX',spec:'Sichere, reversible UI-Interaktionen mit Fokus- und Fehlerzuständen, transparentem Lade-/Leerlaufstatus, ohne automatisch auslösende kostenpflichtige Aktionen.'},
]);
const clean = value => String(value || '').replace(/[\u0000-\u001f\u007f]/g,' ').trim();
/** @param {{notes: string[], featureIds: string[], images?: string[]}} input */
export function buildFrontendDesignPrompt({notes,featureIds,images=[]}) {
  if (!Array.isArray(notes) || notes.length<1 || notes.length>30) throw new Error('SELECT_NOTES');
  const safeNotes=notes.map(clean);
  if(safeNotes.some(n=>!n||n.length>500))throw new Error('INVALID_NOTE');
  const allowed=new Set(FRONTEND_FEATURES.map(f=>f.id));
  if (!Array.isArray(featureIds)||featureIds.length<1||featureIds.some(id=>!allowed.has(id)))throw new Error('SELECT_FEATURE');
  if(!Array.isArray(images)||images.length>5)throw new Error('INVALID_IMAGES');
  const safeImages=images.map(x=>clean(x)).filter(Boolean).map(x=>x.slice(0,120));
  const sections=[
    '# CAPITAL-AI · Privater Frontend-Designauftrag',
    '',
    '## Ziel und Material',
    'Entwirf einen implementierbaren Frontend-Slice auf Grundlage der folgenden, vom Owner bewusst ausgewählten Originalnotizen. Nicht angegebene Fakten und Daten nicht erfinden.',
    ...safeNotes.map((n,i)=>`${i+1}. ${n}`),'',
    '## Technische und gestalterische Anforderungen',
    ...FRONTEND_FEATURES.filter(f=>featureIds.includes(f.id)).map(f=>`- **${f.label}:** ${f.spec}`),
    '',
    '## Werkzeugrecherche (GROWTH_TOOL_DISCOVERY@1)',
    '- Prüfe aktiv vorhandene Integrationen, verfügbare Plugin-Verzeichnisse und offizielle Anbieterquellen mit ausschließlich öffentlichen, nicht vertraulichen Suchbegriffen. Bewerte Lizenz, Kosten, Datenschutz, Version, kommerzielle Nutzung und Alternativen; aktualisiere den privaten Owner-Anwendungskatalog. Fehlende Recherche oder Rechte als NOT_PROVEN kennzeichnen; keine automatische Installation oder Kostenaktivierung.',
    '',
    '## Umsetzung / Abnahme',
    '- Bestehende Authentifizierungs-, Rollen-, Hub- und Hero-Grenzen erhalten; keine Produktivmutationen oder Veröffentlichung ohne vorhandene Gates.',
    '- Komponenten, Interaktionen, mobile Darstellung, Negativfälle und Akzeptanzkriterien mit nachvollziehbaren Ergebnissen spezifizieren.',
  ];
  if(safeImages.length)sections.push('','## Bildreferenzen (nur lokaler Entwurf)',...safeImages.map((n,i)=>`- Bild ${i+1}: ${n} – separat als private Bilddatei beifügen; Markierungen als visuelle Referenz berücksichtigen.`));
  return sections.join('\n');
}
