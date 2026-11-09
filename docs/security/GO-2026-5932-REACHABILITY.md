# GO-2026-5932 Binary-Reachability / VEX Gate

Status: Implementierungsvertrag für Issue #120  
Domains: TRUST + PLATFORM

## Invariante

`GO-2026-5932` bleibt sichtbar und wird nicht per Trivy-Ignore, Severity-Änderung oder `--ignore-unfixed` unterdrückt. Die Bewertung ist standardmäßig `UNKNOWN`.

## Identitätskette

```
deploy/Dockerfile.nats
  -> nats:2.15.0-alpine@immutable digest
  -> local capital-nats:<tested SHA> image ID
  -> extracted /nats-server binary
  -> binary SHA256
  -> go version -m
  -> govulncheck binary/symbol mode
  -> independent go tool nm evidence
  -> GO_VULN_REACHABILITY@2
  -> OpenVEX + CycloneDX VEX
```

Ein neuer Repository-HEAD ist ausdrücklich kein NATS-Redeploy-Signal.

## Entscheidung

- `AFFECTED`: OpenPGP-Code/Symbole oder ein passender govulncheck-Finding-Pfad ist nachgewiesen.
- `NOT_AFFECTED`: nur bei vollständiger Identitätskette, Binary/Symbol-Modus, retained Trivy-Finding, negativem OpenPGP-Symbolnachweis und reproduzierbarem Zweitlauf. Die `not_affected`-VEX wird erst aus dieser Evidence erzeugt.
- `UNKNOWN`: alle unvollständigen oder widersprüchlichen Zustände.

Ein `UNKNOWN`-Ergebnis ist zulässige Evidence und blockiert nur eine Behauptung `NOT_AFFECTED`; es darf das Finding nicht verstecken.

## Reproduzierbarkeit

Die erzeugten Dateien werden als Security-Artefakte gesichert:
- `nats-go-2026-5932-reachability.json`
- `nats-go-2026-5932.openvex.json`
- `nats-go-2026-5932.cdx.vex.json`
- `nats-go-version-m-1.txt`
- `nats-nm-1.txt`
- `nats-reachability-image-identity.json`
- `nats-reachability-reproducible.txt`

Korrelation: Issue #120; PR #116 bleibt Verbraucher der Evidence und darf seinen bisherigen UNKNOWN-Status erst nach belastbarer Evidence ändern.

## Pause-Entscheidung 2026-11-06 (aktueller Owner-Auftrag)

**Status: DEFERRED / NOT_VERIFIED**, solange das versionierte `render.yaml` den Broker als `MARKET_BROKER_PAUSED=true` deklariert und NATS/Rust gemäß `AGENTS.md` nicht für produktive Marktdaten aktiviert sind.

Der `Docker Security Gate` führt während dieser Pause **keinen NATS-Image-Build, Runtime-/Disk-Smoke, eigenen Dockerfile-Lint, NATS-Binary-Scan, govulncheck oder Reachability-/VEX-Neunachweis** durch. Das öffentliche Artefakt `nats-image.public.json` muss `SKIPPED_PAUSED_NOT_VERIFIED` statt `PASS` melden. Source-, Build- und App-Runtime-Scans bleiben verpflichtend und werden nicht abgeschwächt. Auch ein historisches `NOT_AFFECTED` wäre nur an ein exakt geprüftes Binary gebunden.

**Reaktivierung:** Vor jeder erneuten produktiven Broker-Nutzung muss der Owner die erforderlichen Marktdatenrechte herstellen und die Pause in `render.yaml` bewusst beenden. Bei aktiver Repository-Konfiguration gilt wieder der bestehende NATS-Security-Pfad (PR-Diff-Scope; vollständiger Main-/Schedule-/Dispatch-Scan). Die Änderung eines Versionsstempels oder ein neuer App-Commit allein autorisiert keine NATS-Aktivierung. Eine externe manuelle Render-Aktivierung ohne korrespondierenden Repository-Readback ist damit **nicht automatisch ausgeschlossen oder verifiziert**; diese CI-Evidence ist kein Live-Attest.

Der frühere Befund `GO-2026-5932` mit ungeklärter Production-Erreichbarkeit bleibt als historische Evidence sichtbar und wird weder durch Ignore-Listen unterdrückt noch als behoben ausgegeben.
