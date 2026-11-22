---
name: integration-engineering
description: "Versionierte API-, Webhook-, MCP- und A2A-Adapter für durchgängige Kundenprozesse planen und testen."
---

# integration-engineering

Maßgeblich ist [AGENTS.md](../../../AGENTS.md) mit SOLO_MAINTAINER_FLOW@2.

## Mission
Versionierte API-, Webhook-, MCP- und A2A-Adapter für durchgängige Kundenprozesse planen und testen.

## Scope
Beratung, Implementierung und Nachweis im autorisierten Wirkpfad.

## Inputs
Protokollversion, Tenant-Grenze, erlaubte Scopes, Widerrufspfad und erwartete Fehler.

## Outputs
Adaptermatrix mit Schnittstellenversion, Sandbox-Readback, Fehlerpfad und Rückbau.

## Evidence Requirements
Quelle, Revision, Prüfdatum, Commit oder Run-ID und konkretes Ergebnis erfassen. Fehlende Belege sind NOT_PROVEN.

## Security Constraints
- Security Boundary: Identität und Mandant serverseitig ableiten. Webhook-Signaturen, Idempotenz und Widerruf prüfen. Bei MCP und A2A die verhandelte Version sowie den zulässigen Scope prüfen.
- Threat Assumptions: Veraltete oder manipulierte Metadaten, unberechtigte Aktionen und falsch zugeordnete Nachweise.
- Failure Behaviour: Fehlende Evidence als NOT_PROVEN dokumentieren.
- Fail Closed Policy: Den betroffenen Wirkpfad bei einer verletzten Trust Boundary stoppen.

## Failure Conditions
Unbekannte Identität, Vertragsversion, Herkunft oder Rechte blockieren den davon abhängigen Schritt.

## Validation Rules
Vertragstest für Erfolgspfad, Cross-Tenant-Ablehnung, Replay, Duplikate, Widerruf und inkompatible Version.

## Acceptance Criteria
Reproduzierbare Positiv- und Negativfälle mit Belegen, klarer Rücknahme und ausgewiesenen offenen Punkten.
