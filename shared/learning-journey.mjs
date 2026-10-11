// Public editorial source, shared by HTTP fallback, React and draft adaptation.
// All numbers are synthetic educational examples, not market observations.
export const LEARNING_JOURNEY = Object.freeze([
  { id: 'finanzbegriffe', title: 'Finanzbegriffe: Spread und Ausführung verstehen', intent: 'Was ist ein Bid-Ask-Spread?', goal: 'Notierung, Gebühren und Ausführung auseinanderhalten.',
    paragraphs: ['Der beste Geldkurs ist der höchste angebotene Kaufpreis; der beste Briefkurs ist der niedrigste angebotene Verkaufspreis. Ihre Differenz ist der Spread. Die verfügbare Menge im Orderbuch und die Ordergröße beeinflussen, ob dieser Preis für die gesamte Order gilt.', 'Synthetisches Beispiel: Geldkurs 99, Briefkurs 101, Mittelpunkt 100. Der absolute Spread ist 2; relativ zum Mittelpunkt sind das 2 %. Gebühren und Slippage kommen gegebenenfalls hinzu. Eine Notierung garantiert keinen Ausführungspreis.'],
    example: '(101 − 99) / ((101 + 99) / 2) × 100 = 2 %',
    links: [{ href: '/vocabulary/orderbuch', label: 'Orderbuch' }, { href: '/vocabulary/bid-ask-spread', label: 'Bid-Ask-Spread' }, { href: '/vocabulary/slippage', label: 'Slippage' }] },
  { id: 'datenqualitaet', title: 'Datenqualität: Herkunft und Datenvertrag prüfen', intent: 'Welche Daten braucht eine nachvollziehbare Marktanalyse?', goal: 'Quelle, Zeitpunkt, Einheit und Nutzungsrecht vor einer Berechnung prüfen.',
    paragraphs: ['Ein Datenvertrag beschreibt Feldnamen, Einheiten, Zeitbezug und Qualitätsregeln. Ereigniszeit und Abrufzeit sind verschieden: Eine gerade abgerufene Meldung kann ein altes Ereignis betreffen. Für jede Beobachtung gehören Quelle, Zeitzone und Aktualität zur Interpretation.', 'Fehlende Daten sind nicht automatisch null. Bei einer fehlenden Kursbeobachtung bleibt der Faktor unbekannt; die Berechnung muss stoppen oder eine vorab dokumentierte Ersatzregel anwenden. Eine technisch erreichbare API erteilt keine Rechte zur Anzeige oder Weitergabe ihrer Daten.'],
    example: 'Beispielvertrag: Preis in EUR · Ereigniszeit in UTC · Quelle dokumentiert · fehlender Wert = unbekannt',
    links: [{ href: '/datenprovider-lizenzen', label: 'Datenrechte prüfen' }, { href: '/blog/barrierefreie-finanzcharts', label: 'Datenherkunft in Finanzcharts' }] },
  { id: 'normalisierung', title: 'Normalisierung: Faktoren auf eine gemeinsame Skala bringen', intent: 'Wie funktioniert Min-Max-Normalisierung?', goal: 'Skalierung berechnen und ihre Grenzen benennen.',
    paragraphs: ['Eine Min-Max-Skalierung bildet einen Wert x auf (x − Minimum) / (Maximum − Minimum) ab. Synthetisch: x = 30, Minimum = 10 und Maximum = 50 ergeben 0,50. Bei gleichem Minimum und Maximum ist der Nenner null: Es darf kein gültiger normalisierter Wert behauptet werden.', 'Die Referenzgrenzen müssen vorab feststehen. Neue Werte können außerhalb von 0 bis 1 liegen; Begrenzung oder neue Skalierung benötigen eine dokumentierte Regel. Für einen Kostenfaktor kann die Richtung durch 1 − z umgekehrt werden. Ausreißer und eine andere Referenzgruppe verändern das Ergebnis.'],
    example: 'z = (30 − 10) / (50 − 10) = 0,50',
    links: [{ href: '/vocabulary/backtesting', label: 'Referenzdaten zeitlich korrekt prüfen' }] },
  { id: 'gewichtung', title: 'Gewichteter Score: Faktoren verständlich kombinieren', intent: 'Wie berechnet man einen gewichteten Score?', goal: 'Gewichte prüfen und Sensitivität statt Renditeversprechen erklären.',
    paragraphs: ['Drei fiktive Faktoren zwischen 0 und 1 werden mit 50 %, 30 % und 20 % gewichtet. Die Gewichte summieren sich zu 1. Ein solcher Score ordnet nur die gewählten Faktoren unter diesen Annahmen; er ist weder eine Wahrscheinlichkeit noch ein verifizierter Live-Score.', 'Wenn der erste Faktor um 0,10 steigt und alles andere gleich bleibt, steigt das Ergebnis um 0,50 × 0,10 = 0,05. Diese Sensitivität hilft, den Einfluss eines Faktors zu erklären. Stark korrelierte Faktoren können denselben Sachverhalt mehrfach zählen; fehlende Werte dürfen nicht stillschweigend durch günstige Werte ersetzt werden.'],
    example: '0,50 × 0,80 + 0,30 × 0,40 + 0,20 × 0,60 = 0,64',
    links: [{ href: '/marketscreener/dokumentation', label: 'Blueprint-Demos und Berechnungsaufbau' }] },
  { id: 'volatilitaet', title: 'Risiko und Volatilität: Streuung statt Vorhersage', intent: 'Was misst die Standardabweichung von Renditen?', goal: 'Historische Streuung von Verlustwahrscheinlichkeit unterscheiden.',
    paragraphs: ['Volatilität beschreibt die Streuung von Renditen in einem festgelegten Zeitfenster. Für die synthetischen Beobachtungen −1 %, 0 % und +1 % ist der Mittelwert 0 %. Mit dem Stichproben-Nenner n − 1 ergibt sich eine Standardabweichung von 1 Prozentpunkt. Ein anderes Zeitfenster kann ein anderes Ergebnis liefern.', 'Diese drei Beobachtungen sind kein belastbarer Risikonachweis. Eine Annualisierung mit der Quadratwurzel der Periodenzahl setzt unter anderem passende Zeitintervalle und geeignete Unabhängigkeitsannahmen voraus. Historische Volatilität ist keine Prognose; der VIX ist ein eigenständiger optionsbasierter Indikator und nicht diese Beispielrechnung.'],
    example: 's = √(( (−1)² + 0² + 1² ) / (3 − 1)) = 1 Prozentpunkt',
    links: [{ href: '/vocabulary/vix', label: 'VIX richtig einordnen' }] },
  { id: 'validierung', title: 'Backtesting: Modelle ohne Zukunftswissen prüfen', intent: 'Wie vermeidet man Datenlecks und Overfitting?', goal: 'Trainingsdaten, unabhängige Prüfung und Interpretationsgrenzen trennen.',
    paragraphs: ['Synthetischer Aufbau: Beobachtungen 1 bis 60 dienen zum Entwickeln, 61 bis 80 zur Auswahl von Regeln und 81 bis 100 zu einer abschließenden Prüfung. Normalisierungsgrenzen dürfen nur aus den jeweils vorher verfügbaren Trainingsdaten stammen. Spätere Informationen dürfen nicht rückwirkend in frühere Entscheidungen eingehen.', 'Gebühren, Slippage, Survivorship Bias und viele ausprobierte Varianten können ein Backtest-Ergebnis verzerren. Dokumentiere Datenversion, Regel, Zeitfenster und Änderungen. Ein gutes historisches Ergebnis beweist weder zukünftige Rendite noch produktive Zuverlässigkeit. Die Blueprint-Galerie zeigt synthetische Demos, keine freigegebenen Anlageprodukte.'],
    example: 'Entwicklung → zeitlich spätere Validierung → unangetastete Testperiode',
    links: [{ href: '/vocabulary/backtesting', label: 'Backtesting-Begriff' }, { href: '/marketscreener/dokumentation', label: 'Blueprint-Demo ansehen' }] },
]);

