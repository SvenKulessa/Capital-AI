export type ComponentDomain = 'PRODUCT' | 'MARKET' | 'PLATFORM' | 'TRUST' | 'GROWTH';
export type ComponentLifecycle = 'DISCOVERED' | 'BENCHMARKED' | 'APPROVED' | 'ACTIVE' | 'SUPERSEDED';

export interface ExternalComponentCandidate {
  name: string;
  role: 'fallback' | 'replacement' | 'optimization' | 'complement';
  license: string;
}

export interface ExternalComponentInventoryItem {
  id: string;
  name: string;
  domain: ComponentDomain;
  kind: string;
  installedAt: string | null;
  activeVersion: string | null;
  pipelineVersion: string | null;
  lifecycle: ComponentLifecycle;
  functionSummary: string;
  webAppBinding: string;
  domainAssignments: readonly string[];
  license: string;
  cadsScore: number;
  scoreState: 'PROVISIONAL' | 'BENCHMARKED' | 'VERIFIED' | 'BLOCKED';
  dependencies: readonly string[];
  alternatives: readonly ExternalComponentCandidate[];
  evidence: readonly string[];
}

export const CADS_PROFILE_V2 = {
  id: 'CADS_PROFILE@2',
  rawPriorityWeights: { security: 25, correctness: 25, performance: 25, reliability: 20, maintainability: 10, license: 5, observability: 20 },
  normalizedWeights: { security: 19.23, correctness: 19.23, performance: 19.23, reliability: 15.38, maintainability: 7.69, license: 3.85, observability: 15.38 },
  nonCompensableGates: ['SECURITY', 'CORRECTNESS', 'LICENSE_PROVENANCE'],
  portabilityCostGate: 'OSS_OR_GOOD_FREEMIUM; COST_PRODUCING_REQUIRES_OWNER_CHAT_DECISION',
  calibration: ['BASELINE', 'OBSERVE', 'CALIBRATE', 'CHALLENGE', 'PROMOTE'],
} as const;

