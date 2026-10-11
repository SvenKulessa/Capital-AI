export const renderReports = function renderReports(s, e) {
 const domains=['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH'];
 const rows=[...e.results].sort((a,b)=>domains.indexOf(a.domainOwner)-domains.indexOf(b.domainOwner)||a.id.localeCompare(b.id));
 const cat=rows.map(r=>`| ${r.domainOwner} | \`${r.id}\` | ${r.escalationOwner} | ${r.kpis.join('; ')} | ${r.result} | ${r.governanceLevel} |`).join('\n');
 const matrix=rows.map(r=>`| \`${r.id}\` | ${r.documentation} | ${r.security} | ${r.governance} | ${r.maintainability} | ${r.scalability} | ${r.readiness} | ${r.result} |`).join('\n');
 const additions=['accessibility-advisory','accessibility-engineering','platform-observability','seo-engineering','revenue-engineering'];
 const inventory=`# CAPITAL-AI Skill Inventory

> Deterministischer Registry-Snapshot. Strukturstatus: **${e.status}**; keine attestierte Live-Funktion.

| Domain Owner | Skill | Escalation Owner | KPI-Definitionen (keine Messwerte) | Status | Governance Level |
|---|---|---|---|---|---|
${cat}

Es gibt **${rows.length}** Registry-Skills mit genau einer verantwortlichen Domain. Governance Owner aller Skills: \`CAPITAL-AI-TRUST\`. Fachübergreifende Nutzung verändert Ownership nicht.
`;
 const readiness=`# CAPITAL-AI Skill Readiness

> Ausschließlich **Dokumentations-, Registry- und Strukturtest-Reife**, keine Runtime-/WCAG-/Security-/Rechts-Zertifizierung. Test Coverage bezieht sich auf Strukturvalidatoren und deren CI-Einbindung, nicht auf die funktionalen Systeme.

- Status: **${e.status}**
- Konservativer Readiness Score (Minimum aller Skills): **${e.score}/100**; Mindestwert 85
- Governance-Dokumentation (Minimum): **${e.governance}/10**; Mindestwert 8
- Security-Dokumentation (Minimum): **${e.security}/10**; Mindestwert 8

## Skill Readiness Matrix

| Skill | Documentation | Security | Governance | Maintainability | Scalability | Readiness /100 | Status |
|---|---:|---:|---:|---:|---:|---:|---|
${matrix}

## Methode und Grenzen

Readiness = gerundeter Mittelwert der sechs Komponenten **Documentation, Ownership, Security, Governance, Evidence, Structural Test Coverage** (jeweils 1–10) × 10. Der Gesamtwert ist das **Minimum** aller Skillwerte; keinerlei Durchschnitts-Kaschierung. Maintainability und Scalability sind zusätzliche dokumentarische Heuristiken (1–10).

Eine fehlgeschlagene Pflichtvalidierung oder ein Score unter 85/100 bzw. Governance/Security unter 8/10 führt zu \`BLOCKED\`. Status \`DOCUMENTED\` bedeutet weder \`VERIFIED\` im Betrieb noch Deployment-, Lizenz- oder Rechtsfreigabe.
`;
 const expansion=`# CAPITAL-AI Skill Expansion Report

> Reproduzierbarer Dokumentations-Snapshot. Gesamtstatus: **${e.status}**.

## Neue Skills

${additions.map(id=>`- \`${id}\` — Domain Owner: ${s.registry.skillGovernance[id].domainOwner}`).join('\n')}

Acht weitere angeforderte Spezialisten existierten bereits; sie wurden vertragsseitig erweitert, nicht ersetzt. Die zehn Legacy-Spezialisten, zehn Domain-Skills und \`visual-chat\` bleiben erhalten.

## Geänderte Dateien

- \`AGENTS.md\`, \`README.md\`, \`.agents/skills/README.md\`, \`.agents/skills/registry.json\`, \`package.json\`
- \`.github/workflows/build-security.yml\` im **bestehenden** Required Check
- \`.agents/skills/<skill>/{SKILL.md,RESPONSIBILITIES.md,INTERFACES.md}\`; alte \`SKILL.md\` unverändert
- \`.agents/validation/\` einschließlich Negativtests; vier Dateien unter \`generated/\`

## Registry Änderungen

- Das Schema \`CAPITAL_AI_DOMAIN_SKILLS@1\` und Legacy-Routing bleiben kompatibel.
- Additiv: \`skillGovernanceVersion\`, \`skillGovernance\`, \`domains.*.ownedSkills\`.
- **${rows.length}** eindeutig verantwortete Skills; Registry ist die Single Source of Truth.

## Domain Änderungen

${domains.map(d=>`- **${d}:** ${s.registry.domains[d].ownedSkills.join(', ')}`).join('\n')}

## Governance Bewertung

Strukturwert **${e.governance}/10**. Rollen dokumentiert; \`AGENTS.md\` bleibt allein autorisierend. Keine zusätzlichen Admissions, Handoffs, Reviews oder Required Checks. DDD, Team Topologies, FinTech Governance und weitere Referenzrahmen nur anwendbar, nicht pauschal zertifiziert.

## Security Bewertung

Strukturwert **${e.security}/10**. Security Boundaries, Threat Assumptions, Failure Behaviour und Fail Closed dokumentiert. Tatsächliche Security-, Tenant-, Provider- und Restore-Beweise sind **NOT_PROVEN**, soweit nicht separat durch Runtime-Evidence nachgewiesen.

## Documentation Bewertung

Dreiteilige Skill-Verträge und dreizehn Pflichtabschnitte pro Skill über Validatoren prüfbar. Keine Behauptung, dass ein externer Chat-Agent alle Skills wirklich ausführt.

## Skill Readiness Matrix

| Skill | Documentation | Security | Governance | Maintainability | Scalability | Readiness /100 | Status |
|---|---:|---:|---:|---:|---:|---:|---|
${matrix}

## Offene Risiken

- **NOT_PROVEN:** durchgängige WCAG-2.2-AA-Tests in echten Browsern und mit Screenreadern.
- **NOT_PROVEN:** produktive SLO-/Alert-Daten, RTO/RPO-Restore-Proben und vollständige Tenant-Traces.
- **NOT_PROVEN:** tatsächliche DORA-/EU-AI-Act-Anwendbarkeit, kommerzielle Daten-/Modellrechte.
- **NOT_PROVEN:** sichere, consentbasierte Revenue-Attribution nach Refunds und Providerkosten.

## Empfohlene nächste Schritte

1. Bestehende GitHub Required Checks für den exakten PR-Head abwarten und als Evidence dokumentieren.
2. Kritische Runtime-, Auth-/Tenant-, Accessibility- und Providergrenzen getrennt verifizieren.
3. Dokumentierte Enterprise-Fähigkeiten anhand echter SLO-/Nutzer-/Compliance-Evidence bewerten.

## Gesamtbewertung

**${e.status}; ${e.score}/100 dokumentarische Readiness**, Governance ${e.governance}/10, Security ${e.security}/10. Keine eigenständige Merge- oder Production-Autorisierung; es gilt \`AGENTS.md\`.
`;
 const gaps=`# CAPITAL-AI Architecture Gap Analysis

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
`;
 return {'generated/SKILL-INVENTORY.md':inventory,'generated/SKILL-READINESS.md':readiness,'generated/CAPITAL-AI-SKILL-EXPANSION-REPORT.md':expansion,'generated/ARCHITECTURE-GAP-ANALYSIS.md':gaps};
};
