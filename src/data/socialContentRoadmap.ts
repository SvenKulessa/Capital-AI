/** Social-Engine-Migration; Runtime- und Production-Abnahmen bleiben offen. */
import type { WorkPackage } from './roadmapData';

export const SOCIAL_CONTENT_WORK_PACKAGES: WorkPackage[] = [
  {
    "id": "CA-GROWTH-FIN-SOC-MARKET-MIGRATION",
    "title": "Finance Social Media Engine migrieren; MARKET/Data-Folgepaket vorbereiten",
    "owner": "GROWTH",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/8a08f938a519fbf3379749fd9ac59e182851e655/CAPITAL-AI-GROWTH/FINANCE-SOCIAL-MARKET-MIGRATION-WORKPACKAGE-20261005.md",
      "CAPITAL-AI-GROWTH/finance-social-market-source-target-manifest.json",
      "CAPITAL-AI-GROWTH/social-tool-license-evidence-20261006.json"
    ],
    "nextStep": "Punkt 4 Restgates schließen: exakten FFmpeg-/Poppler-Auslieferungsbuild sowie Qwen-/Chatterbox-/Whisper-Gewichtsrevisionen vollständig hash-binden; erst danach Social-Core/Renderer portieren.",
    "priority": "Kritisch",
    "leadName": "Owner + GROWTH/MARKET/PLATFORM/TRUST/PRODUCT",
    "targetSprint": "Sequenziell nach Lizenz-, Datenrechte- und Security-Gates",
    "description": "Das Source-to-Target-Dateimanifest und die erste exakte Social-Tool-Lizenz-Evidence sind gegen CURRENT_MAIN materialisiert. Finance-Scoring/Weighting/Data bleibt bis zum Social-Cutover ausdrücklich blockiert. Die Finance-SocialMediaEngine wird danach schrittweise migriert. Kommerzieller Kundenpfad und Owner-private Tool-Runtime bleiben strikt getrennt; Non-Commercial-Artefakte dürfen keine kommerziellen Outputs erzeugen.",
    "deliverables": [
      "SocialMediaEngine Contracts, Editing, deterministischen Media- und Publishing-Pfad zielkonform migrieren.",
      "Maschinenlesbare Tool-/Lizenz-Zulassung mit Commercial-, Owner-private-, Research- und BLOCKED-Modi durchsetzen.",
      "Finance-Scoring-, Gewichtungs- und Datenkonzepte nur als SHA-gebundenes Inventar für das nachgelagerte MARKET-Arbeitspaket erhalten; keine Runtime-Migration vor Social-Cutover.",
      "Lizenzierte Produktdokumentation und Third-Party-Notices für den auslieferbaren Funktionsumfang bereitstellen."
    ],
    "dependencies": [
      "CA-GROWTH-SOC-MIGRATION",
      "CA-TRUST-SOC-RIGHTS"
    ]
  },
  {
    "id": "CA-MARKET-FINANCE-SCORING-DATA-FOLLOWUP",
    "title": "Finance Scoring-, Gewichtungsmodelle und Datenkonzepte nach Social-Migration konvergieren",
    "owner": "MARKET",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "GEHALTEN",
    "evidenceRefs": [
      "CAPITAL-AI-GROWTH/finance-social-market-source-target-manifest.json",
      "CAPITAL-AI-GROWTH/FINANCE-SOCIAL-MARKET-MIGRATION-WORKPACKAGE-20261005.yaml"
    ],
    "nextStep": "Erst nach abgeschlossenem Social-Media-Engine-Cutover CURRENT_MAIN frisch korrelieren und daraus ein separates MARKET-Arbeitspaket für Finance-Scoring-, Gewichtungs- und Datenkonzepte materialisieren.",
    "priority": "Hoch",
    "leadName": "Owner + MARKET/TRUST/PLATFORM",
    "targetSprint": "Nach abgeschlossenem Social-Media-Engine-Cutover; vorher BLOCKED",
    "description": "Bewahrt die bereits inventarisierten Finance-Scoringmodelle, Faktor-/Gewichtungssemantik und implementierten Datenkonzepte als Folge-Backlog. Die spätere Umsetzung konvergiert ausschließlich in bestehende Capital-AI-Authorities und darf weder eine zweite Scoring-Authority noch Rechte-/Freshness-/Evidence-Gates umgehen.",
    "deliverables": [
      "Finance-ScoringModelRegistry- und ScoringDispatcher-Semantik gegen die eine kanonische Scoring-Authority deduplizieren.",
      "Finance-Gewichtungsmodelle und Faktorlogik mit reproduzierbarer Evidence, Kalibrierung und Replay vergleichen.",
      "Bereits implementierte Finance-Datenkonzepte wie ValidatedFinancialFeature, UniversalAssetAdapter und AnalysisConnectionRegistry gegen aktuelle Contracts konvergieren.",
      "Pattern-, Sentiment-, Momentum-, Regime- und Research-Modelle zunächst research-only halten; Promotion separat evidenzbasiert gaten.",
      "Datenrechte, Provenance, Freshness, Instrumentmanifest und MARKET_CLAIM_ELIGIBILITY vor jeder produktiven Nutzung fail-closed prüfen."
    ],
    "dependencies": [
      "CA-GROWTH-FIN-SOC-MARKET-MIGRATION",
      "CA-GROWTH-SOC-PILOT"
    ]
  },
  {
    "id": "CA-GROWTH-SOC-MIGRATION",
    "title": "Social Media Engine aus Finance prüfen und Migration vorbereiten",
    "owner": "GROWTH",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Datei-/Lizenzinventar und den benötigten Cutover-Umfang aus Finance festlegen; vorhandene SOCIAL-P0/P1/P2/P3-Nachweise übernehmen.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Audit, OSS-Recherche und Migrationsplan sind im Änderungssatz dokumentiert. Die Engine selbst ist noch nicht nach Capital-AI migriert.",
    "deliverables": [
      "Datei-/Lizenzinventar und den benötigten Cutover-Umfang aus Finance festlegen; vorhandene SOCIAL-P0/P1/P2/P3-Nachweise übernehmen."
    ],
    "dependencies": []
  },
  {
    "id": "CA-TRUST-SOC-RIGHTS",
    "title": "Content-, Modell-, Persona- und Distributionsrechte prüfen",
    "owner": "TRUST",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Je Kandidat Herkunft, Integrität, Advisories/Community, Lizenzen/NOTICEs und erlaubte Verwendungen dokumentieren; fehlende Rechte blockieren.",
    "priority": "Kritisch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Einzelprüfung von Code, Gewichten, Daten, Bildern, Stimmen, Musik, Persona, KI-Kennzeichnung und Providerbedingungen; keine Freigabe aus Repository-Lizenzlabel.",
    "deliverables": [
      "Je Kandidat Herkunft, Integrität, Advisories/Community, Lizenzen/NOTICEs und erlaubte Verwendungen dokumentieren; fehlende Rechte blockieren."
    ],
    "dependencies": [
      "CA-GROWTH-SOC-MIGRATION"
    ]
  },
  {
    "id": "CA-PLATFORM-SOC-FOUNDATION",
    "title": "Content-Jobs, Assets und ZITADEL-Adminzugriff aufbauen",
    "owner": "PLATFORM",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Persistenten Store/Object Storage gegen bestehende Verträge auswählen; Neustart, Redelivery, Rollen, Tenant-Isolation, SSRF und Budget testen.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Versionierte Content-/Job-/Assetverträge, dauerhafte Freigaben/Outbox und vorhandene JetStream-/Valkey-Anbindung. Keine Übernahme alter Supabase-Identitäten oder Secretwerte.",
    "deliverables": [
      "Persistenten Store/Object Storage gegen bestehende Verträge auswählen; Neustart, Redelivery, Rollen, Tenant-Isolation, SSRF und Budget testen."
    ],
    "dependencies": [
      "CA-GROWTH-SOC-MIGRATION",
      "CA-TRUST-SOC-RIGHTS"
    ]
  },
  {
    "id": "CA-GROWTH-SOC-COPY",
    "title": "Websitewissen in quellengestützte Social-Skripte umwandeln",
    "owner": "GROWTH",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Zwölf freigegebene Produkt-/Lernbriefs und Negativfixtures für erfundene Zahlen, fehlende Quellen und Längenüberschreitungen erstellen.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Freigegebene Produkt-/Releasequellen, deutsche Kanalvarianten, Hook, CTA und Claims mit Quellenbindung; optionaler lokaler LLM-Adapter.",
    "deliverables": [
      "Zwölf freigegebene Produkt-/Lernbriefs und Negativfixtures für erfundene Zahlen, fehlende Quellen und Längenüberschreitungen erstellen."
    ],
    "dependencies": [
      "CA-TRUST-SOC-RIGHTS",
      "CA-PLATFORM-SOC-FOUNDATION"
    ]
  },
  {
    "id": "CA-PLATFORM-SOC-MEDIA",
    "title": "Deterministische Bildkarten und Produktvideos portieren",
    "owner": "PLATFORM",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "CPU-Pilot mit Hashmanifest, Decode-/Codec-/Buildprofilprüfung, Safe Areas, A/V-/Caption-Timing und vollständig hörbarem Satzende abnehmen.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Pillow/FFmpeg, Design-Tokens, erlaubte Fonts, echte Produktansichten, Captions und technische Assetprüfung. Der bestehende MPEG-4-Encoder ist je Kanal abzunehmen.",
    "deliverables": [
      "CPU-Pilot mit Hashmanifest, Decode-/Codec-/Buildprofilprüfung, Safe Areas, A/V-/Caption-Timing und vollständig hörbarem Satzende abnehmen."
    ],
    "dependencies": [
      "CA-PLATFORM-SOC-FOUNDATION",
      "CA-GROWTH-SOC-COPY"
    ]
  },
  {
    "id": "CA-GROWTH-SOC-TTS",
    "title": "Deutsche Voice-over-Qualität und Podcast-Stimmen abnehmen",
    "owner": "GROWTH",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "GEHALTEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Chatterbox-Prosodie gegen akzeptiertes Beispiel 4 reparieren; Qwen-Kandidat mit exakter Modell-/Lizenzbindung vergleichen; neue immutable WAVs bewerten.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Finance dokumentiert sieben abgelehnte von acht Hörbeispielen. Neue deutsche Kandidaten benötigen Hör-PASS; ASR-PASS allein genügt nicht.",
    "deliverables": [
      "Chatterbox-Prosodie gegen akzeptiertes Beispiel 4 reparieren; Qwen-Kandidat mit exakter Modell-/Lizenzbindung vergleichen; neue immutable WAVs bewerten."
    ],
    "dependencies": [
      "CA-TRUST-SOC-RIGHTS",
      "CA-PLATFORM-SOC-FOUNDATION",
      "CA-GROWTH-SOC-COPY"
    ]
  },
  {
    "id": "CA-PLATFORM-SOC-GENVIDEO",
    "title": "Generative Bilder sowie Text-/Image-to-Video integrieren",
    "owner": "PLATFORM",
    "status": "planning",
    "phase": 4,
    "phaseName": "Phase 4: DevSecOps, Supply Chain & Release Candidate",
    "progressPercent": null,
    "evidenceState": "GEHALTEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Ressource und Budget festlegen; gepinnte Adapter/Gewichte/OCI-Digests mit echten Bild-/Videobenchmarks vergleichen.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "FLUX.2 klein 4B und Wan2.2 als getrennte geprüfte Worker; kein GPU-Modell im Webservice. Hardware, Kosten, Gewichte und Ergebnisqualität sind noch offen.",
    "deliverables": [
      "Ressource und Budget festlegen; gepinnte Adapter/Gewichte/OCI-Digests mit echten Bild-/Videobenchmarks vergleichen."
    ],
    "dependencies": [
      "CA-TRUST-SOC-RIGHTS",
      "CA-PLATFORM-SOC-FOUNDATION",
      "CA-PLATFORM-SOC-MEDIA"
    ]
  },
  {
    "id": "CA-PRODUCT-SOC-STUDIO",
    "title": "Redaktionsstudio mit Vorschau, Quellen und Freigaben integrieren",
    "owner": "PRODUCT",
    "status": "planning",
    "phase": 3,
    "phaseName": "Phase 3: Product, Account & Agent Integration",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Mobile/Desktop, Adminrollen und Cross-tenant-Verbote testen; Assetbytes an die konkrete Freigabe binden.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Deutschsprachige Entwurf-/Render-/Review-UX mit Quellen, Rechtezustand, Kosten, Assetvergleich und Widerruf; kein JSON-Export als fertiges Video.",
    "deliverables": [
      "Mobile/Desktop, Adminrollen und Cross-tenant-Verbote testen; Assetbytes an die konkrete Freigabe binden."
    ],
    "dependencies": [
      "CA-PLATFORM-SOC-FOUNDATION",
      "CA-GROWTH-SOC-COPY",
      "CA-PLATFORM-SOC-MEDIA"
    ]
  },
  {
    "id": "CA-GROWTH-SOC-UGC",
    "title": "Synthetische KI-UGC-Produktclips mit Presenter integrieren",
    "owner": "GROWTH",
    "status": "planning",
    "phase": 5,
    "phaseName": "Phase 5: Production Go-Live",
    "progressPercent": null,
    "evidenceState": "GEHALTEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Drei Produktclips mit Persona-/Voice-Rechten, sichtbarer KI-Herkunft, Lip-sync-, Audio- und Claim-Abnahme erzeugen.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Eigene synthetische Persona oder freigegebener Darsteller, geprüfte Stimme und MuseTalk-Lip-sync; keine erfundenen Kunden-/Profit-Testimonials.",
    "deliverables": [
      "Drei Produktclips mit Persona-/Voice-Rechten, sichtbarer KI-Herkunft, Lip-sync-, Audio- und Claim-Abnahme erzeugen."
    ],
    "dependencies": [
      "CA-TRUST-SOC-RIGHTS",
      "CA-PLATFORM-SOC-MEDIA",
      "CA-GROWTH-SOC-TTS",
      "CA-PLATFORM-SOC-GENVIDEO",
      "CA-PRODUCT-SOC-STUDIO"
    ]
  },
  {
    "id": "CA-PLATFORM-SOC-DISTRIBUTION",
    "title": "Freigegebene Inhalte zuverlässig kanalbezogen verteilen",
    "owner": "PLATFORM",
    "status": "planning",
    "phase": 5,
    "phaseName": "Phase 5: Production Go-Live",
    "progressPercent": null,
    "evidenceState": "GEHALTEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "YouTube/TikTok/Meta-Adapter korrigieren/neu prüfen; Tokenablauf, Teilfehler, UNKNOWN-Uploads, Redelivery und Doppelpost-Vermeidung testen.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Persistenter Scheduler, ein Publisher je Kanal, hashgebundene Freigabe, Provider-IDs und Abschlussprüfung. Automatisierung bleibt an Plattformrechte und zulässige Nutzerinteraktion gebunden.",
    "deliverables": [
      "YouTube/TikTok/Meta-Adapter korrigieren/neu prüfen; Tokenablauf, Teilfehler, UNKNOWN-Uploads, Redelivery und Doppelpost-Vermeidung testen."
    ],
    "dependencies": [
      "CA-TRUST-SOC-RIGHTS",
      "CA-PLATFORM-SOC-FOUNDATION",
      "CA-PLATFORM-SOC-MEDIA",
      "CA-PRODUCT-SOC-STUDIO"
    ]
  },
  {
    "id": "CA-GROWTH-SOC-PILOT",
    "title": "Automatisierte Content-Produktion und Verteilung abnehmen",
    "owner": "GROWTH",
    "status": "planning",
    "phase": 5,
    "phaseName": "Phase 5: Production Go-Live",
    "progressPercent": null,
    "evidenceState": "OFFEN",
    "evidenceRefs": [
      "https://github.com/SvenKulessa/Capital-AI/blob/867406f3aa9a478c14913ac731749fb33daeb9ac/CAPITAL-AI-GROWTH/SOCIAL-ENGINE-MIGRATION.md"
    ],
    "nextStep": "Freigegebenen Kanalpilot samt Provider-Endzustand, Wiederanlauf und Rückweg abnehmen; drei positive Validierungszyklen vor dauerhafter Self-Healing-Invariante.",
    "priority": "Hoch",
    "leadName": "Owner + zuständige Domain",
    "targetSprint": "Nach erfüllten Abhängigkeiten; nicht terminiert",
    "description": "Erster Pilot mit freigegebenen Text-/Bild-/Produktvideo-Paketen, echten Kennzahlen und Kosten. Generatives Video/UGC aktiviert zusätzlich seine separaten Gates. Finance bleibt bis Cutover-Abnahme verfügbar.",
    "deliverables": [
      "Freigegebenen Kanalpilot samt Provider-Endzustand, Wiederanlauf und Rückweg abnehmen; drei positive Validierungszyklen vor dauerhafter Self-Healing-Invariante."
    ],
    "dependencies": [
      "CA-GROWTH-SOC-COPY",
      "CA-PLATFORM-SOC-MEDIA",
      "CA-GROWTH-SOC-TTS",
      "CA-PRODUCT-SOC-STUDIO",
      "CA-PLATFORM-SOC-DISTRIBUTION"
    ]
  }
];
