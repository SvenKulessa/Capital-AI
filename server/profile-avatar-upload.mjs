/**
 * Owner-neutral, authenticated profile avatar ingestion.
 * Disabled by default. No direct browser access to Storage or service key.
 * A local permission-checked ClamAV socket, fresh DB and decoder are mandatory.
 */
import net from 'node:net';
import { lstat } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const LIMIT = 2 * 1024 * 1024;
const MAX_OUTPUT = 512 * 1024;
const USER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BUCKET = 'capital-ai-profile-avatars';
const IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const sha256 = value => createHash('sha256').update(value).digest('hex');

export function imageMagicMime(bytes) {
  if (!Buffer.isBuffer(bytes)) return null;
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex'))) return 'image/png';
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
  if (bytes.length >= 12 && bytes.toString('ascii', 0, 4) === 'RIFF' &&
      bytes.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return null;
}

function credentials(env) {
  try {
    const target = new URL(env.SUPABASE_URL || env.VITE_SUPABASE_URL || '');
    const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY || '';
    let authorized = key.startsWith('sb_secret_') && key.length >= 34;
    if (!authorized && key.startsWith('eyJ')) {
      const payload = JSON.parse(Buffer.from(key.split('.')[1], 'base64url').toString('utf8'));
      authorized = payload?.role === 'service_role';
    }
    if (target.protocol !== 'https:' || target.pathname !== '/' || target.search ||
        target.hash || target.username || target.password || !authorized) return null;
    return { origin: target.origin, key };
  } catch { return null; }
}

/** Only a same-UID, mode-0600 Unix socket with a fresh signed ClamAV DB may scan. */
export function verifyClamavVersion(reply, nowMs = Date.now()) {
  if (typeof reply !== 'string') throw new Error('CLAMAV_VERSION_UNAVAILABLE');
  const match = /^ClamAV (1\.4\.6)\/([1-9][0-9]*)\/(.+)$/.exec(reply.trim());
  if (!match) throw new Error('CLAMAV_VERSION_INVALID');
  const published = Date.parse(match[3] + (/\b(?:GMT|UTC)\b/.test(match[3]) ? '' : ' GMT'));
  const age = nowMs - published;
  if (!Number.isFinite(published) || age < -5 * 60_000 || age > 48 * 60 * 60_000) {
    throw new Error('CLAMAV_SIGNATURES_STALE');
  }
  return { engine: 'clamav', signatureVersion: Number(match[2]), signatureAgeMs: age };
}

async function clamdCommand(socketPath, command, data, timeoutMs) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    let response = Buffer.alloc(0);
    let settled = false;
    function finish(error, message) {
      if (settled) return;
      settled = true;
      socket.destroy();
      if (error) reject(error); else resolve(message);
    }
    socket.setTimeout(timeoutMs, () => finish(new Error('CLAMAV_TIMEOUT')));
    socket.once('error', () => finish(new Error('CLAMAV_UNAVAILABLE')));
    socket.once('connect', () => {
      if (command === 'VERSION') {
        socket.write(Buffer.from('zVERSION\0'));
      } else {
        socket.write(Buffer.from('zINSTREAM\0'));
        for (let offset = 0; offset < data.length; offset += 65536) {
          const part = data.subarray(offset, offset + 65536);
          const length = Buffer.alloc(4);
          length.writeUInt32BE(part.length);
          socket.write(length);
          socket.write(part);
        }
        socket.write(Buffer.alloc(4));
      }
    });
    socket.on('data', chunk => {
      if (response.length + chunk.length > 256) return finish(new Error('CLAMAV_REPLY_OVERSIZE'));
      response = Buffer.concat([response, chunk]);
      const end = response.indexOf(0);
      if (end < 0) return;
      finish(null, response.toString('utf8', 0, end).trim());
    });
    socket.once('end', () => { if (!settled) finish(new Error('CLAMAV_INCOMPLETE')); });
  });
}

/**
 * Strict socket, engine, signature-age and INSTREAM checks are all necessary.
 * Injected transport/stat are for deterministic tests only, never for app wiring.
 */
