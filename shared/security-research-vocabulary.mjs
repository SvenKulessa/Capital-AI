/** Public SECURITY_RESEARCH@1 terminology; no app detection claims or private data. */
export const SECURITY_RESEARCH_VOCABULARY = Object.freeze([
  {
    "id": "learning-null-denominator",
    "term": "Null-Nenner",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Einsteiger",
    "shortDefinition": "Ein Nenner von null macht eine Verhältniskennzahl nicht berechenbar; 0/0 darf nicht als 0 % ausgegeben werden.",
    "detailedExplanation": "Bei einer Fehlalarmrate FPR = FP/(FP+TN) ist die Rate nicht definiert, wenn keine gutartigen Referenzfälle vorhanden sind. Ein Auswertungssystem gibt dann NOT_PROVEN zurück und trifft keine Freigabeentscheidung.",
    "formulaOrRule": "FPR = FP/(FP+TN); FP+TN = 0 → NOT_PROVEN.",
    "practicalExample": "Ein synthetischer Testlauf enthält weder FP noch TN. Die FPR-Anzeige bleibt nicht bewertbar.",
    "keyTakeaway": "Null-Nenner sind fehlende Evidenz, keine gute Performance.",
    "searchTags": [
      "Null-Nenner",
      "Division durch null",
      "Undefined denominator",
      "0/0",
      "FPR"
    ],
    "thesaurus": [
      "Division durch null",
      "undefinierter Quotient",
      "nicht berechenbare Rate"
    ],
    "sources": [
      {
        "title": "Primärquelle / Fachreferenz",
        "url": "https://www.itl.nist.gov/div898/handbook/"
      }
    ]
  },
  {
    "id": "learning-clopper-pearson-upper-bound",
    "term": "Clopper–Pearson-Obergrenze",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Fortgeschritten",
    "shortDefinition": "Exakte einseitige Konfidenzobergrenze für eine binomiale Ereigniswahrscheinlichkeit, etwa die Fehlalarmrate.",
    "detailedExplanation": "Die 95%-Obergrenze quantifiziert Stichprobenunsicherheit bei unabhängigen Bernoulli-Beobachtungen mit gemeinsamer Rate. Null beobachtete Fehlalarme bedeuten keine bewiesene FPR von null. Abhängige Wiederholungen dürfen nicht als unabhängige Stichproben gezählt werden.",
    "formulaOrRule": "Bei FP=0 und n=FP+TN>0: U95 = 1 − 0,05^(1/n).",
    "practicalExample": "Bei null Fehlalarmen in 299 unabhängigen synthetischen gutartigen Fällen beträgt U95 ungefähr 0,997 %.",
    "keyTakeaway": "Die obere Grenze ist eine Unsicherheitsgrenze und keine Messung der realen App-Leistung.",
    "searchTags": [
      "Clopper Pearson",
      "Clopper-Pearson",
      "exakte Binomialgrenze",
      "FPR Konfidenzintervall",
      "upper confidence bound"
    ],
    "thesaurus": [
      "exakte Binomialgrenze",
      "einseitiges Konfidenzintervall",
      "FPR-Obergrenze"
    ],
    "sources": [
      {
        "title": "Primärquelle / Fachreferenz",
        "url": "https://www.itl.nist.gov/div898/handbook/prc/section2/prc241.htm"
      }
    ]
  },
  {
    "id": "learning-system-on-chip-soc",
    "term": "System-on-Chip (SoC)",
    "category": "MOBILE_RUNTIME",
    "categoryLabel": "Mobile & Runtime",
    "level": "Einsteiger",
    "shortDefinition": "Integrierter Chip mit mehreren Systemkomponenten, etwa CPU, GPU und Kommunikationsfunktionen.",
    "detailedExplanation": "Die genaue Ausstattung variiert je Hersteller und Gerät. Sicherheitslücken in Modem, Treiber oder anderen Chipkomponenten können eigene Firmware- und OEM-Patches erfordern; eine App ohne privilegierten Zugriff kann deren internen Zustand nicht vollständig prüfen.",
    "formulaOrRule": "SoC = integrierte Hardwarekomponenten auf einem Chip.",
    "practicalExample": "Ein Android-Sicherheitsbulletin nennt eine SoC-Komponente; die Gerätebetroffenheit muss über Hersteller- und Patchnachweise geklärt werden.",
    "keyTakeaway": "Ein allgemeiner CVE-Eintrag beweist keine konkrete Gerätekompromittierung.",
    "searchTags": [
      "SoC",
      "System on Chip",
      "Smartphone Prozessor",
      "Chipset",
      "Android Firmware"
    ],
    "thesaurus": [
      "Systemchip",
      "Chipsatz",
      "integrierter Schaltkreis"
    ],
    "sources": [
      {
        "title": "Primärquelle / Fachreferenz",
        "url": "https://source.android.com/docs/security/bulletin/asb-overview"
      }
    ]
  },
  {
    "id": "learning-digital-object-identifier-doi",
    "term": "Digital Object Identifier (DOI)",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Einsteiger",
    "shortDefinition": "Dauerhafter Identifikator für digitale wissenschaftliche Objekte wie Fachartikel.",
    "detailedExplanation": "Eine DOI verweist über einen Resolver auf einen registrierten Eintrag. Sie eignet sich zur Quellenzuordnung und Deduplizierung, beweist aber weder Peer-Review noch Studienqualität.",
    "formulaOrRule": "Beispiel: 10.3389/frai.2026.1964400; Resolver: https://doi.org/…",
    "practicalExample": "Zwei Webseiten mit derselben DOI werden im Forschungsradar als dieselbe Publikation behandelt.",
    "keyTakeaway": "Eine DOI identifiziert eine Quelle, nicht ihre Belastbarkeit.",
    "searchTags": [
      "DOI",
      "Digital Object Identifier",
      "doi.org",
      "Publikationskennung",
      "wissenschaftliche Quelle"
    ],
    "thesaurus": [
      "Publikationsidentifikator",
      "persistente Kennung",
      "Quellen-ID"
    ],
    "sources": [
      {
        "title": "Primärquelle / Fachreferenz",
        "url": "https://www.doi.org/the-identifier/what-is-a-doi/"
      }
    ]
  },
  {
    "id": "learning-arxiv-identifier",
    "term": "arXiv-ID",
    "category": "DATA_EVIDENCE",
    "categoryLabel": "Daten & Evidence",
    "level": "Einsteiger",
    "shortDefinition": "Eindeutige Kennung eines wissenschaftlichen Beitrags im Preprint-Archiv arXiv.",
    "detailedExplanation": "arXiv-Versionen derselben Arbeit tragen die gleiche Basiskennung mit möglichem Versionssuffix v2 oder v3. Preprints sind nicht automatisch peer-reviewed. Für den Forschungsradar werden Basis-ID und Version getrennt erfasst.",
    "formulaOrRule": "Beispiel: arXiv:2607.23272v2 → Basis-ID 2607.23272, Version 2.",
    "practicalExample": "Zwei Versionen desselben Preprints werden nicht als zwei neue Publikationen gezählt.",
    "keyTakeaway": "Eine arXiv-ID ist ein Deduplizierungsschlüssel, kein Qualitätszertifikat.",
    "searchTags": [
      "arXiv-ID",
      "arxiv id",
      "Preprint",
      "arXiv Version",
      "Forschung"
    ],
    "thesaurus": [
      "Preprint-Kennung",
      "arXiv-Identifikator",
      "Forschungs-ID"
    ],
    "sources": [
      {
        "title": "Primärquelle / Fachreferenz",
        "url": "https://info.arxiv.org/help/arxiv_identifier.html"
      }
    ]
  }
]);
