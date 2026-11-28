/** Isolated, real-Chromium UI/Clipboard acceptance for the shared follow-up component. */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const chromeBin = process.env.CAPITAL_AI_CHROME_BIN;
assert.ok(chromeBin, 'Chromium binary required; no success from synthetic browser results');
const stylesheet = (await readdir('dist/assets')).find(name => /^index-.*\.css$/.test(name));
assert.ok(stylesheet, 'Actual production CSS required');
const css = await readFile(join('dist/assets', stylesheet));
const entry = "import React from 'react'; import {createRoot} from 'react-dom/client'; import {ChatNextStepActions} from './src/components/ChatNextStepActions'; const root=createRoot(document.getElementById('root')); window.updateChatTask=(task)=>root.render(<ChatNextStepActions task={task} />); window.updateChatTask('GA4 Instagram Social Content Engine Kampagne entwerfen');";
const js = (await build({
  stdin: { contents: entry, resolveDir: process.cwd(), loader: 'tsx' },
  bundle: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  write: false,
})).outputFiles[0].contents;

const routes = {
  '/': ['text/html; charset=utf-8', '<!doctype html><html lang="de"><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/app.css"><main id="root"></main><script src="/app.js"></script></html>'],
  '/app.css': ['text/css', css],
  '/app.js': ['application/javascript', js],
};
const server = createServer((req, res) => {
  const asset = Object.hasOwn(routes, req.url) ? routes[req.url] : null;
  if (!asset) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': asset[0] }).end(asset[1]);
});
const profile = await mkdtemp(join(tmpdir(), 'capital-chat-followup-'));
const output = 'artifacts/chat-followup-browser';
await mkdir(output, { recursive: true });
let chrome, socket, seq = 0;
const pending = new Map();
const results = [];

async function until(check, name) {
  const limit = Date.now() + 15000;
  while (Date.now() < limit) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw Error('TIMEOUT: ' + name);
}
async function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP timeout: ' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!r.exceptionDetails, r.exceptionDetails?.text);
  return r.result.value;
}
async function pressButton(index) {
  assert.equal(await evaluate("(() => { const button = document.querySelectorAll('section[aria-label=\"Kopierbare nächste Schritte\"] > ol button')[" + index + "]; button.focus(); return document.activeElement === button; })()"), true);
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
}

