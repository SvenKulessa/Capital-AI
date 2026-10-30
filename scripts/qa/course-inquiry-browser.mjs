// Isolated loopback QA. Every mail POST is intercepted; external HTTP is blocked.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = 'http://127.0.0.1:17871';
assert.ok(process.env.CAPITAL_AI_CHROME_BIN, 'Chromium required');
const directory = 'artifacts/course-inquiry-browser';
await mkdir(directory, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'capital-course-qa-'));
const chrome = spawn(process.env.CAPITAL_AI_CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket, id = 0, responseMode = 'accepted', intercepted = [], interceptionError;
const pending = new Map();
const result = { scope: 'ISOLATED_LOOPBACK_MOCK_MAIL_NO_GOOGLE_SEND', sourceSha: process.env.GITHUB_SHA ?? null, status: 'FAIL', checks: [] };
const pause = () => new Promise(resolve => setTimeout(resolve, 100));
async function until(check, label) {
  const end = Date.now() + 30000;
  while (Date.now() < end) { if (interceptionError) throw interceptionError; if (await check()) return; await pause(); }
  throw new Error('Timeout: ' + label);
}
function command(method, params = {}) {
  const callId = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(callId); reject(new Error('CDP timeout: ' + method)); }, 15000);
    pending.set(callId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
}
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
}
async function fulfill(requestId, status, value) {
  await command('Fetch.fulfillRequest', { requestId, responseCode: status, responseHeaders: [{ name: 'Content-Type', value: 'application/json' }], body: Buffer.from(JSON.stringify(value)).toString('base64') });
}
async function intercept(event) {
  const { requestId, request } = event;
  const url = new URL(request.url);
  if (url.origin !== origin) return command('Fetch.failRequest', { requestId, errorReason: 'BlockedByClient' });
  if (url.pathname === '/api/public/learning-config') return fulfill(requestId, 200, { measurementId: 'G-0542DT2HCE', inquiryAvailable: true });
  if (request.method === 'POST') {
    assert.ok(['/api/public/learning-inquiry', '/api/public/contact'].includes(url.pathname), 'Unexpected POST');
    const body = JSON.parse(request.postData);
    assert.match(body.requestId, /^[a-f0-9-]{36}$/);
    assert.equal(body.email, 'qa@example.invalid');
    intercepted.push({ path: url.pathname, requestId: body.requestId });
    const accepted = responseMode !== 'rejected';
    return fulfill(requestId, accepted ? 200 : 503, { received: accepted, receipt: responseMode === 'wrong-receipt' ? 'wrong-receipt' : body.requestId, status: accepted ? 'MAIL_SERVER_ACCEPTED' : 'NOT_RECEIVED' });
  }
  return command('Fetch.continueRequest', { requestId });
}
const form = 'section[aria-labelledby="contact-form"] form';
async function submit() {
  const ready = await evaluate(`(() => { const f=document.querySelector(${JSON.stringify(form)}); f.querySelector('[name=email]').value='qa@example.invalid'; f.querySelector('[name=message]').value='Synthetic browser course inquiry, no delivery.'; const b=f.querySelector('button[type=submit]'); b.focus(); return {valid:f.checkValidity(),focused:document.activeElement===b,disabled:b.disabled}; })()`);
  assert.deepEqual(ready, { valid: true, focused: true, disabled: false });
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13, text: '\r', unmodifiedText: '\r' });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
}
try {
  let port;
  await until(async () => { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return /^\d+$/.test(port); } catch { return false; } }, 'Chromium');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT' })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const r = JSON.parse(event.data);
    if (r.id) { const task = pending.get(r.id); if (!task) return; clearTimeout(task.timer); pending.delete(r.id); r.error ? task.reject(new Error(r.error.message)) : task.resolve(r.result); }
    else if (r.method === 'Fetch.requestPaused') intercept(r.params).catch(error => { interceptionError = error; });
  });
  await command('Page.enable'); await command('Runtime.enable');
  result.browser = (await command('Browser.getVersion')).product;
  await command('Network.enable'); await command('Fetch.enable', { patterns: [{ urlPattern: '*' }] });
  for (const scenario of [
    { path: '/learning/kontakt#learning-inquiry', width: 320, course: true, mode: 'accepted', switchToSupport: true },
    { path: '/learning#learning-inquiry', width: 390, course: true, mode: 'accepted' },
    { path: '/learning/kontakt', width: 1440, course: false, mode: 'accepted' },
    { path: '/learning/kontakt#learning-inquiry', width: 768, course: true, mode: 'rejected' },
    { path: '/learning/kontakt#learning-inquiry', width: 320, course: true, mode: 'wrong-receipt' },
  ]) {
    result.activeCase = scenario;
    intercepted = []; responseMode = scenario.mode;
    await command('Storage.clearDataForOrigin', { origin, storageTypes: 'local_storage' });
    await command('Network.clearBrowserCookies');
    await command('Emulation.setDeviceMetricsOverride', { width: scenario.width, height: 900, deviceScaleFactor: 1, mobile: scenario.width < 500 });
    await command('Page.navigate', { url: origin + scenario.path });
    await until(() => evaluate(`!!document.querySelector(${JSON.stringify(form)})`), 'contact form');
    await evaluate(`Array.from(document.querySelectorAll('button')).find(b=>/^(Nur notwendige|Necessary only)$/.test(b.textContent.trim()))?.click()`);
    assert.equal(await evaluate(`!!document.querySelector('#learning-inquiry')`), scenario.course);
    const before = await evaluate(`({width:innerWidth,scroll:document.documentElement.scrollWidth,client:document.documentElement.clientWidth})`);
    assert.equal(before.width, scenario.width); assert.ok(before.scroll <= before.client + 1, 'Horizontal overflow');
    await submit();
    const success = scenario.mode === 'accepted';
    await until(() => evaluate(success ? `${JSON.stringify(form)} && !!document.querySelector(${JSON.stringify(form + ' [role=status]')})?.textContent.trim()` : `!!document.querySelector(${JSON.stringify(form + ' [role=alert]')})?.textContent.trim()`), 'mail response');
    assert.equal(intercepted.length, 1);
    assert.equal(intercepted[0].path, scenario.course ? '/api/public/learning-inquiry' : '/api/public/contact');
    if (scenario.switchToSupport) {
      const firstId = intercepted[0].requestId;
      await evaluate(`location.hash=''`);
      await until(() => evaluate(`!document.querySelector('#learning-inquiry') && !document.querySelector(${JSON.stringify(form + ' [name=email]')})?.disabled`), 'hash purpose reset');
      await submit();
      await until(() => evaluate(`!!document.querySelector(${JSON.stringify(form + ' [role=status]')})?.textContent.trim()`), 'support response');
      assert.equal(intercepted.length, 2); assert.equal(intercepted[1].path, '/api/public/contact'); assert.notEqual(intercepted[1].requestId, firstId);
    }
    result.checks.push({ ...scenario, status: 'PASS', submittedPaths: intercepted.map(x => x.path), keyboardSubmit: true, overflow: false });
  }
  result.status = 'PASS';
  delete result.activeCase;
} catch (error) {
  result.error = error.message;
  result.interceptedPaths = intercepted.map(x => x.path);
  if (socket?.readyState === WebSocket.OPEN) {
    result.dom = await evaluate(`(() => { const f=document.querySelector(${JSON.stringify(form)}); return {form:!!f,valid:f?.checkValidity(),focused:document.activeElement?.tagName,disabled:f?.querySelector('button[type=submit]')?.disabled,status:f?.querySelector('[role=status]')?.textContent,alert:f?.querySelector('[role=alert]')?.textContent}; })()`).catch(() => null);
  }
  throw error;
} finally {
  await writeFile(join(directory, 'result.json'), JSON.stringify(result, null, 2)+'\n');
  console.log(JSON.stringify(result));
  socket?.close();
  const exited = chrome.exitCode !== null || chrome.signalCode !== null ? Promise.resolve() : new Promise(resolve => chrome.once('exit', resolve));
  chrome.kill('SIGTERM'); await exited;
  for (const task of pending.values()) clearTimeout(task.timer);
  await rm(profile, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
}
