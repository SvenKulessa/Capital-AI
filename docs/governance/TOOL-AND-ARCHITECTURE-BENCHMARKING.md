> **SUPERSEDED / NON-AUTHORIZING — 2026-10-07**
> Diese Datei bleibt nur als historische Dokumentation bzw. Evidence erhalten. Sie definiert keine zusätzlichen Gates, Admissions, Handoffs, Pflichtreviews oder Merge-/Deployment-Regeln. Die einzige autorisierende Repository-Richtlinie ist `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`.

# Tool & Architecture Benchmarking Contract

Stand: 2026-10-01
Status: verbindlich unterhalb `AGENTS.md@currentmain`

## Ziel

CAPITAL-AI benötigt nachvollziehbare, reproduzierbare Entscheidungen darüber, warum ein Tool, eine Anwendung, Runtime, API, Datenquelle, Infrastrukturkomponente oder Kombination daraus integriert, ersetzt oder verworfen wurde.

Benchmarks sind Decision Evidence. Sie ergänzen Security, Lizenz, Provenance und Governance; sie ersetzen diese Gates nicht.

## Benchmark-Design

Jeder Vergleich definiert vor der Messung:

1. Problem / Use Case
2. Kandidaten und exakte Versionen/Digests
3. Muss-Kriterien
4. Bewertete Qualitätsmerkmale
5. realistischer CAPITAL-AI-Workload / Fixture
6. Runner/Hardware/OS/Runtime
7. Messmethode und Wiederholungen
8. Akzeptanz- bzw. Regressionsbudgets

Keine nachträgliche Veränderung der Kriterien, um einen bevorzugten Kandidaten gewinnen zu lassen.

## Standardmetriken

Nur relevante Metriken auswählen, aber ausgelassene kritische Dimensionen begründen.

### Funktion
- Korrektheit
- Feature-/Policy-Abdeckung
- False Positives / False Negatives bei Scannern
- Fehler-/Edge-Case-Verhalten

### Performance
- wall-clock
- CPU time
- peak/average RSS
- Disk-/Artefaktgröße
- Netzwerkbedarf
- Startup/Warmup
- p50/p95/p99 Latenz, sofern service-relevant
- Durchsatz, sofern relevant
- cold/warm cache
- Skalierungsverhalten

### Web Performance
Für browser-/frontend-relevante Entscheidungen zusätzlich:
- initial/transferred JS/CSS
- route/chunk size
- parse/compile/evaluate cost
- Core-Web-Vitals-relevante Auswirkungen
- Main-thread blocking
- lazy-loading/code-splitting compatibility

### Engineering
- CI-Zeit
- Build-Zeit
- Cacheability
- Integrations-/Migrationsaufwand
- API-/Schema-Stabilität
- Debuggability
- Wartbarkeit
- Observability

### Trust
- offizielle Herkunft
- Artifact integrity / provenance
- Maintainer-/Community-Gesundheit
- CVE-/Security-Historie
- Dependency-/Binary-Surface
- Install-/Network-Verhalten
- Lizenz/Redistribution/Attribution
- SBOM-/Attestation-Fähigkeit

### Betrieb
- Ressourcenprofil
- Deployment-/Runtime-Kompatibilität
- Portabilität / Lock-in
- Recovery / Rollback
- Provider-Limits und Kosten, sofern relevant


## CAPITAL-AI Decision Score (CADS)

Der CADS normalisiert Benchmark-Ergebnisse auf 0–100 und macht Entscheidungen zwischen geeigneten Kandidaten vergleichbar. Er ist **Decision Evidence, keine Freigabe**.

### Dimensionen

| Dimension | GENERAL | SECURITY_GATE | WEB_RUNTIME | DATA_PIPELINE |
|---|---:|---:|---:|---:|
| Security & Trust | 25 | 35 | 20 | 25 |
| Funktion / Korrektheit | 20 | 25 | 15 | 20 |
| Performance & Ressourcen | 15 | 10 | 25 | 20 |
| Reliability / Operations | 10 | 10 | 10 | 10 |
| Maintainability / Integration | 10 | 5 | 10 | 10 |
| License / Provenance / Compliance | 10 | 10 | 5 | 5 |
| Evidence / Observability / Auditability | 5 | 5 | 5 | 5 |
| Portability / Cost / Exit | 5 | 0 | 10 | 5 |
| **Summe** | **100** | **100** | **100** | **100** |