export const EXTERNAL_COMPONENT_INVENTORY: readonly ExternalComponentInventoryItem[] = [
  {
    id: 'zitadel', name: 'ZITADEL', domain: 'TRUST', kind: 'Identity',
    installedAt: null, activeVersion: 'managed-cloud', pipelineVersion: 'managed-cloud', lifecycle: 'ACTIVE',
    functionSummary: 'OIDC/OAuth2 identity, Passkeys, MFA und append-only Audit-Trail.',
    webAppBinding: 'server/auth.mjs und Login-/Profil-Flows', license: 'Apache-2.0 core', cadsScore: 86.5, scoreState: 'PROVISIONAL',
    domainAssignments: ["OIDC issuer / managed identity domain"],
    dependencies: ['render', 'ionos-smtp'],
    alternatives: [
      { name: 'Keycloak', role: 'fallback', license: 'Apache-2.0' },
      { name: 'Authentik', role: 'replacement', license: 'MIT' },
      { name: 'Ory Kratos + Hydra', role: 'optimization', license: 'Apache-2.0' },
    ],
    evidence: ['docs/security/OIDC-VERIFICATION-STATE-20261001.md'],
  },
  {
    id: 'supabase', name: 'Supabase', domain: 'PLATFORM', kind: 'Backend Platform',
    installedAt: '2026-06-23T08:51:54Z', activeVersion: 'Postgres 17.6.1.127 / managed platform', pipelineVersion: 'managed', lifecycle: 'ACTIVE',
    functionSummary: 'Postgres, Storage und geschützte Evidence-/Inventar-Persistenz; Auth bleibt separat bewertbar.',
    webAppBinding: 'AIFINANCIAL project + server-side integrations', license: 'Apache-2.0 core', cadsScore: 86.1, scoreState: 'PROVISIONAL',
    domainAssignments: ["AIFINANCIAL backend data plane","no public CAPITAL-AI app domain"],
    dependencies: ['zitadel'],
    alternatives: [
      { name: 'Appwrite', role: 'fallback', license: 'BSD-3-Clause' },
      { name: 'Nhost', role: 'replacement', license: 'MIT' },
      { name: 'PocketBase', role: 'complement', license: 'MIT' },
    ],
    evidence: ['Supabase live project readback 2026-10-02'],
  },
  {
    id: 'nats-jetstream', name: 'NATS + JetStream', domain: 'PLATFORM', kind: 'Event Bus',
    installedAt: '2026-09-30T14:02:11Z', activeVersion: '2.15.0', pipelineVersion: '2.15.0 stable', lifecycle: 'ACTIVE',
    functionSummary: 'Durable Market-Event-Transport, Replay und Fan-out-Authority.',
    webAppBinding: 'server/infrastructure.mjs / capital-ai-market-events', license: 'Apache-2.0', cadsScore: 90.4, scoreState: 'PROVISIONAL',
    domainAssignments: ["capital-ai-market-events private Render network"],
    dependencies: ['render', 'valkey'],
    alternatives: [
      { name: 'Apache Kafka', role: 'fallback', license: 'Apache-2.0' },
      { name: 'Apache Pulsar', role: 'replacement', license: 'Apache-2.0' },
      { name: 'RabbitMQ', role: 'complement', license: 'MPL-2.0' },
    ],
    evidence: ['deploy/Dockerfile.nats', 'deploy/nats-server.conf'],
  },
  {
    id: 'valkey', name: 'Valkey', domain: 'PLATFORM', kind: 'Cache + Pub/Sub',
    installedAt: '2026-09-30T01:07:31Z', activeVersion: '8.1.10', pipelineVersion: '8.1.10 stable', lifecycle: 'ACTIVE',
    functionSummary: 'Low-latency Quote Cache und ephemeres Pub/Sub; niemals dauerhafte Evidence-Authority.',
    webAppBinding: 'server/infrastructure.mjs / capital-ai-market-cache', license: 'BSD-3-Clause', cadsScore: 88.1, scoreState: 'PROVISIONAL',
    domainAssignments: ["capital-ai-market-cache private Render network"],
    dependencies: ['render', 'nats-jetstream'],
    alternatives: [
      { name: 'KeyDB', role: 'fallback', license: 'BSD-3-Clause' },
      { name: 'Microsoft Garnet', role: 'optimization', license: 'MIT' },
      { name: 'Memcached', role: 'replacement', license: 'BSD-3-Clause' },
    ],
    evidence: ['Render live key-value readback 2026-10-02'],
  },
  {
    id: 'render', name: 'Render', domain: 'PLATFORM', kind: 'Hosting Control Plane',
    installedAt: '2026-09-29T20:21:57Z', activeVersion: 'managed', pipelineVersion: 'managed', lifecycle: 'ACTIVE',
    functionSummary: 'Webservice, privater NATS-Service, Runtime, Deploy-, Log- und Metrics-Control-Plane.',
    webAppBinding: 'AICapital workspace / Capital-AI', license: 'Proprietary service', cadsScore: 83.3, scoreState: 'PROVISIONAL',
    domainAssignments: ["capital-ai.online (planned primary cutover)","capital-ai-uvsl.onrender.com (current service URL)"],
    dependencies: ['github-ghcr'],
    alternatives: [
      { name: 'Coolify', role: 'fallback', license: 'Apache-2.0' },
      { name: 'Dokku', role: 'replacement', license: 'MIT' },
      { name: 'CapRover', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['Render live service readback 2026-10-02'],
  },
  {
    id: 'github-ghcr', name: 'GitHub + GHCR', domain: 'TRUST', kind: 'SCM + OCI Registry',
    installedAt: null, activeVersion: 'managed', pipelineVersion: 'managed', lifecycle: 'ACTIVE',
    functionSummary: 'Source, PR-Governance, DevSecOps-Evidence, OCI Registry und Attestations.',
    webAppBinding: '.github/workflows + immutable GHCR deployment identity', license: 'Proprietary service', cadsScore: 87.5, scoreState: 'PROVISIONAL',
    domainAssignments: ["github.com/SvenKulessa/Capital-AI","ghcr.io immutable OCI identity"],
    dependencies: [],
    alternatives: [
      { name: 'Forgejo + OCI Distribution', role: 'fallback', license: 'GPL-3.0-or-later / Apache-2.0' },
      { name: 'GitLab CE + Registry', role: 'replacement', license: 'MIT core' },
      { name: 'Gitea + Harbor', role: 'complement', license: 'MIT / Apache-2.0' },
    ],
    evidence: ['docs/security/PRODUCTION-HANDOFF.md'],
  },
  {
    id: 'ionos-smtp', name: 'IONOS SMTP', domain: 'PLATFORM', kind: 'Transactional Mail',
    installedAt: null, activeVersion: 'managed', pipelineVersion: 'managed', lifecycle: 'ACTIVE',
    functionSummary: 'Registrierungs-, Bestätigungs- und Passwort-Reset-E-Mails.',
    webAppBinding: 'server-side Nodemailer, Port 465', license: 'Proprietary service', cadsScore: 73.8, scoreState: 'PROVISIONAL',
    domainAssignments: ["capital-ai.online mail domain"],
    dependencies: ['render'],
    alternatives: [
      { name: 'Stalwart Mail Server', role: 'fallback', license: 'AGPL-3.0' },
      { name: 'Postal', role: 'replacement', license: 'MIT' },
      { name: 'mailcow', role: 'complement', license: 'GPL-3.0' },
    ],
    evidence: ['package.json:nodemailer'],
  },
  {
    id: 'otel-collector', name: 'OpenTelemetry Collector', domain: 'PLATFORM', kind: 'Observability',
    installedAt: null, activeVersion: null, pipelineVersion: '0.162.0 candidate', lifecycle: 'DISCOVERED',
    functionSummary: 'Späterer vendor-neutraler Export für Logs, Metrics und Traces; nicht Runtime-aktiv.',
    webAppBinding: 'Roadmap backlog only', license: 'Apache-2.0', cadsScore: 88.3, scoreState: 'PROVISIONAL',
    domainAssignments: ["not assigned; backlog only"],
    dependencies: ['prometheus'],
    alternatives: [
      { name: 'Grafana Alloy', role: 'fallback', license: 'Apache-2.0' },
      { name: 'Vector', role: 'replacement', license: 'MPL-2.0' },
      { name: 'Fluent Bit', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['src/data/openSourceStack.ts'],
  },
  {
    id: 'prometheus', name: 'Prometheus', domain: 'PLATFORM', kind: 'Metrics',
    installedAt: null, activeVersion: null, pipelineVersion: 'candidate', lifecycle: 'DISCOVERED',
    functionSummary: 'Prometheus-kompatible Metrics-Exposition und spätere Scrape-/Alert-Schicht.',
    webAppBinding: 'Roadmap backlog only', license: 'Apache-2.0', cadsScore: 88.3, scoreState: 'PROVISIONAL',
    domainAssignments: ["not assigned; backlog only"],
    dependencies: ['otel-collector'],
    alternatives: [
      { name: 'Thanos', role: 'fallback', license: 'Apache-2.0' },
      { name: 'VictoriaMetrics', role: 'replacement', license: 'Apache-2.0' },
      { name: 'Grafana Mimir', role: 'complement', license: 'AGPL-3.0' },
    ],
    evidence: ['src/data/openSourceStack.ts'],
  },
  {
    id: 'ort', name: 'OSS Review Toolkit', domain: 'TRUST', kind: 'License Compliance',
    installedAt: null, activeVersion: 'existing integration', pipelineVersion: 'existing integration', lifecycle: 'ACTIVE',
    functionSummary: 'Lizenz-, Obligation- und Compliance-Report-Adapter.',
    webAppBinding: 'License Engine', license: 'Apache-2.0', cadsScore: 79.8, scoreState: 'PROVISIONAL',
    domainAssignments: ["repository/CI tooling; no runtime domain"],
    dependencies: ['scancode'],
    alternatives: [
      { name: 'ScanCode Toolkit', role: 'fallback', license: 'Apache-2.0' },
      { name: 'FOSSology', role: 'replacement', license: 'GPL-2.0' },
      { name: 'Syft + Grype', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['src/data/openSourceStack.ts'],
  },
  {
    id: 'scancode', name: 'ScanCode Toolkit', domain: 'TRUST', kind: 'License Compliance',
    installedAt: null, activeVersion: 'existing integration', pipelineVersion: 'existing integration', lifecycle: 'ACTIVE',
    functionSummary: 'Package-/Lizenz-Metadaten und Provenance-Scanning.',
    webAppBinding: 'License Engine', license: 'Apache-2.0', cadsScore: 79.2, scoreState: 'PROVISIONAL',
    domainAssignments: ["repository/CI tooling; no runtime domain"],
    dependencies: ['ort'],
    alternatives: [
      { name: 'OSS Review Toolkit', role: 'fallback', license: 'Apache-2.0' },
      { name: 'FOSSology', role: 'replacement', license: 'GPL-2.0' },
      { name: 'Syft', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['src/data/openSourceStack.ts'],
  },
  {
    id: 'google-genai', name: 'Google Gemini / GenAI SDK', domain: 'PRODUCT', kind: 'AI Provider',
    installedAt: null, activeVersion: 'lockfile-managed server SDK', pipelineVersion: 'current stable review required', lifecycle: 'ACTIVE',
    functionSummary: 'Server-side AI advisor plus governed GROWTH draft capability with request/month budget, provider/model kill-switch, model routing and public-source URL Context gate; Search Grounding remains excluded from autonomous lead discovery.',
    webAppBinding: 'server/advisor.ts + server/growth-ai-gateway.ts', license: 'Google service terms + Apache-2.0 SDK metadata', cadsScore: 77.0, scoreState: 'PROVISIONAL',
    domainAssignments: ["server-side provider endpoint; PRODUCT advisor + GROWTH draft generation; no browser domain binding"],
    dependencies: ['render'],
    alternatives: [
      { name: 'llama.cpp', role: 'fallback', license: 'MIT' },
      { name: 'vLLM', role: 'optimization', license: 'Apache-2.0' },
      { name: 'Ollama', role: 'replacement', license: 'MIT' },
    ],
    evidence: ['server/advisor.ts', 'server/growth-ai-gateway.ts', 'src/contracts/growthAiPromotion.ts', 'src/contracts/growthProviderRuntime.ts', 'src/contracts/growthMediaApproval.ts', 'docs/growth/GEMINI-FIRST-GROWTH-ENGINE-20261006.md', 'docs/growth/GROWTH-TOOL-CANDIDATE-EVIDENCE-20261006.md', 'scripts/browser-boundary-policy.mjs'],
  },
  {
    id: 'telegram-bot-api', name: 'Telegram Bot API', domain: 'GROWTH', kind: 'Notification / Social',
    installedAt: null, activeVersion: 'managed API', pipelineVersion: 'managed API', lifecycle: 'ACTIVE',
    functionSummary: 'Server-side bounded outbound notifications to a fixed destination.',
    webAppBinding: 'server/telegram.mjs', license: 'Proprietary service/API', cadsScore: 71.0, scoreState: 'PROVISIONAL',
    domainAssignments: ["managed messaging API; server-side only"],
    dependencies: ['render'],
    alternatives: [
      { name: 'Gotify', role: 'fallback', license: 'MIT' },
      { name: 'Matrix Synapse', role: 'replacement', license: 'Apache-2.0' },
      { name: 'Zulip', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['server/telegram.mjs'],
  },
  {
    id: 'metricool-mcp', name: 'Metricool MCP', domain: 'GROWTH', kind: 'Social Publishing / Analytics MCP',
    installedAt: '2026-10-06', activeVersion: 'managed remote MCP', pipelineVersion: 'https://ai.metricool.com/mcp', lifecycle: 'APPROVED',
    functionSummary: 'Kostenfreie MCP-Control-Plane-Anbindung für Social-Planung und Analytics innerhalb der jeweiligen Metricool-Tariflimits; keine Metricool-REST-API und keine automatische Production-Publisher-Authority.',
    webAppBinding: '.mcp.json; operator/control-plane only; OAuth außerhalb des Repositories; keine Browser- oder Web-Runtime-Bindung',
    license: 'Proprietary service; MCP access available on Metricool Free plan', cadsScore: 74.0, scoreState: 'PROVISIONAL',
    domainAssignments: ['operator MCP control plane; no public runtime domain'],
    dependencies: [],
    alternatives: [],
    evidence: ['docs/growth/METRICOOL-MCP-INTEGRATION-20261006.md'],
  },
  {
    id: 'lukerent-gsc-mcp', name: 'LukeRenton Google Search Console MCP', domain: 'GROWTH', kind: 'SEO / Search Console MCP',
    installedAt: '2026-10-04', activeVersion: '0.1.0', pipelineVersion: '0.1.0 pinned / upstream a701813f', lifecycle: 'APPROVED',
    functionSummary: 'Read-only Search Console authority for SEO performance, URL inspection and sitemap readback; write tool is blocked by the Capital-AI MCP guard.',
    webAppBinding: '.mcp.json + scripts/gsc-mcp-guard.mjs; operator/control-plane only', license: 'MIT', cadsScore: 82.0, scoreState: 'PROVISIONAL',
    domainAssignments: ["sc-domain:capital-ai.online; no public web-runtime binding"],
    dependencies: ['google-search-console-api'],
    alternatives: [
      { name: 'Google Search Console API direct adapter', role: 'fallback', license: 'Google API terms / local adapter code' },
      { name: 'jurgisgavenas/search-console-mcp', role: 'replacement', license: 'MIT' },
      { name: 'ncosentino/google-search-console-mcp', role: 'complement', license: 'repository license review required before adoption' },
    ],
    evidence: ['config/growth-google-authority.json', 'docs/security/evidence/growth-gsc-oss-admission-20261004.json', 'docs/licenses/LukeRenton-google-search-console-mcp-MIT.txt'],
  },
  {
    id: 'google-analytics', name: 'Google Analytics', domain: 'GROWTH', kind: 'Web Analytics',
    installedAt: null, activeVersion: null, pipelineVersion: 'GA4 remains separate; Umami v3.4.0 is a benchmark-pending first-party candidate', lifecycle: 'DISCOVERED',
    functionSummary: 'GA4 remains a separate future adapter; the LukeRenton Search Console MCP does not provide GA4.',
    webAppBinding: 'src/utils/analytics.ts + future server/operator GA4 adapter', license: 'Proprietary service/API', cadsScore: 60.0, scoreState: 'BLOCKED',
    domainAssignments: ["disabled; no active measurement domain"],
    dependencies: [],
    alternatives: [
      { name: 'Umami', role: 'replacement', license: 'MIT' },
      { name: 'Matomo', role: 'fallback', license: 'GPL-3.0' },
      { name: 'Plausible Community Edition', role: 'optimization', license: 'AGPL-3.0' },
    ],
    evidence: ['src/utils/analytics.ts', 'scripts/privacy-analytics.test.mjs', 'src/contracts/growthAttribution.ts', 'docs/growth/GROWTH-TOOL-CANDIDATE-EVIDENCE-20261006.md'],
  },
  {
    id: 'binance-market-data', name: 'Binance Market Data', domain: 'MARKET', kind: 'Market Data Provider',
    installedAt: null, activeVersion: 'public WebSocket API', pipelineVersion: 'rights gate open', lifecycle: 'ACTIVE',
    functionSummary: 'BTCUSDT WebSocket ingress; commercial/display/redistribution rights remain a separate fail-closed gate.',
    webAppBinding: 'server/market.mjs', license: 'Provider terms / dataset-specific rights', cadsScore: 67.0, scoreState: 'BLOCKED',
    domainAssignments: ["stream.binance.com server-side market ingress"],
    dependencies: ['nats-jetstream', 'valkey'],
    alternatives: [
      { name: 'CCXT', role: 'fallback', license: 'MIT' },
      { name: 'Cryptofeed', role: 'optimization', license: 'BSD-3-Clause' },
      { name: 'Hummingbot', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['server/market.mjs', 'docs/security/LICENSE-RIGHTS.md'],
  },
  {
    id: 'kraken-market-data', name: 'Kraken Market Data', domain: 'MARKET', kind: 'Market Data Provider',
    installedAt: null, activeVersion: 'WebSocket v2 + REST', pipelineVersion: 'rights gate open', lifecycle: 'ACTIVE',
    functionSummary: 'BTCUSD WebSocket/REST ingress and USD venue reference; data-rights approval remains open.',
    webAppBinding: 'server/market.mjs', license: 'Provider terms / market-data rights', cadsScore: 72.0, scoreState: 'BLOCKED',
    domainAssignments: ["ws.kraken.com + api.kraken.com server-side market ingress"],
    dependencies: ['nats-jetstream', 'valkey'],
    alternatives: [
      { name: 'CCXT', role: 'fallback', license: 'MIT' },
      { name: 'Cryptofeed', role: 'optimization', license: 'BSD-3-Clause' },
      { name: 'Hummingbot', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['server/market.mjs', 'docs/security/LICENSE-RIGHTS.md'],
  },
  {
    id: 'twelve-data', name: 'Twelve Data', domain: 'MARKET', kind: 'Market Data Provider',
    installedAt: null, activeVersion: 'REST API', pipelineVersion: 'optional licensed fallback', lifecycle: 'APPROVED',
    functionSummary: 'Optional USD/stock/crypto fallback only when a server-side API key exists; no synthetic fallback.',
    webAppBinding: 'server/market.mjs', license: 'Provider terms / plan-specific rights', cadsScore: 64.0, scoreState: 'BLOCKED',
    domainAssignments: ["api.twelvedata.com server-side optional ingress"],
    dependencies: ['nats-jetstream', 'valkey'],
    alternatives: [
      { name: 'OpenBB', role: 'fallback', license: 'Apache-2.0' },
      { name: 'fdnpy', role: 'replacement', license: 'MIT SDK; provider terms separate' },
      { name: 'yfinance', role: 'complement', license: 'Apache-2.0 software; not commercially admitted without provider license' },
    ],
    evidence: ['server/market.mjs', 'docs/security/LICENSE-RIGHTS.md'],
  },
  {
    id: 'massive-polygon', name: 'Massive / Polygon', domain: 'MARKET', kind: 'Market Data Provider',
    installedAt: null, activeVersion: 'legacy Polygon REST endpoint', pipelineVersion: 'contract scope unverified', lifecycle: 'APPROVED',
    functionSummary: 'Optional stock/crypto REST fallback. Commercial/derived/non-display rights are not inferred from API availability.',
    webAppBinding: 'server/market.mjs', license: 'Provider market-data terms', cadsScore: 61.0, scoreState: 'BLOCKED',
    domainAssignments: ["api.polygon.io legacy server-side optional ingress"],
    dependencies: ['nats-jetstream', 'valkey'],
    alternatives: [
      { name: 'OpenBB', role: 'fallback', license: 'Apache-2.0' },
      { name: 'fdnpy', role: 'replacement', license: 'MIT SDK; provider terms separate' },
      { name: 'CCXT', role: 'complement', license: 'MIT; exchange data rights separate' },
    ],
    evidence: ['server/market.mjs', 'docs/security/LICENSE-RIGHTS.md'],
  },
  {
    id: 'github-actions-runner-ubuntu', name: 'GitHub Actions Ubuntu Runner', domain: 'PLATFORM', kind: 'CI Runner',
    installedAt: null, activeVersion: 'ubuntu-26.04 (repo workflows)', pipelineVersion: 'explicit ubuntu-26.04; GitHub CodeQL default setup separately uses ubuntu-latest', lifecycle: 'ACTIVE',
    functionSummary: 'Reproduzierbare Linux-CI-Ausführungsbasis für repository-eigene Workflows; keine mutable ubuntu-latest-Referenz in versionierten Workflows.',
    webAppBinding: '.github/workflows/*.yml', license: 'GitHub-hosted managed service / runner-images MIT repository', cadsScore: 88.0, scoreState: 'VERIFIED',
    domainAssignments: ['repository CI only; no public web runtime'],
    dependencies: ['github-ghcr'],
    alternatives: [{ name: 'ubuntu-24.04', role: 'fallback', license: 'Ubuntu/GitHub-hosted runner terms' }],
    evidence: ['docs/security/BUILD-HARDENING.md', 'docs/security/evidence/toolchain-update-20261004/TOOLCHAIN-INVENTORY-AND-UPDATE.md'],
  },
  {
    id: 'github-codeql-default-setup', name: 'GitHub CodeQL Default Setup', domain: 'TRUST', kind: 'Static Analysis',
    installedAt: null, activeVersion: 'provider-managed', pipelineVersion: 'provider-managed runner=ubuntu-latest observed 2026-10-04', lifecycle: 'ACTIVE',
    functionSummary: 'GitHub-generierte CodeQL-Analysejobs für JavaScript/TypeScript, Java/Kotlin, Python und Actions; Runner-Auswahl stammt nicht aus repository-eigenen Workflow-YAMLs.',
    webAppBinding: 'GitHub Advanced Security / default setup control plane', license: 'GitHub managed service; CodeQL engine terms apply', cadsScore: 80.0, scoreState: 'PROVISIONAL',
    domainAssignments: ['GitHub security control plane only'],
    dependencies: ['github-ghcr', 'github-actions-runner-ubuntu'],
    alternatives: [{ name: 'CodeQL Advanced Setup', role: 'replacement', license: 'GitHub managed service / CodeQL terms' }],
    evidence: ['GitHub job log readback 2026-10-04', 'docs/security/evidence/toolchain-update-20261004/TOOLCHAIN-INVENTORY-AND-UPDATE.md'],
  },
  {
    id: 'node-runtime', name: 'Node.js', domain: 'PLATFORM', kind: 'Runtime',
    installedAt: null, activeVersion: '26.10.0', pipelineVersion: 'node:26.10.0-alpine@sha256:0b36e8c136b94cd4fcf02188228e76c31ad5872eef3fec8cbd2eee500cfd9e80', lifecycle: 'ACTIVE',
    functionSummary: 'Build- und Production-JavaScript-Runtime; Container-Base ist version- und digest-gepinnt.',
    webAppBinding: 'Dockerfile', license: 'MIT', cadsScore: 91.0, scoreState: 'VERIFIED',
    domainAssignments: ['build image', 'production runtime'],
    dependencies: ['npm-cli'],
    alternatives: [{ name: 'Node.js 24 LTS', role: 'fallback', license: 'MIT' }],
    evidence: ['Dockerfile', 'Node.js v26.10.0 official release'],
  },
  {
    id: 'npm-cli', name: 'npm CLI', domain: 'PLATFORM', kind: 'Package Manager',
    installedAt: null, activeVersion: '12.2.0', pipelineVersion: '12.2.0 explicit build install', lifecycle: 'ACTIVE',
    functionSummary: 'Deterministische npm-ci Installation aus Lockfiles; Package Manager wird vor Runtime entfernt.',
    webAppBinding: 'Dockerfile + package-lock.json + deploy/runtime/package-lock.json', license: 'Artistic-2.0', cadsScore: 86.0, scoreState: 'VERIFIED',
    domainAssignments: ['build only; removed from production runtime'],
    dependencies: ['node-runtime'],
    alternatives: [{ name: 'pnpm', role: 'replacement', license: 'MIT' }],
    evidence: ['Dockerfile', 'npm/cli v12.2.0 official release'],
  },
  {
    id: 'trivy', name: 'Trivy', domain: 'TRUST', kind: 'Vulnerability / Secret / License Scanner',
    installedAt: null, activeVersion: '0.75.0', pipelineVersion: 'aquasec/trivy:0.75.0@sha256:af6acf9a6b85dfe389a1941505c0ce9efef52a4719635e1a962f022a3d855daa', lifecycle: 'ACTIVE',
    functionSummary: 'Container-, Filesystem-, Secret-, Misconfiguration-, SBOM- und Lizenzscan in Docker Security Gate.',
    webAppBinding: 'Dockerfile.security + .github/workflows/build-security.yml', license: 'Apache-2.0', cadsScore: 91.0, scoreState: 'VERIFIED',
    domainAssignments: ['CI security scanner only'],
    dependencies: ['github-actions-runner-ubuntu'],
    alternatives: [{ name: 'Grype', role: 'fallback', license: 'Apache-2.0' }],
    evidence: ['Dockerfile.security', '.github/workflows/build-security.yml'],
  },
  {
    id: 'hadolint', name: 'Hadolint', domain: 'TRUST', kind: 'Dockerfile Linter',
    installedAt: null, activeVersion: '2.15.1', pipelineVersion: 'hadolint/hadolint:v2.15.1-alpine@sha256:a1d49ae1a4e83c1dbad26b8c1ad7588c8bd1e04f4866b34ad3cac50335198552', lifecycle: 'ACTIVE',
    functionSummary: 'Dockerfile-Hardening/Lint als Bestandteil des Security-Scanner-Images.',
    webAppBinding: 'Dockerfile.security', license: 'GPL-3.0', cadsScore: 84.0, scoreState: 'VERIFIED',
    domainAssignments: ['CI build-security only'],
    dependencies: ['trivy'],
    alternatives: [{ name: 'dockerfilelint', role: 'fallback', license: 'MIT' }],
    evidence: ['Dockerfile.security'],
  },
  {
    id: 'go-toolchain', name: 'Go Toolchain', domain: 'TRUST', kind: 'Security Analysis Runtime',
    installedAt: null, activeVersion: '1.26.8', pipelineVersion: 'golang:1.26.8-alpine@sha256:6e5de3f5b9fb7e30b8bb2ffe8dcbcbdaa2990f0f31267456eabe83f870a623be', lifecycle: 'ACTIVE',
    functionSummary: 'Isolierte Laufzeit für govulncheck-Reachability-Prüfungen; nicht Teil der Web-Runtime.',
    webAppBinding: '.github/workflows/build-security.yml', license: 'BSD-3-Clause', cadsScore: 88.0, scoreState: 'VERIFIED',
    domainAssignments: ['CI security execution unit only'],
    dependencies: ['govulncheck'],
    alternatives: [{ name: 'Go 1.27.x', role: 'optimization', license: 'BSD-3-Clause' }],
    evidence: ['.github/workflows/build-security.yml', 'Go release history 2026-10-04'],
  },
  {
    id: 'govulncheck', name: 'govulncheck', domain: 'TRUST', kind: 'Go Vulnerability Reachability',
    installedAt: null, activeVersion: 'v1.8.0', pipelineVersion: 'v1.8.0 pinned module install', lifecycle: 'ACTIVE',
    functionSummary: 'Reachability-basierte Go-Vulnerability-Prüfung für NATS-/Go-relevante Security Evidence.',
    webAppBinding: '.github/workflows/build-security.yml', license: 'BSD-3-Clause', cadsScore: 89.0, scoreState: 'VERIFIED',
    domainAssignments: ['CI security execution unit only'],
    dependencies: ['go-toolchain'],
    alternatives: [{ name: 'OSV-Scanner', role: 'complement', license: 'Apache-2.0' }],
    evidence: ['.github/workflows/build-security.yml', 'pkg.go.dev golang.org/x/vuln/cmd/govulncheck v1.8.0'],
  },
  {
    id: 'github-actions-pinned-toolchain', name: 'Pinned GitHub Actions Toolchain', domain: 'TRUST', kind: 'CI/CD Supply Chain',
    installedAt: null, activeVersion: 'checkout 7.0.1; setup-node 7.0.0; setup-java 6.0.1; setup-gradle 6.4.0; upload 7.0.1; download 8.0.1; login 4.6.0; attest 4.2.2', pipelineVersion: 'all actions pinned to full commit SHAs', lifecycle: 'ACTIVE',
    functionSummary: 'Repository-eigene Actions sind auf vollständige, gegen offizielle Release-Tags korrelierte Commit-SHAs gepinnt.',
    webAppBinding: '.github/workflows/*.yml', license: 'per upstream action repository', cadsScore: 93.0, scoreState: 'VERIFIED',
    domainAssignments: ['CI/CD only'],
    dependencies: ['github-ghcr', 'github-actions-runner-ubuntu'],
    alternatives: [{ name: 'local composite actions', role: 'fallback', license: 'repository-owned' }],
    evidence: ['docs/security/evidence/toolchain-update-20261004/TOOLCHAIN-INVENTORY-AND-UPDATE.md'],
  },
  {
    id: 'android-gradle-plugin', name: 'Android Gradle Plugin', domain: 'PLATFORM', kind: 'Android Build Toolchain',
    installedAt: null, activeVersion: '8.13.2', pipelineVersion: '8.13.2; major candidate 9.4.1 requires migration', lifecycle: 'ACTIVE',
    functionSummary: 'Android Private-Bundle Build-Plugin; Major-Upgrade wird nicht als Routine-Update übernommen.',
    webAppBinding: 'mobile/android-private/build.gradle', license: 'Android SDK/Google terms', cadsScore: 78.0, scoreState: 'PROVISIONAL',
    domainAssignments: ['private Android build only'],
    dependencies: ['github-actions-pinned-toolchain'],
    alternatives: [{ name: 'Android Gradle Plugin 9.4.1', role: 'optimization', license: 'Android SDK/Google terms' }],
    evidence: ['mobile/android-private/build.gradle', 'Android Developers AGP API reference 2026-10-04'],
  },
  {
    id: 'web-build-stack', name: 'Web Build Stack', domain: 'PRODUCT', kind: 'Frontend Build Toolchain',
    installedAt: null, activeVersion: 'Vite 8.3.1 / TypeScript 6.0.3 / Tailwind 4.3.3 / React 19.3.0 / Lucide 1.52.0 / Motion 13.4.5 / Lucide 1.52.0 / Motion 13.4.5', pipelineVersion: 'lockfile-managed; TypeScript 7.0.2 and Motion 14.0.0 are separate major migration candidates', lifecycle: 'ACTIVE',
    functionSummary: 'Frontend-Kompilierung, Typprüfung, React-Runtime und CSS-Toolchain.',
    webAppBinding: 'package.json + package-lock.json + vite.config.ts + tsconfig.json', license: 'MIT / Apache-2.0', cadsScore: 88.0, scoreState: 'PROVISIONAL',
    domainAssignments: ['web build', 'browser runtime'],
    dependencies: ['node-runtime', 'npm-cli'],
    alternatives: [{ name: 'TypeScript 7.0.2', role: 'optimization', license: 'Apache-2.0' }],
    evidence: ['package.json', 'package-lock.json', 'docs/security/evidence/toolchain-update-20261004/TOOLCHAIN-INVENTORY-AND-UPDATE.md'],
  },
  {
    id: 'web-runtime-dependencies', name: 'Web Runtime Dependency Closure', domain: 'PLATFORM', kind: 'Node Runtime Dependencies',
    installedAt: null, activeVersion: 'NATS JS 3.4.0 / redis 6.3.0 / zod 4.6.5', pipelineVersion: 'deploy/runtime/package-lock.json integrity-pinned; redis 6.3.0 verified by npm update capsule', lifecycle: 'ACTIVE',
    functionSummary: 'Minimale Production-Dependency-Closure für NATS, Valkey/Redis und Runtime-Validierung.',
    webAppBinding: 'deploy/runtime/package.json + deploy/runtime/package-lock.json', license: 'Apache-2.0 / MIT', cadsScore: 90.0, scoreState: 'VERIFIED',
    domainAssignments: ['production runtime'],
    dependencies: ['nats-jetstream', 'valkey', 'node-runtime'],
    alternatives: [{ name: 'redis 6.2.1', role: 'fallback', license: 'MIT' }],
    evidence: ['deploy/runtime/package.json', 'deploy/runtime/package-lock.json', 'docs/security/evidence/toolchain-update-20261004/TOOLCHAIN-INVENTORY-AND-UPDATE.md'],
  },

] as const;

export const COMPONENT_LIFECYCLE = ['DISCOVERED', 'BENCHMARKED', 'APPROVED', 'ACTIVE', 'SUPERSEDED'] as const;
export const SUPERSESSION_SCOPES = ['FRONTEND', 'BACKEND'] as const;