try {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  chrome = spawn(chromeBin, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  const port = await (async () => {
    let result;
    await until(async () => {
      try { result = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return !!result; }
      catch { return false; }
    }, 'DevToolsActivePort');
    return result;
  })();
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const { id, result, error } = JSON.parse(event.data);
    const current = pending.get(id);
    if (!current) return;
    pending.delete(id);
    clearTimeout(current.timer);
    if (error) current.reject(Error(error.message));
    else current.resolve(result);
  });
  await command('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  const browser = (await command('Browser.getVersion')).product;
  await command('Page.enable');

  for (const width of [320, 390, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width !== 1440 });
    await command('Page.navigate', { url: origin });
    await until(() => evaluate("document.querySelectorAll('section[aria-label=\"Kopierbare nächste Schritte\"] > ol button').length === 3"), 'three copy buttons');
    const layout = await evaluate("(() => { const section = document.querySelector('section[aria-label=\"Kopierbare nächste Schritte\"]'); const buttons = [...section.querySelectorAll(':scope > ol button')]; return { overflow: document.documentElement.scrollWidth > innerWidth, buttonsInside: buttons.every(b => b.getBoundingClientRect().right <= innerWidth && b.getBoundingClientRect().left >= 0), touch: buttons.every(b => b.getBoundingClientRect().height >= 44), labels: buttons.every(b => b.getAttribute('aria-label').includes('Prompt kopieren')), hasLiveRegion: !!section.querySelector('[role=status][aria-live=polite]') }; })()");
    assert.equal(layout.overflow, false);
    assert.equal(layout.buttonsInside, true);
    assert.equal(layout.touch, true);
    assert.equal(layout.labels, true);
    assert.equal(layout.hasLiveRegion, true);
    await pressButton(0);
    await until(() => evaluate("document.querySelector('section [role=status]').textContent.includes('erfolgreich kopiert')"), 'clipboard confirmation');
    const clipboard = await evaluate("navigator.clipboard.readText().then(text => text.includes('growth-engineering/SKILL.md') && text.includes('SocialMediaEngine') && text.includes('LangGraph'))");
    assert.equal(clipboard, true);
    // Exercise the new JSON controls independently of the three original text actions.
    await evaluate("document.querySelector('section details').open = true");
    const jsonLayout = await evaluate("(() => { const buttons = [...document.querySelectorAll('section details button')]; return { count: buttons.length, touch: buttons.every(b => b.getBoundingClientRect().height >= 44), inside: buttons.every(b => b.getBoundingClientRect().right <= innerWidth && b.getBoundingClientRect().left >= 0), labels: buttons.every(b => b.getAttribute('aria-label').includes('JSON kopieren')) }; })()");
    assert.deepEqual(jsonLayout, { count: 3, touch: true, inside: true, labels: true });
    assert.equal(await evaluate("(() => { const b = document.querySelector('section details button'); b.focus(); return document.activeElement === b; })()"), true);
    await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await until(() => evaluate("document.querySelector('section details button').textContent === 'Kopiert'"), 'JSON clipboard confirmation');
    const envelope = JSON.parse(await evaluate("navigator.clipboard.readText()"));
    assert.equal(envelope.schema, 'CAPITAL_AI_CHAT_FOLLOWUP@1');
    assert.equal(envelope.domain, 'GROWTH');
    assert.equal(envelope.brand.profileId, 'u7-growth');
    assert.equal(envelope.permissionExpansion, false);
    assert.equal(envelope.executionStatus, 'NOT_PROVEN');
    assert.equal(await evaluate("document.documentElement.scrollWidth > innerWidth"), false);
    await evaluate("document.querySelector('section details').open = false");
    const png = (await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false })).data;
    await writeFile(join(output, 'chat-' + width + '.png'), Buffer.from(png, 'base64'));
    results.push({ width, buttons: 3, noOverflow: true, touch44: true, screenreaderLabels: true, copied: true, jsonCopied: true });
  }

  await command('Browser.setPermission', { origin, permission: { name: 'clipboard-write', allowWithoutSanitization: false }, setting: 'denied' });
  await pressButton(1);
  await until(() => evaluate("!!document.querySelector('textarea[aria-label=\"Vollständigen Prompt manuell kopieren\"]')"), 'manual-copy fallback');
  assert.equal(await evaluate("document.querySelector('textarea[aria-label=\"Vollständigen Prompt manuell kopieren\"]').readOnly"), true);
  // A delayed clipboard completion must not confirm a NEW task after re-render.
  await evaluate("(() => { Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: () => new Promise(resolve => { window.finishStaleCopy = resolve; }) } }); window.updateChatTask('Erstelle eine Instagram Kampagne'); return true; })()");
  await until(() => evaluate("!document.querySelector('textarea[aria-label=\\\"Vollständigen Prompt manuell kopieren\\\"]')"), 'reset copy failure after task change');
  await pressButton(0);
  await until(() => evaluate("typeof window.finishStaleCopy === 'function'"), 'stale clipboard promise pending');
  await evaluate("window.updateChatTask('Prüfe OAuth tenant isolation')");
  await until(() => evaluate("!document.querySelector('section [role=status]').textContent.includes('erfolgreich kopiert')"), 'task reset before old copy completion');
  await evaluate("window.finishStaleCopy()");
  await new Promise(resolve => setTimeout(resolve, 200));
  assert.equal(await evaluate("document.querySelector('section [role=status]').textContent.includes('erfolgreich kopiert')"), false);
  const result = { status: 'PASS', scope: 'ISOLATED_CHAT_COMPONENT_NO_PROVIDER_IO', sourceSha: process.env.GITHUB_SHA ?? null, browser, results, deniedClipboardFallback: true, staleCopyCompletionRejected: true };
  await writeFile(join(output, 'result.json'), JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} finally {
  socket?.close();
  if (chrome && chrome.exitCode === null) {
    const exited = new Promise(resolve => chrome.once('exit', resolve));
    chrome.kill();
    await Promise.race([exited, new Promise(resolve => setTimeout(resolve, 1000))]);
  }
  server.closeAllConnections();
  server.close();
  await rm(profile, { recursive: true, force: true, maxRetries: 4, retryDelay: 100 });
}
