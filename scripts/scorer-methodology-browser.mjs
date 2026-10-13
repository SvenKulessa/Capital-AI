/** Anonymous local QA only: no credentials, provider activation or payment. */
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const origin = 'http://127.0.0.1:17871';
const output = 'artifacts/scorer-browser';
const profile = await mkdtemp(join(tmpdir(), 'scorer-qa-'));
await mkdir(output, { recursive: true });
const report = { sourceSha: process.env.GITHUB_SHA ?? null, origin, status: 'NOT_PROVEN', checks: [], nativeAndroid: 'NOT_PROVEN', actualScreenReader: 'NOT_PROVEN', realPurchase: 'NOT_PROVEN', recording: 'NOT_PROVEN' };
const chrome = spawn(process.env.CAPITAL_AI_CHROME_BIN || 'chromium', ['--headless=new','--no-sandbox','--disable-dev-shm-usage','--remote-debugging-port=0',`--user-data-dir=${profile}`,'about:blank'], { stdio: 'ignore' });
chrome.on('error', () => {});
let socket, seq = 0, recording = false;
const pending = new Map(), frames = [], errors = [];
const pause = ms => new Promise(r => setTimeout(r, ms));
function send(method, params = {}) {
  const id = ++seq;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(Error('CDP_TIMEOUT_' + method)); }, 15000);
    pending.set(id, { resolve, reject, timer }); socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!result.exceptionDetails, 'DOM evaluation failed'); return result.result?.value;
}
async function until(fn, label) {
  for (let i = 0; i < 150; i++) { if (await fn()) return; await pause(100); }
  throw Error('TIMEOUT_' + label);
}
async function navigate(path, selector) {
  await send('Page.navigate', { url: origin + path });
  await until(() => evaluate(`document.readyState === 'complete' && !!document.querySelector(${JSON.stringify(selector)})`), path);
  assert.equal(await evaluate('location.origin'), origin);
}
async function select(value, expected) {
  await evaluate(`(() => {const s=document.querySelector('.scorer-methodology select');s.value=${JSON.stringify(value)};s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await until(() => evaluate(`document.querySelector('.scorer-methodology [role="status"]').textContent.includes(${JSON.stringify(expected)})`), value);
  await pause(600);
}
try {
  let port;
  await until(async () => { try {port = (await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0];return /^\d+$/.test(port);}catch{return false;} }, 'CHROMIUM');
  const tabs = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
  socket = new WebSocket(tabs.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise((resolve,reject) => {socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage = event => {
    const message = JSON.parse(event.data), task = pending.get(message.id);
    if (task) {clearTimeout(task.timer);pending.delete(message.id);message.error ? task.reject(Error(message.error.message)) : task.resolve(message.result);}
    if (message.method === 'Runtime.exceptionThrown') errors.push(message.params.exceptionDetails.text);
    if (message.method === 'Page.screencastFrame') {
      if (recording && frames.length < 200) frames.push(Buffer.from(message.params.data,'base64'));
      void send('Page.screencastFrameAck',{sessionId:message.params.sessionId}).catch(()=>{});
    }
  };
  await send('Page.enable');await send('Runtime.enable');await send('Accessibility.enable');
  for (const viewport of [{width:320,height:800,mobile:true},{width:390,height:844,mobile:true},{width:768,height:1024,mobile:true},{width:1440,height:900,mobile:false}]) {
    await send('Emulation.setDeviceMetricsOverride', {...viewport,deviceScaleFactor:1});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await navigate('/marketscreener/scorer','.scorer-methodology');
    await evaluate("document.querySelector('.scorer-methodology').scrollIntoView()");
    await until(()=>evaluate("document.querySelector('.scorer-methodology [role=status]').textContent.includes('74,08')"),'BASELINE');
    if (viewport.width === 390) {recording=true;await send('Page.startScreencast',{format:'png',everyNthFrame:1});}
    const metrics = await evaluate(`(() => {
      const s=document.querySelector('.scorer-methodology');
      return {overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
        meters:s.querySelectorAll('meter').length, label:!!s.querySelector('select').labels.length,
        links:[...s.querySelectorAll('a')].map(a=>a.getAttribute('href')),
        targets:[...s.querySelectorAll('a,select,summary')].map(e=>e.getBoundingClientRect().height)};
    })()`);
    assert.ok(metrics.overflow <= 2, 'Horizontal overflow: ' + metrics.overflow);
    assert.equal(metrics.meters,10);assert.equal(metrics.label,true);
    assert.ok(metrics.targets.every(h => h >= 44));
    assert.ok(metrics.links.includes('/learning?tab=glossar#learning-offer'));
    const ax=await send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(n=>n.role?.value==='combobox'&&n.name?.value==='Rechenbeispiel'));
    // Real keyboard input moves the native select, not just a synthetic click.
    await evaluate("document.querySelector('.scorer-methodology select').focus()");
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowDown',code:'ArrowDown',windowsVirtualKeyCode:40});
    await until(()=>evaluate("document.querySelector('.scorer-methodology [role=status]').textContent.includes('71,11')"),'KEYBOARD_PARTIAL');
    await select('empty','nicht verfügbar');await select('complete','74,08');
    const png=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
    await writeFile(join(output,`scorer-${viewport.width}.png`),Buffer.from(png.data,'base64'));
    if (viewport.width===390) {
      await evaluate("document.querySelector('.scorer-methodology details').open=true;document.querySelector('.scorer-methodology details').scrollIntoView()");
      await pause(800);
      await evaluate("document.querySelector('.scorer-methodology').scrollIntoView()");await pause(500);
      await send('Page.stopScreencast');recording=false;
    }
    // 200% text zoom checks the modified component's own layout and controls.
    await evaluate("document.querySelector('.scorer-methodology').style.fontSize='200%';document.querySelectorAll('.scorer-methodology p,.scorer-methodology h2,.scorer-methodology h3,.scorer-methodology select,.scorer-methodology a,.scorer-methodology dt,.scorer-methodology dd,.scorer-methodology li').forEach(e=>e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*2)+'px')");
    assert.ok(await evaluate('document.documentElement.scrollWidth-document.documentElement.clientWidth <= 2'),'200% text overflow');
    report.checks.push({viewport,metrics,keyboard:'PASS',scenarios:'PASS',textZoom:'PASS',reducedMotion:'PASS'});
  }
  await navigate('/marketscreener','.historical-demo');
  await evaluate("const d=[...document.querySelectorAll('.historical-demo details')].find(d=>d.textContent.includes('Methodik-Demo öffnen'));d.open=true");
  assert.equal(await evaluate("document.querySelectorAll('.scorer-methodology').length"),1);
  await navigate('/learning?tab=glossar#learning-offer','#learning-offer');
  assert.ok(await evaluate("document.querySelector('#learning-offer').textContent.includes('Learning Portal')"));
  assert.ok(await evaluate("!document.querySelector('#learning-offer input[type=checkbox]').checked"));
  report.checks.push({learningOffer:'PASS',purchaseConsent:'NOT_PRESELECTED'});
  assert.deepEqual(errors,[],'Uncaught browser exceptions');
  assert.ok(frames.length>0,'No screen recording frames');
  for (let i=0;i<frames.length;i++) await writeFile(join(output,`frame-${String(i).padStart(4,'0')}.png`),frames[i]);
  const encoding=spawnSync('ffmpeg',['-y','-framerate','5','-i',join(output,'frame-%04d.png'),'-c:v','libx264','-pix_fmt','yuv420p',join(output,'scorer-mobile.mp4')],{encoding:'utf8'});
  assert.equal(encoding.status,0,'Screen recording encoding failed: ' + (encoding.error?.code || encoding.stderr?.slice(-1000) || 'unknown'));
  for (let i=0;i<frames.length;i++) await rm(join(output,`frame-${String(i).padStart(4,'0')}.png`));
  report.recording='CHROMIUM_MOBILE_VIEWPORT_CAPTURE_NOT_ANDROID';report.status='TARGETED_PASS';
} catch(error) {report.error=String(error.message);report.status='FAILED';process.exitCode=1;}
finally {
  await writeFile(join(output,'result.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
  socket?.close();chrome.kill('SIGTERM');await pause(400);await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:100});
}
