import test from 'node:test';
import assert from 'node:assert/strict';
import { createReconnectingSpotFeed } from './spot-feed-lifecycle.mjs';
import { startAdmittedSpotFeed } from './spot-provider-wire.mjs';

function clock() {
  const queue = new Map(); let id = 0;
  return { queue, schedule(fn, delay) { const token = ++id; queue.set(token, {fn, delay}); return token; },
    cancel(token) { queue.delete(token); },
    next() { const [token, job] = queue.entries().next().value; queue.delete(token); job.fn(); return job.delay; } };
}
test('denied Binance rights start no sockets or reconnect timers even with runtime flags enabled', () => {
  let connections = 0;
  const feed = startAdmittedSpotFeed({provider:'binance',symbol:'BTCUSDT',
    env:{MARKET_SPOT_INGESTION_ENABLED:'true', MARKET_QUOTES_ENABLED:'true', MARKET_SYMBOLS:'BTCUSDT'},
    store:{status:()=>({status:'connected'})},SocketClass:class {constructor(){connections++;}}});
  assert.equal(connections,0);
  assert.equal(feed.metrics().state,'BLOCKED');
  assert.equal(feed.metrics().reason,'REALTIME_MARKET_DATA_RIGHTS_NOT_ADMITTED');
});
test('lifecycle reconnects closed sessions with bounded backoff and resets only after accepted evidence', () => {
  const c = clock(); let opens = 0; let accepted = 0;
  const feed = createReconnectingSpotFeed({schedule:c.schedule,cancel:c.cancel,random:()=>0,
    openSession:()=>{opens++;return {status:'CONNECTING',metrics:()=>({stopped:true,accepted,rejected:1,dropped:2}),stop(){}};}});
  c.next(); assert.equal(feed.metrics().state,'RECONNECTING');
  assert.equal(c.next(),5_000); c.next(); assert.equal(c.next(),10_000);
  c.next(); assert.equal(c.next(),20_000);
  c.next(); assert.equal(c.next(),40_000);
  c.next(); assert.equal(c.next(),60_000);
  accepted=1; c.next(); assert.equal(c.next(),5_000);
  assert.equal(opens,7);
  assert.equal(feed.metrics().accepted,2); // one completed and one current session
  feed.stop(); assert.equal(c.queue.size,0);
});
test('rights revocation on the next session stops reconnecting', () => {
  const c=clock();let opens=0;
  const feed=createReconnectingSpotFeed({schedule:c.schedule,cancel:c.cancel,random:()=>0,
    openSession:()=>++opens===1?{status:'CONNECTING',metrics:()=>({stopped:true,accepted:0,rejected:0,dropped:0})}:
      {status:'BLOCKED',reason:'RIGHTS_REVOKED'}});
  c.next();c.next();assert.equal(feed.metrics().state,'BLOCKED');assert.equal(c.queue.size,0);
});
test('stop closes active socket and removes scheduled work exactly once', () => {
  const c=clock();let closes=0;
  const feed=createReconnectingSpotFeed({schedule:c.schedule,cancel:c.cancel,
    openSession:()=>({status:'CONNECTING',metrics:()=>({stopped:false,accepted:1,rejected:0,dropped:0}),stop(){closes++;}})});
  c.next();assert.equal(feed.metrics().state,'STREAMING');
  feed.stop();feed.stop();assert.equal(closes,1);assert.equal(c.queue.size,0);
});
