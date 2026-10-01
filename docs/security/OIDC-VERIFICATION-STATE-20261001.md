# OIDC_VERIFICATION_STATE@1 — Fail-Closed OIDC-Abnahme

Stand: 2026-10-01. Primary Domain: TRUST. Cross-Domain: PLATFORM.

## Problem

Der bisherige Read-only-Workflow konnte einen technisch grünen OIDC-Diagnoseschritt erzeugen, obwohl nur Konfiguration und Discovery geprüft waren. `scripts/diagnose-oidc.mjs` meldete dabei ausdrücklich `loginVerified:false`. Ein solcher Lauf ist keine vollständige OIDC-Abnahme.

## Verbindlicher Zustand

`OIDC_VERIFICATION_STATE@1` trennt:

1. Konfiguration vorhanden,
2. Discovery kompatibel,
3. Credential-Authentifizierung tatsächlich verifiziert,
4. echten Login-/Callback-/ID-Token-/Session-Ablauf verifiziert.

Die Gesamtentscheidung ist nur bei allen vier Nachweisen PASS. Konfigurations- oder Discovery-Evidence allein darf den Gesamtgate nicht grün setzen.

## Aktueller Projektzustand

Die vorhandene Diagnose kann Konfiguration und Discovery prüfen, besitzt aber noch keinen belastbaren Nachweis einer tatsächlichen Credential-Authentifizierung und keinen automatisierten echten Login-Nachweis. Der Gesamtzustand ist deshalb fail-closed **BLOCKED/FAIL**.

Der bisherige grüne Diagnosezustand wird rückwirkend nicht umetikettiert. Historische Workflow-Evidence bleibt unverändert; ihre Interpretation wird präzisiert: sie belegt Konfigurations-/Discovery-Preflight, nicht vollständige OIDC-Verifikation.

## Sicherheitsgrenzen

- Keine Secret- oder Tokenwerte in Logs, Summary, Evidence oder Repository.
- Kein `id-token: write` allein zur Beseitigung eines roten Gates.
- GitHub-Actions-OIDC und ZITADEL-Anwendungs-OIDC sind getrennte Trust-Flows.
- Keine Identity-Provider-Mutation in diesem Slice.
- Kein Production-, DNS-, Billing- oder NATS-Deploy.
- Automatische Reparatur bleibt aus; Promotion erst nach mindestens drei unabhängigen positiven Validierungen.

## Nächster Nachweis

Ein späterer TRUST-Slice muss die tatsächlich verwendete Credential-Art feststellen und anschließend einen sicheren, redigierten Authentifizierungsnachweis sowie einen echten Login-/Callback-/Session-Test erzeugen. Erst dann darf `LOGIN_VERIFIED` den Gesamtstatus grün setzen.

## Observability-Evidence zu PR #95

Die aktuelle Telemetrie-/Runtime-Korrelation ist unter
`docs/security/evidence/oidc-pr95-observability-20261001/` dokumentiert.

Ergebnis: **BLOCKED**. Der live laufende Render-Deploy wurde vor dem Merge von PR #95 erstellt, nach dem Merge wurde kein `Render CLI read-only verification`-Run beobachtet, und die aktuelle Auth-Observability besitzt keinen nicht-sensitiven Success-Audit-Event für Token-Validierung und Session-Erstellung. Deshalb darf aus bestehender Konfiguration oder einem früher erfolgreichen manuellen Login keine vollständige OIDC-Abnahme abgeleitet werden.
