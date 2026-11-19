#!/usr/bin/env node
/**
 * Chromium QA against the built public B2B route and the existing private
 * Agent Operations HTML preview. Loopback-only; synthetic SMTP receipt;
 * screenshots are CI artifacts, never evidence of live mail delivery.
 */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {mkdtemp,mkdir,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';

const base='http://127.0.0.1:4188';
const out=resolve('artifacts/governance-sprint-qa');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const profile=await mkdtemp(join(tmpdir(),'capital-sprint-qa-'));
const report={schema:'CAPITAL_AI_B2B_RESPONSIVE_QA@1',sourceSha:process.env.GITHUB_SHA??null,
  scope:'ISOLATED_CHROMIUM_BUILT_APP_AND_REPO_HTML_NO_LIVE_EMAIL',checks:[],status:'NOT_PROVEN'};
let chrome,preview,ws,seq=0,contactRequests=0;
const pending=new Map(),exceptions=[];
const synthetic='qa@example.invalid';

function send(method,params={}) {
  return new Promise((resolve,reject)=>{
    const id=++seq;
    const timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT_'+method));},20000);
    pending.set(id,{resolve,reject,timer});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const r=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(r.exceptionDetails)throw Error('BROWSER_EVALUATION_FAILED: '+r.exceptionDetails.text);
  return r.result?.value;
}
async function until(expr,label){
  for(let i=0;i<120;i++){try{if(await evaluate(expr))return;}catch{}await wait(150);}
  throw Error('WAIT_TIMEOUT_'+label);
}
async function screenshot(label){
  const r=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});
  await writeFile(join(out,label+'.png'),Buffer.from(r.data,'base64'));
}
async function setViewport(width){
  await send('Emulation.setDeviceMetricsOverride',{
    width,height:width===320?800:width===390?844:900,deviceScaleFactor:1,mobile:width<=390
  });
  await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
}
function inspect(){
  return `(() => {
    const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    const box=e=>{const r=e.getBoundingClientRect();return {width:r.width,height:r.height,right:r.right};};
    return {width:innerWidth,overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,
      title:document.querySelector('h1')?.textContent?.trim(),
      robots:document.querySelector('meta[name=robots]')?.content??null,
      privacyTag:!!document.querySelector('#capital-ai-ga4'),
      fields:[...document.querySelectorAll('#anfrage input,#anfrage textarea')].filter(visible)
        .map(e=>({name:e.name,labelled:!!e.labels?.length,...box(e)})),
      actions:[...document.querySelectorAll('main a,main button')].filter(visible)
        .map(e=>({label:e.textContent?.trim().slice(0,45),...box(e)})),
      sectionCount:document.querySelectorAll('#pilot article').length,
    };
  })()`;
}
async function closeConsent(){
  const r=await evaluate(`(() => {
    const panel=document.querySelector('[aria-labelledby="cookie-consent-v3-title"]');
    if(!panel)return 'ABSENT';
    const b=[...panel.querySelectorAll('button')]
      .find(e=>/^(Necessary only|Nur notwendige)$/i.test(e.textContent.trim()));
    if(!b)return 'MISSING';b.click();return 'CLOSED';
  })()`);
  assert.notEqual(r,'MISSING','Necessary-only consent control unavailable');
  if(r==='CLOSED')await until("!document.querySelector('[aria-labelledby=\"cookie-consent-v3-title\"]')",'consent-close');
}
async function publicPage(width){
  await setViewport(width);
  await send('Page.navigate',{url:base+'/governance-evidence-sprint?utm_source=qa.synthetic'});
  await until("document.readyState==='complete' && !!document.querySelector('#anfrage form')",
    'public-form');
  await closeConsent();await wait(150);
  const m=await evaluate(inspect());
  assert.equal(m.width,width);
  assert.ok(m.title?.includes('prüfbare Entscheidungen'));
  assert.ok(m.overflow<=2,'public overflow at '+width+': '+m.overflow);
  assert.equal(m.privacyTag,false,'No analytics script without explicit consent');
  assert.ok(m.fields.filter(e=>['email','message'].includes(e.name)).every(e=>e.labelled&&e.width>0));
  assert.ok(m.actions.filter(a=>/anfragen|senden|Musterbericht/.test(a.label))
    .every(a=>a.height>=44),'public CTA touch target');
  assert.equal(await evaluate("!!document.querySelector('#musterbericht')"),true);
  assert.equal(await evaluate("document.querySelector('#anfrage button[type=submit]').disabled"),true);
  assert.equal(await evaluate("document.querySelector('#anfrage form').checkValidity()"),false);
  const inputFocus=await evaluate(`(() => {
    const e=document.querySelector('#anfrage input[type=email]');e.focus();
    return document.activeElement===e && e.labels?.length>0;
  })()`);
  assert.equal(inputFocus,true,'input keyboard focus and label');
  const before=contactRequests;
  const filled=await evaluate(`(() => {
    const form=document.querySelector('#anfrage form');
    const email=form.querySelector('input[type=email]');
    const message=form.querySelector('textarea');
    email.value='qa@example.invalid';email.dispatchEvent(new Event('input',{bubbles:true}));
    message.value='Synthetische QA-Anfrage ohne Kundendaten.';
    message.dispatchEvent(new Event('input',{bubbles:true}));
    form.querySelector('input[type=checkbox]').click();
    return {valid:form.checkValidity(),privacy:form.querySelector('input[type=checkbox]').checked};
  })()`);
  assert.equal(filled.valid,true,'client-side form validity after privacy acknowledgment');
  assert.equal(filled.privacy,true);
  await until("!document.querySelector('#anfrage button[type=submit]').disabled",'submit-enabled');
  await screenshot('sprint-'+width);
  await evaluate("document.querySelector('#anfrage button[type=submit]').click()");
  await until("document.querySelector('#anfrage [role=status]')?.textContent?.includes('angenommen')",
    'smtp-accepted-mock');
  assert.equal(contactRequests,before+1,'exactly one intercepted synthetic contact POST');
  assert.equal(await evaluate("document.querySelector('#anfrage button[type=submit]').disabled"),true);
  assert.equal(await evaluate("!!document.querySelector('#capital-ai-ga4')"),false);
  report.checks.push({scope:'BUILT_PUBLIC_REACT',viewport:width,overflow:m.overflow,
    contact:'SIMULATED_MAIL_SERVER_ACCEPTED_NOT_DELIVERED',consent:'NECESSARY_ONLY_NO_GA4',
    labels:'PASS',keyboard:'PASS',touch:'PASS'});
}
async function privatePreview(width,html){
  await setViewport(width);
  await send('Page.navigate',{url:'about:blank'});
  await evaluate('document.open();document.write('+JSON.stringify(html)+');document.close();');
  await until("!!document.querySelector('#demo-result')",'agent-preview');
  const m=await evaluate(inspect());
  assert.equal(m.width,width);
  assert.ok(m.overflow<=2,'private preview overflow at '+width);
  assert.equal(m.sectionCount,3);
  assert.equal(m.privacyTag,false);
  assert.equal(await evaluate("document.querySelectorAll('form').length"),0);
  assert.equal(await evaluate("document.querySelector('meta[name=robots]').content"),
    'noindex,nofollow,noarchive');
  const controls=await evaluate(`[...document.querySelectorAll('button[data-workflow]')]
    .map(e=>({height:e.getBoundingClientRect().height,label:e.textContent.trim()}))`);
  assert.equal(controls.length,3);
  assert.ok(controls.every(c=>c.height>=44),'private preview touch targets');
  const img=await evaluate("document.querySelector('img.hero').naturalWidth");
  assert.ok(img>0,'actual repository universe SVG must render');
  await evaluate("document.querySelector('button[data-workflow=media-rights]').click()");
  assert.equal(await evaluate("document.querySelector('#demo-result').textContent.includes('NOT_PROVEN')"),
    true);
  await screenshot('agent-preview-'+width);
  report.checks.push({scope:'EXACT_PRIVATE_REPO_HTML',viewport:width,overflow:m.overflow,
    image:'VERIFIED_INLINE_REPO_SVG',touch:'PASS',demo:'PASS',noForm:'PASS',tracking:'ABSENT'});
}
try{
  await mkdir(out,{recursive:true});
  preview=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'preview',
    '--host','127.0.0.1','--port','4188','--strictPort'],{stdio:'ignore'});
  for(let i=0;i<140;i++){
    try{const r=await fetch(base);if(r.ok)break;}catch{}
    if(preview.exitCode!==null)throw Error('VITE_PREVIEW_EXITED');
    if(i===139)throw Error('VITE_PREVIEW_NOT_READY');
    await wait(150);
  }
  const candidates=[process.env.CHROMIUM_BIN,process.env.CAPITAL_AI_CHROME_BIN,
    '/usr/bin/google-chrome','/usr/bin/chromium'].filter(Boolean);
  const bin=candidates.find(v=>v.startsWith('/')&&existsSync(v))||
    candidates.find(v=>!v.startsWith('/'))||'chromium';
  chrome=spawn(bin,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--no-first-run','--disable-extensions','--remote-debugging-port=0',
    '--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  chrome.on('error',()=>{});
  let port=0;
  for(let i=0;i<220;i++){
    try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}
    if(chrome.exitCode!==null)throw Error('CHROMIUM_EXITED');await wait(100);
  }
  if(!port)throw Error('CHROMIUM_NOT_READY');
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  ws=new WebSocket(tabs.find(v=>v.type==='page').webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  ws.onmessage=event=>{
    const m=JSON.parse(event.data),p=pending.get(m.id);
    if(p){pending.delete(m.id);clearTimeout(p.timer);
      m.error?p.reject(Error(m.error.message)):p.resolve(m.result);}
    if(m.method==='Runtime.exceptionThrown')exceptions.push(m.params.exceptionDetails.text);
    if(m.method==='Fetch.requestPaused'){
      const req=m.params.request;
      // QA does NOT call SMTP: the only intercepted POST is local and synthetic.
      if(req.url.startsWith(base+'/api/public/contact')&&req.method==='POST'){
        contactRequests++;
        let receipt=null;
        try {
          const b=JSON.parse(req.postData);
          assert.equal(b.email,synthetic);
          assert.equal(b.website,'');
          assert.ok(b.message.includes('Synthetische QA-Anfrage'));
          receipt=b.requestId;
          assert.match(receipt,/^[0-9a-f-]{36}$/i);
        }catch(e){exceptions.push('CONTACT_FIXTURE_INVALID_'+String(e));}
        void send('Fetch.fulfillRequest',{requestId:m.params.requestId,responseCode:receipt?200:400,
          responseHeaders:[{name:'Content-Type',value:'application/json'},{name:'Cache-Control',value:'no-store'}],
          body:Buffer.from(JSON.stringify(receipt?{
            received:true,receipt,status:'MAIL_SERVER_ACCEPTED'
          }:{error:'fixture_invalid'})).toString('base64')}).catch(e=>exceptions.push('FULFILL_FAIL_'+String(e)));
      }else{
        void send('Fetch.continueRequest',{requestId:m.params.requestId}).catch(()=>{});
      }
    }
  };
  await send('Page.enable');await send('Runtime.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/public/contact',requestStage:'Request'}]});
  const raw=await readFile(resolve('docs/product/agent-operations-pilot-preview.html'),'utf8');
  const svg=await readFile(resolve('public/branding/universe/hero-universe-orbit.svg'),'utf8');
  const source=raw.replace('../../public/branding/universe/hero-universe-orbit.svg',
    'data:image/svg+xml;base64,'+Buffer.from(svg).toString('base64'));
  assert.notEqual(source,raw,'Preview asset path must resolve to exact repo SVG');
  for(const width of [320,390,1440]){
    await publicPage(width);
    await privatePreview(width,source);
  }
  assert.deepEqual(exceptions,[],'browser exceptions/fixtures');
  report.status='TARGETED_PASS';
}catch(e){
  report.status='FAILED';report.error=String(e?.stack||e);process.exitCode=1;
}finally{
  await writeFile(join(out,'audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  try{ws?.close();}catch{}
  if(chrome&&chrome.exitCode===null)chrome.kill('SIGTERM');
  if(preview&&preview.exitCode===null)preview.kill('SIGTERM');
  await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:150});
}
