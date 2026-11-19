/**
 * Offline real ClamAV smoke in an isolated Docker build, not production evidence.
 * Only a temporary unsigned EICAR hash signature is used (no official DB/network).
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile, lstat, rm } from 'node:fs/promises';
import net from 'node:net';
import path from 'node:path';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const eicar = [
  'X5O!P%@AP[4\\PZX54(P^)7CC)7}',
  '$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!',
  '$H+H*',
].join('');
assert.equal(Buffer.byteLength(eicar), 68, 'EICAR test vector must be exactly 68 bytes');
assert.equal(createHash('md5').update(eicar).digest('hex'),
  '44d88612fea8a8f36de82e1278abb02f', 'test-vector integrity');

async function exchange(socketPath, payload, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection({ path: socketPath });
    let response = Buffer.alloc(0), completed = false;
    function finish(error, value) {
      if (completed) return;
      completed = true;
      socket.destroy();
      if (error) reject(error); else resolve(value);
    }
    socket.setTimeout(timeoutMs, () => finish(new Error('CLAMD_SMOKE_TIMEOUT')));
    socket.once('error', finish);
    socket.once('connect', () => {
      socket.write(Buffer.from('zINSTREAM\0'));
      const n = Buffer.alloc(4);
      n.writeUInt32BE(payload.length);
      socket.write(n);
      socket.write(payload);
      socket.write(Buffer.alloc(4));
    });
    socket.on('data', chunk => {
      if (response.length + chunk.length > 256) return finish(new Error('CLAMD_REPLY_OVERSIZE'));
      response = Buffer.concat([response, chunk]);
      const end = response.indexOf(0);
      if (end >= 0) finish(null, response.toString('utf8', 0, end));
    });
    socket.once('end', () => { if (!completed) finish(new Error('CLAMD_INCOMPLETE')); });
  });
}

const scratch = await mkdtemp('/run/clamav/build-smoke-');
const db = path.join(scratch, 'db');
const socketPath = path.join(scratch, 'clamd.sock');
const config = path.join(scratch, 'clamd.conf');
let daemon;
try {
  assert.equal(process.getuid?.(), 1000, 'scanner smoke must run as web UID 1000');
  await mkdir(db, { mode: 0o700 });
  await writeFile(path.join(db, 'smoke.hdb'),
    createHash('md5').update(eicar).digest('hex') + ':68:CapitalAI.Smoke.EICAR\n',
    { mode: 0o600 });
  await writeFile(config, [
    'Foreground yes',
    'DatabaseDirectory ' + db,
    'LocalSocket ' + socketPath,
    'LocalSocketMode 600',
    'FixStaleSocket yes',
    'MaxThreads 1',
    'MaxConnectionQueueLength 4',
    'ReadTimeout 10',
    'StreamMaxLength 3M',
    'MaxFileSize 4M',
    'MaxScanSize 8M',
    '',
  ].join('\n'), { mode: 0o600 });
  daemon = spawn('clamd', ['--config-file=' + config], { stdio: 'ignore', shell: false });
  let gone = false;
  daemon.once('exit', () => { gone = true; });
  daemon.once('error', () => { gone = true; });
  let socketStat;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (gone) throw new Error('CLAMD_EXITED_BEFORE_READY');
    try {
      socketStat = await lstat(socketPath);
      if (socketStat.isSocket()) break;
    } catch { /* startup ongoing */ }
    await sleep(200);
  }
  assert.ok(socketStat?.isSocket(), 'scanner socket missing');
  assert.equal(socketStat.uid, 1000, 'scanner socket wrong owner');
  assert.equal(socketStat.mode & 0o777, 0o600, 'scanner socket not private');
  const clean = await exchange(socketPath, Buffer.from('inert-profile-avatar-sample'));
  const detected = await exchange(socketPath, Buffer.from(eicar, 'ascii'));
  assert.equal(clean, 'stream: OK', 'clean input rejected');
  assert.match(detected, /^stream: [^\r\n]+ FOUND$/, 'EICAR must be detected');
  console.log(JSON.stringify({
    profile: 'CAPITAL_AI_AVATAR_CLAMD_ISOLATED_SMOKE@1',
    scanner: 'real clamd', socketMode: '0600',
    clean: 'OK', eicar: 'FOUND',
    externalDatabase: false, externalNetwork: false,
    productionSignatureFreshness: 'NOT_PROVEN',
    productionActivation: false,
  }));
} finally {
  if (daemon && !daemon.killed) {
    daemon.kill('SIGTERM');
    await Promise.race([new Promise(resolve => daemon.once('exit', resolve)), sleep(3000)]);
    if (daemon.exitCode === null) daemon.kill('SIGKILL');
  }
  await rm(scratch, { recursive: true, force: true });
}
