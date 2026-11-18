/** Opt-in local ClamAV process supervisor; web remains functional on scanner failure. */
import { spawn } from 'node:child_process';

const CONFIG = '/app/deploy/profile-avatar/';
const RETRY_MS = 4 * 60 * 60_000;
const STARTUP_TIMEOUT_MS = 12 * 60_000;

/** Only exact owner opt-in may start signature updates or scanner processes. */
export function startProfileAvatarClamav({
  env = process.env, spawnImpl = spawn, schedule = setInterval,
  cancel = clearInterval, startupTimeoutMs = STARTUP_TIMEOUT_MS,
} = {}) {
  if (env.PROFILE_AVATAR_UPLOAD_ENABLED !== 'true' ||
      env.PROFILE_AVATAR_CLAMAV_SOCKET !== '/run/clamav/clamd.sock') return () => {};
  let closed = false, booting = false;
  let scanner = null, updater = null, bootstrap = null;
  const children = new Set();
  const run = (binary, args) => {
    const child = spawnImpl(binary, args, { stdio: 'ignore', env, shell: false });
    children.add(child);
    child.once('close', () => children.delete(child));
    child.once('error', () => children.delete(child));
    return child;
  };
  const runUpdate = () => new Promise(resolve => {
    let settled = false;
    try {
      bootstrap = run('freshclam', ['--config-file=' + CONFIG + 'freshclam.conf']);
      const child = bootstrap;
      const finish = ok => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (bootstrap === child) bootstrap = null;
        resolve(ok);
      };
      const timer = setTimeout(() => { child.kill('SIGTERM'); finish(false); }, startupTimeoutMs);
      timer.unref?.();
      child.once('close', code => finish(code === 0));
      child.once('error', () => finish(false));
    } catch { resolve(false); }
  });
  async function boot() {
    if (closed || booting || scanner) return;
    booting = true;
    try {
      const updated = await runUpdate();
      if (!updated || closed) return; // unavailable signatures -> no clamd socket -> 503
      scanner = run('clamd', ['--config-file=' + CONFIG + 'clamd.conf']);
      scanner.once('close', () => { scanner = null; });
      scanner.once('error', () => { scanner = null; });
      updater = run('freshclam', ['--daemon', '--config-file=' + CONFIG + 'freshclam.conf']);
      updater.once('close', () => { updater = null; });
      updater.once('error', () => { updater = null; });
    } catch {
      // Fail-closed route owns scan verdict; never print untrusted scanner output.
    } finally { booting = false; }
  }
  void boot();
  const interval = schedule(() => {
    // Recover from stopped scanner or updater at a bounded cadence.
    if (!scanner) { void boot(); return; }
    if (!updater && !closed) {
      try {
        updater = run('freshclam', ['--daemon', '--config-file=' + CONFIG + 'freshclam.conf']);
        updater.once('close', () => { updater = null; });
        updater.once('error', () => { updater = null; });
      } catch { updater = null; }
    }
  }, RETRY_MS);
  interval.unref?.();
  return () => {
    closed = true;
    cancel(interval);
    for (const child of children) child.kill?.('SIGTERM');
    bootstrap?.kill?.('SIGTERM');
  };
}
