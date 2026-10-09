// SPDX-License-Identifier: MIT
// Transport lifecycle only. Each openSession call must enforce the existing source policy.
export function createReconnectingSpotFeed({ openSession, schedule = setTimeout,
  cancel = clearTimeout, random = Math.random } = {}) {
  let session, timer, stopped = false, attempts = 0, accepted = 0, rejected = 0, dropped = 0;
  let state = 'CONNECTING', reason = null;
  const later = (fn, delay) => { timer = schedule(fn, delay); timer?.unref?.(); };
  const stop = () => {
    if (stopped) return;
    stopped = true;
    cancel(timer);
    session?.stop?.();
    state = 'STOPPED';
  };
  const connect = () => {
    if (stopped) return;
    try { session = openSession(); }
    catch { session = null; retry(); return; }
    if (session.status === 'BLOCKED') {
      state = 'BLOCKED'; reason = session.reason; stopped = true; return;
    }
    state = 'CONNECTING';
    later(inspect, 5_000);
  };
  const retry = () => {
    if (stopped) return;
    state = 'RECONNECTING';
    // At most 12 attempts/minute, with exponential backoff up to one minute.
    const base = Math.min(60_000, 5_000 * 2 ** Math.min(attempts++, 4));
    later(connect, base + Math.floor(random() * 1_000));
  };
  const inspect = () => {
    if (stopped) return;
    const metrics = session.metrics();
    if (!metrics.stopped) {
      state = metrics.accepted > 0 ? 'STREAMING' : 'CONNECTING';
      later(inspect, 5_000); return;
    }
    accepted += metrics.accepted; rejected += metrics.rejected; dropped += metrics.dropped;
    // A valid, replay-verified quote proves recovery; an open socket alone does not.
    if (metrics.accepted > 0) attempts = 0;
    session = null;
    retry();
  };
  connect();
  return Object.freeze({ stop, metrics: () => {
    const live = session?.metrics?.();
    return Object.freeze({ state, reason, stopped,
      accepted: accepted + (live?.accepted || 0),
      rejected: rejected + (live?.rejected || 0),
      dropped: dropped + (live?.dropped || 0) });
  } });
}