export async function scanClamavLocal(bytes, socketPath, timeoutMs = 5000, {
  socketStat = lstat, exchange = clamdCommand, nowMs = Date.now(),
  expectedUid = process.getuid?.(),
} = {}) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > LIMIT ||
      typeof socketPath !== 'string' ||
      !/^\/(?:run|var\/run)\/clamav\/[a-zA-Z0-9_.-]+\.sock$/.test(socketPath) ||
      !Number.isInteger(expectedUid)) {
    throw new Error('CLAMAV_SOCKET_UNAVAILABLE');
  }
  let info;
  try { info = await socketStat(socketPath); }
  catch { throw new Error('CLAMAV_SOCKET_UNAVAILABLE'); }
  if (!info?.isSocket?.() || info?.isSymbolicLink?.() || info.uid !== expectedUid ||
      (info.mode & 0o777) !== 0o600) {
    throw new Error('CLAMAV_SOCKET_PERMISSIONS_INVALID');
  }
  const version = verifyClamavVersion(await exchange(socketPath, 'VERSION', null, timeoutMs), nowMs);
  const verdict = await exchange(socketPath, 'INSTREAM', bytes, timeoutMs);
  if (verdict === 'stream: OK') return { clean: true, ...version };
  if (/^stream: [A-Za-z0-9][A-Za-z0-9_.:+()-]{0,127} FOUND$/.test(verdict)) {
    return { clean: false, ...version };
  }
  throw new Error('CLAMAV_BAD_REPLY');
}

/** Dependency is deliberately optional until its pinned runtime image is validated. */
export async function reencodeProfilePng(input) {
  const imported = await import('sharp');
  const sharp = imported.default;
  const image = sharp(input, { limitInputPixels: 16777216, failOn: 'error' });
  const meta = await image.metadata();
  if (!['png', 'jpeg', 'webp'].includes(meta.format) || !Number.isInteger(meta.width) ||
      !Number.isInteger(meta.height) || meta.width < 1 || meta.height < 1 ||
      meta.width > 4096 || meta.height > 4096 || (meta.pages && meta.pages > 1)) {
    throw new Error('IMAGE_DIMENSIONS_INVALID');
  }
  const output = await image.rotate().resize(512, 512, {
    fit: 'inside', withoutEnlargement: true,
  }).png({ compressionLevel: 9 }).toBuffer();
  if (output.length > MAX_OUTPUT || imageMagicMime(output) !== 'image/png') {
    throw new Error('IMAGE_OUTPUT_INVALID');
  }
  return output;
}

async function readBounded(req) {
  const declared = Number(req.headers['content-length']);
  if (!Number.isSafeInteger(declared) || declared < 1 || declared > LIMIT ||
      !/^[0-9]+$/.test(String(req.headers['content-length'] ?? ''))) {
    throw new Error('IMAGE_LENGTH_INVALID');
  }
  const chunks = [];
  let length = 0;
  for await (const part of req) {
    length += part.length;
    if (length > LIMIT || length > declared) throw new Error('IMAGE_LENGTH_INVALID');
    chunks.push(part);
  }
  if (length !== declared) throw new Error('IMAGE_LENGTH_INVALID');
  return Buffer.concat(chunks);
}

function objectPath(userId) {
  if (!USER_ID.test(userId || '')) return null;
  return userId.toLowerCase() + '/avatar.png';
}

