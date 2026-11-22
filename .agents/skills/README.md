# CAPITAL-AI Domain Skills

Machine-readable registry: [registry.json](registry.json) (`CAPITAL_AI_DOMAIN_SKILLS@1`). Each of the five domains has a **separate engineering skill** and **separate advisory skill** under `.agents/skills/<domain>-<mode>/SKILL.md`. The root `AGENTS.md` remains the only policy authority.

## Chat-Routing

- Route by **task subject**, not by the origin chat or branch. Use engineering for implementation/review/debugging, advisory for consulting/trade-offs, and **both** for mixed work.
- Domain-specific chat agents are in `.github/agents/capital-ai-<domain>.agent.md`. They are optional interfaces, not independent permission authorities. A chat may load several domains directly, without handoffs.
- Engineering examples: PRODUCT frontend/auth UX; MARKET providers/scoring; PLATFORM deployments/brokers; TRUST application security/evidence; GROWTH SEO/content/social.
- Advisory examples: design critiques; market licensing architecture; runtime/SLO costs; risk/contract applicability; release/marketing channels. Advisory gives justified options, not marketing platitudes.
- For cross-cutting work choose a primary domain for branch/PR naming, then include whichever additional domain skills match real code/system boundaries.

## Execution-first in allen Domains

Bei ausdrücklich beauftragter Implementierung oder Reparatur die passenden Engineering-Skills im selben Auftrag auf Diagnose, kleinste reversible Änderung, Positiv-/Negativtests, vorhandene CI, autonomes Beheben technischer Fehler, Evidence, gegebenenfalls delegierten Merge und nachgelagerten Live-Readback anwenden. Analysephasen aus älteren Aufgabenprompts sind Zwischenphasen, kein pauschaler Ausführungsstopp. Kopierbare Folgeschritte beschreiben positive nächste Aktionen und übernehmen nur tatsächlich geltende Read-only-, No-Merge-/No-Deploy-/No-Publish-, Sicherheits-, Lizenz-, Provider-, Kosten- und Production-Grenzen aus dem konkreten Auftrag und Root-`AGENTS.md`. Beratungs-/Statusfragen autorisieren keine Schreibaktion; Skills erzeugen keine eigenen Berechtigungen oder Gates.

## State of the art (on demand, not a background promise)

For materially changing questions confirm current official documentation, public standards, security advisories, license/terms and the **exact** code/runtime evidence. Prefer primary sources; show versions, dates and links. Differentiate normative requirements from guidance and project preference. When verification is impossible label the conclusion `NOT_VERIFIED`, never assert perpetual freshness, and do not claim the skill can fetch tools that the active chat cannot access.

## Safety and permission boundaries

Skills are **instruction files**, not executables, connectors, approvals or capability grants. No new internal admissions or review gates arise from this directory. Die delegierte Agenten-Merge-Regel aus Root-`AGENTS.md` bleibt unverändert mit allen verbindlichen GitHub-Rulesets, Required Checks und Trust Boundaries gültig; kein Skill verlangt eine zusätzliche persönliche Owner-Einzelfreigabe für einen bereits delegierten Merge. Tatsächlich persönliche Owner-Handlungen, technische Sicherheits- und Datenrechtsgrenzen bleiben bestehen; erfolgreiche Tests allein erlauben keine Produktion, Marktdaten-, Provider- oder Lizenzaktivierung.

## Validate

Run `npm run test:domain-skills` (also part of the normal `npm test` script). This checks registry/files/frontmatter/chat agent wiring, not skill runtime invocation or the externally hosted ChatGPT app. No new Required Check is introduced.

## Skill-Routing-Evaluation (offline)

Unter `scripts/skill-routing.mjs` steht ein deterministischer, read-only Textsignal-Selektor. Er nutzt `registry.json#specialistRouting` und wählt fachlich passende Shared-Skills unabhängig vom Ursprungschat. `scripts/skill-routing-cases.json` enthält 41 synthetische Aufgaben: 30 Einzelfälle (3 je Spezialist), 6 fachübergreifende Kombinationen und 5 negative/unklare Fälle mit `REVIEW_REQUIRED`.

```sh
npm run test:domain-skills
node scripts/skill-routing.mjs --domain TRUST "RAG Prompt Injection und DSGVO prüfen"
```

