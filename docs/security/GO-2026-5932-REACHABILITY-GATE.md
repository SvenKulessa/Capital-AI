# GO-2026-5932 — NATS Binary Reachability Gate

Stand: 2026-10-02  
Primary Domain: TRUST  
Cross-Domain: PLATFORM / MARKET

## Ziel

Trivys Finding `GO-2026-5932 / golang.org/x/crypto v0.57.0 / UNKNOWN` bleibt vollständig sichtbar. Es wird weder in `.trivyignore` aufgenommen noch auf eine andere Severity umgeschrieben.

Die zusätzliche Evidence beantwortet ausschließlich die engere Frage:

> Enthält das exakt aus dem gepinnten NATS-2.15.0-Image extrahierte Go-Binary ein von GO-2026-5932 betroffenes OpenPGP-Symbol?

## Gate

Der Workflow `NATS GO-2026-5932 Reachability`:

1. baut `deploy/Dockerfile.nats` mit dem bereits gepinnten NATS-Basisimage;
2. extrahiert exakt `/usr/local/bin/nats-server` und bildet dessen SHA-256;
3. weist per `go version -m` `golang.org/x/crypto v0.57.0` im Binary nach;
4. baut `govulncheck v1.8.0` aus dem offiziellen Go-Modul in einem immutable gepinnten Go-1.26.8-linux/amd64-Container;
5. führt `govulncheck -mode binary` auf genau diesem Binary aus;
6. archiviert Streaming-JSON und das direkt von govulncheck erzeugte OpenVEX;
7. klassifiziert `GO-2026-5932` fail-closed.

## NOT_AFFECTED-Kriterien

`NOT_AFFECTED` ist nur zulässig, wenn gleichzeitig:

- Binary-SHA gültig ist;
- das Binary exakt `x/crypto v0.57.0` enthält;
- govulncheck `scan_mode=binary` und `scan_level=symbol` meldet;
- GO-2026-5932 in der verwendeten Vulnerability-DB tatsächlich beobachtet wurde;
- ein OpenVEX-Statement für GO-2026-5932 vorhanden ist;
- dieses Statement `status=not_affected` mit einer standardisierten Reachability-Begründung enthält;
- kein betroffenes Symbol im Binary gemeldet wird.

Jede fehlende oder widersprüchliche Evidence ergibt `INCONCLUSIVE` und blockiert die Reachability-Abnahme. Ein gefundenes vulnerables Symbol ergibt `AFFECTED`.

## Interpretation

Govulncheck dokumentiert für den Binary-Modus, dass die Symboltabelle verwendet wird, um Findings auf tatsächlich im Binary vorhandene vulnerable Funktionen einzugrenzen. Binary-Analyse besitzt jedoch keine vollständigen Call-Graphs und kann konservative False Positives liefern. `NOT_AFFECTED` ist daher eine binär- und versionsgebundene VEX-Aussage, keine generelle Aussage über zukünftige NATS-Versionen.

Die OpenVEX-Evidence ergänzt Trivy. Sie ersetzt oder löscht das Trivy-Finding nicht.

## Tooling / Provenance

- govulncheck: `golang.org/x/vuln/cmd/govulncheck@v1.8.0`
- Lizenz: BSD-3-Clause
- Tool-Container: `golang:1.26.8-alpine@sha256:6e5de3f5b9fb7e30b8bb2ffe8dcbcbdaa2990f0f31267456eabe83f870a623be` (linux/amd64 manifest)
- Vulnerability DB: `https://vuln.go.dev`
- NATS: `nats:2.15.0-alpine@sha256:ac8f88a6494bffc2c2a5289a0ca61cb28a9145c11ba5677cf24265d07f46d8d4`

Kein Deploy, Restart, GHCR-Publish, Render-Mutation oder Trivy-Suppression ist Bestandteil dieses Gates.
