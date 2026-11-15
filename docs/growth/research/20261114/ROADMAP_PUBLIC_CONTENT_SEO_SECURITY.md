# Roadmap-Konzept: Öffentlicher Content-Schutz inkl. SEO-Sicherheitsprüfung
**Status:** PROPOSED  
**Arbeitspaket-ID:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Basis:** Read-only Prüfung von main  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## 1. Ausgangslage (VERIFIED)

Aktueller öffentlicher Stand (main) leakt keine offensichtlichen Secrets oder Eigentumsrechte. .gitignore, .env.example und README sind fail-closed ausgerichtet. Risiko liegt in zukünftigen Inhalten, Docs, generierten Medien und SEO-relevanten öffentlichen Seiten.

## 2. Erweiterung: SEO-Sicherheitsprüfung

Zusätzlich zum allgemeinen Content-Schutz werden öffentliche SEO-relevante Inhalte (Meta-Tags, Structured Data, Sitemap, robots.txt, öffentliche Landingpages, Learning-Inhalte) auf folgende Risiken geprüft:

- Unbeabsichtigte Offenlegung interner Pfade, Parameter oder Endpoints in Meta-Daten oder Structured Data.
- Indexierung sensibler oder nicht freigegebener Inhalte (Drafts, LICENSE_REVIEW_REQUIRED-Materialien).
- Fehlende oder irreführende robots.txt / noindex-Regeln für nicht-öffentliche Bereiche.
- Structured Data, das Eigentumsrechte oder unveröffentlichte Claims behauptet.
- Canonical- und Open-Graph-Daten, die interne oder nicht freigegebene Ressourcen referenzieren.

## 3. Roadmap-Phasen (erweitert)

### Phase 1 – Prävention (0–30 Tage)
- Secret-Scanning und Pattern-Blacklist.
- Dokumentations-Policy mit Statuskennzeichnung.
- Branding-/Lizenz-Gate.
- **SEO-Security-Checkliste:** robots.txt, noindex für Drafts, Structured-Data-Review, Meta-Tag-Audit.

### Phase 2 – Continuous Assurance (30–90 Tage)
- Monatlicher öffentlicher Content- und SEO-Audit.
- PR-Template-Pflichtfeld für öffentliche Inhalte.
- Allowlist für indexierbare Pfade.

### Phase 3 – Governance-Verankerung
- Risikobasierte Prüfung in bestehenden Gates.
- Jährliche Review inkl. SEO-Sicherheitsaspekte.

## 4. Arbeitspaket-Definition (für Roadmap / Control Center)

```ts
{
  id: 'CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY',
  title: 'Öffentlicher Content-Schutz und SEO-Sicherheitsprüfung',
  owner: 'GROWTH',
  status: 'planning',
  phase: 3,
  phaseName: 'Phase 3: Product, Account & Agent Integration',
  progressPercent: null,
  evidenceState: 'OFFEN',
  evidenceRefs: [
    'docs/growth/research/20261114/ROADMAP_PUBLIC_CONTENT_SEO_SECURITY.md',
    'docs/growth/research/20261114/BRANDING_CHECK_PROCESS.md',
    'docs/growth/research/20261114/CONTENT_ENGINE_IMAGE_LICENSE_POLICY.md',
  ],
  nextStep: 'SEO-Security-Checkliste operationalisieren und ersten Audit auf öffentlichen Seiten durchführen.',
  priority: 'Mittel',
  leadName: 'Projektowner',
  targetSprint: 'Nach Freigabe des Konzepts',
  description: 'Dauerhafte Absicherung, dass öffentlich sichtbare Inhalte (inkl. SEO-relevanter Seiten) keine Sicherheits- oder Eigentumsrechts-relevanten Informationen preisgeben.',
  deliverables: [
    'SEO-Security-Checkliste',
    'Periodischer Audit-Prozess',
    'Integration in Branding- und Lizenz-Gates',
    'Dokumentation im Roadmap-Kontext',
  ],
}
```

## 5. Start der Umsetzung

- Dieses Dokument dient als Grundlage für das Arbeitspaket.
- Erste operative Schritte: Checkliste für robots.txt, noindex und Structured Data erstellen.
- Keine Änderung an bestehenden Governance-Dateien.
- Status bleibt PROPOSED bis zur Maintainer-Freigabe.

**Abschluss:** Konzept erweitert und als Arbeitspaket definiert. Umsetzung gestartet mit der Dokumentation.
