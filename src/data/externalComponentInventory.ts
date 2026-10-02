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
    dependencies: ['ort'],
    alternatives: [
      { name: 'OSS Review Toolkit', role: 'fallback', license: 'Apache-2.0' },
      { name: 'FOSSology', role: 'replacement', license: 'GPL-2.0' },
      { name: 'Syft', role: 'complement', license: 'Apache-2.0' },
    ],
    evidence: ['src/data/openSourceStack.ts'],
  },
] as const;

export const COMPONENT_LIFECYCLE = ['DISCOVERED', 'BENCHMARKED', 'APPROVED', 'ACTIVE', 'SUPERSEDED'] as const;
export const SUPERSESSION_SCOPES = ['FRONTEND', 'BACKEND'] as const;
