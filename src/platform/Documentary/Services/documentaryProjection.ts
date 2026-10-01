import {
  DOCUMENTARY_LIFECYCLES,
  DOCUMENTARY_SCHEMA,
  DOCUMENTARY_VERSION,
  type DocumentaryAudience,
  type DocumentaryEvidenceRecord,
} from '../Models/documentaryEvidence';

const SHA256_RE = /^[a-f0-9]{64}$/i;
const GIT_SHA_RE = /^[a-f0-9]{40}$/i;
const CHANGE_TYPES = new Set([
  'FEATURE', 'FIX', 'SECURITY', 'DEPENDENCY', 'ARCHITECTURE', 'RUNTIME',
  'DOCUMENTATION', 'COMMERCIALIZATION', 'LICENSE', 'GOVERNANCE',
]);
const VALIDATION_STEPS = ['DETECT', 'CORRELATE', 'CLASSIFY', 'REMEDIATE', 'VERIFY'];

function nonEmpty(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function sameArray(left: unknown, right: readonly string[]): boolean {
  return Array.isArray(left) &&
    left.length === right.length &&
    left.every((entry, index) => entry === right[index]);
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  return String(value);
}

function list(values: unknown[]): string {
  return values.length ? values.map((value) => `- ${formatValue(value)}`).join('\n') : '- —';
}

function evidenceRefs(gate: { evidenceRefs?: string[] }): string {
  return gate.evidenceRefs?.length ? gate.evidenceRefs.join('<br>') : '—';
}

export function validateDocumentaryEvidence(record: DocumentaryEvidenceRecord): string[] {
  const failures: string[] = [];

  if (record.schema !== DOCUMENTARY_SCHEMA) failures.push('schema must be DOCUMENTARY_EVIDENCE@1');
  if (record.version !== DOCUMENTARY_VERSION) failures.push('version must be 1.0.0');
  if (record.metadata?.project !== 'CAPITAL-AI') failures.push('metadata.project must be CAPITAL-AI');
  if (record.metadata?.domain !== 'PLATFORM') failures.push('metadata.domain must be PLATFORM');
  if (record.metadata?.consumerDomain !== 'GROWTH') failures.push('metadata.consumerDomain must be GROWTH');
  if (!DOCUMENTARY_LIFECYCLES.includes(record.state?.lifecycle)) failures.push('state.lifecycle is invalid');
  if (record.metadata?.status !== record.state?.lifecycle) failures.push('metadata.status must equal state.lifecycle');

  if (!nonEmpty(record.correlation?.changeId)) failures.push('correlation.changeId is required for evidence instances');
  if (!nonEmpty(record.identity?.documentaryId)) failures.push('identity.documentaryId is required');
  if (!GIT_SHA_RE.test(record.identity?.sourceSha ?? '')) failures.push('identity.sourceSha must be a 40-character Git SHA');
  if (record.identity?.parentSha !== null && !GIT_SHA_RE.test(record.identity?.parentSha ?? '')) failures.push('identity.parentSha must be null or a 40-character Git SHA');
  if (!record.identity?.createdAt || Number.isNaN(Date.parse(record.identity.createdAt))) failures.push('identity.createdAt must be an ISO timestamp');
  if (record.identity?.pullRequest !== null && (!Number.isInteger(record.identity.pullRequest) || record.identity.pullRequest <= 0)) failures.push('identity.pullRequest must be null or a positive integer');

  const changeType = typeof record.change?.type === 'string' ? record.change.type : null;
  if (!changeType || !CHANGE_TYPES.has(changeType)) failures.push('change.type must be one of the canonical change types');
  if (!nonEmpty(record.change?.title)) failures.push('change.title is required');
  if (!nonEmpty(record.change?.summary)) failures.push('change.summary is required');
  if (!nonEmpty(record.change?.domains?.primary)) failures.push('change.domains.primary is required');

  const files = record.implementation?.changedFiles ?? [];
  if (new Set(files).size !== files.length) failures.push('implementation.changedFiles must not contain duplicates');

  if (record.supplyChain?.source?.commitSha !== record.identity?.sourceSha) {
    failures.push('supplyChain.source.commitSha must equal identity.sourceSha');
  }

  if (!sameArray(record.selfHealing?.validationSteps, VALIDATION_STEPS)) {
    failures.push('selfHealing.validationSteps must be DETECT, CORRELATE, CLASSIFY, REMEDIATE, VERIFY');
  }
  if ((record.selfHealing?.validationCycle?.required ?? 0) < 3) failures.push('selfHealing requires at least three validation cycles');
  if (record.selfHealing?.eligibleForAutomation) {
    const cycle = record.selfHealing.validationCycle;
    const promotion = record.selfHealing.promotionConditions;
    if (cycle.current < cycle.required) failures.push('automation eligibility requires all validation cycles');
    if (!promotion?.validationCyclesPassed || !promotion?.deterministicOutput || !promotion?.noTrustBoundaryChange || !promotion?.noHumanAuthorityRequired) {
      failures.push('automation eligibility requires all promotion conditions');
    }
    if (!nonEmpty(record.selfHealing.repairClass)) failures.push('automation eligibility requires repairClass');
  }

  if (record.runtime?.deployed && !record.runtime?.readback?.performed) {
    failures.push('runtime.deployed=true requires runtime readback');
  }
  if (record.runtime?.deploymentRequired && record.state?.lifecycle === 'EFFECTIVE') {
    if (!record.runtime?.readback?.performed) failures.push('EFFECTIVE deployment requires runtime readback');
    if (record.runtime?.readback?.sourceSha !== record.identity?.sourceSha) failures.push('EFFECTIVE runtime sourceSha must match documentary sourceSha');
  }

  if (record.state?.lifecycle === 'SUPERSEDED' && !nonEmpty(record.state?.supersededBy)) {
    failures.push('SUPERSEDED evidence requires state.supersededBy');
  }

  if (record.integrity?.canonicalSerialization !== 'RFC8785') failures.push('integrity.canonicalSerialization must be RFC8785');
  if (record.integrity?.hashAlgorithm !== 'SHA-256') failures.push('integrity.hashAlgorithm must be SHA-256');
  if (!SHA256_RE.test(record.integrity?.documentaryDigest ?? '')) failures.push('integrity.documentaryDigest must be a SHA-256 hex digest');

  if (record.safety?.historicalRecordsImmutable !== true) failures.push('historicalRecordsImmutable must be true');
  if (record.safety?.inferredSuccessForbidden !== true) failures.push('inferredSuccessForbidden must be true');
  if (record.safety?.missingEvidenceMeansSuccess !== false) failures.push('missingEvidenceMeansSuccess must be false');

  return failures;
}

const SENSITIVE_KEY = /(secret|token|password|credential|authorization|cookie|private.*email)/i;

export function redactDocumentaryValue(value: unknown, key = ''): unknown {
  if (SENSITIVE_KEY.test(key) && value !== null && value !== undefined) return '[REDACTED]';
  if (Array.isArray(value)) return value.map((entry) => redactDocumentaryValue(entry));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([childKey, childValue]) => [
        childKey,
        redactDocumentaryValue(childValue, childKey),
      ]),
    );
  }
  return value;
}

