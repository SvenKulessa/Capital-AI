#!/usr/bin/env node
/**
 * Isolated Chromium mobile Buddy acceptance with synthetic screenshots only.
 * 320/390 CSS px, one native CDP touch stroke, no auth secrets, no uploads,
 * no device-level capture and no real Android-device claim.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const origin = new URL(process.argv[2]);
assert.equal(origin.protocol, 'http:');
assert.ok(['127.0.0.1', 'localhost'].includes(origin.hostname));
assert.equal(origin.pathname, '/');
const outputDir=process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR || 'artifacts/buddy-mobile';
const profile=await mkdtemp(join(tmpdir(),'ca-buddy-mobile-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const pending=new Map();
const evidence=[];
let chrome=null,socket=null,sequence=0;
function send(method,params={}) {
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timer=setTimeout(()=>{pending.delete(id);reject(new Error('CDP_TIMEOUT_'+method));},18000);
    pending.set(id,{resolve,reject,timer});
    socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw new Error('EVALUATION_FAILED');
  return result.result?.value;
}
async function until(expression,label) {
  for(let attempt=0;attempt<130;attempt++){
    try {if(await evaluate(expression))return;}
    catch {/* route/client bootstrap ongoing */}
    await sleep(100);
  }
  throw new Error('DOM_TIMEOUT_'+label);
}
async function testWidth(width) {
  await send('Emulation.setDeviceMetricsOverride',{width,height:820,deviceScaleFactor:2,mobile:true});
  await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
  await send('Page.navigate',{url:origin.origin+'/'});
  await until("document.readyState==='complete' && !!document.querySelector('[aria-label=\"JaJa Chat öffnen\"]')",'BUDDY_'+width);
  await evaluate("document.querySelector('[aria-label=\"JaJa Chat öffnen\"]').click()");
  await until("!!document.querySelector('[aria-label=\"JaJa CAM: Screenshot aufnehmen\"]')",'CAM_'+width);
  await evaluate("document.querySelector('[aria-label=\"JaJa CAM: Screenshot aufnehmen\"]').click()");
  await until("!!document.querySelector('[aria-label=\"JaJa Screenshot und Markierung\"] input[type=file]')",'PANEL_'+width);
  const accepted=await evaluate(String.raw`(async()=>{
    const input=document.querySelector('[aria-label="JaJa Screenshot und Markierung"] input[type=file]');
    const source=document.createElement('canvas');
    source.width=240;source.height=180;
    const ctx=source.getContext('2d');
    ctx.fillStyle='#0F2739';ctx.fillRect(0,0,240,180);
    const blob=await new Promise(resolve=>source.toBlob(resolve,'image/png'));
    if(!blob)return false;
    const data=new DataTransfer();
    data.items.add(new File([blob],'synthetic-mobile-qa.png',{type:'image/png'}));
    input.files=data.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    return true;
  })()`);
  assert.equal(accepted,true,'Synthetic PNG input was not accepted');
  await until("!!document.querySelector('canvas[aria-label=\"Screenshot mit Markierungen\"]') && document.querySelector('canvas[aria-label=\"Screenshot mit Markierungen\"]').width===240",'IMAGE_'+width);
  await evaluate("(()=>{const button=[...document.querySelectorAll('button')].find(b=>b.textContent.includes('Stift aus'));button?.click();return !!button;})()");
  await until("!!document.querySelector('button[aria-pressed=true]') && getComputedStyle(document.querySelector('canvas[aria-label=\"Screenshot mit Markierungen\"]')).touchAction==='none'",'PEN_'+width);
  const before=await evaluate("document.querySelector('canvas[aria-label=\"Screenshot mit Markierungen\"]').toDataURL('image/png')");
  const bounds=await evaluate(String.raw`(()=>{
    const el=document.querySelector('canvas[aria-label="Screenshot mit Markierungen"]');
    el.scrollIntoView({block:'center',inline:'nearest',behavior:'instant'});
    const r=el.getBoundingClientRect();
    const panel=el.closest('[aria-label="JaJa Screenshot und Markierung"]').getBoundingClientRect();
    return {x:r.x,y:r.y,w:r.width,h:r.height,panelX:panel.x,panelRight:panel.right,innerWidth:innerWidth};
  })()`);
  assert.ok(bounds.w>=30&&bounds.h>=20,'Canvas must have visible drawable area');
  assert.ok(bounds.panelX>=-2&&bounds.panelRight<=width+2,'Capture panel escapes '+width+'px screen');
  const px=Math.max(10,Math.min(width-10,bounds.x+bounds.w*0.40));
  const py=Math.max(10,Math.min(810,bounds.y+bounds.h*0.40));
  assert.ok(px>=bounds.x&&px<=bounds.x+bounds.w&&py>=bounds.y&&py<=bounds.y+bounds.h,'Touch target not visible');
  const first={x:px,y:py};
  const second={x:Math.min(bounds.x+bounds.w-8,px+22),y:Math.min(bounds.y+bounds.h-8,py+15)};
  await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});
  await send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[second]});
  await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  await sleep(250);
  const after=await evaluate("document.querySelector('canvas[aria-label=\"Screenshot mit Markierungen\"]').toDataURL('image/png')");
  assert.notEqual(after,before,'Native pointer touch did not annotate the local canvas');
  const screenshot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(join(outputDir,'buddy-'+width+'-touch.png'),Buffer.from(screenshot.data,'base64'));
  await evaluate("([...document.querySelectorAll('button')].find(b=>b.textContent.includes('Bild zum Prompt-Entwurf hinzufügen')))?.click()");
  await until("!!document.querySelector('img[alt=\"Lokaler markierter Screenshot\"]')",'PREVIEW_'+width);
  evidence.push({width,mode:'CHROMIUM_MOBILE_EMULATION',capture:'SYNTHETIC_PNG_LOCAL',pen:'NATIVE_CDP_TOUCH_PASS',preview:'PASS',
    screenshotsUploaded:false,physicalAndroid:'NOT_PROVEN'});
}
try {
  await mkdir(outputDir,{recursive:true});
  chrome=spawn(process.env.CAPITAL_AI_CHROME_BIN||'chromium',[
    '--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run',
    '--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank',
  ],{stdio:'ignore'});
  chrome.on('error',()=>{});
  let port;
  for(let attempt=0;attempt<300;attempt++){
    try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}
    catch{}
    if(chrome.exitCode!==null||chrome.signalCode!==null)throw new Error('CHROME_EXITED');
    await sleep(100);
  }
  if(!port)throw new Error('CHROME_NOT_READY');
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const tab=tabs.find(x=>x.type==='page');
  if(!tab?.webSocketDebuggerUrl)throw new Error('CDP_PAGE_MISSING');
  socket=new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=()=>reject(new Error('CDP_UNAVAILABLE'));});
  socket.onmessage=event=>{
    const message=JSON.parse(event.data),p=pending.get(message.id);
    if(!p)return;pending.delete(message.id);clearTimeout(p.timer);
    if(message.error)p.reject(new Error('CDP_COMMAND_FAILED'));
    else p.resolve(message.result);
  };
  await send('Page.enable');await send('Runtime.enable');
  for(const width of [320,390])await testWidth(width);
  const report={schema:'CAPITAL_AI_BUDDY_MOBILE_TOUCH@1',status:'PASS',scenarios:evidence,physicalDevice:'NOT_PROVEN'};
  await writeFile(join(outputDir,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report));
} catch(error) {
  const report={schema:'CAPITAL_AI_BUDDY_MOBILE_TOUCH@1',status:'FAIL',scenarios:evidence,
    errorCode:String(error?.message||'BUDDY_BROWSER_FAILURE').slice(0,160),physicalDevice:'NOT_PROVEN'};
  await mkdir(outputDir,{recursive:true});
  await writeFile(join(outputDir,'result.json'),JSON.stringify(report,null,2)+'\n');
  console.error(JSON.stringify(report));
  process.exitCode=1;
} finally {
  try{socket?.close();}catch{}
  if(chrome&&chrome.exitCode===null&&chrome.signalCode===null)chrome.kill('SIGTERM');
  await rm(profile,{recursive:true,force:true,maxRetries:8,retryDelay:200});
}