Die bestehenden Domain-Skill-Tests sowie das reguläre `npm test` führen diese Evaluation aus. Es gibt keine neue CI-Pipeline, keine Dependency, keinen Provideraufruf, keine Secrets oder zusätzliche Required Checks. `MATCHED` bedeutet ausschließlich ein reproduzierbares Signal-Match, **nicht** einen tatsächlichen Aufruf eines Skills in ChatGPT, keine semantische LLM-Evaluation und keine Security-/Rechts-/Production-Freigabe. Eine echte ChatGPT-Evaluation setzt kontrollierte Chat-Agent-Traces und verfügbare Connector-Berechtigungen voraus und bleibt `NOT_PROVEN`. Indirekte, negierte oder mehrdeutige Aufgaben müssen vom Agenten geprüft werden; `REVIEW_REQUIRED` ist kein Fehler und erfindet keine Zuständigkeit. Chat-/Plugin-Rechte werden durch Routing nicht verändert.

## Additives Ownership-Modell

Die bisherige Liste der zehn gemeinsamen Spezialisten und ihre Routing-Evaluation bleiben für bestehende Chat-Agenten unverändert. Weitere Fach-Skills werden über `registry.json#domains.*.ownedSkills` auffindbar. Die eindeutige, verantwortliche Domain für **alle** Skills liegt in `registry.json#skillGovernance`; andere `leadDomains` bleiben nicht-autorisierende fachliche Nutzung. Die Dokumenttrilogie ist für alle Skills vorgeschrieben. Mit `npm run validate:all` werden Struktur, Ownership, Referenzen und Readiness fail-closed geprüft, ohne weitere GitHub Required Checks.

## Quelleninventar und Bundle-Katalog

Die Registry enthält versionierte Angebotskandidaten für drei Kundensegmente. Bundles kombinieren feste Kernleistungen, optionale Skills und wählbare Verbindungsprofile. Die Auswahl erzeugt einen prüfbaren Leistungsumfang und weder Checkout noch Zugriff.

| Bundle | Zielgruppe | Angebotsmodell | Verbindungsprofile |
|---|---|---|---|
| founder-launch | Founder | Angebot mit festem Pilotumfang | API/Webhook, MCP |
| b2b-integration | B2B-Teams | Setup- und Abonnement-Angebot | API/Webhook, MCP, A2A |
| enterprise-orchestration | Enterprise | Vertragsangebot | API/Webhook, MCP, A2A, OIDC-SSO, SCIM |

    node scripts/skill-bundles.mjs --audit
    node scripts/skill-bundles.mjs --probe
    node scripts/skill-bundles.mjs --bundle '{"bundleId":"b2b-integration","addOns":["platform-observability"],"connections":["api-webhook","a2a-workflow"]}'
    node scripts/skill-routing.mjs --plan --domain PLATFORM "Skill Inventar und MCP Adapter prüfen"

Die Verbindungsprofile beschreiben Protokollquellen und Abnahmeschritte. Für einen E2E-Nachweis gehören ein autorisierter Sandbox-Tenant, die konkrete Adapterversion sowie beobachtete Ereignisse vom Identitätsnachweis über die erlaubte Aktion bis zu Widerruf und Rückbau zum Nachweis. A2A-Workflows erfassen außerdem einen beobachteten Task-Abbruch und Trace-Korrelation. Offene kommerzielle Rechte, Daten-/Modelllizenzen, Entitlement-Zuordnung, Preise, Kostenrahmen und Live-Betrieb behalten ihren eigenen Nachweisstatus.

Die vorhandene **Daily Dependency and CVE Watch** protokolliert Erreichbarkeit, Textanker und fällige Quellenreviews im bestehenden Run-Artefakt. Ein gefundener Textanker belegt nur den Abruf. Für ein Review liest die zuständige Domain die offizielle Spezifikation und relevante Release Notes oder Rechtsänderungen, prüft die Anwendbarkeit und aktualisiert Version sowie Prüfdatum im normalen Repository-Workflow. Ein nicht unterstützter Redirect, fehlender Anker, abgelaufener oder fehlender Nachweis bleibt sichtbar. Produktive Implementierung und rechtliche Anwendbarkeit brauchen jeweils eigene Evidence.

**Bewertungsgrundlage.** Die unveränderten 76 kuratierten Aufgaben prüfen das Legacy-Signal-Routing. Zusätzlich decken Regressionstests neue Signale, falsche Bundle-Auswahl, Review-Datumsgrenzen und Quellenfehler ab. Struktur- und Routing-Ergebnisse liefern keine Messwerte zur tatsächlichen Skill-Ausführung. Dafür fordert der Skill agent-evaluation eine belegte Run-ID, die Skill-ID, Zeiten und eine Quellreferenz. Reine Empfehlungen bleiben als solche sichtbar.
