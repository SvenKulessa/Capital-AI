export const CRYPTO_CONTRACT_ASSURANCE_EVIDENCE_VERSION =
  'crypto-contract-assurance-evidence/0.1.0' as const;

export type CryptoContractAssuranceGateState = 'PASS' | 'BLOCKED' | 'NOT_COMPUTABLE';
export type CryptoCodeIdentityState = 'EXACT_MATCH' | 'MISMATCH' | 'UNKNOWN';
export type CryptoAuditScope = 'FULL_CONTRACT' | 'PARTIAL' | 'UNKNOWN';
export type CryptoFindingSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
export type CryptoFormalProofState = 'PROVED' | 'COUNTEREXAMPLE' | 'INCONCLUSIVE' | 'UNKNOWN';

export interface CryptoContractAssuranceIdentity {
  readonly protocolId: string;
  readonly chainId: string;
  readonly contractAddress: string;
  readonly runtimeCodeHash: string;
}

export interface CryptoCodeIdentityObservation extends CryptoContractAssuranceIdentity {
  readonly state: CryptoCodeIdentityState;
  readonly observedAtMs: number;
  readonly providerId: string;
  readonly authorityId: string;
  readonly authorityVersion: string;
  readonly evidenceRefs: readonly string[];
}

export interface CryptoAuditFindingSummary {
  readonly severity: CryptoFindingSeverity;
  readonly unresolvedCount: number;
}

export interface CryptoAuditObservation extends CryptoContractAssuranceIdentity {
  readonly auditId: string;
  readonly scope: CryptoAuditScope;
  readonly reportIssuedAtMs: number;
  readonly observedAtMs: number;
  readonly auditorAuthorityId: string;
  readonly auditorAuthorityVersion: string;
  readonly reportAuthorityId: string;
  readonly reportAuthorityVersion: string;
  readonly findings: readonly CryptoAuditFindingSummary[];
  readonly evidenceRefs: readonly string[];
}

export interface CryptoFormalVerificationObservation extends CryptoContractAssuranceIdentity {
  readonly proofId: string;
  readonly state: CryptoFormalProofState;
  readonly specificationId: string;
  readonly specificationVersion: string;
  readonly verifierId: string;
  readonly verifierVersion: string;
  readonly proofGeneratedAtMs: number;
  readonly observedAtMs: number;
  readonly authorityId: string;
  readonly authorityVersion: string;
  readonly evidenceRefs: readonly string[];
}

export interface CryptoContractAssurancePolicy {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly maxObservationAgeMs: number;
  readonly maxAuditAgeMs: number;
  readonly maxFormalProofAgeMs: number;
  readonly codeIdentityRequirement: 'REQUIRED' | 'NOT_REQUIRED';
  readonly minIndependentAuditors: number;
  readonly requiredAuditScope: 'FULL_CONTRACT' | 'ANY';
  readonly blockingFindingSeverities: readonly CryptoFindingSeverity[];
  readonly formalVerificationRequirement: 'REQUIRED' | 'NOT_REQUIRED';
}

export interface CryptoContractAssuranceEvaluation {
  readonly contractVersion: typeof CRYPTO_CONTRACT_ASSURANCE_EVIDENCE_VERSION;
  readonly identity: CryptoContractAssuranceIdentity;
  readonly state: CryptoContractAssuranceGateState;
  readonly smartContractEvidenceVerified: boolean | null;
  readonly acceptedCodeIdentityObservationCount: number;
  readonly acceptedAuditObservationCount: number;
  readonly acceptedFormalVerificationObservationCount: number;
  readonly independentAuditorCount: number;
  readonly authorityIds: readonly string[];
  readonly evidenceRefs: readonly string[];
  readonly reason: string;
  readonly scoreEligible: false;
  readonly executionEligible: false;
  readonly authority: 'RESEARCH_EVIDENCE_ONLY';
}

function hasText(value: string): boolean {
  return value.trim().length > 0;
}

function sameIdentity(
  identity: CryptoContractAssuranceIdentity,
  observation: CryptoContractAssuranceIdentity,
): boolean {
  return (
    observation.protocolId === identity.protocolId &&
    observation.chainId === identity.chainId &&
    observation.contractAddress === identity.contractAddress &&
    observation.runtimeCodeHash === identity.runtimeCodeHash
  );
}

function validObservedAt(observedAtMs: number, evaluatedAtMs: number, maxObservationAgeMs: number): boolean {
  return (
    Number.isFinite(observedAtMs) &&
    observedAtMs > 0 &&
    observedAtMs <= evaluatedAtMs &&
    evaluatedAtMs - observedAtMs <= maxObservationAgeMs
  );
}

function validEvidenceRefs(refs: readonly string[]): boolean {
  return refs.length > 0 && refs.every(hasText);
}

function validIdentity(identity: CryptoContractAssuranceIdentity): boolean {
  return (
    hasText(identity.protocolId) &&
    hasText(identity.chainId) &&
    hasText(identity.contractAddress) &&
    hasText(identity.runtimeCodeHash)
  );
}

