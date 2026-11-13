#!/usr/bin/env node
/**
 * Read-only, synthetic-only Screener YAML reset regression (real Chromium/CDP).
 * Usage: node scripts/qa/screener-blueprint-reset-browser.mjs https://authorized-staging.example
 * Optional: CAPITAL_AI_CHROME_BIN=/path/to/chromium
 * No credentials, storage mutations, orders, live scorers or API writes.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let origin;
try {
  origin = new URL(process.argv[2]);
  if (!['https:', 'http:'].includes(origin.protocol) || origin.username ||
      origin.password || origin.search || origin.hash || origin.pathname !== '/') throw Error();
} catch {
  console.error('Usage: node scripts/qa/screener-blueprint-reset-browser.mjs https://authorized-staging.example');
  process.exit(2);
}
const path = '/marketscreener/dokumentation';
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const profile = await mkdtemp(join(tmpdir(), 'capital-ai-screener-reset-'));
const failures = [], evidence = [];
let browser, socket, sequence = 0;
const pending = new Map(), runtimeErrors = [];
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(Error('CDP_TIMEOUT_' + method)); }, 15000);
  pending.set(id, { resolve, reject, timeout });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw Error('CDP_EVALUATION_FAILED');
  return result.result?.value;
};
const stateExpression = "(() => { const a=document.querySelector('#screener-bundle-yaml');" +
  "const b=document.querySelector('#screener-blueprint-bundle');" +
  "return {yaml:a?.value??null,invalid:a?.getAttribute('aria-invalid')??null," +
  "score:!!b?.textContent?.includes('76,85 / 100')," +
  "fallback:document.body.textContent?.includes('Oberfläche konnte nicht sicher gestartet werden')??false}; })()";
const clickExpression = label => "(() => {const b=[...document.querySelectorAll('#screener-blueprint-bundle button')]" +
  ".find(x=>x.textContent?.includes(" + JSON.stringify(label) + ")); if (!b) return false; b.click(); return true;})()";
const focusExpression = "(() => {const a=document.querySelector('#screener-bundle-yaml');" +
  "if(!a)return false;a.focus();a.select();return document.activeElement===a;})()";

try {
  browser = spawn(process.env.CAPITAL_AI_CHROME_BIN || 'chromium', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--disable-extensions', '--remote-debugging-port=0',
    '--user-data-dir=' + profile, 'about:blank',
  ], { stdio: 'ignore' });
  browser.on('error', () => {});
  let port;
  for (let i = 0; i < 300; i++) {
    try {
      port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
      if (port) break;
    } catch {}
    if (browser.exitCode !== null || browser.signalCode !== null) throw Error('CHROMIUM_EXITED');
    await pause(100);
  }
  if (!port) throw Error('CHROMIUM_NOT_READY');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = tabs.find(x => x.type === 'page');
  if (!tab?.webSocketDebuggerUrl) throw Error('CDP_PAGE_MISSING');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = () => reject(Error('CDP_CONNECTION')); });
  socket.onmessage = ({ data }) => {
    const m = JSON.parse(data);
    if (m.method === 'Runtime.exceptionThrown') {
      const e = m.params?.exceptionDetails;
      runtimeErrors.push({ kind: 'exception', text: String(e?.text || '').slice(0, 120),
        frames: (e?.stackTrace?.callFrames || []).slice(0, 5).map(f => ({
          name: f.functionName, script: String(f.url || '').split(/[?#]/)[0],
          line: f.lineNumber, column: f.columnNumber,
        })) });
    }
    if (m.method === 'Runtime.consoleAPICalled' && m.params?.type === 'error') {
      runtimeErrors.push({ kind: 'console.error',
        frames: (m.params?.stackTrace?.callFrames || []).slice(0, 5).map(f => ({
          name: f.functionName, script: String(f.url || '').split(/[?#]/)[0],
          line: f.lineNumber, column: f.columnNumber,
        })) });
    }
    const p = pending.get(m.id);
    if (!p) return;
    pending.delete(m.id); clearTimeout(p.timeout);
    if (m.error) p.reject(Error(m.error.message || 'CDP_ERROR')); else p.resolve(m.result);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');

  for (const width of [320, 390, 1280]) {
    await send('Emulation.setDeviceMetricsOverride', {
      width, height: width === 1280 ? 800 : 844,
      deviceScaleFactor: 2, mobile: width !== 1280,
    });
    await send('Page.navigate', { url: new URL(path, origin).href });
    let baseline;
    for (let i = 0; i < 100; i++) {
      try {
        baseline = await evaluate(stateExpression);
        if (baseline.yaml !== null) break;
      } catch {}
      await pause(150);
    }
    if (!baseline?.yaml?.includes('schema_version: 1') || baseline.invalid !== 'false' || !baseline.score) {
      failures.push(width + ': BASELINE_NOT_READY');
      continue;
    }
    const resets = [];
    const resetAndCheck = async scenario => {
      const clicked = await evaluate(clickExpression('Zurücksetzen'));
      await pause(300);
      const after = await evaluate(stateExpression);
      const pass = clicked && after.yaml === baseline.yaml && after.invalid === 'false' &&
        after.score && !after.fallback;
      resets.push({ scenario, pass: !!pass, clicked: !!clicked,
        restored: after.yaml === baseline.yaml, errorOverlay: !!after.fallback });
      if (!pass) failures.push(width + ': RESET_' + scenario.toUpperCase() + '_FAILED');
    };
    await resetAndCheck('unmodified');
    const focused = await evaluate(focusExpression);
    if (focused) await send('Input.insertText', { text: '# synthetic invalid input' });
    await pause(300);
    const invalid = await evaluate(stateExpression);
    if (!focused || invalid.invalid !== 'true') failures.push(width + ': INVALID_EDIT_NOT_APPLIED');
    await resetAndCheck('invalid-input');
    const copyClicked = await evaluate(clickExpression('Demo-YAML kopieren'));
    if (!copyClicked) failures.push(width + ': COPY_BUTTON_MISSING');
    await pause(300);
    await resetAndCheck('after-copy');
    evidence.push({ viewportCssPx: width, scenarios: resets, runtimeErrors: runtimeErrors.splice(0) });
  }
  console.log(JSON.stringify({
    schema: 'CAPITAL_AI_SCREENER_RESET_BROWSER@1',
    target: origin.origin + path,
    testedAt: new Date().toISOString(),
    evidence, failures, status: failures.length ? 'FAILED' : 'PASS',
  }, null, 2));
  process.exitCode = failures.length ? 1 : 0;
} catch (error) {
  console.error('NOT_PROVEN: ' + String(error?.message || error));
  process.exitCode = 2;
} finally {
  try { socket?.close(); } catch {}
  if (browser && browser.exitCode === null && browser.signalCode === null) {
    await new Promise(resolve => {
      browser.once('close', resolve);
      try { browser.kill('SIGTERM'); } catch { resolve(); }
      setTimeout(() => { try { browser.kill('SIGKILL'); } catch {} resolve(); }, 3000).unref();
    });
  }
  await rm(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 150 });
}
