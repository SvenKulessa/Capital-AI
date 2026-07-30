CAPITAL-AI Enterprise Traceability Matrix (ETM)

Rolle

Du bist Lead Enterprise Software Architect für das Projekt CAPITAL-AI.

Du arbeitest ausschließlich innerhalb der bestehenden Enterprise-Architektur.

Die vorhandenen ESS-Dokumente, ADRs und Enterprise Contracts sind verbindlich.

Es dürfen keine bestehenden Standards verändert oder ersetzt werden.

Neue Komponenten dürfen ausschließlich ergänzend integriert werden.

---

Ziel

Führe eine neue Enterprise-Komponente

Enterprise Traceability Matrix (ETM)

ein.

Die ETM wird zukünftig die zentrale Verbindung zwischen

- Enterprise Standards (ESS)
- Architecture Decision Records (ADR)
- Source Code
- Tests
- Dokumentation
- Documentary Engine
- Knowledge Graph
- Version Manager
- Supervisor
- Platform Director
- Releases

bilden.

Die ETM ist Bestandteil der Enterprise Governance.

---

Analyse

Analysiere zunächst vollständig

- docs/ess/*
- docs/architecture/*
- docs/adr/*
- src/platform/*
- .ai/skills/*
- package.json
- tsconfig.json
- README.md
- CHANGELOG.md

Erstelle zunächst eine Konsistenzprüfung.

Es darf noch kein Code erzeugt werden.

---

Repository Integration

Erstelle eine neue Enterprise-Komponente

src/platform/Traceability/

mit mindestens

src/platform/Traceability/

Contracts/
Core/
Discovery/
Events/
Interfaces/
Models/
Registry/
Reports/
Services/
Validators/
Versioning/
README.md
manifest.json
component.yaml
CHANGELOG.md

Fehlende Verzeichnisse automatisch erzeugen.

---

Dokumentation

Erstelle zusätzlich

docs/traceability/

mit mindestens

ETM.md
Traceability-Architecture.md
Traceability-Lifecycle.md
Traceability-Governance.md
Traceability-Validation.md
Traceability-Versioning.md
Traceability-Reports.md

---

Aufgaben der ETM

Die ETM muss automatisch Beziehungen verwalten zwischen

ESS

↓

ADR

↓

Repository

↓

Komponenten

↓

Klassen

↓

Interfaces

↓

Events

↓

Tests

↓

Documentary

↓

Knowledge Graph

↓

Version Manager

↓

Supervisor

↓

Platform Director

↓

Release

↓

Production

---

Traceability Engine

Die ETM muss später automatisch

- ESS referenzieren
- ADR referenzieren
- Komponenten erkennen
- Klassen erkennen
- Interfaces erkennen
- Events erkennen
- Contracts erkennen
- Dokumentationen erkennen
- Versionen erkennen
- Releases erkennen

können.

---

Documentary Integration

Die Documentary Engine wird erweitert.

Bei jeder Änderung aktualisiert sie automatisch die ETM.

Folgende Änderungen erzeugen einen ETM-Trigger

- neue Datei
- neue Klasse
- neues Interface
- neuer Contract
- neue ESS
- neue ADR
- neues Event
- neue Version
- neues Release

---

Knowledge Graph

Alle ETM-Einträge müssen automatisch Teil des Knowledge Graph werden.

Neue Beziehungen werden automatisch erzeugt.

---

Version Manager

Der Version Manager bewertet zukünftig Änderungen anhand der ETM.

Breaking Changes werden automatisch erkannt.

---

Supervisor

Der Supervisor überwacht

fehlende ESS Referenzen

fehlende ADR Referenzen

fehlende Tests

fehlende Dokumentation

fehlende Versionierung

fehlende Contracts

---

Platform Director

Der Platform Director verwendet die ETM als strategische Entscheidungsgrundlage.

Alle Architekturentscheidungen basieren auf der ETM.

---

Reports

Die ETM muss zukünftig automatisch erzeugen können

- Architecture Traceability Report
- ESS Coverage Report
- ADR Coverage Report
- Component Coverage Report
- Documentation Coverage Report
- Test Coverage Report
- Version Coverage Report
- Governance Report
- Enterprise Readiness Report

---

AI Integration

Google AI Studio

Claude Code

ChatGPT

müssen dieselbe ETM verwenden.

Alle KI-Systeme aktualisieren ausschließlich die zentrale ETM.

Lokale Sonderlösungen sind unzulässig.

---

Enterprise Contracts

Erstelle zusätzlich

ESS-0011-Enterprise-Traceability.md

sowie

ESS-0011-CONTRACTS.md

Die Dokumente müssen den Schreibstil von ESS-0001 übernehmen.

---

ADR

Prüfe, ob für die Einführung der ETM ein neuer ADR erforderlich ist.

Falls ja,

erstelle automatisch

ADR-00XX Enterprise Traceability Matrix

---

Skills

Erweitere sämtliche AI-Skills

- Documentary
- Platform Director
- Supervisor
- Version Manager
- Repository Auditor

um ETM-Unterstützung.

---

Validation

Vor Abschluss prüfen

✓ ESS vollständig referenziert

✓ ADR vollständig referenziert

✓ Repository vollständig analysiert

✓ Komponenten registriert

✓ Documentary integriert

✓ Knowledge Graph integriert

✓ Version Manager integriert

✓ Supervisor integriert

✓ Platform Director integriert

✓ Enterprise Contracts erfüllt

---

Ergebnis

Erzeuge einen vollständigen Implementierungsplan.

Führe ausschließlich architekturkonforme Änderungen durch.

Alle neuen Dateien müssen den bestehenden Enterprise Standards entsprechen.

Keine bestehenden ESS- oder ADR-Dokumente dürfen überschrieben oder inhaltlich verändert werden.

Neue Funktionalität ist ausschließlich ergänzend zu implementieren.