export function projectDocumentaryRecord(
  record: DocumentaryEvidenceRecord,
  audience: DocumentaryAudience = 'engineering',
): DocumentaryEvidenceRecord {
  if (audience === 'public') {
    return redactDocumentaryValue(record) as DocumentaryEvidenceRecord;
  }
  return structuredClone(record);
}

export function renderDocumentaryMarkdown(
  record: DocumentaryEvidenceRecord,
  audience: DocumentaryAudience = 'engineering',
): string {
  const projected = projectDocumentaryRecord(record, audience);
  const validationRows = Object.entries(projected.validation)
    .map(([gate, value]) => `| ${gate} | ${formatValue(value.status)} | ${evidenceRefs(value)} |`)
    .join('\n');

  return `<!-- GENERATED FILE. DO NOT EDIT. -->
<!-- Source: ${projected.identity.documentaryId} @ ${projected.identity.sourceSha} -->
# ${formatValue(projected.change.title)}

> Deterministische Documentary-Projektion aus \`${projected.schema}\` v${projected.version}. Generated output ist keine kanonische Evidence und darf nicht von Hand editiert werden.

## Identity

| Feld | Wert |
| --- | --- |
| Documentary ID | ${formatValue(projected.identity.documentaryId)} |
| Change ID | ${formatValue(projected.correlation.changeId)} |
| Source SHA | ${formatValue(projected.identity.sourceSha)} |
| Parent SHA | ${formatValue(projected.identity.parentSha)} |
| Pull Request | ${formatValue(projected.identity.pullRequest)} |
| Branch | ${formatValue(projected.identity.branch)} |
| Created | ${formatValue(projected.identity.createdAt)} |
| Lifecycle | ${formatValue(projected.state.lifecycle)} |
| Audience | ${audience} |
| Documentary Digest | ${formatValue(projected.integrity.documentaryDigest)} |

## Change

${formatValue(projected.change.summary)}

**Type:** ${formatValue(projected.change.type)}  
**Primary Domain:** ${formatValue(projected.change.domains.primary)}  
**Affected Domains:** ${projected.change.domains.affected.length ? projected.change.domains.affected.join(', ') : '—'}

## Intent

**Problem:** ${formatValue(projected.intent.problem)}

**Desired Outcome:** ${formatValue(projected.intent.desiredOutcome)}

## Architecture

**Changed:** ${formatValue(projected.architecture.changed)}  
**Security Boundary Changed:** ${formatValue(projected.architecture.securityBoundaryChanged)}

### Before

${formatValue(projected.architecture.before.summary)}

### After

${formatValue(projected.architecture.after.summary)}

### Affected Components

${list(projected.architecture.affectedComponents)}

### Interfaces Changed

${list(projected.architecture.interfacesChanged)}

## Implementation

### Changed Files

${list(projected.implementation.changedFiles)}

### Execution Units

${list(projected.implementation.executionUnits.affected)}

## Validation

| Gate | Status | Evidence |
| --- | --- | --- |
${validationRows}

Missing or \`UNKNOWN\` evidence is not interpreted as success.

## Supply Chain

**Commit:** ${formatValue(projected.supplyChain.source.commitSha)}  
**SBOM Generated:** ${formatValue(projected.supplyChain.sbom.generated)}

### Immutable Digests

${list(projected.supplyChain.immutableDigests)}

### Attestations

${list(projected.supplyChain.attestations)}

## Runtime

| Feld | Wert |
| --- | --- |
| Deployment Required | ${formatValue(projected.runtime.deploymentRequired)} |
| Deployed | ${formatValue(projected.runtime.deployed)} |
| Environment | ${formatValue(projected.runtime.environment)} |
| Readback Performed | ${formatValue(projected.runtime.readback.performed)} |
| Runtime Source SHA | ${formatValue(projected.runtime.readback.sourceSha)} |
| Image Digest | ${formatValue(projected.runtime.readback.imageDigest)} |

## Observability

**Telemetry Changed:** ${formatValue(projected.observability.telemetryChanged)}

### Regressions

${list(projected.observability.regressionsDetected)}

### Anomalies

${list(projected.observability.anomalies)}

## Self-Healing

| Feld | Wert |
| --- | --- |
| Candidate Detected | ${formatValue(projected.selfHealing.candidateDetected)} |
| Pattern ID | ${formatValue(projected.selfHealing.patternId)} |
| Validation Cycle | ${projected.selfHealing.validationCycle.current} / ${projected.selfHealing.validationCycle.required} |
| Eligible for Automation | ${formatValue(projected.selfHealing.eligibleForAutomation)} |
| Repair Class | ${formatValue(projected.selfHealing.repairClass)} |

**Validation Steps:** ${projected.selfHealing.validationSteps.join(' → ')}

## Commercialization

**Affected:** ${formatValue(projected.commercialization.affected)}  
**Revenue Gate Changed:** ${formatValue(projected.commercialization.revenueGateChanged)}

## Roadmap

**Affected:** ${formatValue(projected.roadmap.affected)}

## Safety

Historical records immutable: ${formatValue(projected.safety.historicalRecordsImmutable)}  
Inferred success forbidden: ${formatValue(projected.safety.inferredSuccessForbidden)}  
Missing evidence means success: ${formatValue(projected.safety.missingEvidenceMeansSuccess)}
`;
}
