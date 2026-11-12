#!/usr/bin/env node
// CAPITAL_AI_BLUEPRINT_MOBILE_NOJS@1 — isolated Chrome/CDP browser acceptance.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const origin = new URL(process.argv[2]);
assert.equal(origin.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname));
assert.equal(origin.pathname, '/');
assert.equal(origin.search, '');
const outputDir = process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR || 'artifacts/blueprint-mobile';
const startedAt = new Date().toISOString();
const profile = await mkdtemp(join(tmpdir(), 'ca-blueprint-chrome-'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const pending = new Map(), records = [];
let chrome, socket, sequence = 0;
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP_TIMEOUT_' + method)); }, 18000);
  pending.set(id, { resolve, reject, timer });
  socket.send(JSON.stringify({ id, method, params }));
});
async function evaluate(expression) {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error('PAGE_EVAL_FAILED');
  return r.result?.value;
}
async function navigate(path) {
  await send('Page.navigate', { url: origin.origin + path });
  for (let i = 0; i < 150; i++) {
    try {
      if (await evaluate("document.readyState === 'complete' && document.body && document.body.textContent.length > 40")) {
        await sleep(500);
        return;
      }
    } catch { /* page navigation ongoing */ }
    await sleep(100);
  }
  throw new Error('NAVIGATION_TIMEOUT_' + path);
}
async function snapshot() {
  return evaluate("(() => {const p=document.getElementById('capital-ai-blueprint-preview');const a=p?.querySelector('a[href=\"/pricing\"]');const r=a?.getBoundingClientRect();return {width:document.documentElement.clientWidth,overflow:Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth),preview:!!p,synthetic:!!p?.textContent?.includes('Synthetisches Beispiel'),pricingHref:a?.getAttribute('href')||null,linkRect:r?{x:r.x+r.width/2,y:r.y+r.height/2}:null,appContent:(document.getElementById('root')?.textContent||'').trim().length>80};})()");
}
async function check(width, jsEnabled) {
  await send('Emulation.setDeviceMetricsOverride', { width, height: 820, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  await send('Emulation.setScriptExecutionDisabled', { value: !jsEnabled });
  await navigate('/blog/datenkonzept-blueprint');
  assert.equal(await evaluate("document.body.textContent.includes('Datenkonzept-Blueprint')"), true, 'article missing');
  await navigate('/marketscreener/dokumentation');
  const state = await snapshot();
  assert.equal(state.width, width, 'CSS viewport mismatch');
  assert.ok(state.overflow <= 2, 'horizontal overflow at width ' + width + ': ' + state.overflow);
  assert.equal(state.appContent, true, 'empty application root');
  if (!jsEnabled) {
    assert.equal(state.preview, true, 'initial server HTML preview missing');
    assert.equal(state.synthetic, true, 'synthetic marker missing');
    assert.equal(state.pricingHref, '/pricing', 'contextual pricing link missing');
  }
  await mkdir(outputDir, { recursive: true });
  const image = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(outputDir, 'blueprint-' + width + (jsEnabled ? '-js' : '-nojs') + '.png'), Buffer.from(image.data, 'base64'));
  if (!jsEnabled) {
    assert.ok(state.linkRect && state.linkRect.y > 0 && state.linkRect.y < 820, 'pricing link outside viewport');
    await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: state.linkRect.x, y: state.linkRect.y }] });
    await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    for (let i = 0; i < 80; i++) {
      try { if (await evaluate("location.pathname === '/pricing'")) break; } catch { /* navigation */ }
      await sleep(100);
    }
    assert.equal(await evaluate("location.pathname"), '/pricing', 'touch pricing navigation failed');
  } else {
    await navigate('/pricing');
  }
  assert.equal(await evaluate("document.body.textContent.trim().length > 100"), true, 'pricing route empty');
  records.push({ width, jsEnabled, article: 'PASS', preview: 'PASS', pricing: 'PASS',
    horizontalOverflow: state.overflow, previewInNoJs: jsEnabled ? 'NOT_ASSERTED' : true });
}
try {
  const r = await fetch(origin.origin + '/marketscreener/dokumentation', { redirect: 'manual' });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('x-robots-tag') || '', /noindex/);
  const html = await r.text();
  assert.match(html, /<main id="capital-ai-blueprint-preview" lang="de"/);
  assert.match(html, /Synthetisches Beispiel/);
  assert.match(html, /href="\/pricing">Bestehende Angebote vergleichen<\/a>/);
  assert.doesNotMatch(html, /\/api\/billing|<script[^>]*>[^<]*checkout/i);
  chrome = spawn(process.env.CAPITAL_AI_CHROME_BIN || 'chromium', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
    '--no-first-run', '--disable-extensions', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank'
  ], { stdio: 'ignore' });
  chrome.on('error', () => {});
  let port;
  for (let i = 0; i < 300; i++) {
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); if (port) break; }
    catch { /* starting */ }
    if (chrome.exitCode !== null || chrome.signalCode !== null) throw new Error('CHROME_EXITED');
    await sleep(100);
  }
  if (!port) throw new Error('CHROME_NOT_READY');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = tabs.find(x => x.type === 'page');
  if (!tab?.webSocketDebuggerUrl) throw new Error('CDP_PAGE_MISSING');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(new Error('CDP_CONNECTION_FAILED')); });
  socket.onmessage = event => {
    const m = JSON.parse(event.data), p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id); clearTimeout(p.timer);
    if (m.error) p.reject(new Error('CDP_COMMAND_ERROR'));
    else p.resolve(m.result);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  for (const width of [320, 390]) for (const jsEnabled of [false, true]) await check(width, jsEnabled);
  const report = { schema: 'CAPITAL_AI_BLUEPRINT_MOBILE_NOJS@1', startedAt,
    status: 'PASS', origin: 'LOOPBACK', scenarios: records,
    realDevice: 'NOT_PROVEN', production: 'NOT_PROVEN' };
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
} catch (error) {
  const report = { schema: 'CAPITAL_AI_BLUEPRINT_MOBILE_NOJS@1',
    startedAt, status: 'FAIL', scenarios: records,
    errorCode: String(error?.message || 'BROWSER_FAILURE').slice(0,160) };
  await mkdir(outputDir, { recursive: true });
  await writeFile(join(outputDir, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.error(JSON.stringify(report));
  process.exitCode = 1;
} finally {
  try { socket?.close(); } catch {}
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) chrome.kill('SIGTERM');
  await rm(profile, { recursive: true, force: true, maxRetries: 8, retryDelay: 200 });
}
