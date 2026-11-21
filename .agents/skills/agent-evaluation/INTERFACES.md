# agent-evaluation — Interfaces

## Domain Ownership
- Domain Owner: TRUST
- Escalation Owner: CAPITAL-AI-TRUST
- Governance Owner: CAPITAL-AI-TRUST

## Dependencies
Registry skillGovernance.agent-evaluation, skillSourceInventory und Root-AGENTS.md.

## Security Boundary
Vorgeschlagene oder geladene Skills von belegten Ausführungen unterscheiden. Keine Credentials, vertraulichen Prompts, RAG-Passagen oder personenbezogenen Rohdaten persistieren.

## Input contract
Versionierte Fälle und beobachtete Runtime-Events mit Run-ID, Commit, Skill-ID, Start-, Endzeit und Quellreferenz.

## Output contract
Getrennte Messreihen für Routing, Ausführung, RAG-Quellen, E2E-Wirkung und manuelle Stopps.
