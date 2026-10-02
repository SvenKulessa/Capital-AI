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
- `NOT_AFFECTED`: nur bei vollständiger Identitätskette, Binary/Symbol-Modus, retained Trivy-Finding und expliziter `not_affected`-VEX-Evidence.
- `UNKNOWN`: alle unvollständigen oder widersprüchlichen Zustände.

Ein `UNKNOWN`-Ergebnis ist zulässige Evidence und blockiert nur eine Behauptung `NOT_AFFECTED`; es darf das Finding nicht verstecken.

## Reproduzierbarkeit

Die erzeugten Dateien werden als Security-Artefakte gesichert:
- `nats-go-2026-5932-reachability.json`
- `nats-go-2026-5932.openvex.json`
- `nats-go-2026-5932.cdx.vex.json`
- `nats-go-version-m.txt`
- `nats-go-nm.txt`

Korrelation: Issue #120; PR #116 bleibt Verbraucher der Evidence und darf seinen bisherigen UNKNOWN-Status erst nach belastbarer Evidence ändern.