export const LEARNING_NEXT_STEPS = Object.freeze([
  { href: '/marketscreener/dokumentation', label: 'Blueprint-Demos ansehen', note: 'Synthetische Beispiele; kein einzelnes Blueprint-Kaufangebot und keine Anlageberatung.' },
  { href: '/learning?tab=glossar#learning-offer', label: 'Learning-Angebot und Voraussetzungen prüfen', note: 'Einmalkauf für Vocabulary und tägliche Quizzes. Chart-Module benötigen zusätzlich mindestens Starter; Chart-Training Pro. Videos sind noch nicht verfügbar.' },
  { href: '/learning#learning-inquiry', label: 'Kursanfrage stellen', note: 'Eine Anfrage ist kein Kauf. Ohne Analytics-Einwilligung nutzbar.' },
]);

// The HTML projection lives with immutable public content, not the CI-bound server entrypoint.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

export function renderLearningLandingFallback(description) {
  const lessons = LEARNING_JOURNEY.map(lesson => `<details id="${lesson.id}"><summary>${escapeHtml(lesson.title)}</summary><p>Lernziel: ${escapeHtml(lesson.goal)}</p>${lesson.paragraphs.map(text => `<p>${escapeHtml(text)}</p>`).join('')}<p>${escapeHtml(lesson.example)}</p><nav>${lesson.links.map(link => `<a href="${escapeHtml(link.href)}">${escapeHtml(link.label)}</a>`).join(' · ')}</nav></details>`).join('');
  const steps = LEARNING_NEXT_STEPS.map(step => `<p><a href="${escapeHtml(step.href)}">${escapeHtml(step.label)}</a> — ${escapeHtml(step.note)}</p>`).join('');
  return `<main><article><h1>Finanzwissen lernen mit Capital-AI</h1><p>${escapeHtml(description)}</p>
    <section id="learning-methodology"><h2>Marktanalyse verstehen: sechs kostenlose Lernschritte</h2><p>Für Lernende, Studierende und Fintech-Teams. Alle Rechenwerte sind synthetisch. Keine Handelssignale, Renditeprognosen oder Anlageberatung.</p>${lessons}<nav aria-label="Vom Lernbeispiel zum Angebot">${steps}</nav></section>
    <section id="learning-offer"><h2>Learning-Angebot und Zugang</h2><p>Das öffentliche Glossar und die sechs Lernschritte sind kostenlos. Ein Checkout ist erst nach Anmeldung und nur bei verfügbarer Zahlungsabwicklung möglich. Im interaktiven Glossar sind der aktuelle Einmalkauf-Preis und die Widerrufserklärung zu prüfen. Chart-Module benötigen zusätzlich mindestens Starter; Chart-Training Pro. Videos sind noch nicht verfügbar. Einzelne Blueprint-Demos sind keine kaufbaren Blueprint-Produkte.</p><p><a href="/login">Für Lernzugang anmelden</a> · <a href="/vocabulary">Öffentliche Begriffe lesen</a> · <a href="/pricing">Abonnement-Voraussetzungen prüfen</a></p></section>
    <section id="learning-inquiry"><h2>Learning-/Kursanfrage</h2><p>Das interaktive Kursformular übermittelt Anfragen an unseren Support. Ohne JavaScript erreichen Sie uns per <a href="mailto:support@capital-ai.online?subject=Capital-AI%20Learning-%2FKursanfrage">E-Mail</a>. Eine Anfrage bestätigt keinen Kauf.</p><a href="/datenschutz">Datenschutzhinweise</a></section>
  </article></main>`;
}
