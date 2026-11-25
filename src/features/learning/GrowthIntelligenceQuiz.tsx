import { useState } from 'react';

// NotebookLM questions transcribed from the owner-supplied recording of 2026-11-25.
// Answer keys and explanations are editorially derived, not exported NotebookLM feedback.
// Specialist questions reference docs/growth/growth-intelligence-content-plan-v1.md
// and Root AGENTS.md; universal questions are original educational exercises.
type Level = 'notebook' | 'specialist' | 'universal';
type Question = { id: string; level: Level; domain: string; question: string; options: readonly string[]; correct: readonly number[]; explanation: string };
export const GROWTH_QUIZ_QUESTIONS: readonly Question[] = [
  {
    "id": "growth-01",
    "level": "notebook",
    "domain": "Market Intelligence",
    "question": "Was bildet im Rahmen der Market Intelligence der Growth Intelligence Engine die wesentliche Grundlage für die verständliche Aufbereitung finanzwirtschaftlicher Zusammenhänge?",
    "options": [
      "Die automatische Generierung spekulativer Handelssignale auf Basis unbegrenzter Marktindikatoren.",
      "Der vollständige Ersatz menschlicher Marktanalysten durch autonome Handels-Bots.",
      "Die ausschließliche Verwendung historischer Simulationen unter Ausschluss von Echtzeit-Datenquellen.",
      "Eine strukturierte Marktbeobachtung unter Berücksichtigung von Datenqualität, verifizierbaren Quellen und methodischen Grenzen."
    ],
    "correct": [
      3
    ],
    "explanation": "Verlässliche Analysen brauchen nachvollziehbare Quellen, Datenqualität und transparente Grenzen."
  },
  {
    "id": "growth-02",
    "level": "notebook",
    "domain": "Product Intelligence",
    "question": "Auf welche Weise unterstützt die Product Intelligence die Entwicklung neuer digitaler Angebote bei CAPITAL-AI?",
    "options": [
      "Sie verbindet Kundeninteressen, technologische Möglichkeiten und Vertriebskanäle zur strukturierten Bewertung von Einsatzmöglichkeiten.",
      "Sie garantiert feste Renditen für alle aus den Produktkonzepten abgeleiteten Finanzangebote.",
      "Sie schließt künftige Nachfragevalidierungen und Wettbewerbsanalysen systematisch aus dem Entwicklungsprozess aus.",
      "Sie bildet die Basis für die gezielte Weiterentwicklung von Lernprodukten, Analysewerkzeugen und KI-gestützten Lösungen."
    ],
    "correct": [
      0,
      3
    ],
    "explanation": "Kundenbedarf, Technik und Vertrieb unterstützen die Produktvalidierung, nicht Renditegarantien."
  },
  {
    "id": "growth-03",
    "level": "notebook",
    "domain": "Knowledge Intelligence",
    "question": "Welches Kernprinzip verfolgt die Knowledge Intelligence beim Einsatz künstlicher Intelligenz im CAPITAL-AI Learning Hub?",
    "options": [
      "Wissen wird ausschließlich in Form von unstrukturierter Fachliteratur ohne Lernkonzepte bereitgestellt.",
      "Die Wissensaufbereitung beschränkt sich rein auf historische Lexikoneinträge unter Ausschluss interaktiver Lernwelten.",
      "Sämtliche Finanzbegriffe werden ohne menschliche Nachprüfung vollautomatisch generiert.",
      "Die KI unterstützt die Strukturierung von Wissen, ersetzt jedoch keinesfalls die fachliche Prüfung durch unbelegte Aussagen."
    ],
    "correct": [
      3
    ],
    "explanation": "KI unterstützt die Wissensstrukturierung; fachliche Prüfung und Belege bleiben notwendig."
  },
  {
    "id": "growth-04",
    "level": "notebook",
    "domain": "Content Intelligence",
    "question": "Welche Aspekte berücksichtigt die Content Intelligence bei der Erstellung redaktioneller Entwürfe und Kommunikationskonzepte?",
    "options": [
      "Die fachliche Relevanz und Verständlichkeit des Inhalts für unterschiedliche Formate.",
      "Die automatisierte Erstellung von Fachbegriffen zur Erhöhung der reinen Klickzahlen.",
      "Die Erstellung zielgruppengerechter Formate vom Fachartikel bis zur visuellen Erklärung.",
      "Die sorgfältige Berücksichtigung von Quellen und möglichen Nutzungsbeschränkungen."
    ],
    "correct": [
      0,
      2,
      3
    ],
    "explanation": "Relevanz, Zielgruppenorientierung und Quellenrechte gehören zusammen."
  },
  {
    "id": "growth-05",
    "level": "notebook",
    "domain": "Visual Intelligence",
    "question": "Wie stellt das CAPITAL-AI Universe Design in der Visual Intelligence sicher, dass komplexe Datenlandschaften verlässlich analysiert werden können?",
    "options": [
      "Simulationen, historische Daten und tatsächlich verfügbare Echtzeitinformationen bleiben stets eindeutig voneinander unterscheidbar.",
      "Dreidimensionale Modelle ersetzen sämtliche quantitativen Daten durch rein abstrakte Kunstobjekte.",
      "Die sieben Farbfamilien vermitteln direkt Rendite- und Risiko-Warnungen ohne begleitenden Text.",
      "Visualisierungen nutzen überwiegend grelle Neon-Effekte, um Informationshierarchien bewusst zu überdecken."
    ],
    "correct": [
      0
    ],
    "explanation": "Datenherkunft und Aktualität müssen unabhängig vom Design erkennbar bleiben."
  },
  {
    "id": "growth-06",
    "level": "notebook",
    "domain": "Search Intelligence",
    "question": "Worauf liegt der primäre Schwerpunkt der Search Intelligence im Hinblick auf die digitale Sichtbarkeit?",
    "options": [
      "Auf dem vollständigen Verzicht auf Keyword- und SEO-Analysen zugunsten rein zufälliger Publikationen.",
      "Auf der ausschließlichen Optimierung von Texten für Suchmaschinen-Crawler unter Ausschluss menschlicher Lesbarkeit.",
      "Auf der inhaltlichen Qualität, Zugänglichkeit und dem tatsächlichen Nutzen der Inhalte für die Zielgruppe statt rein auf Reichweite.",
      "Auf der künstlichen Maximierung von Klicks durch irreführende Suchbegriffe und automatisierte Spam-Links."
    ],
    "correct": [
      2
    ],
    "explanation": "Nachhaltige Sichtbarkeit verbindet Suchintention, Qualität und Zugänglichkeit."
  },
  {
    "id": "growth-07",
    "level": "notebook",
    "domain": "Social and Media Intelligence",
    "question": "Welcher Grundsatz gilt in der Social und Media Intelligence, wenn Fachinhalte für verschiedene Kommunikationskanäle aufbereitet werden?",
    "options": [
      "Jeder Kanal erfordert die Erfindung völlig neuartiger Fakten ohne Bezug zur primären Informationsquelle.",
      "Die inhaltliche Kernaussage und fachliche Genauigkeit bleiben über alle unterschiedlichen Medienformate hinweg vollständig erhalten.",
      "Für soziale Netzwerke dürfen Aussagen frei dramatisiert werden, sofern die Interaktionsrate steigt.",
      "Inhalte dürfen ausschließlich als unformatiertes Textmanuskript auf Social-Media-Kanälen geteilt werden."
    ],
    "correct": [
      1
    ],
    "explanation": "Kanalspezifische Formate dürfen die fachliche Kernaussage nicht verfälschen."
  },
  {
    "id": "growth-08",
    "level": "notebook",
    "domain": "Performance Intelligence",
    "question": "Welcher Grundsatz leitet die Messung von Wachstums-KPIs innerhalb der Performance Intelligence?",
    "options": [
      "Die Leistungsmessung beschränkt sich ausschließlich auf die Anzahl von Followern und ignoriert echte Produktnutzungen.",
      "Datenschutz und Einwilligungen bilden die Grundlage; fehlende Messwerte werden keinesfalls durch erfundene Ergebnisse ersetzt.",
      "Website-Besuche und Conversions werden ohne Rücksicht auf datenschutzrechtliche Vorgaben erfasst.",
      "Fehlende Messdaten werden automatisch durch geschätzte Erfolgs-KPIs ergänzt, um Lücken in Berichten zu füllen."
    ],
    "correct": [
      1
    ],
    "explanation": "Fehlende Messwerte müssen als fehlend ausgewiesen und Einwilligungen respektiert werden."
  },
  {
    "id": "growth-09",
    "level": "notebook",
    "domain": "Technology Intelligence",
    "question": "Nach welchen Hauptkriterien bewertet der Technologie-Radar im Rahmen der Technology Intelligence neue Open-Source-Werkzeuge, KI-Modelle und Plugins?",
    "options": [
      "Nach der Ähnlichkeit der Namensgebung mit bekannten Marken fremder Science-Fiction-Franchises.",
      "Nach ihrer technischen Sicherheit und Eignung für den bestehenden Systemverbund.",
      "Nach ihrem nachweisbaren Beitrag zur Verbesserung von Qualität, Interaktivität oder Effizienz.",
      "Nach ihren Lizenzbedingungen und der Eignung für den kommerziellen Einsatz."
    ],
    "correct": [
      1,
      2,
      3
    ],
    "explanation": "Sicherheit, Integrationsnutzen und Nutzungsrechte entscheiden über die Eignung."
  },
  {
    "id": "growth-10",
    "level": "notebook",
    "domain": "Trust Intelligence",
    "question": "Welche fundamentale Abgrenzung betont die Trust Intelligence in Bezug auf die von CAPITAL-AI bereitgestellten Inhalte und Werkzeuge?",
    "options": [
      "Sämtliche Modellgrenzen und Unsicherheiten werden verborgen, um das Vertrauen nicht zu schwächen.",
      "Automatisierte KI-Analysen garantieren einen gewinnbringenden Anlageerfolg für jeden Nutzer.",
      "Die Inhalte ersetzen keine individuelle Anlageberatung und beinhalten keine Renditegarantie.",
      "CAPITAL-AI übernimmt die rechtliche Haftung für alle vom Nutzer getätigten Anlageentscheidungen."
    ],
    "correct": [
      2
    ],
    "explanation": "Lern- und Analyseangebote sind keine individuelle Anlageberatung oder Renditezusage."
  },
  {
    "id": "growth-11",
    "level": "specialist",
    "domain": "Market Intelligence",
    "question": "Eine Marktkennzahl stammt aus einem historischen Snapshot. Wie sollte sie dargestellt werden?",
    "options": [
      "Als Live-Kurs, wenn der Wert plausibel ist.",
      "Mit Stichtag, Quelle und Hinweis auf den historischen Stand.",
      "Als Prognose für den nächsten Handelstag.",
      "Ohne Zeitangabe, sofern die Grafik verständlich ist."
    ],
    "correct": [
      1
    ],
    "explanation": "Ein Snapshot belegt nur seinen Beobachtungszeitpunkt."
  },
  {
    "id": "growth-12",
    "level": "specialist",
    "domain": "Product Intelligence",
    "question": "Welche Evidenz unterstützt die Priorisierung eines neuen Lernprodukts?",
    "options": [
      "Nur die Zahl technisch möglicher Funktionen.",
      "Ein positives Logo-Feedback ohne Nachfragebezug.",
      "Validierte Kundenprobleme, Nutzbarkeit und belegte Nachfrage.",
      "Ausschließlich die Zahl der geplanten Social Posts."
    ],
    "correct": [
      2
    ],
    "explanation": "Problemvalidierung, Nutzbarkeit und Nachfrage reduzieren Produktunsicherheit."
  },
  {
    "id": "growth-13",
    "level": "specialist",
    "domain": "Knowledge Intelligence",
    "question": "Welche Aufgaben erfüllen Quellen und RAG in einem Lernagenten?",
    "options": [
      "Relevante dokumentierte Inhalte für Antworten bereitstellen.",
      "Eine fachliche Nachprüfung bei unsicheren Aussagen unterstützen.",
      "Jede generierte Antwort automatisch als wahr zertifizieren.",
      "Die Herkunft verwendeter Aussagen nachvollziehbar machen."
    ],
    "correct": [
      0,
      1,
      3
    ],
    "explanation": "Retrieval liefert Kontext; Validierung und Quellenbezug bleiben notwendig."
  },
  {
    "id": "growth-14",
    "level": "specialist",
    "domain": "Content Intelligence",
    "question": "Wann ist ein erzeugtes Growth-Content-Paket zur Veröffentlichung freigegeben?",
    "options": [
      "Sobald ein Textentwurf einen Hash besitzt.",
      "Sobald der Content Engine Dry-Run erfolgreich ist.",
      "Sobald ein Modell eine hohe Qualität prognostiziert.",
      "Erst nach den anwendbaren Rechte-, Review- und Publisher-Freigaben."
    ],
    "correct": [
      3
    ],
    "explanation": "Ein hashgebundener Entwurf ist kein Publikationsnachweis."
  },
  {
    "id": "growth-15",
    "level": "specialist",
    "domain": "Visual Intelligence",
    "question": "Was muss eine interaktive Marktgrafik auch ohne Farben oder 3D-Bewegung vermitteln?",
    "options": [
      "Die wesentlichen Werte, Einheiten und Datenarten.",
      "Nur die gewählte Markenfarbe.",
      "Ausschließlich den Animationseffekt.",
      "Nur einen zusammengefassten Trend ohne Kontext."
    ],
    "correct": [
      0
    ],
    "explanation": "Text, Beschriftungen und verständliche Alternativen unterstützen barrierefreie Interpretation."
  },
  {
    "id": "growth-16",
    "level": "specialist",
    "domain": "Search Intelligence",
    "question": "Was ist beim Einsatz von UTM-Parametern im bestehenden Growth-Content-Vertrag sinnvoll?",
    "options": [
      "Interne Navigation als neue Akquisition markieren.",
      "Externe Social-Kampagnen mit konsistenter Kampagnen- und Content-ID kennzeichnen.",
      "Jede URL ohne Prüfung des Zielursprungs markieren.",
      "Personenbezogene Rohdaten als Kampagnenparameter senden."
    ],
    "correct": [
      1
    ],
    "explanation": "Der Vertrag beschränkt Akquisitions-UTMs auf externe Social-Entwürfe mit validierter Identität."
  },
  {
    "id": "growth-17",
    "level": "specialist",
    "domain": "Social and Media Intelligence",
    "question": "Welche Aussage beschreibt den DRAFT_ONLY-Pfad der Growth Engine korrekt?",
    "options": [
      "Er beweist erfolgreiche Live-Publikation.",
      "Er aktiviert automatisch kostenpflichtige Kanäle.",
      "Er erzeugt vorbereitete Inhalte ohne eigenständige Veröffentlichungsfreigabe.",
      "Er ersetzt den Social Media Engine Publisher."
    ],
    "correct": [
      2
    ],
    "explanation": "Entwurf, Freigabe, Veröffentlichung und Readback sind getrennte Schritte."
  },
  {
    "id": "growth-18",
    "level": "specialist",
    "domain": "Performance Intelligence",
    "question": "Welche Voraussetzungen sind bei der Korrelation eines Growth-Attribution-Ereignisses wichtig?",
    "options": [
      "Passende Kampagnen- und Content-Identität.",
      "Belegte Einwilligung im vorgesehenen Messpfad.",
      "Ersetzung fehlender Providerdaten durch plausible Werte.",
      "Passende Provider-Identität und unterstützte Ereignisquelle."
    ],
    "correct": [
      0,
      1,
      3
    ],
    "explanation": "Der bestehende Vertrag verwirft fehlende Einwilligung und falsche Identitäten oder Quellen."
  },
  {
    "id": "growth-19",
    "level": "specialist",
    "domain": "Technology Intelligence",
    "question": "Was ist der Nutzen persistenter Checkpoints in einem Agenten-Workflow?",
    "options": [
      "Sie umgehen nach einem Neustart alle Prüfungen.",
      "Sie ersetzen die Berechtigungsprüfung.",
      "Sie garantieren externe API-Verfügbarkeit.",
      "Sie ermöglichen die nachvollziehbare Wiederaufnahme eines gespeicherten Zustands."
    ],
    "correct": [
      3
    ],
    "explanation": "Checkpoints erhalten Ablaufzustände; Rechte und externe Wirkung müssen separat geprüft werden."
  },
  {
    "id": "growth-20",
    "level": "specialist",
    "domain": "Trust Intelligence",
    "question": "Welche Aussage gilt für VERIFIED_READ eines Providers?",
    "options": [
      "Ein erfolgreicher Lesezugriff belegt nicht automatisch Veröffentlichungsrechte.",
      "Er erlaubt jede Mutation beim Provider.",
      "Er beweist, dass alle zugehörigen Daten aktuell sind.",
      "Er ersetzt die Prüfung kommerzieller Nutzungsrechte."
    ],
    "correct": [
      0
    ],
    "explanation": "Lesen, Rechte, Aktualität und Publikation sind eigenständige Nachweise."
  },
  {
    "id": "growth-21",
    "level": "universal",
    "domain": "Market Intelligence",
    "question": "Was unterscheidet Korrelation von Kausalität?",
    "options": [
      "Korrelation garantiert eine Ursache.",
      "Kausalität ist lediglich ein anderer Name für Korrelation.",
      "Korrelation beschreibt einen Zusammenhang, ohne allein eine Ursache zu beweisen.",
      "Jede starke Korrelation schließt Störfaktoren aus."
    ],
    "correct": [
      2
    ],
    "explanation": "Gemeinsame Veränderung kann durch Störfaktoren oder Zufall entstehen."
  },
  {
    "id": "growth-22",
    "level": "universal",
    "domain": "Product Intelligence",
    "question": "Welches Vorgehen eignet sich, um eine Produktannahme zu überprüfen?",
    "options": [
      "Eine überprüfbare Hypothese formulieren und an repräsentativen Nutzersituationen testen.",
      "Eine Annahme allein aufgrund persönlicher Präferenz bestätigen.",
      "Nur positive Rückmeldungen auswerten.",
      "Die Erfolgskriterien erst nach dem Test beliebig ändern."
    ],
    "correct": [
      0
    ],
    "explanation": "Vorab definierte Kriterien und passende Tests machen Hypothesen überprüfbar."
  },
  {
    "id": "growth-23",
    "level": "universal",
    "domain": "Knowledge Intelligence",
    "question": "Wie sollte man eine KI-Antwort mit unklaren Quellen behandeln?",
    "options": [
      "Als gesichert weitergeben, wenn sie überzeugend klingt.",
      "Unsicherheit kennzeichnen und anhand unabhängiger Quellen prüfen.",
      "Die Quellenangaben entfernen.",
      "Nur anhand der Textlänge bewerten."
    ],
    "correct": [
      1
    ],
    "explanation": "Plausibilität ersetzt keine Verifikation."
  },
  {
    "id": "growth-24",
    "level": "universal",
    "domain": "Content Intelligence",
    "question": "Welche Eigenschaften verbessern die Qualität eines Fachartikels?",
    "options": [
      "Nachvollziehbare Quellen.",
      "Verständliche Gliederung und präzise Begriffe.",
      "Unbelegte Zuspitzung für Klicks.",
      "Transparente Unterscheidung von Fakten und Einschätzungen."
    ],
    "correct": [
      0,
      1,
      3
    ],
    "explanation": "Quellen, Struktur und klare Trennung von Fakten und Bewertungen fördern Verständlichkeit."
  },
  {
    "id": "growth-25",
    "level": "universal",
    "domain": "Visual Intelligence",
    "question": "Welche Informationen braucht ein aussagekräftiges Diagramm?",
    "options": [
      "Nur eine ansprechende Farbpalette.",
      "Nur einen Trendpfeil.",
      "Nur einen animierten Übergang.",
      "Beschriftete Achsen oder Kategorien, Einheiten und relevanten Kontext."
    ],
    "correct": [
      3
    ],
    "explanation": "Lesbare Beschriftungen und Kontext verhindern irreführende Interpretation."
  },
  {
    "id": "growth-26",
    "level": "universal",
    "domain": "Search Intelligence",
    "question": "Was beschreibt Suchintention am besten?",
    "options": [
      "Die Anzahl der Wörter im Seitentitel.",
      "Das Ziel oder Bedürfnis hinter einer Suchanfrage.",
      "Die Position eines Logos.",
      "Die Anzahl künstlich erzeugter Backlinks."
    ],
    "correct": [
      1
    ],
    "explanation": "Suchintention erklärt, welches Ergebnis Nutzer tatsächlich benötigen."
  },
  {
    "id": "growth-27",
    "level": "universal",
    "domain": "Social and Media Intelligence",
    "question": "Welche Anpassungen sind bei der Übertragung eines Fachartikels in ein Kurzvideo sinnvoll?",
    "options": [
      "Die Kernbotschaft beibehalten.",
      "Darstellung und Länge an das Medium anpassen.",
      "Quellen und erforderliche Rechte berücksichtigen.",
      "Fakten durch erfundene dramatische Behauptungen ersetzen."
    ],
    "correct": [
      0,
      1,
      2
    ],
    "explanation": "Mediengerechte Kürzung bewahrt fachlichen Sinn und Rechte."
  },
  {
    "id": "growth-28",
    "level": "universal",
    "domain": "Performance Intelligence",
    "question": "Eine Kampagne erzielt 20 Conversions bei 400 gemessenen Besuchen. Wie hoch ist die Conversion-Rate in diesem synthetischen Beispiel?",
    "options": [
      "0,5 %",
      "2 %",
      "5 %",
      "20 %"
    ],
    "correct": [
      2
    ],
    "explanation": "20 / 400 × 100 = 5 %; Zähler und Nenner müssen gleichartig abgegrenzt sein."
  },
  {
    "id": "growth-29",
    "level": "universal",
    "domain": "Technology Intelligence",
    "question": "Welche Aspekte gehören zur Bewertung einer externen API?",
    "options": [
      "Authentifizierung und Rechteumfang.",
      "Zuverlässigkeit, Limits und Fehlerverhalten.",
      "Lizenzbedingungen und Kosten.",
      "Ausschließlich die Bekanntheit des Anbieters."
    ],
    "correct": [
      0,
      1,
      2
    ],
    "explanation": "Technische, betriebliche und rechtliche Eigenschaften müssen zusammen betrachtet werden."
  },
  {
    "id": "growth-30",
    "level": "universal",
    "domain": "Trust Intelligence",
    "question": "Was bedeutet das Prinzip der geringsten Berechtigung (Least Privilege)?",
    "options": [
      "Jeder Dienst erhält Administratorrechte.",
      "Rechte bleiben dauerhaft aktiv, unabhängig vom Bedarf.",
      "Schreibrechte ersetzen alle Sicherheitsprüfungen.",
      "Ein Dienst erhält nur die Rechte, die er für seinen konkreten Zweck benötigt."
    ],
    "correct": [
      3
    ],
    "explanation": "Minimale Berechtigungen begrenzen Missbrauch und Auswirkungen von Fehlern."
  }
];