Profile:
- `GENERAL@1`: allgemeine Tool-/Library-/API-Auswahl.
- `SECURITY_GATE@1`: Scanner, Browser-/Server-Boundaries, Auth-/Secret-/Supply-Chain-Gates.
- `WEB_RUNTIME@1`: Browser-, Frontend-, Runtime- und Delivery-Komponenten mit direkter Nutzer-Performance-Auswirkung.
- `DATA_PIPELINE@1`: Pipeline Builder, Datenprovider, Transformations-/Broker-/Scoring-Komponenten.

Neue Profile benötigen Versionierung und eine dokumentierte Begründung.

### Berechnung

Jede Dimension erhält einen normalisierten Score von 0 bis 100:

```text
CADS = Σ (dimensionScore × dimensionWeight) / 100
```

Rohmetriken bleiben erhalten. Eine Normalisierung muss ihre Formel/Schwellenwerte offenlegen; ein Score ohne Rohdaten und Methodik ist keine ausreichende Evidence.

### Non-compensable Gates

Vor einem CADS-Vergleich müssen alle Muss-Gates positiv sein. Mindestens:

- `SECURITY_TRUST_GATE`
- `FUNCTIONAL_CORRECTNESS_GATE`
- `LICENSE_PROVENANCE_GATE`
- `SUPPLY_CHAIN_GATE`

Je nach Einheit kommen weitere Gates hinzu, z. B. `AUTH_BOUNDARY_GATE`, `BROWSER_BOUNDARY_GATE`, `DATA_INTEGRITY_GATE` oder `PRODUCTION_COMPATIBILITY_GATE`.

Ein Kandidat mit einem BLOCKED Muss-Gate ist **nicht auswählbar**, unabhängig vom numerischen CADS. Der Score darf zur Diagnose gespeichert werden, muss dann aber als `decisionEligible:false` markiert sein.

### Security & Trust Subscore

Security wird nicht aus einem einzelnen Vulnerability-Scan abgeleitet. Der Subscore berücksichtigt je nach Tool:

- Herkunft, Publisher und Namespace,
- Signatur/Attestation/Integrity/Digest,
- CVEs, Advisories und Reaktionszeit,
- Dependency-/Binary-Surface,
- Install-/Postinstall- und Netzwerkverhalten,
- Maintainer-/Ownership-/Community-Risiken,
- Release-/Update-/Support-Modell,
- benötigte Berechtigungen und Privilegien,
- Zugriff auf Daten, Secrets, Dateisystem und Netzwerk,
- Sandbox-/Isolationseigenschaften,
- sichere Defaults und Fail-closed-Verhalten,
- Incident Response, Patchbarkeit und Rollback.

Kritische ungeklärte Befunde führen zum Gate-Fail und dürfen nicht lediglich als Punktabzug modelliert werden.

### Maschinenlesbare Score-Evidence

```json
{
  "schemaVersion": 1,
  "scoreModel": "CADS",
  "scoreProfile": "SECURITY_GATE@1",
  "candidate": {"name": "", "version": "", "artifactIdentity": ""},
  "decisionEligible": false,
  "gates": {
    "SECURITY_TRUST_GATE": "PENDING",
    "FUNCTIONAL_CORRECTNESS_GATE": "PENDING",
    "LICENSE_PROVENANCE_GATE": "PENDING",
    "SUPPLY_CHAIN_GATE": "PENDING"
  },
  "dimensions": {
    "securityTrust": {"weight": 35, "score": null, "evidence": []},
    "functionalCorrectness": {"weight": 25, "score": null, "evidence": []},
    "performanceResources": {"weight": 10, "score": null, "evidence": []},
    "reliabilityOperations": {"weight": 10, "score": null, "evidence": []},
    "maintainabilityIntegration": {"weight": 5, "score": null, "evidence": []},
    "licenseProvenanceCompliance": {"weight": 10, "score": null, "evidence": []},
    "evidenceObservabilityAuditability": {"weight": 5, "score": null, "evidence": []},
    "portabilityCostExit": {"weight": 0, "score": null, "evidence": []}
  },
  "weightedScore": null
}
```

