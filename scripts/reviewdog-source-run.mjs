import { appendFileSync, writeFileSync } from 'node:fs';

const id = process.env.SOURCE_RUN_ID;
const repository = process.env.GITHUB_REPOSITORY;
if (!/^[1-9][0-9]*$/.test(id ?? '') || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository ?? '')) {
  throw new Error('Invalid workflow run or repository');
}
const api = async suffix => {
  const response = await fetch(`https://api.github.com/repos/${repository}/actions/${suffix}`, {
    headers: { Authorization: `Bearer ${process.env.GITHUB_TOKEN}`, Accept: 'application/vnd.github+json' },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`GitHub read failed (${response.status})`);
  return response.json();
};
const run = await api(`runs/${id}`);
if (run.status !== 'completed' || run.repository?.full_name !== repository ||
    run.path?.split('@')[0] !== '.github/workflows/build-security.yml' || !/^[a-f0-9]{40}$/.test(run.head_sha)) {
  throw new Error('Select a completed Docker Build Sicherheit run from this repository');
}
const artifacts = await api(`runs/${id}/artifacts?per_page=100`);
if (artifacts.total_count > 100) throw new Error('Artifact inventory exceeds pilot limit');
const selected = artifacts.artifacts.filter(a => /^docker-security-[a-f0-9]{40}$/.test(a.name) && !a.expired);
if (selected.length !== 1) throw new Error('Exactly one unexpired Docker security report is required');
const artifact = selected[0];
if (!/^sha256:[a-f0-9]{64}$/.test(artifact.digest ?? '')) throw new Error('Artifact digest is missing');
const metadata = { runId: run.id, runAttempt: run.run_attempt, conclusion: run.conclusion,
  workflowHeadSha: run.head_sha, artifactId: artifact.id, artifactDigest: artifact.digest,
  artifactSha: artifact.name.slice('docker-security-'.length) };
writeFileSync('reviewdog-source-run.json', JSON.stringify(metadata, null, 2) + '\n');
for (const [key, value] of Object.entries({ artifact_id: artifact.id, head_sha: run.head_sha, artifact_sha: metadata.artifactSha })) {
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
}
