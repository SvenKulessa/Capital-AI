#!/usr/bin/env node
// Owner-local Social Media Engine TTS helper. No public server endpoint.
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, relative, resolve, sep } from 'node:path';
import {
  parsePrivateNeural2Request, previewPrivateNeural2,
  synthesizePrivateNeural2,
} from '../../server/social-media/google-neural2-tts.mjs';

function option(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) return undefined;
  const value = argv[index + 1];
  if (!value || value.startsWith('--')) throw new Error('SOCIAL_NEURAL2_ARGUMENT_INVALID');
  return value;
}
function privatePath(path) {
  const absolute = resolve(path);
  const cwd = process.cwd();
  const fromCwd = relative(cwd, absolute);
  if (fromCwd === '' || (fromCwd !== '..' && !fromCwd.startsWith('..' + sep)
    && !isAbsolute(fromCwd))) {
    throw new Error('SOCIAL_NEURAL2_PRIVATE_OUTPUT_MUST_BE_OUTSIDE_REPOSITORY');
  }
  return absolute;
}
function gcloudAccessToken() {
  if (process.env.SOCIAL_NEURAL2_ACCESS_TOKEN) return process.env.SOCIAL_NEURAL2_ACCESS_TOKEN;
  const result = spawnSync('gcloud', ['auth', 'print-access-token'],
    { encoding: 'utf8', timeout: 12_000, windowsHide: true });
  if (result.status !== 0 || !result.stdout?.trim()) {
    throw new Error('SOCIAL_NEURAL2_PRIVATE_GCLOUD_AUTH_REQUIRED');
  }
  return result.stdout.trim();
}
async function main() {
  const args = process.argv.slice(2);
  const allowed = new Set(['--request', '--out-dir', '--execute', '--dry-run']);
  for (let i = 0; i < args.length; i++) {
    if (!allowed.has(args[i])) throw new Error('SOCIAL_NEURAL2_ARGUMENT_INVALID');
    if (args[i] === '--request' || args[i] === '--out-dir') i++;
  }
  if (args.includes('--execute') && args.includes('--dry-run')) {
    throw new Error('SOCIAL_NEURAL2_ARGUMENT_INVALID');
  }
  const inputPath = option(args, '--request');
  if (!inputPath) throw new Error('SOCIAL_NEURAL2_REQUEST_PATH_REQUIRED');
  const rawRequest = JSON.parse(await readFile(inputPath, 'utf8'));
  const request = parsePrivateNeural2Request(rawRequest);
  const preflight = previewPrivateNeural2(rawRequest, process.env);
  if (!args.includes('--execute')) {
    process.stdout.write(JSON.stringify(preflight, null, 2) + '\n');
    return;
  }
  const outDir = privatePath(option(args, '--out-dir') ??
    join(homedir(), '.capital-ai', 'private-social-audio'));
  await mkdir(outDir, { recursive: true, mode: 0o700 });
  const result = await synthesizePrivateNeural2({
    rawRequest, env: process.env,
    ledgerPath: join(homedir(), '.capital-ai', 'private-social-audio-usage-ledger.json'),
    accessToken: gcloudAccessToken(),
  });
  const basename = request.voice + '-' + result.evidence.requestHash.slice(0,20);
  const wavName = basename + '.wav';
  const wavPath = join(outDir, wavName);
  await writeFile(wavPath, result.wav, { flag: 'wx', mode: 0o600 });
  const review = {
    evidence: result.evidence,
    status: 'REVIEW_REQUIRED',
    // This binding MUST remain blocked until the owner listens and explicitly
    // changes acceptanceStatus to PASS in the containing render manifest.
    voiceover: {
      audioPath: wavName,
      audioSha256: result.evidence.audioSha256,
      requestHash: result.evidence.requestHash,
      contentPackageId: result.evidence.contentPackageId,
      candidateContentHash: result.evidence.candidateContentHash,
      runtimeEvidenceReference: 'GOOGLE_NEURAL2_PRIVATE_EU:' + result.evidence.requestHash,
      licenseEvidenceReference: 'docs/growth/GOOGLE-NEURAL2-PRIVATE-SOCIAL-TTS-20261009.md',
      listeningReviewReference: 'PENDING_OWNER_AUDIO_REVIEW',
      acceptanceStatus: 'REVIEW_REQUIRED',
    },
    note: 'For the existing renderer, keep audio and manifest in the same private directory; verify whole speech and disclaimer before updating to PASS.',
  };
  await writeFile(join(outDir, basename + '.review.json'),
    JSON.stringify(review, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  process.stdout.write(JSON.stringify({
    ok: true, audioPath: wavPath,
    reviewPath: join(outDir, basename + '.review.json'),
    audioSha256: result.evidence.audioSha256,
    approval: 'REVIEW_REQUIRED', published: false,
  }) + '\n');
}
main().catch(error => {
  const message = error instanceof Error && /^SOCIAL_NEURAL2_[A-Z_]+$/.test(error.message)
    ? error.message : 'SOCIAL_NEURAL2_PRIVATE_GENERATION_FAILED';
  process.stderr.write(JSON.stringify({ ok: false, error: message }) + '\n');
  process.exitCode = 2;
});
