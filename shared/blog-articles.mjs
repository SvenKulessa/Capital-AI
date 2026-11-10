/** Original public editorial content; shared by the website and its HTTP fallback. */
export const BLOG_ARTICLES = [
  {
    "id": "x-api-expansions-kosten",
    "path": "/blog/x-api-expansions-kosten",
    "title": "X-API-Expansions: Datenkosten verstehen und Quellen sicher prüfen",
    "description": "Warum zusätzlich geladene X-API-Objekte ab November 2026 kostenrelevant sind und wie sichere, sparsame Abfragen geplant werden.",
    "date": "2026-11-06",
    "image": "/learning/editorial/x-api-kostenbewusst-20261106.svg",
    "imageAlt": "Schematische Übersicht: ein Post, eine geprüfte Quelle und eine Kostenkontrolle als getrennte Schritte.",
    "intro": "Eine Datenabfrage ist nicht immer nur eine Datenabfrage. Über sogenannte Expansions können zu einem X-Post weitere Objekte geliefert werden – etwa das Autorenprofil. Ab dem 22. November 2026 sollen auch diese zusätzlich gelieferten Objekte nach dem Pay-Per-Use-Modell berechnet werden. Für verantwortungsvolle Analyse zählt deshalb nicht nur, welche Information verfügbar ist, sondern auch, wofür sie benötigt wird.",
    "sections": [
      {
        "title": "1. Was sind Expansions?",
        "body": "Eine Post-Abfrage kann beispielsweise eine Autorenkennung enthalten. Eine Expansion ergänzt das zugehörige Benutzerobjekt in derselben API-Antwort. Das ist bequem, weil die Daten zusammen ankommen. Es kann aber zusätzliche nutzungsabhängige Kosten auslösen. Die Preise unterscheiden sich je Ressourcentyp; maßgeblich sind die aktuellen Angaben im X Developer Portal."
      },
      {
        "title": "2. Warum weniger Daten nicht immer sicherer sind",
        "body": "Manche Felder sind für die Qualität einer Quelle entscheidend. Bei einer manuell angegebenen Post-Adresse kann ein Abgleich von Post-Kennung, Autorenkennung und Benutzername helfen, die Quelle korrekt zuzuordnen. Auch öffentlich oder geschützt ist eine relevante Unterscheidung. Zusätzliche Informationen nur aus Spargründen zu entfernen, ohne die Prüfung anderweitig abzusichern, wäre kein belastbares Qualitätskonzept."
      },
      {
        "title": "3. Kostenbewusst und nachprüfbar planen",
        "body": "Eine gute Datenstrategie benennt vor dem Abruf genau die benötigten Objekte, begrenzt den Umfang und berücksichtigt mögliche Wiederholungen. Für ein einfaches Rechenbeispiel nennt die veröffentlichte X-Preisliste 0,005 US-Dollar je Post Read und 0,010 US-Dollar je User Read. Ein Post plus ein zusätzlich berechneter Autor könnte damit 0,015 US-Dollar kosten; Deduplizierung, Kontotyp und aktuelle Konditionen können die Rechnung verändern. Das ist ein Beispiel, keine Aussage über den Verbrauch von CAPITAL-AI."
      },
      {
        "title": "4. Vom externen Hinweis zum redaktionellen Inhalt",
        "body": "Öffentliche Inhalte aus sozialen Netzwerken sind zunächst externe Quellen, keine geprüften Finanzfakten. Ein verantwortlicher Ablauf trennt Auswahl, Quellenprüfung, eigene Einordnung und redaktionelle Freigabe. Automatische Veröffentlichung oder die Übernahme fremder Texte lässt sich aus dem Vorliegen einer URL nicht ableiten. Insbesondere Finanzthemen brauchen verständliche Grenzen, einen Zeitbezug und Angaben zu Datenrechten."
      },
      {
        "title": "5. Lernen statt undurchsichtiger Leistungsversprechen",
        "body": "CAPITAL-AI erläutert Grundlagen von Datenqualität, Indikatoren und nachvollziehbaren Analysen im Lernbereich. Technische Erweiterungen, Providerrechte, operative Nutzung und echte Reichweitenzahlen dürfen nicht allein aus einem Konzept abgeleitet werden. Wer eine Analyse besser verstehen möchte, beginnt mit Quelle, Datenzeitpunkt, Unsicherheit und der Frage, welche Informationen wirklich erforderlich sind."
      }
    ],
    "sources": [
      {
        "label": "X Developer: Pay-per-use-Preise und Credit-Verbrauch",
        "url": "https://docs.x.com/x-api/getting-started/pricing"
      },
      {
        "label": "X Developer: Post per ID abrufen",
        "url": "https://docs.x.com/x-api/posts/get-post-by-id"
      },
      {
        "label": "CAPITAL-AI: Kostenlose Lerninhalte und Datenqualität",
        "url": "https://capital-ai.online/learning"
      }
    ]
  },
  {
    "id": "barrierefreie-finanzcharts",
    "path": "/blog/barrierefreie-finanzcharts",
    "title": "Barrierefreie Finanzcharts: Vier Informationswege statt nur einer Kurve",
    "description": "Wie Textalternativen, nachvollziehbare Datenherkunft und Tastaturbedienung Finanzcharts verständlicher machen.",
    "date": "2026-10-10",
    "image": "/learning/editorial/chart-accessibility-20261010.svg",
    "imageAlt": "Vier Informationswege: visueller Chart, Textalternative, Datenherkunft und Tastaturzugang. Synthetisches Lernschema ohne echte Kursdaten.",
    "intro": "Ein Chart lässt sich schnell überfliegen – solange man die Linien sehen kann und versteht, welche Daten hinter ihnen stehen. Für barrierefreie Finanzanalyse reichen Farben und Kurven jedoch nicht. Menschen, die Screenreader, Tastatur, hohe Vergrößerung oder kleine Displays verwenden, brauchen gleichwertige Informationen.",
    "sections": [
      {
        "title": "1. Das Diagramm",
        "body": "Eine visuelle Darstellung macht Trends und Strukturen erkennbar. Farben dürfen nicht der einzige Informationsträger sein; Beschriftungen, Muster und unterscheidbare Linien helfen zusätzlich. Die Darstellung muss auf dem Smartphone ohne Informationsverlust lesbar bleiben."
      },
      {
        "title": "2. Die Textalternative",
        "body": "Ein aussagekräftiger Kurztext beschreibt Zweck, Datenbasis und wesentliche Aussage. Für komplexe Finanzcharts benötigt der Nutzer gegebenenfalls einen längeren erklärenden Text und eine strukturierte Datentabelle. Ein bloßes „Chart“ als Alternativtext reicht nicht."
      },
      {
        "title": "3. Die Datenherkunft",
        "body": "Ein gutes Finanzdiagramm kennzeichnet Instrument, Einheit, Zeitraum, Zeitstempel und Anbieter. Synthetische Beispiele müssen ausdrücklich als solche erkennbar bleiben. Die im CAPITAL-AI-Learning-Portal verwendeten Chartlektionen dürfen nicht als reale Kursbeobachtungen dargestellt werden."
      },
      {
        "title": "4. Tastatur und lesbare Detailinformationen",
        "body": "Interaktive Zeiträume, Datenpunkte und Tooltips sollten ohne Maus zugänglich sein. Fokusreihenfolge, sichtbare Fokusmarkierung und sinnvolle Statusansagen ermöglichen die Bedienung auch jenseits des Touchscreens."
      },
      {
        "title": "Was CAPITAL AI davon ableitet",
        "body": "Dies sind überprüfbare Entwicklungsziele, keine Behauptung einer abgeschlossenen WCAG-Abnahme. Konkrete Kriterien sind semantische Beschriftungen, verständliche Textäquivalente, mobile Safe Areas, Testfälle mit Tastatur und Screenreader sowie die klare Trennung synthetischer Lernkurven von lizenzierten Marktdaten."
      }
    ],
    "sources": [
      {
        "label": "W3C: Web Content Accessibility Guidelines 2.2",
        "url": "https://www.w3.org/TR/WCAG22/"
      },
      {
        "label": "W3C: Understanding Non-text Content",
        "url": "https://www.w3.org/WAI/WCAG22/Understanding/non-text-content.html"
      }
    ]
  },
{
  "id": "datenkonzept-blueprint",
  "path": "/blog/datenkonzept-blueprint",
  "title": "Datenkonzept-Blueprint: Von der Quelle zum nachvollziehbaren Score",
  "description": "Datenquellen, Zeitbezug, Qualitätsregeln und Scoring als verständliches Datenkonzept planen. Mit synthetischem Beispiel und Blueprint-Dokumentation.",
  "date": "2026-10-14",
  "image": "/branding/badges/data-pipeline-blueprint.svg",
  "imageAlt": "Capital-AI Data-Pipeline-Blueprint: schematisch verbundene Datenkomponenten.",
  "intro": "Ein Datenkonzept beschreibt, welche Daten eine Analyse benötigt und wie aus ihnen eine nachvollziehbare Kennzahl entsteht. Ein Blueprint verbindet diese fachlichen Entscheidungen mit den Verarbeitungsschritten. Für Lernende und Teams ist zuerst die Herkunft jedes Ergebnisses entscheidend.",
  "sections": [
    {
      "title": "1. Einen Datenvertrag festlegen",
      "body": "Ein synthetischer Datensatz enthält Instrument, Ereigniszeit in UTC, Abrufzeit, Einheit und Quelle. Ein Preis von 100 ohne Währung und Zeitpunkt ist nicht eindeutig. Fehlende Werte bleiben unbekannt; sie werden nicht stillschweigend durch null ersetzt. Zugängliche APIs erlauben nicht automatisch die kommerzielle Weitergabe."
    },
    {
      "title": "2. Verarbeitung und Fehlerpfade beschreiben",
      "body": "Ein Beispielpfad lautet: Quelle prüfen, Felder validieren, Zeitstände abgleichen, Faktoren normalisieren und Score berechnen. Jeder Schritt hat Eingaben, Ausgaben und einen Fehlerfall. Bei veralteten Daten oder fehlenden Nutzungsrechten wird die betroffene Berechnung ausgesetzt. Der Blueprint dokumentiert diese Entscheidung."
    },
    {
      "title": "3. Ein Ergebnis erklären und weiterlernen",
      "body": "Zu einem synthetischen Score gehören Faktoren, Gewichtungen, Datenabdeckung und Berechnungsstand. In Capital-AI zeigen die öffentlichen Lernschritte diese Grundlagen; die Blueprint-Dokumentation ergänzt Architekturbeispiele. Ein Dokumentationsbeispiel ist keine Zusage eines lieferbaren Datenprodukts oder lizenzierter Live-Daten."
    }
  ],
  "sources": [
    {
      "label": "Kostenlose Lernschritte: Datenqualität und Gewichtung",
      "url": "https://capital-ai.online/learning#learning-methodology"
    },
    {
      "label": "Blueprint-Dokumentation und Beispiele erkunden",
      "url": "https://capital-ai.online/marketscreener/dokumentation"
    },
    {
      "label": "Learning-Angebot, Preis und Zugang prüfen",
      "url": "https://capital-ai.online/learning#learning-offer"
    },
    {
      "label": "Datenrechte und Provider-Lizenzen",
      "url": "https://capital-ai.online/datenprovider-lizenzen"
    }
  ]
},
{
  "id": "screener-scoring-lernen",
  "path": "/blog/screener-scoring-lernen",
  "title": "Screener-Scoring lernen: Faktoren, Gewichtung und Datenabdeckung",
  "description": "Wie ein gewichteter Screener-Score entsteht und welche Grenzen er hat. Synthetisches Rechenbeispiel, Datenabdeckung und kostenlose Lernschritte.",
  "date": "2026-10-14",
  "image": "/branding/badges/screener-bundle-blueprint.svg",
  "imageAlt": "Capital-AI Screener-Blueprint mit verbundenen Faktoren und Summensymbol.",
  "intro": "Ein Screener ordnet Instrumente anhand festgelegter Kriterien. Ein Score verdichtet mehrere Faktoren zu einer Kennzahl. Wer die Zahl einordnen möchte, braucht die Faktoren, ihre Skalen und die Regeln für fehlende Daten. Ein hoher Demo-Score ist kein Kaufsignal.",
  "sections": [
    {
      "title": "1. Faktoren vergleichbar machen",
      "body": "Umsatzwachstum und Schwankung verwenden unterschiedliche Einheiten. Vor einer Zusammenfassung müssen Richtung und Skala festgelegt werden. Bei Min-Max-Normalisierung ergibt ein Wert von 30 zwischen 10 und 50 den normierten Wert 0,50. Gleiche Grenzen erzeugen einen Nenner von null und damit keinen gültigen Faktor."
    },
    {
      "title": "2. Gewichteten Score nachvollziehen",
      "body": "Synthetisches Beispiel: Drei normierte Faktoren 0,80, 0,40 und 0,60 erhalten die Gewichte 0,50, 0,30 und 0,20. Daraus ergibt sich 0,50 × 0,80 + 0,30 × 0,40 + 0,20 × 0,60 = 0,64. Die Gewichte summieren sich zu eins. Eine andere Gewichtung verändert das Ranking und muss begründet werden."
    },
    {
      "title": "3. Datenabdeckung und Grenzen prüfen",
      "body": "Fehlt ein Faktor, darf die volle Datenabdeckung nicht behauptet werden. Ausschluss, Mindestabdeckung oder eine dokumentierte Neugewichtung sind verschiedene Methoden. Ein Backtest benötigt historische Zeitstände und darf keine später bekannt gewordenen Informationen verwenden. Die Lernbeispiele erklären Methoden; sie belegen keine Rendite oder aktuelle Marktdaten."
    }
  ],
  "sources": [
    {
      "label": "Kostenlose Scoring-Lernschritte öffnen",
      "url": "https://capital-ai.online/learning#gewichtung"
    },
    {
      "label": "Enterprise-Scorer-Demo ansehen",
      "url": "https://capital-ai.online/marketscreener/scorer"
    },
    {
      "label": "Learning-Angebot und Quizzes prüfen",
      "url": "https://capital-ai.online/learning#learning-offer"
    },
    {
      "label": "Finanzbegriffe kostenlos nachschlagen",
      "url": "https://capital-ai.online/vocabulary"
    }
  ]
}
];
export const blogArticleForPath = path => BLOG_ARTICLES.find(article => article.path === path) ?? null;