export function growthAnswerCorrect(question: Question, selection: readonly number[] = []): boolean {
  return selection.length === question.correct.length && new Set(selection).size === selection.length &&
    selection.every(value => question.correct.includes(value));
}

const levels: readonly Level[] = ['notebook', 'specialist', 'universal'];
const labels: Record<Level, string> = { notebook: 'NotebookLM · Grundlagen', specialist: 'CAPITAL-AI · Fachwissen', universal: 'Universal · Transferwissen' };

export function GrowthIntelligenceQuiz() {
  const [level, setLevel] = useState<Level>('notebook');
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [position, setPosition] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const questions = GROWTH_QUIZ_QUESTIONS.filter(item => item.level === level);
  const question = questions[position];
  const selection = answers[question.id] ?? [];
  const answered = questions.filter(item => (answers[item.id] ?? []).length > 0).length;
  const score = questions.filter(item => growthAnswerCorrect(item, answers[item.id])).length;
  const reset = (next: Level = level) => { setLevel(next); setAnswers({}); setPosition(0); setSubmitted(false); };
  const navigate = (next: number) => {
    setPosition(next);
    requestAnimationFrame(() => document.getElementById('growth-quiz-question')?.focus());
  };
  return (
    <section aria-labelledby="growth-quiz-title" className="space-y-5 rounded-xl border border-slate-700 p-4">
      <h3 id="growth-quiz-title" className="text-xl font-bold text-amber-200">Growth Intelligence Engine · Lernquiz</h3>
      <p className="text-sm text-slate-300">30 Fragen in drei Lernstufen. Die Antworten bleiben im Browserzustand; es erfolgt keine Übertragung und keine Anrechnung auf das private Vocabulary-Abzeichen. Kein offiziell anerkanntes Zertifikat, keine Anlageberatung.</p>
      <div>
        <label htmlFor="growth-quiz-level" className="block text-sm font-semibold text-slate-100">Lernstufe wählen (startet eine neue Runde)</label>
        <select id="growth-quiz-level" value={level} onChange={event => { const next = levels.find(value => value === event.target.value); if (next) reset(next); }} className="mt-2 min-h-11 w-full rounded-lg border border-slate-600 bg-slate-950 p-2 text-slate-100">
          {levels.map(value => <option key={value} value={value}>{labels[value]}</option>)}
        </select>
      </div>
      <p role="status" className="text-sm text-slate-300">{answered} von {questions.length} Fragen beantwortet.</p>
      {submitted ? (
        <div className="space-y-4">
          <p role="status" className="text-xl font-bold text-amber-200">{score} / {questions.length} richtig</p>
          {questions.map((item, index) => <article key={item.id} className="rounded-lg border border-slate-700 p-3 text-sm text-slate-200">
            <h4 className="font-semibold">{index + 1}. {item.question}</h4>
            <p>{growthAnswerCorrect(item, answers[item.id]) ? 'Richtig.' : 'Nicht richtig.'}</p>
            <p>Deine Antwort: {(answers[item.id] ?? []).map(i => item.options[i]).join('; ') || 'Nicht beantwortet'}</p>
            <p className="text-amber-100">Lösung: {item.correct.map(i => item.options[i]).join('; ')}</p>
            <p>{item.explanation}</p>
          </article>)}
          <button type="button" onClick={() => reset()} className="min-h-11 rounded-lg border border-amber-300 px-4 py-2 text-amber-100">Erneut üben</button>
        </div>
      ) : (
        <form onSubmit={event => { event.preventDefault(); if (answered === questions.length) setSubmitted(true); }} className="space-y-4">
          <p className="text-sm text-slate-300">{question.domain} · Frage {position + 1} von {questions.length}</p>
          <fieldset className="rounded-lg border border-slate-700 bg-slate-950 p-4">
            <legend id="growth-quiz-question" tabIndex={-1} className="px-1 font-semibold text-slate-100">{question.question}</legend>
            <p className="my-2 text-sm text-slate-300">{question.correct.length > 1 ? 'Wähle alle zutreffenden Antworten aus.' : 'Wähle eine Antwort aus.'}</p>
            {question.options.map((option, index) => <label key={index} className="flex min-h-11 cursor-pointer items-start gap-3 rounded-lg px-2 py-3 text-sm text-slate-100 hover:bg-white/5">
              <input type={question.correct.length > 1 ? 'checkbox' : 'radio'} name={question.id} checked={selection.includes(index)} onChange={event => {
                const checked = event.target.checked;
                setAnswers(previous => {
                  const current = previous[question.id] ?? [];
                  return { ...previous, [question.id]: question.correct.length === 1 ? [index] : checked ? [...new Set([...current, index])] : current.filter(value => value !== index) };
                });
              }} className="mt-1 h-4 w-4 shrink-0 accent-amber-400" />
              <span>{option}</span>
            </label>)}
          </fieldset>
          <div className="flex flex-wrap gap-3">
            <button type="button" disabled={position === 0} onClick={() => navigate(position - 1)} className="min-h-11 rounded-lg border border-slate-600 px-4 py-2 text-slate-100 disabled:opacity-40">Zurück</button>
            {position < questions.length - 1 ? <button type="button" disabled={!selection.length} onClick={() => navigate(position + 1)} className="min-h-11 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-40">Weiter</button> :
              <button type="submit" disabled={answered !== questions.length} className="min-h-11 rounded-lg bg-amber-400 px-4 py-2 font-semibold text-black disabled:opacity-40">Antworten auswerten</button>}
          </div>
        </form>
      )}
    </section>
  );
}
