import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_ASSET_CLASSES = ['crypto','equity_us','equity_eu','commodities','forex','fixed_income'];

const digestRef = /^ghcr\.io\/svenkulessa\/capital-ai@sha256:[a-f0-9]{64}$/;

export function verifyReleaseReadiness(evidence) {
  const reasons = [];
  const assetEvidence = new Map((evidence.assetClasses || []).map(row => [row.assetClass, row]));
  const uniqueClasses = assetEvidence.size === (evidence.assetClasses || []).length;
  const count = value => Number.isSafeInteger(value) && value >= 0;

  const checks = {
    sourceIsCurrentMain: Boolean(evidence.sourceSha && evidence.sourceSha === evidence.currentMainSha),
    requiredChecksPass: evidence.requiredChecks === 'PASS',
    natsReachable: evidence.brokers?.nats?.authenticated === true && evidence.brokers?.nats?.jetstream === true,
    valkeyReachable: evidence.brokers?.valkey?.connected === true,
    fullPipelineMeasured: evidence.pipeline?.scope === 'FULL_PIPELINE' && Number(evidence.pipeline?.samples || 0) >= 600,
    latencyBelow200ms: Number.isFinite(evidence.pipeline?.p95Ms) && Number.isFinite(evidence.pipeline?.maxMs) &&
      evidence.pipeline.p95Ms < 200 && evidence.pipeline.maxMs < 200,
    noDataLeakFindings: evidence.cads?.dataLeakFindings === 0,
    cadsLayerCoverage: ['ingress','normalization','scoring','stream','cache','storage','api','presentation']
      .every(layer => (evidence.cads?.coveredLayers || []).includes(layer)),
    immutableGhcrDigest: digestRef.test(String(evidence.imageRef || '')),
    productionHandoffVerified: evidence.productionHandoff === 'PASS',
    uniqueAssetClassEvidence: uniqueClasses,
  };

  const assetClasses = REQUIRED_ASSET_CLASSES.map(assetClass => {
    const row = assetEvidence.get(assetClass);
    const pass = Boolean(uniqueClasses && row &&
      [row.concurrent, row.attempted, row.succeeded, row.failed].every(count) &&
      row.attempted === row.succeeded + row.failed && row.concurrent <= row.attempted &&
      Number(row.concurrent || 0) >= 100 &&
      Number(row.attempted || 0) >= 100 &&
      Number(row.succeeded || 0) >= 100 &&
      Number(row.failed || 0) === 0 &&
      row.scoreEngine === 'PASS' &&
      row.productionEligibility === 'PASS' &&
      row.dataRights === 'PASS');
    if (!pass) reasons.push('ASSET_CLASS_NOT_PROVEN:' + assetClass);
    return { ...(row || {}), assetClass, pass };
  });
  checks.assetClasses100Concurrent = assetClasses.every(row => row.pass);

  for (const [key, value] of Object.entries(checks)) if (!value) reasons.push('GATE_FAILED:' + key);

  return {
    schema: 'CAPITAL_AI_RELEASE_READINESS@1',
    sourceSha: evidence.sourceSha || null,
    currentMainSha: evidence.currentMainSha || null,
    imageRef: evidence.imageRef || null,
    checks,
    assetClasses,
    deployAllowed: reasons.length === 0,
    reasons,
    policy: {
      deployOnlyAffectedService: true,
      natsHeadOnlyRedeploy: false,
      requireImmutableDigest: true,
      failClosedOnMissingEvidence: true,
    },
  };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const input = process.argv[2];
  const output = process.argv[3];
  if (!input) throw new Error('Usage: verify-release-readiness.mjs <evidence.json> [output.json]');
  const result = verifyReleaseReadiness(JSON.parse(fs.readFileSync(input, 'utf8')));
  const body = JSON.stringify(result, null, 2) + '\n';
  if (output) fs.writeFileSync(output, body);
  process.stdout.write(body);
  if (!result.deployAllowed) process.exitCode = 1;
}
