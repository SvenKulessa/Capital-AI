// Public, anonymous UI checks only. Never starts login, checkout or publishing.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const requestedOrigin = process.env.CAPITAL_LEARNING_ORIGIN || 'https://capital-ai.online';
assert.ok(requestedOrigin === 'https://capital-ai.online' || requestedOrigin === 'https://capital-ai-uvsl.onrender.com', 'Unapproved public origin');
// Construct every navigation from a trusted literal, never a substring match.
const origin = requestedOrigin === 'https://capital-ai-uvsl.onrender.com'
  ? 'https://capital-ai-uvsl.onrender.com' : 'https://capital-ai.online';
assert.ok(process.env.CHROME_BIN, 'CHROME_BIN is required');
const output = 'browser-readback';
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'capital-learning-readback-'));
const chrome = spawn(process.env.CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
const pending = new Map();
let id = 0;
const report = { schemaVersion: 1, origin, capturedAt: new Date().toISOString(), status: 'FAIL', checks: [], purchase: 'NOT_PROVEN', marketplace: 'NOT_PROVEN', publishing: 'NOT_PROVEN', nativeMobile: 'NOT_PROVEN' };
const pause = () => new Promise(resolve => setTimeout(resolve, 250));
async function until(fn, label) {
  const end = Date.now() + 30000;
  while (Date.now() < end) { if (await fn()) return; await pause(); }
  throw new Error(`Timed out: ${label}`);
}
function command(method, params = {}) {
  const callId = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(callId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!response.exceptionDetails, 'DOM evaluation failed');
  return response.result.value;
}
async function navigate(path, ready) {
  await command('Page.navigate', { url: origin + path });
  await until(() => evaluate(ready), path);
  assert.equal(await evaluate('location.origin'), origin, 'Unexpected navigation');
}
async function capture(name) {
  const metrics = await evaluate(`(() => { const d=document.documentElement; return {width:innerWidth, client:d.clientWidth, scroll:d.scrollWidth}; })()`);
  assert.equal(metrics.width, report.viewport.width, 'Viewport override did not apply');
  assert.ok(metrics.scroll <= metrics.client + 1, `Horizontal page overflow: ${JSON.stringify(metrics)}`);
  const png = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(output, name + '.png'), Buffer.from(png.data, 'base64'));
  report.checks.push({ name, metrics, status: 'PASS' });
}
try {
  let port;
  await until(async () => { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return /^\d+$/.test(port); } catch { return false; } }, 'Chromium startup');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT', signal: AbortSignal.timeout(10000) })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    const task = pending.get(response.id);
    if (!task) return;
    clearTimeout(task.timer); pending.delete(response.id);
    if (response.error) task.reject(new Error(response.error.message)); else task.resolve(response.result);
  });
  await command('Page.enable'); await command('Runtime.enable');
  for (const viewport of [{ name: 'desktop', width: 1440, height: 900, mobile: false }, { name: 'mobile', width: 390, height: 844, mobile: true }]) {
    report.viewport = viewport;
    await command('Emulation.setDeviceMetricsOverride', { width: viewport.width, height: viewport.height, mobile: viewport.mobile, deviceScaleFactor: 1 });
    await navigate('/learning?tab=patterns', `document.querySelector('[aria-label="Chart-Lernatlas"] select')?.options.length === 12`);
    assert.equal(await evaluate(`!!document.querySelector('[aria-label="Chart-Lernatlas"] [role="img"]')`), true, 'Accessible chart missing');
    await evaluate(`document.querySelector('[aria-label="Kategorie filtern"] button:nth-child(2)').click()`);
    await until(() => evaluate(`document.querySelector('[aria-label="Chart-Lernatlas"] select')?.options.length === 2`), 'Flags filter');
    await evaluate(`(() => { const s=document.querySelector('[aria-label="Chart-Lernatlas"] select'); s.value=s.options[1].value; s.dispatchEvent(new Event('change',{bubbles:true})); })()`);
    await until(() => evaluate(`document.querySelector('[aria-label="Chart-Lernatlas"] select')?.value === 'bear-flag'`), 'Bear Flag selection');
    await evaluate(`Array.from(document.querySelectorAll('[aria-label="Chart-Lernatlas"] button')).find(b=>b.textContent==='Erklärung anzeigen').click()`);
    await until(() => evaluate(`!!document.querySelector('[aria-label="Chart-Lernatlas"] button[aria-expanded="true"]')`), 'Self check');
    await capture(viewport.name + '-chart-atlas');
    await navigate('/', `Array.from(document.querySelectorAll('button')).some(b=>b.textContent==='Tarife & Leistungsumfang ansehen')`);
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>b.textContent==='Tarife & Leistungsumfang ansehen').click()`);
    await until(() => evaluate(`!!document.querySelector('[role="dialog"] [role="switch"]')`), 'CADS pricing dialog');
    await evaluate(`(() => {const s=document.querySelector('[role="dialog"] [role="switch"]'); if(s.getAttribute('aria-checked')==='true') s.click();})()`);
    await until(() => evaluate(`document.querySelector('[role="dialog"] [role="switch"]')?.getAttribute('aria-checked')==='false'`), 'Monthly pricing');
    assert.equal(await evaluate(`['Starter','Pro','Enterprise'].every(t=>document.querySelector('[role="dialog"]').textContent.includes(t))`), true, 'Pricing tiers missing');
    const dialog = await evaluate(`(() => {const d=document.querySelector('[role="dialog"]'), r=d.getBoundingClientRect(); return {left:r.left,right:r.right,client:d.clientWidth,scroll:d.scrollWidth};})()`);
    assert.ok(dialog.left >= -1 && dialog.right <= viewport.width + 1 && dialog.scroll <= dialog.client + 1, 'Dialog horizontal overflow');
    await capture(viewport.name + '-cads-pricing');
    report.checks.at(-1).dialog = dialog;
    await evaluate(`document.querySelector('[aria-label="Preisliste schließen"]').click()`);
  }
  delete report.viewport;
  report.status = 'PASS';
  console.log(JSON.stringify(report));
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  socket?.close();
  for (const task of pending.values()) clearTimeout(task.timer);
  chrome.kill('SIGTERM');
  await new Promise(resolve => { if (chrome.exitCode !== null || chrome.signalCode) resolve(); else { chrome.once('exit', resolve); setTimeout(() => { chrome.kill('SIGKILL'); resolve(); }, 3000).unref(); } });
  await rm(profile, { recursive: true, force: true });
}
