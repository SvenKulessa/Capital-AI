#!/usr/bin/env node
/** Isolated Chromium 320/390/1440 layout and screenshot evidence. No publishing. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = 'http://127.0.0.1:17871';
const route = '/studio?tab=content';
const output = 'artifacts/universe-content-studio';
const families = ['cyan', 'violet', 'gold', 'pink', 'rose', 'blue', 'green'];
const tokens = JSON.parse(await readFile('public/branding/asset-pack/meta/social-render-tokens.json', 'utf8'));
const rgb = hex => 'rgb(' + [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)).join(', ') + ')';
const expected = families.map(name => rgb(tokens.color.universe[name].$value));
assert.equal(new Set(expected).size, 7);
assert.ok(process.env.CAPITAL_AI_CHROME_BIN, 'Local Chromium binary required');

const profile = await mkdtemp(join(tmpdir(), 'capital-universe-studio-'));
await mkdir(output, { recursive: true });
const chrome = spawn(process.env.CAPITAL_AI_CHROME_BIN, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
  '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile,
  'about:blank',
], { stdio: 'ignore' });
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
let socket, id = 0;
const tasks = new Map();
const report = {
  schemaVersion: 'CAPITAL_AI_UNIVERSE_BROWSER_QA@1', testedPath: route,
  sourceSha: process.env.GITHUB_SHA ?? null,
  status: 'NOT_PROVEN', viewports: [], actualScreenReader: 'NOT_PROVEN',
  humanImageReview: 'NOT_PROVEN', publicationApproval: false,
};
async function until(predicate, label) {
  for (let n = 0; n < 250; n++) {
    try { if (await predicate()) return; } catch { /* browser still loading */ }
    if (chrome.exitCode !== null || chrome.signalCode !== null) throw Error('CHROMIUM_EXITED');
    await pause(120);
  }
  throw Error('TIMEOUT_' + label);
}
function command(method, params = {}) {
  const request = ++id;
  return new Promise((resolve,reject) => {
    const timer = setTimeout(() => { tasks.delete(request); reject(Error('CDP_TIMEOUT_' + method)); }, 15000);
    tasks.set(request, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: request, method, params }));
  });
}
async function evaluate(expression) {
  const r = await command('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (r.exceptionDetails) throw Error('EVALUATION_FAILED');
  return r.result.value;
}
const inspect = [
  '(() => {',
  'const root=document.querySelector("[aria-labelledby=capital-universe-profile]");',
  'const box=root.getBoundingClientRect();',
  'const strip=root.querySelector("[aria-label=\\"Sieben CAPITAL-AI-Markenfarben\\"]");',
  'const swatches=Array.from(strip.querySelectorAll("span[style]"));',
  'const names=Array.from(strip.children).map(el=>el.textContent.trim());',
  'const overflow=Math.max(0,document.documentElement.scrollWidth-document.documentElement.clientWidth);',
  'const clipped=swatches.some(el=>{const r=el.getBoundingClientRect();return r.left<box.left-1||r.right>box.right+1||r.width<=0||r.height<=0;});',
  'const buddy=document.querySelector("[data-hero-buddy=agent] > button");',
  'const br=buddy?.getBoundingClientRect();',
  'const spectrum=document.querySelector("section[aria-label=Chart-Lernatlas] svg [data-universe-spectrum]");',
  'const chartDots=Array.from(spectrum?.querySelectorAll("circle")??[]);',
  'const atlasHeader=document.querySelector("section[aria-label=Chart-Lernatlas] > div:first-child");',
  'const textRects=atlasHeader?[...atlasHeader.querySelectorAll("h2,p")].flatMap(el=>{const range=document.createRange();range.selectNodeContents(el);return [...range.getClientRects()];}):[];',
  'const buddyTextOverlap=!!br && textRects.some(r=>r.right>br.left+2 && r.left<br.right-2 && r.bottom>br.top+2 && r.top<br.bottom-2);',
  'return {heading:document.getElementById("capital-universe-profile")?.textContent.trim()??null,',
  'names,colours:swatches.map(el=>getComputedStyle(el).backgroundColor),overflow,clipped,',
  'panelWidth:box.width,panelLeft:box.left,panelRight:box.right,',
  'chartUniverseColours:chartDots.map(el=>el.getAttribute("fill")),chartUniverseDecorative:spectrum?.getAttribute("aria-hidden")==="true",',
  'buddy:br?{x:br.x,y:br.y,width:br.width,height:br.height,ariaLabel:buddy.getAttribute("aria-label")}:null,buddyTextOverlap,',
  'cookiePanelVisible:!!document.querySelector("[aria-labelledby=cookie-consent-v3-title]"),',
  'documentWidth:document.documentElement.clientWidth,',
  'reducedMotion:matchMedia("(prefers-reduced-motion: reduce)").matches};',
  '})()',
].join('');
try {
  let port;
  await until(async () => {
    try {
      port = Number((await readFile(join(profile, 'DevToolsActivePort'),'utf8')).split('\n')[0]);
      return Number.isInteger(port) && port > 0;
    } catch { return false; }
  }, 'CHROMIUM_START');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = tabs.find(t => t.type === 'page');
  assert.ok(tab?.webSocketDebuggerUrl);
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { socket.onopen=resolve; socket.onerror=()=>reject(Error('CDP_CONNECTION')); });
  socket.onmessage = event => {
    const message = JSON.parse(event.data), task = tasks.get(message.id);
    if (!task) return;
    clearTimeout(task.timer); tasks.delete(message.id);
    if (message.error) task.reject(Error(message.error.message));
    else task.resolve(message.result);
  };
  await command('Page.enable');
  await command('Runtime.enable');
  await command('Emulation.setEmulatedMedia', { features:[{ name:'prefers-reduced-motion', value:'reduce' }] });
  for (const viewport of [
    { width:320, height:800, mobile:true },
    { width:390, height:844, mobile:true },
    { width:1440, height:900, mobile:false },
  ]) {
    await command('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor:1 });
    await command('Page.navigate', { url:origin + route });
    await until(() => evaluate('document.readyState==="complete" && !!document.querySelector("[aria-labelledby=capital-universe-profile]")'), 'PANEL_' + viewport.width);
    // A fresh isolated browser always starts with no cookie receipt. Wait for
    // React's consent UI before rejecting optional tracking; the previous
    // best-effort click could run before hydration and hide the actual preview.
    if (viewport.width === 320) {
      await until(() => evaluate('!!document.querySelector("[aria-labelledby=cookie-consent-v3-title] button")'), 'COOKIE_BANNER');
      const rejected = await evaluate('(() => { const panel=document.querySelector("[aria-labelledby=cookie-consent-v3-title]"); const button=panel?.querySelector("button"); button?.click(); return !!button; })()');
      assert.equal(rejected, true, 'Consent rejection button unavailable');
    }
    await until(() => evaluate('!document.querySelector("[aria-labelledby=cookie-consent-v3-title]")'), 'COOKIE_DISMISSED_' + viewport.width);
    await evaluate('document.querySelector("[aria-labelledby=capital-universe-profile]").scrollIntoView({block:"center"})');
    await pause(220);
    const dom = await evaluate(inspect);
    // Persist the evidence even when a geometry assertion fails.
    const shot = await command('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
    const bytes = Buffer.from(shot.data, 'base64');
    await writeFile(join(output,'content-studio-' + viewport.width + '.png'), bytes);
    const evidence = {...viewport,status:'MEASURED',...dom,screenshotSha256:createHash('sha256').update(bytes).digest('hex')};
    report.viewports.push(evidence);
    assert.ok(bytes.length > 8_000);
    assert.ok(dom.heading?.includes('Universum'));
    assert.deepEqual(dom.names.map(name=>name.toLowerCase()), families);
    assert.deepEqual(dom.colours, expected);
    assert.deepEqual(dom.chartUniverseColours, families.map(name => tokens.color.universe[name].$value),
      'Chart SVG does not contain all seven canonical Universe hues at ' + viewport.width);
    assert.equal(dom.chartUniverseDecorative, true, 'Decorative Universe chart SVG dots leaked accessibility semantics');
    assert.equal(dom.clipped, false, 'Swatches clipped at ' + viewport.width);
    assert.ok(dom.overflow <= 2, 'Horizontal overflow at ' + viewport.width + ': ' + dom.overflow);
    assert.ok(dom.panelLeft >= -1 && dom.panelRight <= viewport.width + 1);
    assert.equal(dom.reducedMotion, true);
    assert.equal(dom.cookiePanelVisible, false, 'Consent UI obstructs visual regression screenshot');
    assert.ok(dom.buddy?.ariaLabel?.startsWith('JaJa Chat'), 'JaJa assistant lost its accessible control');
    if (viewport.mobile) {
      assert.ok(dom.buddy.width >= 44 && dom.buddy.width <= 56, 'Closed JaJa mobile width should preserve a compact touch target');
      assert.ok(dom.buddy.height >= 44 && dom.buddy.height <= 56, 'Closed JaJa mobile height should preserve a compact touch target');
    }
    assert.equal(dom.buddyTextOverlap, false, 'JaJa assistant visually covers Chart-Lernatlas text at ' + viewport.width);
    // Capture the actual chart, not only the Universe header above the fold.
    await evaluate('document.querySelector("section[aria-label=Chart-Lernatlas] figure").scrollIntoView({block:"center"})');
    await pause(220);
    const chartFrame = await evaluate('(() => { const el=document.querySelector("section[aria-label=Chart-Lernatlas] figure svg"); const b=el?.getBoundingClientRect(); return b?{left:b.left,right:b.right,width:b.width,height:b.height,visible:b.bottom>0&&b.top<innerHeight}:null; })()');
    assert.ok(chartFrame?.visible && chartFrame.width > 100, 'Chart SVG is not visible in the viewport');
    assert.ok(chartFrame.left >= -1 && chartFrame.right <= viewport.width + 1, 'Chart SVG exceeds viewport bounds');
    const chartShot = await command('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
    const chartBytes = Buffer.from(chartShot.data, 'base64');
    assert.ok(chartBytes.length > 8_000, 'Chart screenshot missing');
    await writeFile(join(output, 'chart-universe-' + viewport.width + '.png'), chartBytes);
    evidence.chartFrame = chartFrame;
    evidence.chartScreenshotSha256 = createHash('sha256').update(chartBytes).digest('hex');
    evidence.status = 'DOM_LAYOUT_PASS';
  }
  report.status = 'TARGETED_PASS';
} catch (error) {
  report.status = 'FAILED'; report.error = String(error?.message || error); process.exitCode = 1;
} finally {
  await writeFile(join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
  try { socket?.close(); } catch {}
  chrome.kill('SIGTERM');
  for (const task of tasks.values()) clearTimeout(task.timer);
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:150});
}
