/** Anonymous CI test against the isolated BFF only; no remote URL or provider. */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

const origin = 'http://127.0.0.1:17871';
const output = 'artifacts/globe-browser';
const profile = await mkdtemp(join(tmpdir(), 'brand-globe-qa-'));
await mkdir(output, { recursive: true });
const report = { sourceSha: process.env.GITHUB_SHA ?? null, origin, status: 'NOT_PROVEN', checks: [], nativeAndroid: 'NOT_PROVEN', visualReview: 'NOT_PROVEN' };
const chrome = spawn(process.env.CAPITAL_AI_CHROME_BIN || 'chromium', [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage',
  '--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
  '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank',
], { stdio: 'ignore' });
chrome.on('error', () => {});
let socket, seq = 0, loaded = false;
const pending = new Map(), errors = [];
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP_TIMEOUT_' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, 'Page evaluation failed: ' + result.exceptionDetails?.text);
  return result.result?.value;
}
async function until(fn, label) {
  for (let i = 0; i < 150; i++) { if (await fn()) return; await pause(100); }
  throw Error('TIMEOUT_' + label);
}
async function navigate() {
  loaded = false;
  await send('Page.navigate', { url: origin + '/' });
  await until(() => loaded, 'PAGE_LOAD');
  await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('.capital-ai-hero .brand-globe-art')"), 'HERO');
  assert.equal(await evaluate('location.origin'), origin);
  await evaluate("[...document.querySelectorAll('[aria-labelledby=\"cookie-consent-v3-title\"] button')].find(b=>b.textContent.trim()==='Nur notwendige')?.click()");
  await evaluate("document.querySelector('.capital-ai-hero').scrollIntoView()");
}
async function shot(name, clip) {
  const screenshot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false, ...(clip ? { clip } : {}) });
  const bytes = Buffer.from(screenshot.data, 'base64');
  if (name) await writeFile(join(output, name + '.png'), bytes);
  return createHash('sha256').update(bytes).digest('hex');
}
try {
  let port;
  await until(async () => { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return /^\d+$/.test(port); } catch { return false; } }, 'CHROMIUM');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(tab => tab.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.onopen = resolve; socket.onerror = reject; });
  socket.onmessage = event => {
    const message = JSON.parse(event.data), task = pending.get(message.id);
    if (task) { clearTimeout(task.timer); pending.delete(message.id); message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result); }
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Page.loadEventFired') loaded = true;
  };
  await send('Page.enable'); await send('Runtime.enable');
  for (const viewport of [{ width: 320, height: 800, mobile: true }, { width: 390, height: 844, mobile: true }, { width: 768, height: 1024, mobile: true }, { width: 1440, height: 1000, mobile: false }]) {
    await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await navigate();
    await until(() => evaluate("document.querySelector('.brand-globe-poster').complete && document.querySelector('.brand-globe-poster').naturalWidth === 1254"), 'POSTER');
    assert.equal(await evaluate("document.querySelector('.brand-globe-art').dataset.globeState"), 'poster');
    assert.equal(await evaluate("!!document.querySelector('.hero-globe-pause')"), false);
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), 'Page horizontal overflow');
    assert.ok(await evaluate("[...document.querySelectorAll('.hero-copy button')].every(b=>b.getBoundingClientRect().height>=44)"), 'Small hero touch target');
    const layout = await evaluate(`(() => {
      const logo=document.querySelector('.hero-brand-logo'), copy=document.querySelector('.hero-copy'), globe=document.querySelector('.hero-globe-background');
      const r=logo.getBoundingClientRect(), style=getComputedStyle(logo);
      const borderX=parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
      const borderY=parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
      return {logoRatio:(r.width-borderX)/(r.height-borderY), naturalRatio:logo.naturalWidth/logo.naturalHeight,
        foregroundLayer:Number(getComputedStyle(copy).zIndex), backgroundLayer:Number(getComputedStyle(globe).zIndex),
        copyOffset:copy.getBoundingClientRect().top-globe.getBoundingClientRect().top};
    })()`);
    assert.ok(Math.abs(layout.logoRatio-layout.naturalRatio)<.02, 'Logo frame leaves empty space or distorts artwork');
    assert.ok(layout.backgroundLayer<layout.foregroundLayer, 'Globe is not behind the copy');
    assert.ok(layout.copyOffset>=0 && layout.copyOffset<48, 'Copy has been moved into a separate row below the globe');
    report.checks.push({viewport, layout});
    await shot('hero-reduced-' + viewport.width);
    // Simulate doubled text while retaining the same viewport.
    await evaluate("document.querySelectorAll('.hero-copy h1,.hero-copy p,.hero-copy button').forEach(e=>e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*2)+'px')");
    const zoomLayout = await evaluate("(() => { const c=document.querySelector('.hero-copy'); return {scroll:c.scrollWidth,client:c.clientWidth,overflowing:[...c.querySelectorAll('*')].filter(e=>e.scrollWidth>e.clientWidth+2).map(e=>({tag:e.tagName,className:typeof e.className==='string'?e.className:'svg',scroll:e.scrollWidth,client:e.clientWidth})).slice(0,10)}; })()");
    report.checks.push({viewport, zoomLayout});
    // The shade intentionally extends beyond the copy using ::before. Measure
    // actual text fragments, not scrollWidth (which includes that decoration).
    const doubledText = await evaluate(`(() => {
      const copy=document.querySelector('.hero-copy'), bounds=copy.getBoundingClientRect();
      const walker=document.createTreeWalker(copy, NodeFilter.SHOW_TEXT);
      let node, maxOverflow=0, fragments=0;
      while ((node=walker.nextNode())) {
        if (!node.textContent.trim()) continue;
        const range=document.createRange(); range.selectNodeContents(node);
        for (const r of range.getClientRects()) {
          if (!r.width || !r.height) continue;
          fragments++;
          maxOverflow=Math.max(maxOverflow,bounds.left-r.left,r.right-bounds.right);
        }
      }
      return {fragments,maxOverflow};
    })()`);
    assert.ok(doubledText.fragments>0, 'No visible text measured');
    assert.ok(doubledText.maxOverflow<=2, '200% text overflows copy panel: ' + doubledText.maxOverflow);
    report.checks.push({viewport,doubledText});
    report.checks.push({ viewport, reducedMotion: 'PASS', staticArtwork: 'PASS', touchTargets: 'PASS', doubledText: 'PASS' });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
    await navigate();
    await until(() => evaluate("document.querySelector('.brand-globe-art').dataset.globeState === '3d'"), 'WEBGL_READY');
    await pause(900); // Allow poster/copy entrance transitions to finish.
    // JaJa is an independent animated overlay, not part of globe playback.
    // Full-page reduced-motion screenshots above retain it. Isolate only the
    // subsequent globe pixel comparisons; do not change the product design.
    await evaluate("document.querySelectorAll('[data-hero-buddy=\"agent\"]').forEach(e=>e.style.visibility='hidden')");
    const clip = await evaluate(`(() => { const r=document.querySelector('.hero-globe-background').getBoundingClientRect(); const x=Math.max(0,r.x),y=Math.max(0,r.y); return {x,y,width:Math.min(innerWidth,r.right)-x,height:Math.min(innerHeight,r.bottom)-y,scale:1}; })()`);
    assert.ok(clip.width > 0 && clip.height > 0);
    const first = await shot('hero-3d-' + viewport.width, clip);
    await pause(900);
    const second = await shot(null, clip);
    assert.notEqual(first, second, '3D output is not changing');
    // Exercise the real focusable button using keyboard input.
    await evaluate("document.querySelector('.hero-globe-pause').focus({preventScroll:true})");
    assert.equal(await evaluate("document.activeElement === document.querySelector('.hero-globe-pause')"), true, 'Pause button did not receive keyboard focus');
    // Enter also needs its character event; keyDown without text does not
    // reproduce Chromium's native button activation (unlike ArrowDown).
    await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
    await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13 });
    await until(() => evaluate("document.querySelector('.hero-globe-pause').getAttribute('aria-pressed')==='true'"), 'KEYBOARD_PAUSE');
    await pause(100);
    const paused = await shot(null, clip);
    await pause(600);
    assert.equal(await shot(null, clip), paused, 'Paused globe still changes');
    await evaluate("document.querySelector('.hero-globe-pause').click()");
    await pause(600);
    assert.notEqual(await shot(null, clip), paused, 'Globe did not resume');
    const lost = await evaluate("(() => { const gl=document.querySelector('.brand-globe-canvas').getContext('webgl2'); const ext=gl?.getExtension('WEBGL_lose_context'); if(!ext)return false; ext.loseContext(); return true; })()");
    assert.equal(lost, true, 'Context-loss test unavailable');
    await until(() => evaluate("document.querySelector('.brand-globe-art').dataset.globeState==='poster'"), 'CONTEXT_LOSS_FALLBACK');
    await until(() => evaluate("!document.querySelector('.hero-globe-pause')"), 'FALLBACK_HAS_NO_PLAYBACK_CONTROL');
    await pause(700);
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.brand-globe-poster')).opacity"), '1');
    report.checks.push({ viewport, webgl: 'SOFTWARE_WEBGL_PASS', animatedFrames: 'PASS', keyboardPauseResume: 'PASS', contextLossFallback: 'PASS' });
  }
  assert.deepEqual(errors, [], 'Uncaught exceptions');
  report.status = 'TARGETED_PASS';
} catch (error) { report.status = 'FAILED'; report.error = error.message; process.exitCode = 1; }
finally {
  await writeFile(join(output, 'result.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report));
  socket?.close(); chrome.kill('SIGTERM'); await pause(400);
  await rm(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
}
