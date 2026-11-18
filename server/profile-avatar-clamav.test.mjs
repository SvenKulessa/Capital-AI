import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { startProfileAvatarClamav } from './profile-avatar-clamav.mjs';

test('no ClamAV processes or update calls without exact opt-in', () => {
  let starts = 0;
  for (const env of [{}, { PROFILE_AVATAR_UPLOAD_ENABLED: 'true' },
    { PROFILE_AVATAR_UPLOAD_ENABLED: 'false', PROFILE_AVATAR_CLAMAV_SOCKET: '/run/clamav/clamd.sock' }]) {
    const stop = startProfileAvatarClamav({ env, spawnImpl: () => { starts++; throw Error('unexpected'); } });
    stop();
  }
  assert.equal(starts, 0);
});

test('enabled runtime starts updater before local scanner and stops children on shutdown', async () => {
  const processes = [];
  let task;
  const spawnImpl = (bin, args, opts) => {
    const child = new EventEmitter();
    child.kill = () => { child.killed = true; };
    processes.push({ bin, args, opts, child });
    if (processes.length === 1) queueMicrotask(() => child.emit('close', 0));
    return child;
  };
  const stop = startProfileAvatarClamav({
    env: { PROFILE_AVATAR_UPLOAD_ENABLED: 'true',
      PROFILE_AVATAR_CLAMAV_SOCKET: '/run/clamav/clamd.sock' },
    spawnImpl, schedule: callback => { task = callback; return { unref() {} }; },
    cancel: () => { task = null; },
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(processes.map(x => x.bin), ['freshclam', 'clamd', 'freshclam']);
  assert.equal(processes[1].args[0], '--config-file=/app/deploy/profile-avatar/clamd.conf');
  assert.equal(processes[1].opts.shell, false);
  stop();
  assert.equal(task, null);
  assert.equal(processes[1].child.killed, true);
  assert.equal(processes[2].child.killed, true);
});

test('bootstrap failure leaves no listening scanner and remains fail closed', async () => {
  const calls = [];
  const spawnImpl = (bin, args) => {
    const child = new EventEmitter();
    child.kill = () => {};
    calls.push(bin);
    queueMicrotask(() => child.emit('close', 1));
    return child;
  };
  const stop = startProfileAvatarClamav({
    env: {PROFILE_AVATAR_UPLOAD_ENABLED:'true', PROFILE_AVATAR_CLAMAV_SOCKET:'/run/clamav/clamd.sock'},
    spawnImpl, schedule: () => ({unref(){}}), cancel: () => {},
  });
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(calls, ['freshclam']);
  stop();
});