Der Pipeline Builder soll dieses Modell später referenzieren können, ohne historische Scores als aktuelle Wahrheit zu behandeln. Score, Profil, Version, Datum, Source-SHA und Re-Evaluation-Trigger gehören zusammen.


## Reproduzierbarkeit

Benchmark-Evidence enthält mindestens:

```text
Benchmark-ID:
Datum:
Problem:
CURRENT_MAIN:
Kandidaten:
Version/Digest je Kandidat:
Fixture/Workload:
Runner/Hardware:
OS/Runtime:
Konfiguration:
Warmup:
Wiederholungen:
Messmethode:
Rohdaten:
Aggregierte Ergebnisse:
Security-Evidence:
License/Provenance-Evidence:
Trade-offs:
Entscheidung:
Rollback/Alternative:
Re-Evaluation Trigger:
```

Rohdaten sollen maschinenlesbar gespeichert werden. Aggregationen dürfen Rohdaten nicht ersetzen.

## Decision Record

Ein ADR/Decision Record beschreibt nicht nur den ausgewählten Kandidaten, sondern auch die belastbaren Gründe gegen oder für Alternativen. Keine pauschalen Rankings ohne gemeinsamen Workload.

Zulässige Entscheidung:
- Tool A wurde für Workload X in Version Y gewählt, weil es Muss-Kriterien M erfüllt und in reproduzierten Messungen Vorteile V bei akzeptierten Trade-offs T zeigte.

Nicht ausreichend:
- Tool A ist moderner/schneller/besser.

## Pipeline-Builder-Evidence

Der Pipeline Builder soll später je Node/Tool/API mindestens referenzieren können:

```json
{
  "component": "",
  "version": "",
  "artifactIdentity": "",
  "purpose": "",
  "interfaces": [],
  "benchmarkEvidence": "",
  "decisionRecord": "",
  "securityStatus": "",
  "licenseStatus": "",
  "provenanceStatus": "",
  "resourceProfile": "",
  "alternatives": [],
  "rollback": "",
  "reEvaluateOn": []
}
```

Dieses Schema ist ein Governance-Zielbild, noch kein Production-Schema. Änderungen daran benötigen Schema-Versionierung, sobald der Pipeline Builder es produktiv konsumiert.

## Browser Boundary / TypeScript 7

Für die Migration von TypeScript 7 gilt:

- TypeScript 7.0.2 bleibt der Zielcompiler.
- Die alte TypeScript-Compiler-API darf nicht als dauerhafte Compatibility-Bridge konserviert werden.
- Oxc/Oxlint wird als Kandidat gegen die bestehende Browser-Boundary-Suite gemessen.
- Die bestehende Sicherheitssemantik ist die Baseline: server-only Symbole, `process.env`, fehlende/ungültige Browser-Artefakte und fail-closed Verhalten.
- Kandidaten müssen mindestens dieselben sicherheitsrelevanten positiven und negativen Fixtures bestehen.
- Zusätzlich werden Laufzeit, CPU/RAM, Install-/Dependency-Surface, Binary-/Provenance-Evidence, Lizenz und CI-Auswirkung gemessen.
- Ein schnelleres Ergebnis mit schlechterer Detection ist kein Gewinn.
- Der bisherige Boundary-Gate wird erst ersetzt, wenn die neue Lösung funktional mindestens gleichwertig und Trust-/Lizenz-seitig freigabefähig ist.

## Ablage

Bevorzugt:

- `docs/governance/decisions/` für ADRs,
- `docs/benchmarks/<benchmark-id>/` für Methodik/Rohdaten/Aggregate,
- `security-reports/` für laufbezogene Security-Evidence.

Benchmark-Evidence muss den getesteten Source-SHA und die exakten Tool-Versionen/Digests referenzieren.
