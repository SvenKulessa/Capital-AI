import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gatePath = resolve(root, 'CAPITAL-AI-GROWTH/social-engine-completion-gate.json');
const workPackagePath = resolve(root, 'CAPITAL-AI-GROWTH/FINANCE-SOCIAL-MARKET-MIGRATION-WORKPACKAGE-20261005.yaml');

function fail(message) {
  throw new Error('[SOCIAL-ENGINE-COMPLETION-GATE] ' + message);
}

function present(paths) {
  return paths.filter(path => existsSync(resolve(root, path)));
}

export function evaluateSocialEngineCompletionGate() {
  const gate = JSON.parse(readFileSync(gatePath, 'utf8'));
  const workPackage = readFileSync(workPackagePath, 'utf8');

  if (gate.schemaVersion !== 'SOCIAL_ENGINE_COMPLETION_GATE@1') fail('schemaVersion mismatch');
  if (gate.point !== '06_SOCIAL_ENGINE_MIGRATION_COMPLETION_GATE') fail('point mismatch');
  if (!/^[0-9a-f]{40}$/.test(gate.correlatedMain || '')) fail('correlatedMain must be immutable SHA');

  const runtimePresent = present(gate.requiredRuntimeArtifacts || []);
  const rendererPresent = present(gate.requiredRendererArtifacts || []);
  const evidencePresent = present(gate.requiredEvidenceArtifacts || []);
  const missingRuntime = (gate.requiredRuntimeArtifacts || []).filter(path => !runtimePresent.includes(path));
  const missingRenderer = (gate.requiredRendererArtifacts || []).filter(path => !rendererPresent.includes(path));
  const missingEvidence = (gate.requiredEvidenceArtifacts || []).filter(path => !evidencePresent.includes(path));

  const runtimeComplete = missingRuntime.length === 0;
  const rendererComplete = missingRenderer.length === 0;
  const evidenceComplete = missingEvidence.length === 0;
  const actualState = runtimeComplete && rendererComplete && evidenceComplete ? 'PASS' : 'BLOCKED';

  const forbiddenPresent = present(gate.forbiddenFinanceScoringRuntimeBeforePass || []);
  if (actualState !== 'PASS' && forbiddenPresent.length > 0) {
    fail('Finance scoring runtime appeared before Social Engine PASS: ' + forbiddenPresent.join(', '));
  }

  if (gate.declaredState !== actualState) {
    fail(`declaredState=${gate.declaredState} but repository evaluates to ${actualState}`);
  }

  const backlogStatusMatch = workPackage.match(/followUpBacklog:[\s\S]*?status:\s*"([^"]+)"/);
  const backlogStatus = backlogStatusMatch?.[1] || null;
  if (!backlogStatus) fail('followUpBacklog status missing from work package');

  if (actualState !== 'PASS' && backlogStatus !== 'BLOCKED_BY_SOCIAL_MEDIA_ENGINE_MIGRATION') {
    fail('Finance scoring/data follow-up must remain blocked while Social Engine gate is not PASS');
  }
  if (actualState === 'PASS' && backlogStatus === 'BLOCKED_BY_SOCIAL_MEDIA_ENGINE_MIGRATION') {
    fail('Social Engine is complete but Finance scoring/data follow-up is still declared blocked');
  }

  return {
    status: actualState,
    runtime: { present: runtimePresent.length, required: gate.requiredRuntimeArtifacts.length, missing: missingRuntime },
    renderer: { present: rendererPresent.length, required: gate.requiredRendererArtifacts.length, missing: missingRenderer },
    evidence: { present: evidencePresent.length, required: gate.requiredEvidenceArtifacts.length, missing: missingEvidence },
    financeScoringRuntimePresentBeforePass: forbiddenPresent,
    followUpBacklogStatus: backlogStatus,
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.stdout.write(JSON.stringify(evaluateSocialEngineCompletionGate(), null, 2) + '\n');
}
