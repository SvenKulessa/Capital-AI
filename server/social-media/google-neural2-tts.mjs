// Private-only Google Cloud Neural2 voice source for CAPITAL-AI Social Media Engine.
// No HTTP route, implicit retries, public publishing authority or credentials on disk.
import { createHash } from 'node:crypto';
import { open, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';

export const PRIVATE_NEURAL2_CONTRACT = 'CAPITAL_AI_SOCIAL_NEURAL2_PRIVATE@1';
export const NEURAL2_ENDPOINT = 'https://eu-texttospeech.googleapis.com/v1/text:synthesize';
export const NEURAL2_VOICES = Object.freeze(['de-DE-Neural2-G', 'de-DE-Neural2-H']);
export const GOOGLE_NEURAL2_MONTHLY_FREE_CHARACTERS = 1_000_000;
// Private headroom is intentionally larger than an individual short.
export const PRIVATE_NEURAL2_MAX_MONTHLY_CHARACTERS = 800_000;
const SHA = /^[a-f0-9]{64}$/;
const PROJECT = /^[a-z][a-z0-9-]{4,62}[a-z0-9]$/;
const MONTH = /^\d{4}-\d{2}$/;
const iso = value => new Date(value).toISOString();
const digest = bytes => createHash('sha256').update(bytes).digest('hex');

function assert(condition, code) {
  if (!condition) throw new Error(code);
}

export function parsePrivateNeural2Request(raw) {
  assert(raw && typeof raw === 'object' && !Array.isArray(raw),
    'SOCIAL_NEURAL2_REQUEST_INVALID');
  const text = raw.text;
  assert(typeof text === 'string' && text.trim() === text && text.length > 0
    && Buffer.byteLength(text, 'utf8') <= 4_000,
  'SOCIAL_NEURAL2_TEXT_INVALID');
  const voice = raw.voice ?? 'de-DE-Neural2-H';
  assert(NEURAL2_VOICES.includes(voice), 'SOCIAL_NEURAL2_VOICE_NOT_ALLOWED');
  assert(typeof raw.contentPackageId === 'string' && /^[a-zA-Z0-9._:-]{1,160}$/.test(raw.contentPackageId),
    'SOCIAL_NEURAL2_PACKAGE_INVALID');
  assert(typeof raw.candidateContentHash === 'string' && SHA.test(raw.candidateContentHash),
    'SOCIAL_NEURAL2_CANDIDATE_HASH_INVALID');
  const characterCount = Buffer.byteLength(text, 'utf8'); // conservative vs Unicode code-point billing
  const body = Object.freeze({
    input: { text },
    voice: { languageCode: 'de-DE', name: voice },
    audioConfig: { audioEncoding: 'LINEAR16', speakingRate: 1.0 },
  });
  return Object.freeze({
    text, voice, contentPackageId: raw.contentPackageId,
    candidateContentHash: raw.candidateContentHash, body, characterCount,
    requestHash: digest(JSON.stringify({
      contract: PRIVATE_NEURAL2_CONTRACT, body,
      contentPackageId: raw.contentPackageId,
      candidateContentHash: raw.candidateContentHash,
    })),
  });
}

function validReadback(env, now) {
  assert(env.SOCIAL_NEURAL2_PRIVATE_ENABLED === 'true' &&
    env.SOCIAL_NEURAL2_FREE_TIER_ONLY === 'true' &&
    env.NODE_ENV !== 'production', 'SOCIAL_NEURAL2_PRIVATE_DISABLED');
  const project = env.SOCIAL_NEURAL2_PROJECT_ID;
  assert(typeof project === 'string' && PROJECT.test(project),
    'SOCIAL_NEURAL2_PROJECT_REQUIRED');
  assert(env.SOCIAL_NEURAL2_EXTERNAL_READBACK_PROJECT === project,
    'SOCIAL_NEURAL2_PROJECT_READBACK_MISMATCH');
  const used = env.SOCIAL_NEURAL2_EXTERNAL_USED_CHARS;
  assert(typeof used === 'string' && /^(0|[1-9]\d{0,8})$/.test(used),
    'SOCIAL_NEURAL2_EXTERNAL_USAGE_REQUIRED');
  const checkedAt = Date.parse(env.SOCIAL_NEURAL2_EXTERNAL_READBACK_AT ?? '');
  assert(Number.isFinite(checkedAt) && checkedAt <= now.getTime() &&
    now.getTime() - checkedAt <= 6 * 60 * 60_000,
    'SOCIAL_NEURAL2_EXTERNAL_USAGE_STALE');
  return { project, externallyUsed: Number(used) };
}

function validLedger(raw, project) {
  assert(raw && raw.version === PRIVATE_NEURAL2_CONTRACT &&
    raw.project === project && raw.months && typeof raw.months === 'object' && !Array.isArray(raw.months),
  'SOCIAL_NEURAL2_LEDGER_INVALID');
  return raw;
}

async function loadLedger(path, project) {
  try { return validLedger(JSON.parse(await readFile(path, 'utf8')), project); }
  catch (error) {
    if (error.code === 'ENOENT') {
      return { version: PRIVATE_NEURAL2_CONTRACT, project, months: {} };
    }
    throw error;
  }
}

async function atomicSaveLedger(path, ledger) {
  const temp = path + '.tmp';
  await writeFile(temp, JSON.stringify(ledger, null, 2) + '\n',
    { flag: 'wx', mode: 0o600 });
  try { await rename(temp, path); }
  finally { await unlink(temp).catch(() => {}); }
}

export function previewPrivateNeural2(rawRequest, env, now = new Date()) {
  const request = parsePrivateNeural2Request(rawRequest);
  const { project, externallyUsed } = validReadback(env, now);
  assert(externallyUsed + request.characterCount <= PRIVATE_NEURAL2_MAX_MONTHLY_CHARACTERS,
    'SOCIAL_NEURAL2_FREE_CAP_EXCEEDED');
  return {
    provider: 'GOOGLE_CLOUD_TTS', model: 'Neural2', voice: request.voice,
    region: 'eu', project,
    charactersReservedIfExecuted: request.characterCount,
    externalCharsAtReadback: externallyUsed,
    freeTierCharacters: GOOGLE_NEURAL2_MONTHLY_FREE_CHARACTERS,
    privateHardLimitCharacters: PRIVATE_NEURAL2_MAX_MONTHLY_CHARACTERS,
    requestHash: request.requestHash, state: 'DRY_RUN',
    note: 'This local ledger cannot account for other Google Cloud consumers. Free use is not guaranteed.',
  };
}

// Hold a local process lock THROUGH the provider call; failed/ambiguous attempts remain reserved.
// No automatic retry: a timeout may have been billed by Google.
export async function synthesizePrivateNeural2({
  rawRequest, env = process.env, ledgerPath, accessToken,
  fetchImpl = fetch, now = new Date(),
}) {
  const request = parsePrivateNeural2Request(rawRequest);
  const { project, externallyUsed } = validReadback(env, now);
  assert(typeof ledgerPath === 'string' && isAbsolute(ledgerPath),
    'SOCIAL_NEURAL2_LEDGER_ABSOLUTE_PATH_REQUIRED');
  assert(typeof accessToken === 'string' && /^[a-zA-Z0-9._~-]{20,8192}$/.test(accessToken),
    'SOCIAL_NEURAL2_ACCESS_TOKEN_REQUIRED');
  assert(typeof fetchImpl === 'function', 'SOCIAL_NEURAL2_FETCH_INVALID');
  const month = iso(now).slice(0, 7);
  assert(MONTH.test(month), 'SOCIAL_NEURAL2_MONTH_INVALID');
  await mkdir(dirname(ledgerPath), { recursive: true, mode: 0o700 });
  const lockPath = ledgerPath + '.lock';
  const lock = await open(lockPath, 'wx', 0o600).catch(error => {
    if (error.code === 'EEXIST') throw new Error('SOCIAL_NEURAL2_LEDGER_BUSY');
    throw error;
  });
  try {
    const ledger = await loadLedger(ledgerPath, project);
    assert(ledger.months[month] === undefined || Array.isArray(ledger.months[month]),
      'SOCIAL_NEURAL2_LEDGER_INVALID');
    const current = ledger.months[month] ?? [];
    assert(current.every(entry => entry && Number.isSafeInteger(entry.characters) &&
      entry.characters >= 0 && typeof entry.requestHash === 'string'),
    'SOCIAL_NEURAL2_LEDGER_INVALID');
    const localUsed = current.reduce((sum, row) => sum + row.characters, 0);
    // Conservative: external reported usage may overlap local ledger. Over-count rather than bill.
    assert(externallyUsed + localUsed + request.characterCount <= PRIVATE_NEURAL2_MAX_MONTHLY_CHARACTERS,
      'SOCIAL_NEURAL2_FREE_CAP_EXCEEDED');
    assert(!current.some(row => row.requestHash === request.requestHash),
      'SOCIAL_NEURAL2_DUPLICATE_REQUEST');
    const entry = {
      at: iso(now), requestHash: request.requestHash, characters: request.characterCount,
      voice: request.voice, status: 'UNKNOWN',
    };
    current.push(entry);
    ledger.months[month] = current;
    await atomicSaveLedger(ledgerPath, ledger); // reserve BEFORE network activity
    let response;
    try {
      response = await fetchImpl(NEURAL2_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + accessToken,
          'x-goog-user-project': project,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request.body),
        signal: AbortSignal.timeout(25_000),
        redirect: 'error',
      });
      if (!response.ok) throw new Error('SOCIAL_NEURAL2_PROVIDER_REJECTED');
      const declaredLength = Number(response.headers?.get?.('content-length') ?? 0);
      assert(!Number.isFinite(declaredLength) || declaredLength <= 20_000_000,
        'SOCIAL_NEURAL2_AUDIO_TOO_LARGE');
      const result = await response.json();
      const encoded = result?.audioContent;
      assert(typeof encoded === 'string' && encoded.length > 100 &&
        encoded.length <= 20_000_000 &&
        /^[A-Za-z0-9+/]+={0,2}$/.test(encoded),
        'SOCIAL_NEURAL2_AUDIO_INVALID');
      const wav = Buffer.from(encoded, 'base64');
      assert(wav.length > 44 && wav.length < 15_000_000 &&
        wav.toString('ascii', 0, 4) === 'RIFF' &&
        wav.toString('ascii', 8, 12) === 'WAVE',
        'SOCIAL_NEURAL2_WAV_INVALID');
      entry.status = 'SUCCEEDED';
      entry.audioSha256 = digest(wav);
      await atomicSaveLedger(ledgerPath, ledger);
      return {
        wav,
        evidence: {
          contractVersion: PRIVATE_NEURAL2_CONTRACT,
          provider: 'GOOGLE_CLOUD_TTS', model: 'Neural2',
          voiceId: request.voice, languageCode: 'de-DE', endpointRegion: 'eu',
          requestHash: request.requestHash, audioSha256: entry.audioSha256,
          characterCount: request.characterCount,
          contentPackageId: request.contentPackageId,
          candidateContentHash: request.candidateContentHash,
          googleProject: project, generatedAt: entry.at,
          invoiceState: 'NOT_PROVEN', freeTierEligibility: 'SELF_REPORTED_CONSERVATIVE',
          acceptanceStatus: 'REVIEW_REQUIRED', publishReady: false,
        },
      };
    } catch (error) {
      // Reservation is retained even when the provider call is ambiguous.
      // Never include server response body or token in errors.
      if (error.message?.startsWith('SOCIAL_NEURAL2_')) throw error;
      throw new Error('SOCIAL_NEURAL2_PROVIDER_UNAVAILABLE_OR_AMBIGUOUS');
    }
  } finally {
    await lock.close();
    await unlink(lockPath).catch(() => {});
  }
}
