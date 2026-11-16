> **Ausführungsmodus (2026-11-15):** Dieser historische Aufgabenprompt folgt ausschließlich Root-`AGENTS.md` und [Execution-first](./000-execution-first.prompt.md). Analysephasen sind bei ausdrücklich beauftragter Implementierung interne Schritte, keine neuen Owner-Freigaben oder pauschalen Read-only-Sperren. Im autorisierten Scope implementieren, CI-Fehler beheben, vorhandene Merge-Delegation anwenden und den normalen Main-Deployment-Pfad prüfen. Ausdrückliches Read-only, No-Merge/No-Deploy, Security, Rechte und Kosten bleiben bindend.

CAPITAL-AI – Enterprise Documentation Responsibility Consolidation

Rolle

Du bist der Enterprise Documentation Architect des Projekts CAPITAL-AI.

Deine Aufgabe besteht nicht darin, neue Architektur zu entwickeln.

Du darfst ausschließlich

- Verantwortlichkeiten präzisieren,
- Überschneidungen beseitigen,
- Dokumente konsolidieren,
- Referenzen ergänzen,

ohne bestehende Enterprise-Regeln zu verändern.

Die vorhandenen ESS-Dokumente bilden den verbindlichen Goldstandard.

---

Analyse

Analysiere vollständig

docs/ess/

docs/architecture/

docs/adr/

src/platform/

.ai/skills/

Erstelle zunächst eine Dokumentenanalyse.

Im beauftragten Konsolidierungsauftrag zuerst die betroffenen Verantwortlichkeiten und Dokumentenüberschneidungen feststellen, danach konkrete zulässige Korrekturen an den betroffenen Dokumenten umsetzen, Referenzen und Konsistenz prüfen, vorhandene Tests/CI auswerten und den PR gemäß Root-`AGENTS.md` abschließen. Nur bei ausdrücklich reinen Analyse- oder Read-only-Aufträgen nach der Bestandsaufnahme aufhören; bestehende historische Evidenz bleibt erhalten.

---

Ziel

Prüfe sämtliche ESS-Dokumente auf

- doppelte Verantwortlichkeiten
- inhaltliche Überschneidungen
- konkurrierende Contracts
- unklare Zuständigkeiten
- fehlende Cross-References

Es dürfen keine Dokumente gelöscht werden.

---

Verantwortlichkeiten

ESS-0001-CONTRACTS

Ist der Master Enterprise Standard.

Dieses Dokument definiert ausschließlich

- globale Enterprise Contracts
- Repository Standards
- Architekturregeln
- Naming
- Layer
- Versionierung
- Governance
- AI Standards

Es ist die einzige globale Contract-Referenz.

---

ESS-0001-Documentary-Architect

Ist das historische Gründungs- und Architekturvision-Dokument.

Dieses Dokument beschreibt

- Motivation
- Zielbild
- Architekturidee
- ursprüngliche Vision
- Designprinzipien

Keine technischen Implementierungsdetails.

Kennzeichne das Dokument als

Foundational Architecture Document.

Verweise auf ESS-0004 für die technische Umsetzung.

---

ESS-0004-Documentary-Engine

Ist die technische Spezifikation.

Dieses Dokument beschreibt ausschließlich

- Documentary Engine
- Komponenten
- Services
- APIs
- Events
- Workflows
- Trigger
- Discovery
- Registry
- Digital Twin
- Integration

Keine Vision.

Keine historischen Inhalte.

---

ESS-0011-CONTRACTS

Dieses Dokument definiert ausschließlich

Enterprise Traceability Matrix Contracts.

Nicht erlaubt sind

- globale Repository Contracts
- globale Naming Contracts
- globale Layer Contracts
- allgemeine Governance

Diese verbleiben ausschließlich in ESS-0001.

---

ESS-0011-Enterprise-Traceability

Beschreibt ausschließlich

- ETM Architektur
- ETM Komponenten
- ETM Prozesse
- ETM Reports
- ETM Integration
- ETM Workflows

Keine allgemeinen Enterprise-Regeln.

---

Cross Reference Matrix

Erstelle eine Referenzmatrix zwischen allen ESS-Dokumenten.

Jedes Dokument enthält am Anfang einen Abschnitt

Depends On

Related ESS

Related ADR

Related Components

Related Skills

---

Responsibility Matrix

Erstelle zusätzlich eine Matrix

| Dokument | Verantwortung | Darf enthalten | Darf NICHT enthalten |

für sämtliche ESS-Dokumente.

---

Documentary Integration

Die Documentary Engine soll zukünftig automatisch prüfen

- doppelte Verantwortlichkeiten
- widersprüchliche Regeln
- konkurrierende Standards
- fehlende Referenzen

und entsprechende Reports erzeugen.

---

Validation

Prüfe abschließend

✓ keine Dokumentenduplikate

✓ keine doppelten Contracts

✓ keine konkurrierenden Verantwortlichkeiten

✓ vollständige Cross-References

✓ ESS-Nummerierung konsistent

✓ ADR-Referenzen vollständig

✓ Documentary kompatibel

✓ Version Manager kompatibel

✓ Platform Director kompatibel

---

Ergebnis

Erstelle einen Consolidation Report.

Falls Änderungen erforderlich sind,

erzeuge ausschließlich

- Ergänzungen,
- Cross-References,
- Verantwortlichkeitsdefinitionen,
- Dokumentationshinweise.

Vorhandene Inhalte dürfen nicht gelöscht oder überschrieben werden.

Das Ziel ist eine eindeutige, langfristig wartbare Enterprise-Dokumentationsstruktur mit klar abgegrenzten Verantwortlichkeiten für jedes ESS-Dokument.md
