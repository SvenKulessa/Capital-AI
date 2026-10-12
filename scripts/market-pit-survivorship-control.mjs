// SPDX-License-Identifier: MIT
// Synthetic-only research control. This validator does NOT admit market datasets, scores or trading.
import { createHash } from 'node:crypto';

export const PIT_UNIVERSE_CONTROL_VERSION = 'CAPITAL_AI_PIT_UNIVERSE_CONTROL@1';
export const PIT_UNIVERSE_MANIFEST_VERSION = 'CAPITAL_AI_SYNTHETIC_PIT_UNIVERSE@1';

function timestamp(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) return NaN;
  return Date.parse(value);
}
function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort().map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  return JSON.stringify(value);
}
const fingerprint = value => createHash('sha256').update(canonical(value)).digest('hex');
const nonblank = value => typeof value === 'string' && value.trim().length > 0;

export function inspectSyntheticPitUniverse(manifest, dataset) {
  const blockers = new Set();
  const reject = reason => blockers.add(reason);
  if (!manifest || !dataset || typeof manifest !== 'object' || typeof dataset !== 'object') {
    return Object.freeze({ version: PIT_UNIVERSE_CONTROL_VERSION, status: 'BLOCKED',
      reasons: ['PIT_INPUT_MISSING'], fingerprint: null, empiricalPerformanceProven: false,
      productionEligible: false, scoreEligible: false, redistributionAllowed: false });
  }
  if (manifest.schemaVersion !== PIT_UNIVERSE_MANIFEST_VERSION) reject('PIT_MANIFEST_SCHEMA_INVALID');
  if (manifest.dataClass !== 'SYNTHETIC_ONLY' || dataset.dataClass !== 'SYNTHETIC_ONLY') reject('PIT_SYNTHETIC_SCOPE_REQUIRED');
  if (dataset.immutable !== true || dataset.authority !== 'VALIDATION_ONLY') reject('PIT_RESEARCH_ONLY_REQUIRED');
  for (const field of ['datasetId','datasetVersion','universeId']) {
    if (!nonblank(manifest[field]) || manifest[field] !== dataset[field]) reject('PIT_IDENTITY_MISMATCH:' + field);
  }
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0 ||
      !Array.isArray(manifest.snapshots) || manifest.snapshots.length < 2 ||
      !Array.isArray(dataset.observations) || dataset.observations.length === 0) {
    reject('PIT_DATASET_INCOMPLETE');
  }
  const assets = new Map();
  for (const asset of Array.isArray(manifest.assets) ? manifest.assets : []) {
    if (!nonblank(asset.assetId) || assets.has(asset.assetId)) { reject('PIT_ASSET_ID_DUPLICATE_OR_MISSING'); continue; }
    const listed = timestamp(asset.listedAt), delisted = asset.delistedAt === null ? Infinity : timestamp(asset.delistedAt);
    if (!Number.isFinite(listed) || Number.isNaN(delisted) || delisted <= listed ||
        !nonblank(asset.symbol) || !nonblank(asset.identityEvidenceId)) reject('PIT_ASSET_LIFECYCLE_INVALID:' + asset.assetId);
    assets.set(asset.assetId, { ...asset, listed, delisted });
  }
  const snapshots = new Map();
  for (const snapshot of Array.isArray(manifest.snapshots) ? manifest.snapshots : []) {
    const decision = timestamp(snapshot.decisionAt);
    const captured = timestamp(snapshot.capturedAt);
    const published = timestamp(snapshot.publishedAt);
    const key = snapshot.decisionAt;
    if (!Number.isFinite(decision) || !Number.isFinite(captured) || !Number.isFinite(published) ||
        captured > decision || published > captured) reject('PIT_SNAPSHOT_LOOKAHEAD:' + String(key));
    if (snapshots.has(key)) reject('PIT_SNAPSHOT_DUPLICATE:' + String(key));
    snapshots.set(key, snapshot);
    const declared = new Map();
    for (const item of Array.isArray(snapshot.members) ? snapshot.members : []) {
      if (!nonblank(item.assetId) || declared.has(item.assetId)) { reject('PIT_MEMBER_DUPLICATE_OR_MISSING:' + String(key)); continue; }
      if (!assets.has(item.assetId)) reject('PIT_MEMBER_UNKNOWN_ASSET:' + item.assetId);
      if (!nonblank(item.membershipEvidenceId) || !Number.isFinite(timestamp(item.availableAt)) ||
          timestamp(item.availableAt) > decision) reject('PIT_MEMBERSHIP_LOOKAHEAD:' + item.assetId);
      declared.set(item.assetId, item);
    }
    const eligible = [...assets.values()].filter(asset => asset.listed <= decision && decision < asset.delisted)
      .map(asset => asset.assetId).sort();
    const actual = [...declared.keys()].sort();
    if (JSON.stringify(eligible) !== JSON.stringify(actual)) reject('PIT_SURVIVORSHIP_OR_UNIVERSE_COVERAGE:' + String(key));
  }
  const observed = new Map();
  for (const observation of Array.isArray(dataset.observations) ? dataset.observations : []) {
    const key = String(observation.decisionAt) + '::' + String(observation.assetId);
    if (observed.has(key)) reject('PIT_OBSERVATION_DUPLICATE:' + key);
    observed.set(key, observation);
    const snapshot = snapshots.get(observation.decisionAt);
    const member = snapshot?.members?.find(row => row.assetId === observation.assetId);
    if (!snapshot || !member) reject('PIT_OBSERVATION_NOT_IN_HISTORICAL_UNIVERSE:' + key);
    if (!nonblank(observation.observationId) ||
        !nonblank(observation.universeMembershipEvidenceId) ||
        observation.universeMembershipEvidenceId !== member?.membershipEvidenceId) reject('PIT_MEMBERSHIP_EVIDENCE_MISMATCH:' + key);
    const decision = timestamp(observation.decisionAt), realized = timestamp(observation.realizedAt);
    if (!Number.isFinite(realized) || !Number.isFinite(decision) || realized <= decision) reject('PIT_OUTCOME_TIME_INVALID:' + key);
    if (!Array.isArray(observation.features) || observation.features.length === 0) reject('PIT_FEATURE_EVIDENCE_MISSING:' + key);
    for (const feature of Array.isArray(observation.features) ? observation.features : []) {
      if (!nonblank(feature.featureKey) || !nonblank(feature.sourceVersion) ||
          !Number.isFinite(timestamp(feature.availableAt)) ||
          timestamp(feature.availableAt) > decision) reject('PIT_LOOKAHEAD_FEATURE:' + key);
    }
  }
  for (const [decisionAt,snapshot] of snapshots) {
    for (const member of Array.isArray(snapshot.members) ? snapshot.members : []) {
      if (!observed.has(decisionAt + '::' + member.assetId)) reject('PIT_SURVIVORSHIP_OBSERVATION_MISSING:' + decisionAt + '::' + member.assetId);
    }
  }
  const reasons = Object.freeze([...blockers].sort());
  return Object.freeze({
    version: PIT_UNIVERSE_CONTROL_VERSION, manifestVersion: manifest.schemaVersion,
    datasetVersion: dataset.datasetVersion, status: reasons.length ? 'BLOCKED' : 'VALIDATED_SYNTHETIC_FIXTURE',
    reasons, fingerprint: fingerprint({ manifest, dataset }),
    observedDecisionCount: snapshots.size, observedRecordCount: observed.size,
    empiricalPerformanceProven: false, productionEligible: false,
    scoreEligible: false, redistributionAllowed: false,
  });
}
