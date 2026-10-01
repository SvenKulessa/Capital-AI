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
