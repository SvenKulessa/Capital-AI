export const DOCUMENTARY_SCHEMA = 'DOCUMENTARY_EVIDENCE@1' as const;
export const DOCUMENTARY_VERSION = '1.0.0' as const;

export const DOCUMENTARY_LIFECYCLES = [
  'PROPOSED',
  'VERIFIED',
  'EFFECTIVE',
  'SUPERSEDED',
  'BLOCKED',
] as const;

export type DocumentaryLifecycle = (typeof DOCUMENTARY_LIFECYCLES)[number];
export type DocumentaryAudience = 'engineering' | 'management' | 'public' | 'funding';

export interface EvidenceGate {
  status: string;
  evidenceRefs: string[];
}

export interface DocumentaryEvidenceRecord {
  schema: typeof DOCUMENTARY_SCHEMA;
  version: typeof DOCUMENTARY_VERSION;
  metadata: {
    project: 'CAPITAL-AI';
    domain: 'PLATFORM';
    consumerDomain: 'GROWTH';
    status: DocumentaryLifecycle;
  };
  correlation: { changeId: string | null };
  identity: {
    documentaryId: string | null;
    sourceSha: string | null;
    parentSha: string | null;
    branch: string | null;
    pullRequest: number | null;
    createdAt: string | null;
  };
  change: {
    title: string | null;
    summary: string | null;
    type: string | { allowed?: string[] };
    domains: { primary: string | null; affected: string[] };
  };
  intent: {
    problem: string | null;
    desiredOutcome: string | null;
    ownerRequestRef: string | null;
  };
  architecture: {
    changed: boolean;
    architectureChangeRef: string | null;
    affectedComponents: string[];
    before: { summary: string | null };
    after: { summary: string | null };
    interfacesChanged: string[];
    securityBoundaryChanged: boolean;
  };
  implementation: {
    changedFiles: string[];
    dependencies: { added: string[]; removed: string[]; updated: string[] };
    executionUnits: { affected: string[] };
  };
  validation: {
    tests: EvidenceGate;
    security: EvidenceGate;
    licenses: EvidenceGate;
    provenance: EvidenceGate;
    build: EvidenceGate;
    benchmark: EvidenceGate;
  };
  supplyChain: {
    source: { commitSha: string | null };
    sbom: { generated: boolean; refs: string[] };
    artifacts: { images: unknown[] };
    immutableDigests: string[];
    attestations: string[];
  };
  runtime: {
    deploymentRequired: boolean;
    deployed: boolean;
    environment: string | null;
    readback: {
      performed: boolean;
      sourceSha: string | null;
      imageDigest: string | null;
      evidenceRefs: string[];
    };
  };
  observability: {
    telemetryChanged: boolean;
    metricsAdded: string[];
    metricsRemoved: string[];
    regressionsDetected: string[];
    anomalies: string[];
  };
  selfHealing: {
    candidateDetected: boolean;
    patternId: string | null;
    validationCycle: { current: number; required: number };
    validationSteps: string[];
    eligibleForAutomation: boolean;
    repairClass: string | null;
    promotionConditions: {
      validationCyclesPassed: boolean;
      deterministicOutput: boolean;
      noTrustBoundaryChange: boolean;
      noHumanAuthorityRequired: boolean;
    };
  };
  commercialization: {
    affected: boolean;
    inventoryRefs: string[];
    revenueGateChanged: boolean;
  };
  roadmap: { affected: boolean; entries: unknown[] };
  documentationProjection: Record<string, { regenerate: boolean }>;
  documentaryProjection: {
    publicSafe: boolean;
    sections: Record<string, boolean>;
    redact: Record<string, boolean>;
  };
  state: {
    lifecycle: DocumentaryLifecycle;
    supersededBy: string | null;
  };
  integrity: {
    canonicalSerialization: 'RFC8785';
    hashAlgorithm: 'SHA-256';
    documentaryDigest: string | null;
  };
  safety: {
    historicalRecordsImmutable: boolean;
    inferredSuccessForbidden: boolean;
    missingEvidenceMeansSuccess: boolean;
  };
}
