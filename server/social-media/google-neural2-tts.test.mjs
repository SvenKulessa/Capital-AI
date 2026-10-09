import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  GOOGLE_NEURAL2_MONTHLY_FREE_CHARACTERS,
  NEURAL2_ENDPOINT, NEURAL2_VOICES,
  PRIVATE_NEURAL2_MAX_MONTHLY_CHARACTERS,
  parsePrivateNeural2Request, previewPrivateNeural2,
  synthesizePrivateNeural2,
} from './google-neural2-tts.mjs';

const now = new Date('2026-10-09T14:00:00.000Z');
const hash = 'f'.repeat(64);
const request = {
  text: 'Die Nackenlinie ist eine Zone. Keine Anlageberatung.',
  contentPackageId: 'CA-GROWTH-PATTERN-SHORTS-20261009',
  candidateContentHash: hash,
  voice: 'de-DE-Neural2-H',
};
function env(externalUsed = '0') {
  return {
    NODE_ENV: 'development', SOCIAL_NEURAL2_PRIVATE_ENABLED: 'true',
    SOCIAL_NEURAL2_FREE_TIER_ONLY: 'true',
    SOCIAL_NEURAL2_PROJECT_ID: 'private-capital-ai-123',
    SOCIAL_NEURAL2_EXTERNAL_READBACK_PROJECT: 'private-capital-ai-123',
    SOCIAL_NEURAL2_EXTERNAL_USED_CHARS: externalUsed,
    SOCIAL_NEURAL2_EXTERNAL_READBACK_AT: '2026-10-09T13:15:00.000Z',
  };
}
const token = 'a'.repeat(32);
const wav = Buffer.alloc(180);
wav.write('RIFF', 0); wav.write('WAVE', 8);
function fakeResponse() {
  return { ok: true, headers: { get: () => null },
    json: async () => ({ audioContent: wav.toString('base64') }) };
}
async function temp(callback) {
  const dir = await mkdtemp(join(tmpdir(), 'private-neural2-test-'));
  try { return await callback(join(dir, 'ledger.json')); }
  finally { await rm(dir, { recursive: true, force: true }); }
}

test('only documented de-DE Neural2 G/H; deterministic request and conservative UTF-8 billing', () => {
  assert.deepEqual(NEURAL2_VOICES, ['de-DE-Neural2-G', 'de-DE-Neural2-H']);
  assert.equal(GOOGLE_NEURAL2_MONTHLY_FREE_CHARACTERS, 1_000_000);
  assert.equal(PRIVATE_NEURAL2_MAX_MONTHLY_CHARACTERS, 800_000);
  const p = parsePrivateNeural2Request({ ...request, text: 'Ä' });
  assert.equal(p.characterCount, 2);
  assert.equal(p.body.voice.name, 'de-DE-Neural2-H');
  assert.equal(p.requestHash, parsePrivateNeural2Request({ ...request, text: 'Ä' }).requestHash);
  assert.throws(() => parsePrivateNeural2Request({ ...request, voice: 'de-DE-Standard-H' }),
    /VOICE_NOT_ALLOWED/);
  assert.throws(() => parsePrivateNeural2Request({ ...request, text: '<speak>not supported</speak>', voice: 'de-DE-Neural2-F' }),
    /VOICE_NOT_ALLOWED/);
  assert.throws(() => parsePrivateNeural2Request({ ...request, candidateContentHash: 'invalid' }),
    /CANDIDATE_HASH_INVALID/);
  assert.throws(() => parsePrivateNeural2Request({ ...request, text: 'a'.repeat(5000) }),
    /TEXT_INVALID/);
});

test('private opt-in, billing quota readback freshness and hard cap required', () => {
  assert.throws(() => previewPrivateNeural2(request, {}, now), /PRIVATE_DISABLED/);
  assert.throws(() => previewPrivateNeural2(request, { ...env(), NODE_ENV: 'production' }, now),
    /PRIVATE_DISABLED/);
  assert.throws(() => previewPrivateNeural2(request,
    { ...env(), SOCIAL_NEURAL2_EXTERNAL_READBACK_AT: '2026-10-08T12:00:00.000Z' }, now),
    /EXTERNAL_USAGE_STALE/);
  assert.throws(() => previewPrivateNeural2(request,
    { ...env(), SOCIAL_NEURAL2_EXTERNAL_READBACK_PROJECT: 'another-project' }, now),
    /PROJECT_READBACK_MISMATCH/);
  assert.throws(() => previewPrivateNeural2(request, env('799999'), now),
    /FREE_CAP_EXCEEDED/);
  assert.equal(previewPrivateNeural2(request, env(), now).state, 'DRY_RUN');
});

