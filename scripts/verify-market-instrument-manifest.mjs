#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

const manifestPath = process.argv[2] || 'docs/market-data/evidence/instrument-manifest-20261004.json';
const shaPath = process.argv[3] || 'docs/market-data/evidence/instrument-manifest-20261004.sha256';
const raw = readFileSync(manifestPath, 'utf8');
const manifest = JSON.parse(raw);
const expectedSha = readFileSync(shaPath, 'utf8').trim().split(/\s+/)[0];
const actualSha = createHash('sha256').update(raw).digest('hex');

const classes = ['crypto', 'stocks', 'commodities', 'forex', 'indices'];
const counts = Object.fromEntries(classes.map((assetClass) => [assetClass, 0]));
const assets = Object.fromEntries(classes.map((assetClass) => [assetClass, new Set()]));
const ids = new Set();
const violations = [];
const required = [
  'instrumentId', 'assetId', 'assetClass', 'instrumentType', 'provider', 'venue',
  'providerInstrumentId', 'symbol', 'underlyingAsset', 'tradingStatus',
  'availableDataFields', 'sourceReference', 'dataRightsAdmissionReference',
  'rankingBasis', 'rankingAsOf', 'rankingPosition',
];

if (manifest.schema !== 'CAPITAL_AI_REAL_INSTRUMENT_MANIFEST@1') violations.push('SCHEMA_INVALID');
if (manifest.status !== 'CATALOG_EVIDENCE_NOT_RIGHTS_ADMISSION') violations.push('STATUS_MUST_REMAIN_CATALOG_ONLY');
if (manifest.sourceCommit !== 'de4c268311c42877f8a7e1361e7de986ffb096cb') violations.push('SOURCE_COMMIT_DRIFT');
if (actualSha !== expectedSha) violations.push('SHA256_MISMATCH');

for (const [key, source] of Object.entries(manifest.sources || {})) {
  if (!source || typeof source.url !== 'string' || !source.url.startsWith('https://')) violations.push(`SOURCE_URL_INVALID:${key}`);
  if (!source?.retrievalCompletedAt) violations.push(`SOURCE_TIMESTAMP_MISSING:${key}`);
}
for (const [index, row] of (manifest.instruments || []).entries()) {
  for (const key of required) if (!(key in row) || row[key] === undefined) violations.push(`ROW_${index}_MISSING_${key}`);
  if (!classes.includes(row.assetClass)) {
    violations.push(`ROW_${index}_ASSET_CLASS_INVALID`);
    continue;
  }
  counts[row.assetClass] += 1;
  assets[row.assetClass].add(row.assetId);
  if (ids.has(row.instrumentId)) violations.push(`DUPLICATE_INSTRUMENT_ID:${row.instrumentId}`);
  ids.add(row.instrumentId);
  if (!manifest.sources?.[row.sourceReference]) violations.push(`ROW_${index}_SOURCE_REFERENCE_UNKNOWN`);
  if (!manifest.rightsReferences?.[row.dataRightsAdmissionReference]) violations.push(`ROW_${index}_RIGHTS_REFERENCE_UNKNOWN`);
  if (['ETF', 'CFD', 'FUTURE', 'SYNTHETIC'].includes(row.instrumentType)) violations.push(`ROW_${index}_FORBIDDEN_SUBSTITUTION`);
  if (row.assetClass === 'crypto') {
    const exchanges = row.providerAvailableExchanges || [];
    if (exchanges.includes('Binance')) violations.push(`ROW_${index}_BINANCE_LINEAGE`);
    if (exchanges.includes('Synthetic')) violations.push(`ROW_${index}_SYNTHETIC_LINEAGE`);
  }
  if (row.assetClass === 'stocks' && row.instrumentType !== 'COMMON_STOCK') violations.push(`ROW_${index}_NON_COMMON_STOCK`);
}
for (const assetClass of classes) {
  if (counts[assetClass] !== 20) violations.push(`${assetClass.toUpperCase()}_INSTRUMENT_COUNT_${counts[assetClass]}`);
}
const canonicalAssetCounts = Object.fromEntries(classes.map((assetClass) => [assetClass, assets[assetClass].size]));
const firstAssetGate = Object.fromEntries(classes.map((assetClass) => [
  assetClass,
  canonicalAssetCounts[assetClass] >= 20 ? 'CATALOG_IDENTITY_PASS_RIGHTS_STILL_REQUIRED' : 'FAIL_CANONICAL_ASSET_COUNT',
]));
if (manifest.coverage?.perpetualState !== 'NOT_CAPTURED_NO_ADMITTED_DERIVATIVE_DATASET') violations.push('PERPETUAL_STATE_INVALID');

const result = {
  status: violations.length ? 'FAIL' : 'PASS',
  sha256: actualSha,
  instruments: manifest.instruments?.length || 0,
  counts,
  canonicalAssetCounts,
  firstAssetGate,
  duplicateInstrumentIds: (manifest.instruments?.length || 0) - ids.size,
  rightsAdmission: 'NOT_EVALUATED_AS_PASS_BY_THIS_VALIDATOR',
  violations,
};
console.log(JSON.stringify(result, null, 2));
if (violations.length) process.exitCode = 1;
