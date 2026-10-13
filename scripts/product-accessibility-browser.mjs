#!/usr/bin/env node
/**
 * Browser accessibility smoke test with real Chromium + CDP (no external npm
 * dependencies). Not a screenreader test or a complete WCAG certification.
 * node scripts/product-accessibility-browser.mjs https://staging.example
 * Override browser path with CAPITAL_AI_CHROME_BIN.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let base;
try {
  base = new URL(process.argv[2]);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw Error();
} catch {
  console.error('Usage: node scripts/product-accessibility-browser.mjs https://staging-host');
  process.exit(2);
}
const startedAt = new Date().toISOString();
const profile = await mkdtemp(join(tmpdir(), 'capital-ai-product-a11y-'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const failures = [], pages = [];
let chrome, socket, sequence = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP_TIMEOUT_' + method)); }, 15000);
  pending.set(id, { resolve, reject, timeout });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (result.exceptionDetails) throw Error('EVALUATION_FAILED');
  return result.result?.value;
};
async function navigate(path) {
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw Error('ORIGIN_CHANGED');
  await send('Page.navigate', { url: url.href });
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const ready = await evaluate("document.readyState === 'complete' && !!document.querySelector('main,nav,header')");
      if (ready) { await pause(800); return; }
    } catch { /* navigation in progress */ }
    await pause(100);
  }
  throw Error('PAGE_TIMEOUT_' + path);
}
const domExpression = String.raw`(() => {
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const name = el => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '').trim();
  return {
    documentLanguage: document.documentElement.lang,
    imagesWithoutAlt: [...document.querySelectorAll('img')].filter(el => !el.hasAttribute('alt')).length,
    unlabeledFields: [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')]
      .filter(visible).filter(el => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).length,
    unnamedButtons: [...document.querySelectorAll('button')].filter(visible)
      .filter(el => !name(el) && !el.getAttribute('aria-labelledby')).length,
    scrollNav: [...document.querySelectorAll('.hub-navigation')].map(container => {
      const el = container.querySelector('nav.hub-tab-strip');
      return el ? ({
      hub: container.getAttribute('data-hub'),
      wrap: getComputedStyle(el).flexWrap,
      scroll: getComputedStyle(el).overflowX,
      width: el.clientWidth, contentWidth: el.scrollWidth,
      linkNames: [...el.querySelectorAll('a[href]')].map(name),
    }) : null;
    }).filter(Boolean),
  };
})()`;
async function checkPage(path, viewport) {
  await send('Emulation.setDeviceMetricsOverride', {
    width:viewport.width, height:viewport.height, deviceScaleFactor:2, mobile:viewport.mobile,
  });
  await navigate(path);
  const dom = await evaluate(domExpression);
  const ax = await send('Accessibility.getFullAXTree');
  const nodes = ax.nodes || [];
  const nav = nodes.filter(node => node.role?.value === 'navigation');
  const simulator = path === '/learning/simulator' ? await evaluate(String.raw`(() => ({
    visible: !!document.querySelector('#sim-title'),
    title: document.querySelector('#sim-title')?.textContent?.trim() || '',
    baseline: document.body.textContent?.includes('9.53 %') || false,
    tasks: [...document.querySelectorAll('button')].filter(el => el.textContent?.includes('Aufgabe ')).length,
    rangeFields: document.querySelectorAll('input[type="range"]').length,
    tabularRows: document.querySelectorAll('table tbody tr').length,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    privateEditorVisible: !!document.querySelector('#sim-name'),
  }))()` ) : null;
  const record = { path, viewport, dom, simulator, AX: { nodes:nodes.length, navigations:nav.map(n => n.name?.value || '') } };
  pages.push(record);
  if (path === '/learning/simulator' && process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR) {
    await mkdir(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, { recursive: true });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR,
      'simulator-' + viewport.width + 'x' + viewport.height + '.png'), Buffer.from(shot.data, 'base64'));
    const buttonPressed = await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(el => el.textContent?.includes('Aufgabe 1: Diversifikation'));
      if (!button || button.disabled) return false;
      button.click(); return true;
    })()`);
    await pause(150);
    const feedbackVisible = await evaluate("document.body.textContent.includes('Gleichgewichtetes Portfolio:')");
    if (!buttonPressed || !feedbackVisible) failures.push(path + ': keyboard-accessible learning task not responding');
  }
  if (!dom.documentLanguage) failures.push(path + ': document lang missing (WCAG 3.1.1)');
  if (dom.imagesWithoutAlt) failures.push(path + ': ' + dom.imagesWithoutAlt + ' images without alt (WCAG 1.1.1 partial)');
  if (dom.unlabeledFields) failures.push(path + ': ' + dom.unlabeledFields + ' unnamed form controls (WCAG 3.3.2 partial)');
  if (dom.unnamedButtons) failures.push(path + ': ' + dom.unnamedButtons + ' unnamed buttons (WCAG 4.1.2 partial)');
  if (!nodes.length || !nav.length) failures.push(path + ': accessible navigation tree missing');
  if (path === '/learning/simulator') {
    if (!simulator?.visible || !simulator?.title.includes('Financial Learning Simulator')) failures.push(path + ': route did not render simulator');
    if (!simulator?.baseline) failures.push(path + ': synthetic baseline 9.53 % not rendered');
    if (simulator?.tasks !== 3 || simulator?.rangeFields < 3 || simulator?.tabularRows < 3) failures.push(path + ': learning controls or accessible data table missing');
    if (simulator?.horizontalOverflow > 2) failures.push(path + ': page horizontal overflow (' + simulator.horizontalOverflow + 'px)');
    if (simulator?.privateEditorVisible) failures.push(path + ': private Pro controls visible without verified session');
  }
  if (path === '/learning' && !dom.scrollNav.some(item =>
    item.hub === 'learning' && item.wrap === 'nowrap' && item.scroll === 'auto' && item.linkNames.length >= 4
  )) failures.push(path + ': Learning Hub mobile scroll navigation missing');
}
try {
  chrome = spawn(process.env.CAPITAL_AI_CHROME_BIN || 'chromium', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { stdio:'ignore' });
  chrome.on('error', () => {});
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    try { port = Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]); if (port) break; }
    catch { /* still starting */ }
    if (chrome.exitCode !== null) throw Error('CHROMIUM_EXITED');
    await pause(100);
  }
  if (!port) throw Error('CHROMIUM_NOT_READY');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = tabs.find(t => t.type === 'page');
  if (!tab?.webSocketDebuggerUrl) throw Error('CDP_PAGE_MISSING');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { socket.onopen=resolve; socket.onerror=()=>reject(Error('CDP_CONNECTION')); });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id); clearTimeout(entry.timeout);
    if (message.error) entry.reject(Error(message.error.message || 'CDP_ERROR'));
    else entry.resolve(message.result);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Accessibility.enable');
  for (const viewport of [{width:320,height:800,mobile:true},{width:390,height:844,mobile:true},{width:768,height:1024,mobile:true},{width:1280,height:800,mobile:false}]) {
    for (const path of ['/', '/learning', '/learning/simulator', '/login']) await checkPage(path,viewport);
  }
  console.log(JSON.stringify({schemaVersion:'CAPITAL_AI_PRODUCT_BROWSER_A11Y@1',target:base.origin,startedAt,
    pages,failures,status:failures.length?'FAILED':'TARGETED_PASS',
    actualScreenReader:'NOT_PROVEN',liveTenantIsolation:'NOT_PROVEN',fullWCAGConformance:'NOT_PROVEN'},null,2));
  process.exitCode = failures.length ? 1 : 0;
} catch (err) {
  console.error('Browser audit NOT_PROVEN: ' + String(err?.message || err));
  process.exitCode = 2;
} finally {
  try { socket?.close(); } catch {}
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    await new Promise(resolve => {
      let settled = false;
      const finish = () => { if (settled) return; settled = true; resolve(); };
      chrome.once('close', finish);
      try { chrome.kill('SIGTERM'); } catch { finish(); }
      const timer = setTimeout(() => { try { chrome.kill('SIGKILL'); } catch {} finish(); }, 3000);
      timer.unref();
    });
  }
  await rm(profile,{recursive:true,force:true,maxRetries:12,retryDelay:150});
}
