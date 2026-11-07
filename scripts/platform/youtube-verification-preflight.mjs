import { writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const REPO = 'SvenKulessa/Capital-AI';

export async function preflight({ sha256, generation, token, runId, fetchImpl = fetch }) {
  if (!/^[1-9][0-9]*$/.test(runId ?? '') ||
      !/^[1-9][0-9]{0,19}$/.test(generation ?? '') ||
      !/^[a-f0-9]{64}$/.test(sha256 ?? '')) throw Error('INPUT_INVALID');
  if (typeof token !== 'string' || token.length < 9 || /[\s]/.test(token)) throw Error('GITHUB_AUTH_REQUIRED');
  const claimName = 'youtube-verification-demo-claim-v1';
  for (let page = 1; page <= 100; page += 1) {
    const response = await fetchImpl('https://api.github.com/repos/' + REPO + '/actions/artifacts?per_page=100&page=' + page, {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json' },
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw Error('GITHUB_READ_FAILED');
    const data = await response.json();
    if (!Array.isArray(data.artifacts)) throw Error('ARTIFACT_LIST_INVALID');
    if (data.artifacts.some(artifact => artifact.name === claimName || artifact.name === 'youtube-demo-claim-' + sha256)) {
      throw Error('PRIOR_UPLOAD_CLAIM_REQUIRES_RECONCILIATION');
    }
    if (data.artifacts.length < 100) return { claimName, runId, status: 'CLAIMED_NO_AUTOMATIC_RETRY' };
  }
  throw Error('ARTIFACT_HISTORY_LIMIT');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    const claim = await preflight({
      generation: process.env.DEMO_OBJECT_GENERATION,
      sha256: process.env.DEMO_SHA256,
      token: process.env.GH_TOKEN,
      runId: process.env.GITHUB_RUN_ID,
    });
    await writeFile('youtube-upload-claim.json', JSON.stringify(claim, null, 2), { flag: 'wx', mode: 0o600 });
    await appendFile(process.env.GITHUB_OUTPUT, 'claim_name=' + claim.claimName + '\n');
  } catch {
    console.error('YOUTUBE_UPLOAD_PREFLIGHT_STOPPED');
    process.exitCode = 1;
  }
}
