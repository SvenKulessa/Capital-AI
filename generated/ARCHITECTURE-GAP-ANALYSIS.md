# CAPITAL-AI Architecture Gap Analysis

> Dokumentierte Architektur vs. nachgewiesene Enterprise-Evidence. **NOT_PROVEN** bedeutet nicht, dass Implementierungen nachweislich fehlen.

## Vorhandene Enterprise Fähigkeiten

- Fünf bestehende Domains mit Engineering-/Advisory-Skills und Chat-Agent-Profilen.
- Zehn geteilte Enterprise-Spezialisten mit deterministischem Signal-Routing und 41 synthetischen Testfällen.
- Registry als Single Source of Truth, eindeutige Ownership, dokumentierte Trust Boundaries und Fail-Closed-Anforderungen.
- Offline-Validierung für strukturelle Konsistenz, Security-Dokumentation, Evidence und Governance.

## Fehlende oder nicht nachgewiesene Enterprise Fähigkeiten

### Priorität High

| Capability Gap | Evidence | Nächste Verifikation |
|---|---|---|
| WCAG 2.2 AA in vollständigen Journeys inkl. Assistive Technology | NOT_PROVEN | Mobile-, Keyboard- und Screenreader-Matrix |
| Reale Tenant-/Auth-/Telemetry-Isolation und Secret-Redaction | NOT_PROVEN | Negative Integrationstests, Trace-Readbacks |
| Kommerzielle Datenrechte und anwendbare DSGVO/DORA/EU-AI-Act-Pflichten | NOT_PROVEN | Use-Case-spezifische Lizenz-/Rechtsprüfung |
| Disaster Recovery und Restore-Ziele | NOT_PROVEN | Gemessene RTO/RPO-Proben und Recovery-Nachweis |

### Priorität Medium

| Capability Gap | Evidence | Nächste Verifikation |
|---|---|---|
| SLO-Baselines, Burn-Rate-Alerts und Alert-Rauschen | NOT_PROVEN | SLI-Telemetrie und kontrollierte Tests |
| Retention- und Revenue-Funnel-Attribution | NOT_PROVEN | Signierte Payment-/Refund-Events und Consent |
| Data-Quality-/Quant-Lineage-Nachweise | NOT_PROVEN | Point-in-Time- und Backtest-Bias-Audits |

### Priorität Low

| Capability Gap | Evidence | Nächste Verifikation |
|---|---|---|
| Langfristige Trendhistorie der Skill-Readiness | NOT_PROVEN | Vergleich commitgebundener Reportstände |
| Tatsächliche Skill-Nutzung durch externe Chats | NOT_PROVEN | Autorisierte Beispieltraces und Benutzertests |

Es entstehen keine neuen Domains, pauschalen Freigaben oder kostenpflichtigen Integrationen.
