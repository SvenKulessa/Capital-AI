# accessibility-advisory — Interfaces

> Keine API- oder Berechtigungserweiterung; gilt ergänzend zum bestehenden `SKILL.md` und `AGENTS.md`.

## Inputs
- Nutzerreise, Designs, Viewports, Zielgruppen, WCAG-2.2-Kriterien und bekannte Findings
- Repository-Commit und präziser Scope; tenant- und lizenzrelevante Daten nur minimal.

## Outputs
- Priorisierte barrierefreie UX-Alternativen mit Kriterien, Restrisiken und Entscheidungsevidence
- Verifizierter Status, Quelle, Validierungsweg und Restrisiken; keine erfundene Runtime-Evidence.

## Dependencies
- Registry-Eintrag: `skillGovernance.accessibility-advisory`
- Domain Owner: PRODUCT; cross-domain Konsultation ohne Transfer der Verantwortung.
- External Interfaces: ausschließlich real vorhandene und explizit berechtigte Provider/Tools.

## Security Boundary
Keine Personendaten aus Accessibility-Tests ohne Einwilligung; kein WCAG-Zertifikat aus automatischen Scans.

## Threat Assumptions
Screenreader- oder Keyboard-Blocker, unzureichender Kontrast, erfundene Konformität.

## Failure Behaviour
Bei fehlender Evidence `NOT_PROVEN`; bei Verletzung einer Trust Boundary `BLOCKED` (fail-closed). Kein automatischer Provider-/Kostenwechsel.

## Validation Contract
Keyboard, Focus-Not-Obscured, Reflow, 200%-Zoom, Farbunabhängigkeit; manuelle Review-Evidence; Evidenz und exakten Commit speichern. Keine zusätzlichen Required Checks.

## Domain Ownership
- Domain Owner: PRODUCT
- Escalation Owner: CAPITAL-AI-PRODUCT
- Governance Owner: CAPITAL-AI-TRUST
- Governance Level: G2
