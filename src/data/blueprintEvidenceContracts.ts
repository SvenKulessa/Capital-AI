export type BlueprintEvidenceRequirement = {
  id: string;
  label: string;
  required: true;
};

export type BlueprintEvidenceContract = {
  blueprintId: string;
  schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1';
  state: 'BLOCKED';
  privateContextAccepted: readonly ('KEY_VAULT_VERIFIED_PROVIDER' | 'PRIVATE_TEST_API')[];
  requirements: readonly BlueprintEvidenceRequirement[];
  productionAdmissionFromPrivateContext: false;
};

const common = [
  { id: 'SOURCE_SHA', label: 'Exact repository source SHA', required: true },
  { id: 'LICENSE_PROVENANCE', label: 'Software- und Asset-Lizenz-/Provenienz-Evidence', required: true },
  { id: 'REPRODUCIBLE_TEST', label: 'Reproduzierbarer Blueprint-Test gegen exakt gebundene Inputs', required: true },
  { id: 'SECURITY_REVIEW', label: 'Security-/Secret-/Dependency-Review', required: true },
] as const;

export const BLUEPRINT_EVIDENCE_CONTRACTS: Record<string, BlueprintEvidenceContract> = {
  TIER_1_4_LIVE: {
    blueprintId: 'TIER_1_4_LIVE',
    schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1',
    state: 'BLOCKED',
    privateContextAccepted: ['KEY_VAULT_VERIFIED_PROVIDER', 'PRIVATE_TEST_API'],
    productionAdmissionFromPrivateContext: false,
    requirements: [
      ...common,
      { id: 'PROVIDER_RIGHTS', label: 'Provider- und Datenrechte für verwendete Streams', required: true },
      { id: 'STREAM_TEST', label: 'Private Ingress-/Conflation-/Reconnect-Test-Evidence', required: true },
      { id: 'LATENCY_EVIDENCE', label: 'Gemessene Latenz statt Planwert', required: true },
    ],
  },
  AUTHORITY_PLANE: {
    blueprintId: 'AUTHORITY_PLANE',
    schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1',
    state: 'BLOCKED',
    privateContextAccepted: ['KEY_VAULT_VERIFIED_PROVIDER', 'PRIVATE_TEST_API'],
    productionAdmissionFromPrivateContext: false,
    requirements: [
      ...common,
      { id: 'MULTI_PROVIDER_RIGHTS', label: 'Rechte für alle Consensus-Quellen', required: true },
      { id: 'CANONICAL_REPLAY', label: 'Deterministischer Canonical-/Evidence-Replay', required: true },
      { id: 'HASH_BINDING', label: 'Evidence-Hash an Input und Output gebunden', required: true },
    ],
  },
  HYBRID: {
    blueprintId: 'HYBRID',
    schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1',
    state: 'BLOCKED',
    privateContextAccepted: ['KEY_VAULT_VERIFIED_PROVIDER', 'PRIVATE_TEST_API'],
    productionAdmissionFromPrivateContext: false,
    requirements: [
      ...common,
      { id: 'STORAGE_CONTRACT', label: 'Valkey/PostgreSQL Rollen und Retention verifiziert', required: true },
      { id: 'CACHE_CORRECTNESS', label: 'Cache-/Persistenz-Konsistenztest', required: true },
      { id: 'RESTORE_REPLAY', label: 'Restore-/Replay-Nachweis', required: true },
    ],
  },
  MIXED_DOMAIN: {
    blueprintId: 'MIXED_DOMAIN',
    schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1',
    state: 'BLOCKED',
    privateContextAccepted: ['KEY_VAULT_VERIFIED_PROVIDER', 'PRIVATE_TEST_API'],
    productionAdmissionFromPrivateContext: false,
    requirements: [
      ...common,
      { id: 'ASSET_RIGHTS_MATRIX', label: 'Rechte- und Instrumentmatrix je Assetklasse', required: true },
      { id: 'SYMBOL_NORMALIZATION', label: 'Kanonische Instrument-/Symbolnormalisierung', required: true },
      { id: 'FRESHNESS_CLASSIFICATION', label: 'Realtime/Delayed/Reference/Historical klassifiziert', required: true },
    ],
  },
  PARALLEL_HOMOGENEOUS: {
    blueprintId: 'PARALLEL_HOMOGENEOUS',
    schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1',
    state: 'BLOCKED',
    privateContextAccepted: ['KEY_VAULT_VERIFIED_PROVIDER', 'PRIVATE_TEST_API'],
    productionAdmissionFromPrivateContext: false,
    requirements: [
      ...common,
      { id: 'PROVIDER_RIGHTS', label: 'Rechte aller redundanten Provider', required: true },
      { id: 'FAILOVER_TEST', label: 'Deterministischer Disconnect-/Failover-Test', required: true },
      { id: 'CONSENSUS_CORRECTNESS', label: 'Duplikat-/Late-Tick-/Consensus-Test', required: true },
    ],
  },
  PARALLEL_MIXED: {
    blueprintId: 'PARALLEL_MIXED',
    schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1',
    state: 'BLOCKED',
    privateContextAccepted: ['KEY_VAULT_VERIFIED_PROVIDER', 'PRIVATE_TEST_API'],
    productionAdmissionFromPrivateContext: false,
    requirements: [
      ...common,
      { id: 'MULTIMODAL_RIGHTS', label: 'Rechte für Markt-, News-, Fundamental- und KI-Inputs', required: true },
      { id: 'PROMPT_EVIDENCE_BOUNDARY', label: 'Keine Secrets/Rohrechte im KI-Kontext', required: true },
      { id: 'SCORING_REPLAY', label: 'Deterministischer Feature-/Score-Replay', required: true },
    ],
  },
  INDIVIDUAL_PACKAGE: {
    blueprintId: 'INDIVIDUAL_PACKAGE',
    schemaVersion: 'CAPITAL_AI_BLUEPRINT_EVIDENCE@1',
    state: 'BLOCKED',
    privateContextAccepted: ['KEY_VAULT_VERIFIED_PROVIDER', 'PRIVATE_TEST_API'],
    productionAdmissionFromPrivateContext: false,
    requirements: [
      ...common,
      { id: 'FUNDAMENTAL_RIGHTS', label: 'Fundamental-Datenrechte und point-in-time Semantik', required: true },
      { id: 'FIELD_CONTRACT', label: 'Minimaler Datenvertrag je Zielanalyse', required: true },
      { id: 'NO_LOOKAHEAD', label: 'Kein Look-ahead-/Survivorship-Leakage im Test', required: true },
    ],
  },
};
