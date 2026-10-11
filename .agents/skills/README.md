# CAPITAL-AI Domain Skills

Machine-readable registry: [registry.json](registry.json) (`CAPITAL_AI_DOMAIN_SKILLS@1`). Each of the five domains has a **separate engineering skill** and **separate advisory skill** under `.agents/skills/<domain>-<mode>/SKILL.md`. The root `AGENTS.md` remains the only policy authority.

## Chat-Routing

- Route by **task subject**, not by the origin chat or branch. Use engineering for implementation/review/debugging, advisory for consulting/trade-offs, and **both** for mixed work.
- Domain-specific chat agents are in `.github/agents/capital-ai-<domain>.agent.md`. They are optional interfaces, not independent permission authorities. A chat may load several domains directly, without handoffs.
- Engineering examples: PRODUCT frontend/auth UX; MARKET providers/scoring; PLATFORM deployments/brokers; TRUST application security/evidence; GROWTH SEO/content/social.
- Advisory examples: design critiques; market licensing architecture; runtime/SLO costs; risk/contract applicability; release/marketing channels. Advisory gives justified options, not marketing platitudes.
- For cross-cutting work choose a primary domain for branch/PR naming, then include whichever additional domain skills match real code/system boundaries.

## State of the art (on demand, not a background promise)

For materially changing questions confirm current official documentation, public standards, security advisories, license/terms and the **exact** code/runtime evidence. Prefer primary sources; show versions, dates and links. Differentiate normative requirements from guidance and project preference. When verification is impossible label the conclusion `NOT_VERIFIED`, never assert perpetual freshness, and do not claim the skill can fetch tools that the active chat cannot access.

## Safety and permission boundaries

Skills are **instruction files**, not executables, connectors, approvals or capability grants. No new internal admissions or review gates arise from this directory. Human-owner merge requirements, technical security and data-rights boundaries remain unchanged; a successful test does not authorize production, market data, providers or licenses.

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

Die bisherige Liste der zehn gemeinsamen Spezialisten und ihre Routing-Evaluation bleiben für bestehende Chat-Agenten unverändert. Weitere fünf Fach-Skills werden über `registry.json#domains.*.ownedSkills` auffindbar. Die eindeutige, verantwortliche Domain für **alle** Skills liegt in `registry.json#skillGovernance`; andere `leadDomains` bleiben nicht-autorisierende fachliche Nutzung. Die Dokumenttrilogie ist für alle Skills vorgeschrieben. Mit `npm run validate:all` werden Struktur, Ownership, Referenzen und Readiness fail-closed geprüft, ohne weitere GitHub Required Checks.