export function createProfileAvatarUpload({
  env = process.env, fetchImpl = fetch, auth, scan = scanClamavLocal, transcode = reencodeProfilePng,
} = {}) {
  const config = credentials(env);
  async function objectRequest(method, object, token, body, extraHeaders = {}) {
    const headers = { apikey: config.key, ...extraHeaders };
    if (config.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + config.key;
    const endpoint = new URL('/storage/v1/object/' + BUCKET + '/' + object, config.origin);
    return fetchImpl(endpoint, { method, headers, body, redirect: 'error',
      signal: AbortSignal.timeout(7000) });
  }
  async function handle(req, res, url, json) {
    const isImage = url.pathname === '/api/profile/avatar/current';
    const isLogo = url.pathname === '/api/profile/logo';
    const isUpload = url.pathname === '/api/profile/upload-logo';
    if (!isImage && !isLogo && !isUpload) return false;
    res.setHeader('Cache-Control', 'private, no-store, max-age=0');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "sandbox");
    const verified = await auth?.verify?.(req, res);
    const object = objectPath(verified?.userId);
    if (!object) { json(res, 401, { error: 'authentication_required' }); return true; }
    if (!config || env.PROFILE_AVATAR_UPLOAD_ENABLED !== 'true') {
      json(res, 503, { error: 'profile_avatar_unavailable' }); return true;
    }
    const method = req.method;
    if ((isUpload && method !== 'POST') ||
        (isImage && method !== 'GET') ||
        (isLogo && !['GET', 'DELETE'].includes(method))) {
      res.setHeader('Allow', isUpload ? 'POST' : isImage ? 'GET' : 'GET, DELETE');
      json(res, 405, { error: 'method_not_allowed' }); return true;
    }
    if (method !== 'GET' && !auth?.sameOrigin?.(req)) {
      json(res, 403, { error: 'forbidden_origin' }); return true;
    }
    if (isUpload) {
      const mime = req.headers['content-type'];
      if (!IMAGE_TYPES.has(mime)) { json(res, 415, { error: 'unsupported_media_type' }); return true; }
      let raw;
      try { raw = await readBounded(req); }
      catch { json(res, 413, { error: 'image_length_invalid' }); return true; }
      if (imageMagicMime(raw) !== mime) {
        json(res, 415, { error: 'image_signature_mismatch' }); return true;
      }
      let output, verdict;
      try {
        verdict = await scan(raw, env.PROFILE_AVATAR_CLAMAV_SOCKET);
        if (verdict?.clean !== true || verdict.engine !== 'clamav') {
          json(res, 422, { error: 'image_rejected_by_scan' }); return true;
        }
        output = await transcode(raw);
        if (!Buffer.isBuffer(output) || output.length > MAX_OUTPUT ||
            imageMagicMime(output) !== 'image/png') throw new Error('TRANSCODE_INVALID');
        verdict = await scan(output, env.PROFILE_AVATAR_CLAMAV_SOCKET);
        if (verdict?.clean !== true || verdict.engine !== 'clamav') {
          json(res, 422, { error: 'image_rejected_by_scan' }); return true;
        }
      } catch {
        json(res, 503, { error: 'image_scan_or_decode_unavailable' }); return true;
      }
      try {
        const stored = await objectRequest('POST', object, null, output, {
          'Content-Type': 'image/png', 'cache-control': '0', 'x-upsert': 'true',
        });
        if (!stored.ok) throw new Error('PRIVATE_STORAGE_WRITE_FAILED');
        json(res, 200, { uploaded: true, avatarUrl: '/api/profile/avatar/current',
          sha256: sha256(output) });
      } catch { json(res, 503, { error: 'private_storage_unavailable' }); }
      return true;
    }
    if (method === 'DELETE') {
      try {
        const headers = { apikey: config.key, 'Content-Type': 'application/json' };
        if (config.key.startsWith('eyJ')) headers.Authorization = 'Bearer ' + config.key;
        const response = await fetchImpl(new URL('/storage/v1/object/' + BUCKET, config.origin), {
          method: 'DELETE', headers, body: JSON.stringify({ prefixes: [object] }),
          redirect: 'error', signal: AbortSignal.timeout(7000),
        });
        if (!response.ok) throw new Error('PRIVATE_STORAGE_DELETE_FAILED');
        json(res, 200, { removed: true });
      } catch { json(res, 503, { error: 'private_storage_unavailable' }); }
      return true;
    }
    try {
      const result = await objectRequest('GET', object);
      if (result.status === 404) { json(res, 404, { error: 'avatar_not_found' }); return true; }
      if (!result.ok) throw new Error('PRIVATE_STORAGE_READ_FAILED');
      const declared = Number(result.headers.get('content-length') || 0);
      if (declared > MAX_OUTPUT) throw new Error('PRIVATE_STORAGE_OVERSIZE');
      const bytes = Buffer.from(await result.arrayBuffer());
      if (bytes.length > MAX_OUTPUT || imageMagicMime(bytes) !== 'image/png') throw new Error('INVALID_STORED_IMAGE');
      if (isLogo) {
        json(res, 200, { uploaded: true, avatarUrl: '/api/profile/avatar/current' });
      } else {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Content-Length': bytes.length,
          'Cache-Control': 'private, no-store, max-age=0', 'X-Content-Type-Options': 'nosniff',
          'Content-Security-Policy': 'sandbox', 'Referrer-Policy': 'no-referrer' });
        res.end(bytes);
      }
    } catch { json(res, 503, { error: 'private_storage_unavailable' }); }
    return true;
  }
  return Object.freeze({ handle });
}
