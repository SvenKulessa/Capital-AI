/** Original public editorial content; shared by the website and its HTTP fallback. */
export const BLOG_ARTICLES = [
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
  }
];
export const blogArticleForPath = path => BLOG_ARTICLES.find(article => article.path === path) ?? null;
