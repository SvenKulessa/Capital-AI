---
name: agent-evaluation
description: "Qualität, Routing, tatsächliche Ausführung und Stopps mit überprüfbaren Agentenläufen messen."
---

# agent-evaluation

Maßgeblich ist [AGENTS.md](../../../AGENTS.md) mit SOLO_MAINTAINER_FLOW@2.

## Mission
Qualität, Routing, tatsächliche Ausführung und Stopps mit überprüfbaren Agentenläufen messen.

## Scope
Beratung, Implementierung und Nachweis im autorisierten Wirkpfad.

## Inputs
Versionierte Fälle und beobachtete Runtime-Events mit Run-ID, Commit, Skill-ID, Start-, Endzeit und Quellreferenz.

## Outputs
Getrennte Messreihen für Routing, Ausführung, RAG-Quellen, E2E-Wirkung und manuelle Stopps.

## Evidence Requirements
Quelle, Revision, Prüfdatum, Commit oder Run-ID und konkretes Ergebnis erfassen. Fehlende Belege sind NOT_PROVEN.

## Security Constraints
- Security Boundary: Vorgeschlagene oder geladene Skills von belegten Ausführungen unterscheiden. Keine Credentials, vertraulichen Prompts, RAG-Passagen oder personenbezogenen Rohdaten persistieren.
- Threat Assumptions: Veraltete oder manipulierte Metadaten, unberechtigte Aktionen und falsch zugeordnete Nachweise.
- Failure Behaviour: Fehlende Evidence als NOT_PROVEN dokumentieren.
- Fail Closed Policy: Den betroffenen Wirkpfad bei einer verletzten Trust Boundary stoppen.

## Failure Conditions
Unbekannte Identität, Vertragsversion, Herkunft oder Rechte blockieren den davon abhängigen Schritt.

## Validation Rules
Fehlrouting, Abstention, ungültige Run-ID, fehlende RAG-Evidence und manuelle Stopps prüfen. PR-Durchlauf und aktive Umsetzung getrennt messen.

## Acceptance Criteria
Reproduzierbare Positiv- und Negativfälle mit Belegen, klarer Rücknahme und ausgewiesenen offenen Punkten.