test('synthesis sends one EU-only Neural2 request, binds SHA and retains local ledger', async () => {
  await temp(async ledgerPath => {
    let calls = 0;
    const fetchImpl = async (url, init) => {
      calls++;
      assert.equal(url, NEURAL2_ENDPOINT);
      assert.equal(init.redirect, 'error');
      assert.equal(init.headers['x-goog-user-project'], env().SOCIAL_NEURAL2_PROJECT_ID);
      assert.equal(init.headers.Authorization, 'Bearer ' + token);
      assert.equal(JSON.parse(init.body).voice.name, request.voice);
      return fakeResponse();
    };
    const result = await synthesizePrivateNeural2({
      rawRequest: request, env: env(), ledgerPath, accessToken: token,
      fetchImpl, now,
    });
    assert.equal(calls, 1);
    assert.deepEqual(result.wav, wav);
    assert.equal(result.evidence.acceptanceStatus, 'REVIEW_REQUIRED');
    assert.equal(result.evidence.publishReady, false);
    assert.match(result.evidence.audioSha256, /^[a-f0-9]{64}$/);
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
    assert.equal(ledger.months['2026-10'][0].status, 'SUCCEEDED');
    assert.equal(ledger.months['2026-10'][0].requestHash, result.evidence.requestHash);
    await assert.rejects(synthesizePrivateNeural2({
      rawRequest: request, env: env(), ledgerPath, accessToken: token, fetchImpl, now,
    }), /DUPLICATE_REQUEST/);
    assert.equal(calls, 1);
    assert.deepEqual(await readdir(join(ledgerPath, '..')), ['ledger.json']);
  });
});

test('failed/ambiguous requests reserve the characters without any retry', async () => {
  await temp(async ledgerPath => {
    let calls = 0;
    await assert.rejects(synthesizePrivateNeural2({
      rawRequest: request, env: env(), ledgerPath, accessToken: token,
      fetchImpl: async () => { calls++; throw new Error('connection failed confidential'); }, now,
    }), /PROVIDER_UNAVAILABLE_OR_AMBIGUOUS/);
    assert.equal(calls, 1);
    const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
    assert.equal(ledger.months['2026-10'][0].status, 'UNKNOWN');
    assert.equal(ledger.months['2026-10'][0].characters,
      parsePrivateNeural2Request(request).characterCount);
    await assert.rejects(synthesizePrivateNeural2({
      rawRequest: request, env: env(), ledgerPath, accessToken: token,
      fetchImpl: async () => { calls++; return fakeResponse(); }, now,
    }), /DUPLICATE_REQUEST/);
    assert.equal(calls, 1);
  });
});

test('ledger prevents use beyond locally bounded free-budget and mismatched projects', async () => {
  await temp(async ledgerPath => {
    await writeFile(ledgerPath, JSON.stringify({
      version: 'CAPITAL_AI_SOCIAL_NEURAL2_PRIVATE@1',
      project: env().SOCIAL_NEURAL2_PROJECT_ID,
      months: { '2026-10': [{ requestHash: 'old', characters: 799995 }] },
    }));
    let called = false;
    await assert.rejects(synthesizePrivateNeural2({
      rawRequest: request, env: env(), ledgerPath, accessToken: token,
      fetchImpl: async () => { called = true; return fakeResponse(); }, now,
    }), /FREE_CAP_EXCEEDED/);
    assert.equal(called, false);
    const otherProject = { ...env(),
      SOCIAL_NEURAL2_PROJECT_ID: 'different-private-project',
      SOCIAL_NEURAL2_EXTERNAL_READBACK_PROJECT: 'different-private-project' };
    await assert.rejects(synthesizePrivateNeural2({
      rawRequest: request, env: otherProject, ledgerPath, accessToken: token,
      fetchImpl: async () => { called = true; return fakeResponse(); }, now,
    }), /LEDGER_INVALID/);
    assert.equal(called, false);
    await writeFile(ledgerPath, JSON.stringify({
      version: 'CAPITAL_AI_SOCIAL_NEURAL2_PRIVATE@1',
      project: env().SOCIAL_NEURAL2_PROJECT_ID,
      months: { '2026-10': 'corrupted-month-state' },
    }));
    await assert.rejects(synthesizePrivateNeural2({
      rawRequest: request, env: env(), ledgerPath, accessToken: token,
      fetchImpl: async () => { called = true; return fakeResponse(); }, now,
    }), /LEDGER_INVALID/);
    assert.equal(called, false);
  });
});
