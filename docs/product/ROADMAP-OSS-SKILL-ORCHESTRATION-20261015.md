# Roadmap Tools & Skill Orchestration – owner-only web integration

Date: 2026-10-15
PR target: existing PRODUCT / GROWTH PR #523 (do not create a duplicate PR).
Baseline: main \`68467751155d4a0ee0a9a2d8a971babdfaf19287\`.

## Real implementation
- \`src/data/roadmapToolOrchestration.ts\` maps five existing revenue/security workstreams to existing repo skills, required source paths, actual app destinations and unmet evidence.
- \`src/components/RoadmapSkillOrchestrationPanel.tsx\` renders an interactive workstream selector under **Control Center → Tools & Anwendungen** and cross-checks paths against the already owner-only, read-only repository tool catalog from \`/api/internal/repository-tools\`. This is a working user-facing read-only integration; it does not execute providers or claim successful deployments.
- \`src/components/RepositoryToolCatalogDashboard.tsx\` mounts the panel only when a validated repository catalog snapshot is available.
- \`scripts/navigation.test.mjs\` checks core routing, candidates and rendered UI.

## Skill routing
Reuses 26 existing skills from \`.agents/skills/registry.json\` and their source files. Workstreams are the existing prioritized projects: Commerce/Learning, Blueprint rights/50 analysis components, content/social worker pipeline, SEO, and security/recovery. New skills are not auto-installed and none grants credentials or compliance approval.

## Orchestrators and commercial use
1. Existing **Node.js Promise.all** orchestrator in \`scripts/growth/pr-merge-social-batch.mjs\`: already operating in the normal GitHub Actions pipeline, with existing rights gates and disabled external workers by default. No new npm dependency.
2. **LangGraph JS Core**: MIT. [upstream license](https://github.com/langchain-ai/langgraphjs/blob/main/LICENSE). Candidate for explicit agent DAGs after evaluation. **NOT INSTALLED**.
3. **Temporal TypeScript SDK and Server**: MIT. [SDK license](https://github.com/temporalio/sdk-typescript/blob/main/LICENSE), [official server licensing](https://learn.temporal.io/tutorials/typescript/background-check/project-setup/). Candidate for durable jobs; requires separate state, hosting and bounded workers. **NOT INSTALLED**.
4. **Flowise Community**: Apache-2.0 outside separately commercially licensed enterprise code. [upstream license](https://github.com/FlowiseAI/Flowise/blob/main/LICENSE.md). Candidate for visual graph authoring; not bundled, no enterprise claims. **NOT INSTALLED**.

This is a source-level license review, not review of a locked exact artifact, dependencies, commercial provider/model/data rights, or a legal sign-off. MIT and Apache-2.0 generally permit commercial use with their notice obligations, but a system's total commercial deployment may include separately licensed parts. No license bypass, provider key, model weights or third-party audio assets are installed, redistributed or activated.

## Runtime / cost boundary
- **Additional billable calls from this change: zero.** The panel reuses the existing catalog readback, which retains its own 5-minute cache and 10-minute foreground refresh. No new polling or external API.
- Self-hosted Temporal, Flowise or LangGraph workers entail CPU/RAM, storage, observability and possible cloud/model inference fees; current tariffs/quotas and model entitlements remain NOT_PROVEN.
- Social publishing and YouTube/X delivery remain separate rights-bound paths. No auto-posts, finance provider licensing changes, NATS / Rust Bridge activation, external-agent code execution or secrets to the browser.
- A website visualisation of an option is not a deployment. Claim \`CANDIDATE_NOT_INSTALLED\` until exact dependency, license, SBOM, security, runtime budget and useful E2E behavior are proven.

## Reproduction / acceptance
\`\`\`bash
node --import tsx --test scripts/navigation.test.mjs
npm run lint
npm run build
gh pr checks 523 --repo SvenKulessa/Capital-AI
\`\`\`
Success requires valid existing Control Center owner route, correct catalog identity display, no cross-user access changes and no surprise network execution. Keep production and merge status separate from source changes.

## Rollback
Revert the component import/mount and remove the two new modules plus test. No data migration, credentials, new service, billing or scheduled activity is introduced.
