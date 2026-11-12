import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { build } from 'esbuild';

const chromeBin = process.env.CAPITAL_AI_CHROME_BIN;
assert.ok(chromeBin, 'Chromium is required for Ecosystem Roadmap QA');
const assets = 'dist/assets';
const stylesheet = (await readdir(assets)).find(name => /^index-.*\.css$/.test(name));
assert.ok(stylesheet, 'Build the production stylesheet before running browser QA');
const css = await readFile(join(assets, stylesheet));
const js = (await build({
  stdin: {
    contents: "import React from 'react'; import {createRoot} from 'react-dom/client'; import {EcosystemRoadmapPanel} from './src/components/EcosystemRoadmapPanel'; createRoot(document.getElementById('root')).render(<EcosystemRoadmapPanel />);",
    resolveDir: process.cwd(),
    loader: 'tsx',
  },
  bundle: true,
  define: { 'process.env.NODE_ENV': '"production"' },
  write: false,
})).outputFiles[0].contents;
const routes = {
  '/': ['text/html; charset=utf-8', '<!doctype html><html lang="de"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/roadmap.css"><main id="root"></main><script src="/roadmap.js"></script></html>'],
  '/roadmap.css': ['text/css', css],
  '/roadmap.js': ['application/javascript', js],
};
const server = createServer((req, res) => {
  const resource = Object.hasOwn(routes, req.url) ? routes[req.url] : null;
  if (!resource) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': resource[0] }).end(resource[1]);
});
const profile = await mkdtemp(join(tmpdir(), 'capital-ecosystem-browser-'));
let chrome, socket, serial = 0;
const pending = new Map();

async function until(check, label) {
  const end = Date.now() + 12000;
  while (Date.now() < end) {
    const value = await check();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Timeout: ' + label);
}

function command(method, params = {}) {
  return new Promise((resolve, reject) => {
    const id = ++serial;
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('CDP timeout: ' + method)); }, 12000);
    pending.set(id, { resolve, reject, timer });
    socket.send(JSON.stringify({ id, method, params }));
  });
}

async function evaluate(expression) {
  const result = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, result.exceptionDetails?.text);
  return result.result.value;
}

async function activate(selector) {
  assert.equal(await evaluate(`(() => { const target = document.querySelector('${selector}'); target.focus(); return document.activeElement === target; })()`), true);
  await command('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await command('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
}

try {
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  chrome = spawn(chromeBin, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  const port = await until(async () => {
    try { return (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; }
    catch { return null; }
  }, 'Chromium DevTools');
  const targets = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  socket = new WebSocket(targets.find(target => target.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  socket.addEventListener('message', event => {
    const { id, result, error } = JSON.parse(event.data);
    const task = pending.get(id);
    if (!task) return;
    pending.delete(id);
    clearTimeout(task.timer);
    if (error) task.reject(new Error(error.message));
    else task.resolve(result);
  });
  const browser = (await command('Browser.getVersion')).product;
  await command('Browser.grantPermissions', { origin, permissions: ['clipboardReadWrite', 'clipboardSanitizedWrite'] });
  const checks = [];
  for (const width of [320, 768, 1440]) {
    await command('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width === 320 });
    await command('Page.navigate', { url: origin });
    await until(() => evaluate("document.querySelectorAll('section ol li').length === 4"), 'four milestones');
    assert.equal(await evaluate("document.documentElement.scrollWidth <= innerWidth && [...document.querySelectorAll('section ol a')].every(a => new URL(a.href).hostname === 'github.com')"), true);
    await activate('summary');
    assert.equal(await evaluate("document.querySelector('details').open && document.querySelector('textarea').readOnly && !!document.querySelector('textarea').labels.length"), true);
    await activate('details button');
    await until(() => evaluate("document.querySelector('[role=status]').textContent.includes('Aufgabenbriefing kopiert.')"), 'clipboard confirmation');
    assert.equal(await evaluate("navigator.clipboard.readText().then(value => value === document.querySelector('textarea').value)"), true);
    checks.push({ width, milestones: 4, keyboard: true, clipboard: true });
  }
  await command('Browser.setPermission', { origin, permission: { name: 'clipboard-write', allowWithoutSanitization: false }, setting: 'denied' });
  await activate('details button');
  await until(() => evaluate("document.querySelector('[role=status]').textContent.includes('manuell')"), 'clipboard permission fallback');
  assert.equal(await evaluate("document.querySelector('details').open && document.querySelector('textarea').value.length > 0"), true);
  console.log(JSON.stringify({ status: 'PASS', scope: 'ISOLATED_ROADMAP_COMPONENT', sourceSha: process.env.GITHUB_SHA ?? null, browser, checks, deniedClipboardFallback: true }));
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
