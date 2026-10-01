# OIDC PR #95 — Observability Evidence

Stand: 2026-10-01T21:43:00Z  
Domain: TRUST · Cross-Domain: PLATFORM  
Contract: `OIDC_VERIFICATION_STATE@1`

## Ergebnis

Der aktuelle Zustand bleibt **BLOCKED**. Die vorliegenden Daten belegen **keinen bestätigten OIDC-Runtime-Fehler**, sondern eine fehlende positive Auth-Evidence.

PR #95 wurde am `2026-10-01T20:13:50Z` gemerged. Der live laufende Render-Deploy `dep-dauri23ncjis738243fg` wurde bereits am `2026-10-01T01:36:09Z` erstellt und verwendet weiterhin den GHCR-Index-Digest `sha256:53c47463dfdb9e66721be1c997769d9fae3e6ca0e8a3fdd8cf77074785a08d23`. Die vorhandene Digest-Evidence ordnet diesem Runtime-Image den Source-SHA `4fbd1373b07092ed8ef550f60e9cf60f1f3f526d` zu. Damit ist PR #95 **nicht in der aktuell beobachteten Runtime korreliert**.

## CI-/Workflow-Evidence

- PR-Check `Domain Governance`: PASS, Run `36918060218`.
- PR-Check `Docker Build Sicherheit`: PASS, Run `36918060341`.
- Post-Merge `Post-Merge Correlation`: PASS, Run `36920049411`.
- Post-Merge `Docker Build Sicherheit`: PASS, Run `36920048513`.
- In den 100 jüngsten Actions-Runs zwischen `17:35:04Z` und `21:42:57Z` liegen 50 Runs nach dem Merge von #95.
- In diesem Zeitraum wurde **kein** `Render CLI read-only verification`-Run beobachtet.

Diese Checks belegen Code-/Governance-Integrität, **nicht** Credential-Authentifizierung oder echten Login.

## Render Telemetry / Observability

Beobachtungsfenster: `2026-10-01T18:30:00Z` bis `2026-10-01T21:43:00Z`.

- Keine App-Logs mit OIDC/OAuth/ZITADEL/Auth/Callback/Token/Session-Mustern.
- Keine Request-Logs auf Auth-Pfaden.
- Keine HTTP-Request-Metrikserie für:
  - `/api/auth/login`
  - `/api/auth/callback`
  - `/api/auth/session`
- CPU- und Memory-Zeitreihen sind vorhanden. Sie zeigen, dass die Service-Instanz läuft, sind aber **keine Auth-Evidence**.

## Observability-Lücke im aktuellen Auth-Code

`server/auth.mjs` erzeugt bei Fehlern nur einen redigierten Phasenhinweis:

`OIDC authentication failed at <phase>`

Die Phasen umfassen `callback_validation`, `discovery`, `token_exchange`, `token_validation` und `session_creation`.

Für einen erfolgreichen Ablauf existiert dagegen **kein nicht-sensitives Success-Audit-Event**. Deshalb kann aus den Runtime-Logs aktuell kein positiver Nachweis für:

1. Credential-/Token-Endpoint-Authentifizierung,
2. erfolgreiche Callback-Verarbeitung,
3. validiertes ID-Token,
4. Session-Erstellung

abgeleitet werden.

## Gate-Entscheidung

| Gate | Status |
| --- | --- |
| Konfiguration vorhanden | nicht frisch re-observed |
| Discovery verifiziert | nicht frisch re-observed |
| Credential Authentication | **nicht verifiziert** |
| Login / Callback / ID Token / Session | **nicht verifiziert** |
| Gesamtstatus | **BLOCKED** |

Das entspricht der fail-closed Semantik von `OIDC_VERIFICATION_STATE@1`.

## Nächste Validierungskette

1. Attestiertes Image **mit PR #95** deployen und Source-SHA ↔ OCI-Digest ↔ Render-Deploy-ID ↔ Current Main korrelieren.
2. Danach den manuellen Read-only-OIDC-Workflow ausführen; Evidence bleibt auf Booleans/State/IDs beschränkt, ohne Secrets oder Tokens.
3. Einen dedizierten synthetischen OIDC-Testnutzer verwenden und Callback, Token-Exchange, ID-Token-Prüfung und Session-Erstellung mit redigierter Success-Telemetrie nachweisen.
4. Synthetic-Login-Evidence mit Render-Request-Metriken/Logs sowie `changeId`/Run-ID korrelieren.
5. Self-Healing/Auto-Repair erst nach **mindestens drei unabhängigen positiven Validierungszyklen** promoten.

## Sicherheitsgrenzen

- Kein Secret-/Tokenwert wurde in dieser Evidence gespeichert.
- Kein `id-token: write` wurde ergänzt.
- Keine ZITADEL-, Render-, DNS-, Billing-, NATS- oder Production-Konfiguration wurde verändert.
- Diese Evidence ist **keine Auth- oder Production-Freigabe**.

## Vorbereitete nächste TRUST-Stufe

Der Branch enthält nun zusätzlich eine identifier-freie Success-Telemetrie für die drei nachweisrelevanten Phasen:

- `OIDC authentication verified at token_exchange`
- `OIDC authentication verified at token_validation`
- `OIDC authentication verified at session_creation`

Die Meldungen enthalten keine Codes, Tokens, Client-Credentials, Subjects, Nonces oder Session-IDs. Der bestehende synthetische OIDC-End-to-End-Test prüft die exakte Eventfolge und testet explizit auf Secret-/Token-/Subject-Leakage.

Für die spätere Self-Healing-Promotion steht `scripts/validate-oidc-positive-cycles.mjs` bereit. Der Validator bleibt fail-closed und setzt `selfHealingPromotionEligible:true` erst bei mindestens drei vollständigen, voneinander unabhängigen positiven Zyklen mit getrennten Validation- und Run-IDs. Ein einzelner grüner Lauf oder duplizierte Evidence kann die Grenze nicht erfüllen.

Diese Änderungen erzeugen noch **keine Live-OIDC-Freigabe**: Das attestierte Image mit diesen Änderungen muss erst über die bestehende Digest-Handoff-Kette deployt und anschließend gegen echte, redigierte Runtime-Evidence validiert werden.