function validPolicy(policy: CryptoContractAssurancePolicy, evaluatedAtMs: number): boolean {
  return (
    hasText(policy.policyId) &&
    hasText(policy.policyVersion) &&
    Number.isFinite(policy.maxObservationAgeMs) && policy.maxObservationAgeMs > 0 &&
    Number.isFinite(policy.maxAuditAgeMs) && policy.maxAuditAgeMs > 0 &&
    Number.isFinite(policy.maxFormalProofAgeMs) && policy.maxFormalProofAgeMs > 0 &&
    Number.isInteger(policy.minIndependentAuditors) && policy.minIndependentAuditors >= 0 &&
    policy.blockingFindingSeverities.every((severity) =>
      ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'].includes(severity)) &&
    Number.isFinite(evaluatedAtMs) && evaluatedAtMs > 0
  );
}

function evaluateResult(
  identity: CryptoContractAssuranceIdentity,
  state: CryptoContractAssuranceGateState,
  smartContractEvidenceVerified: boolean | null,
  codeIdentity: readonly CryptoCodeIdentityObservation[],
  audits: readonly CryptoAuditObservation[],
  proofs: readonly CryptoFormalVerificationObservation[],
  reason: string,
): CryptoContractAssuranceEvaluation {
  const auditorIds = [...new Set(audits.map((entry) =>
    `${entry.auditorAuthorityId}@${entry.auditorAuthorityVersion}`))].sort();
  const authorityIds = [...new Set([
    ...codeIdentity.map((entry) => `${entry.authorityId}@${entry.authorityVersion}`),
    ...audits.flatMap((entry) => [
      `${entry.auditorAuthorityId}@${entry.auditorAuthorityVersion}`,
      `${entry.reportAuthorityId}@${entry.reportAuthorityVersion}`,
    ]),
    ...proofs.map((entry) => `${entry.authorityId}@${entry.authorityVersion}`),
  ])].sort();
  const evidenceRefs = [...new Set([
    ...codeIdentity.flatMap((entry) => entry.evidenceRefs),
    ...audits.flatMap((entry) => entry.evidenceRefs),
    ...proofs.flatMap((entry) => entry.evidenceRefs),
  ])].sort();

  return Object.freeze({
    contractVersion: CRYPTO_CONTRACT_ASSURANCE_EVIDENCE_VERSION,
    identity: Object.freeze({ ...identity }),
    state,
    smartContractEvidenceVerified,
    acceptedCodeIdentityObservationCount: codeIdentity.length,
    acceptedAuditObservationCount: audits.length,
    acceptedFormalVerificationObservationCount: proofs.length,
    independentAuditorCount: auditorIds.length,
    authorityIds: Object.freeze(authorityIds),
    evidenceRefs: Object.freeze(evidenceRefs),
    reason,
    scoreEligible: false,
    executionEligible: false,
    authority: 'RESEARCH_EVIDENCE_ONLY',
  });
}

export function evaluateCryptoContractAssuranceEvidence(
  identity: CryptoContractAssuranceIdentity,
  codeIdentityObservations: readonly CryptoCodeIdentityObservation[] | null | undefined,
  auditObservations: readonly CryptoAuditObservation[] | null | undefined,
  formalVerificationObservations: readonly CryptoFormalVerificationObservation[] | null | undefined,
  policy: CryptoContractAssurancePolicy,
  evaluatedAtMs: number,
): CryptoContractAssuranceEvaluation {
  if (!validIdentity(identity) || !validPolicy(policy, evaluatedAtMs)) {
    return evaluateResult(identity, 'NOT_COMPUTABLE', null, [], [], [], 'Contract-Identität, Policy oder Evaluationszeit ist ungültig.');
  }

  const admittedCodeIdentity = Object.freeze((codeIdentityObservations ?? []).filter((entry) =>
    sameIdentity(identity, entry) &&
    validObservedAt(entry.observedAtMs, evaluatedAtMs, policy.maxObservationAgeMs) &&
    hasText(entry.providerId) &&
    hasText(entry.authorityId) &&
    hasText(entry.authorityVersion) &&
    validEvidenceRefs(entry.evidenceRefs)));

  const admittedAudits = Object.freeze((auditObservations ?? []).filter((entry) =>
    sameIdentity(identity, entry) &&
    hasText(entry.auditId) &&
    validObservedAt(entry.observedAtMs, evaluatedAtMs, policy.maxObservationAgeMs) &&
    Number.isFinite(entry.reportIssuedAtMs) &&
    entry.reportIssuedAtMs > 0 &&
    entry.reportIssuedAtMs <= evaluatedAtMs &&
    evaluatedAtMs - entry.reportIssuedAtMs <= policy.maxAuditAgeMs &&
    hasText(entry.auditorAuthorityId) &&
    hasText(entry.auditorAuthorityVersion) &&
    hasText(entry.reportAuthorityId) &&
    hasText(entry.reportAuthorityVersion) &&
    entry.findings.every((finding) => Number.isInteger(finding.unresolvedCount) && finding.unresolvedCount >= 0) &&
    validEvidenceRefs(entry.evidenceRefs)));

  const admittedProofs = Object.freeze((formalVerificationObservations ?? []).filter((entry) =>
    sameIdentity(identity, entry) &&
    hasText(entry.proofId) &&
    hasText(entry.specificationId) &&
    hasText(entry.specificationVersion) &&
    hasText(entry.verifierId) &&
    hasText(entry.verifierVersion) &&
    hasText(entry.authorityId) &&
    hasText(entry.authorityVersion) &&
    validObservedAt(entry.observedAtMs, evaluatedAtMs, policy.maxObservationAgeMs) &&
    Number.isFinite(entry.proofGeneratedAtMs) &&
    entry.proofGeneratedAtMs > 0 &&
    entry.proofGeneratedAtMs <= evaluatedAtMs &&
    evaluatedAtMs - entry.proofGeneratedAtMs <= policy.maxFormalProofAgeMs &&
    validEvidenceRefs(entry.evidenceRefs)));

  const codeMismatch = admittedCodeIdentity.some((entry) => entry.state === 'MISMATCH');
  if (codeMismatch) {
    return evaluateResult(identity, 'BLOCKED', false, admittedCodeIdentity, admittedAudits, admittedProofs, 'Attestierte deployed-code Identity stimmt nicht mit dem gebundenen Runtime-Code-Hash überein.');
  }

  if (policy.codeIdentityRequirement === 'REQUIRED') {
    if (admittedCodeIdentity.length === 0 || admittedCodeIdentity.some((entry) => entry.state === 'UNKNOWN')) {
      return evaluateResult(identity, 'NOT_COMPUTABLE', null, admittedCodeIdentity, admittedAudits, admittedProofs, 'Erforderliche deployed-code Identity Evidence fehlt oder ist unbekannt.');
    }
    if (!admittedCodeIdentity.some((entry) => entry.state === 'EXACT_MATCH')) {
      return evaluateResult(identity, 'NOT_COMPUTABLE', null, admittedCodeIdentity, admittedAudits, admittedProofs, 'Kein attestierter exakter Source-/Bytecode-Identity-Match vorhanden.');
    }
  }

  const blockingSeverities = new Set(policy.blockingFindingSeverities);
  const unresolvedBlockingFinding = admittedAudits.some((audit) =>
    audit.findings.some((finding) => blockingSeverities.has(finding.severity) && finding.unresolvedCount > 0));
  if (unresolvedBlockingFinding) {
    return evaluateResult(identity, 'BLOCKED', false, admittedCodeIdentity, admittedAudits, admittedProofs, 'Mindestens ein admissibles Audit enthält ungeklärte Findings in einer policy-blockierenden Severity.');
  }

  const quorumEligibleAudits = policy.requiredAuditScope === 'FULL_CONTRACT'
    ? admittedAudits.filter((entry) => entry.scope === 'FULL_CONTRACT')
    : admittedAudits;
  const independentAuditors = new Set(quorumEligibleAudits.map((entry) =>
    `${entry.auditorAuthorityId}@${entry.auditorAuthorityVersion}`));
  if (independentAuditors.size < policy.minIndependentAuditors) {
    return evaluateResult(
      identity,
      'NOT_COMPUTABLE',
      null,
      admittedCodeIdentity,
      admittedAudits,
      admittedProofs,
      `Nur ${independentAuditors.size} scope-qualifizierte unabhängige Auditor-Authorities; mindestens ${policy.minIndependentAuditors} sind erforderlich.`,
    );
  }

  const counterexample = admittedProofs.some((entry) => entry.state === 'COUNTEREXAMPLE');
  if (counterexample) {
    return evaluateResult(identity, 'BLOCKED', false, admittedCodeIdentity, admittedAudits, admittedProofs, 'Formale Verifikation enthält einen attestierten Counterexample gegen die gebundene Spezifikation.');
  }

  if (policy.formalVerificationRequirement === 'REQUIRED') {
    if (admittedProofs.length === 0) {
      return evaluateResult(identity, 'NOT_COMPUTABLE', null, admittedCodeIdentity, admittedAudits, admittedProofs, 'Die Policy verlangt Formal-Verification-Evidence, aber kein admissibler Proof liegt vor.');
    }
    if (admittedProofs.some((entry) => entry.state === 'UNKNOWN' || entry.state === 'INCONCLUSIVE')) {
      return evaluateResult(identity, 'NOT_COMPUTABLE', null, admittedCodeIdentity, admittedAudits, admittedProofs, 'Formal-Verification-Evidence ist unbekannt oder nicht schlüssig.');
    }
    if (!admittedProofs.some((entry) => entry.state === 'PROVED')) {
      return evaluateResult(identity, 'NOT_COMPUTABLE', null, admittedCodeIdentity, admittedAudits, admittedProofs, 'Kein attestierter PROVED-Nachweis für die gebundene formale Spezifikation vorhanden.');
    }
  }

  return evaluateResult(
    identity,
    'PASS',
    true,
    admittedCodeIdentity,
    admittedAudits,
    admittedProofs,
    'Contract-Identity, Audit-Evidence und optional erforderliche Formal-Verification-Evidence erfüllen die governte Assurance-Policy.',
  );
}
