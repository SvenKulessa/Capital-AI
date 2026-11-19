#!/usr/bin/env node
/**
 * Isolated Chromium visual QA of the BUILT Owner Operations route.
 * Uses only clearly marked fixture responses; never authenticates as a real owner,
 * never sends credentials, never calls public providers, and never publishes screenshots.
 * Run after npm run build; produces local screenshots and a machine-readable report.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const base='http://127.0.0.1:4187';
const output=resolve(process.env.OWNER_OPERATIONS_QA_DIR || 'evidence/owner-operations-visual-qa');
const profile=await mkdtemp(join(tmpdir(),'capital-owner-visual-'));
const wait=ms=>new Promise(ok=>setTimeout(ok,ms));
const failures=[];
const checks=[];
let preview,chrome,ws,sequence=0,mode='owner';
const pending=new Map();
const fakeSha='b'.repeat(40);
const noPublisher={revenue:null,revenueStatus:'NOT_PROVEN_NOT_QUERIED'};
function fixture() {
  const verified=mode!=='missing';
  const now=new Date().toISOString();
  const prs=[{number:901,title:'[CAPITAL-AI-PRODUCT] QA fixture',draft:false,headSha:fakeSha,updatedAt:now}];
  return {
    schema:'CAPITAL_AI_EVIDENCE_DASHBOARD_READBACK@1',private:true,readOnly:true,
    syntheticDataUsed:false,generatedAt:mode==='stale'?'2020-01-01T00:00:00Z':now,
    github:verified?{
      status:'VERIFIED_PROVIDER_READ',repository:'SvenKulessa/Capital-AI',
      mainSha:fakeSha,openPrCount:1,openPrCountStatus:'VERIFIED',
      pullRequestsStatus:'VERIFIED',pullRequests:prs,
      ci:{status:'VERIFIED_PROVIDER_READ',scope:'MAIN_COMMIT_CHECK_RUNS_NOT_PR_MERGE_AUTHORIZATION',
        runs:[{name:'Docker Security Gate',status:'completed',conclusion:'success',requiredByRootPolicy:true}]},
    }:{status:'NOT_PROVEN',reason:'QA_PROVIDER_UNAVAILABLE'},
    render:verified?{status:'VERIFIED_PROVIDER_READ',deployId:'dep-QA-FIXTURE',
      deployStatus:'live',sourceCommitSha:fakeSha,
      deployments:[{deployId:'dep-QA-FIXTURE',deployStatus:'live',sourceCommitSha:fakeSha,finishedAt:now}],
      deploymentIdentityStatus:'NOT_PROVEN_INDEPENDENT_HEALTH'}:
      {status:'NOT_PROVEN',reason:'QA_PROVIDER_UNAVAILABLE'},
    ga4:verified?{status:'VERIFIED_PROVIDER_READ',property:'properties/12345678',
      period:'LAST_7_DAYS_INCLUDING_TODAY',events:[{eventName:'page_view',eventCount:37}],
      ...noPublisher}:{status:'NOT_PROVEN',reason:'QA_PROVIDER_UNAVAILABLE'},
    comparison:{mainVsDeploy:verified?'MATCH_PROVIDER_CLAIMS_ONLY':'NOT_PROVEN',
      runtimeBuildIdentity:'NOT_PROVEN_INDEPENDENT_READBACK'},
  };
}
function respond(requestId, status, data) {
  const body=Buffer.from(JSON.stringify(data),'utf8').toString('base64');
  return send('Fetch.fulfillRequest',{requestId,responseCode:status,
    responseHeaders:[{name:'Content-Type',value:'application/json; charset=utf-8'},
      {name:'Cache-Control',value:'no-store'},{name:'Access-Control-Allow-Origin',value:'*'}],
    body});
}
function send(method,params={}) {
  return new Promise((resolve,reject)=>{
    const id=++sequence;
    const timeout=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT_'+method));},20000);
    pending.set(id,{resolve,reject,timeout});
    ws.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression) {
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('BROWSER_SCRIPT_ERROR');
  return result.result?.value;
}
async function awaitPage(expression,timeout=24000) {
  for(let i=0;i<timeout/150;i++){
    try{if(await evaluate(expression))return;}catch{}
    await wait(150);
  }
  throw Error('PAGE_STATE_TIMEOUT');
}
async function visit(role,width,tag,expected=true,route='/profile/render-dashboard') {
  mode=role;
  await send('Emulation.setDeviceMetricsOverride',{
    width,height:900,deviceScaleFactor:1,mobile:width<=390});
  await evaluate('window.__qa_previous_document = true');
  await send('Page.navigate',{url:base+route});
  await awaitPage("window.__qa_previous_document === undefined && document.readyState === 'complete' && !!document.querySelector('h1')");
  if(route==='/profile/dashboard' && expected){
    await awaitPage("!!document.getElementById('dashboard-operations-tab')");
    const opened=await evaluate("(() => { const button=document.getElementById('dashboard-operations-tab'); if(!button)return false; button.click(); return true; })()");
    if(!opened)throw Error('OWNER_TAB_NOT_AVAILABLE');
    await awaitPage("document.getElementById('dashboard-operations-tab')?.getAttribute('aria-selected') === 'true'");
  }
  if(expected)await awaitPage("!!document.querySelector('.ops-mock')");
  else await awaitPage("!!document.querySelector('[role=status]') || !!document.querySelector('[role=alert]')");
  await wait(550);
  // The public cookie dialog is unrelated to the private Operations visual layout;
  // choose necessary-only in the isolated browser, never auto-consent to analytics.
  const consent=await evaluate("(() => { const button=[...document.querySelectorAll('button')].find(el=>el.textContent.trim()==='Nur notwendige'); if(!button||!button.getClientRects().length)return false; button.click(); return true; })()");
  if(consent)await wait(350);
  const state=await evaluate(`(() => {
    const root=document.querySelector('.ops-mock');
    const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right};};
    const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';
    const controls=[...document.querySelectorAll('button')].filter(visible).map(e=>({
      name:(e.textContent||e.getAttribute('aria-label')||'').trim().slice(0,70),...rect(e)}));
    return {
      path:location.pathname,scrollWidth:document.documentElement.scrollWidth,
      viewportWidth:document.documentElement.clientWidth,
      ownerTitle:!!root,headline:document.querySelector('h1')?.textContent,
      kpis:root?.querySelectorAll('.ops-mock-kpi').length||0,
      panels:root?.querySelectorAll('.ops-mock-card').length||0,
      agents:root?.querySelectorAll('.ops-mock-agent').length||0,
      donut:!!root?.querySelector('.ops-mock-donut'),
      lineSvg:!!root?.querySelector('.ops-mock-chart-area svg'),
      labels:[...root?.querySelectorAll('.ops-mock-kpi-value')||[]].map(x=>x.textContent.trim()),
      ownerTabSelected:document.getElementById('dashboard-operations-tab')?.getAttribute('aria-selected')==='true',
      unauthorizedMessage:document.body.textContent.includes('für die aktuelle Anmeldung nicht verfügbar'),
      border:root?getComputedStyle(root).borderColor:null,
      kpiColumns:root?getComputedStyle(root.querySelector('.ops-mock-kpis')).gridTemplateColumns:null,
      panelColumns:root?getComputedStyle(root.querySelector('.ops-mock-panels')).gridTemplateColumns:null,
      cardBounds:root?[...root.querySelectorAll('.ops-mock-kpi,.ops-mock-card')].map(rect):[],
      rootBounds:root?rect(root):null,
      controls,
    };
  })()`);
  const row={scenario:role,viewport:width,mode:'ISOLATED_FIXTURE_NOT_PRODUCTION',...state};
  checks.push(row);
  if(state.scrollWidth>width+2)failures.push(tag+': viewport horizontal overflow');
  if(expected){
    if(!state.ownerTitle||state.kpis!==4||state.panels!==4||state.agents!==6||!state.donut||(role!=='missing'&&!state.lineSvg))
      failures.push(tag+': owner operations visual elements missing');
    if(!state.rootBounds||state.rootBounds.right>width+2)failures.push(tag+': owner operations panel exceeds viewport');
    if(route==='/profile/dashboard' && (!state.ownerTabSelected || state.path!=='/profile/dashboard'))
      failures.push(tag+': private owner dashboard tab not selected');
    if(state.cardBounds.some(x=>x.right>width+2||x.width<=0))failures.push(tag+': card overflows viewport');
    if(state.controls.some(c=>c.name==='Aktualisieren'&&(c.width<44||c.height<44)))
      failures.push(tag+': refresh target under 44px');
    if(role==='missing'&&state.lineSvg)failures.push(tag+': unavailable PR history was drawn as real trend');
    if(role==='missing'&&state.labels.some(x=>/37|fake|12345678/.test(x)))
      failures.push(tag+': fallback leaks fixture KPI');
  }else if(state.ownerTitle||!state.unauthorizedMessage)
    failures.push(tag+': owner-only content displayed for non-owner');
  if(expected){
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});
    await writeFile(join(output,'owner-operations-'+tag+'.png'),Buffer.from(shot.data,'base64'));
    if(role==='owner'&&width===390){
      const touch=await evaluate(`(() => {
        const element=[...document.querySelectorAll('[role="tab"]')].find(e=>e.textContent.includes('Evidence'));
        if(!element)return null;
        element.scrollIntoView({block:'center'});
        const r=element.getBoundingClientRect();
        return {x:r.x+r.width/2,y:r.y+r.height/2};
      })()`);
      if(!touch)failures.push(tag+': Evidence tab inaccessible');
      else{
        await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
        await send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch]});
        await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
        await wait(200);
        const selected=await evaluate("!![...document.querySelectorAll('[role=tab]')].find(e=>e.textContent.includes('Evidence')&&e.getAttribute('aria-selected')==='true')");
        if(!selected)failures.push(tag+': native touch did not activate Evidence tab');
        await send('Emulation.setTouchEmulationEnabled',{enabled:false});
      }
    }
    if(role==='owner'&&width===320){
      await evaluate("document.documentElement.style.fontSize='200%'");
      await wait(180);
      const overflow=await evaluate("document.documentElement.scrollWidth-document.documentElement.clientWidth");
      checks.push({scenario:'owner-zoom-200',viewport:320,overflow});
      if(overflow>2)failures.push(tag+': 200 percent text zoom causes overflow');
      const zoom=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true});
      await writeFile(join(output,'owner-operations-'+tag+'-zoom200.png'),Buffer.from(zoom.data,'base64'));
    }
  }
}
async function run() {
  await mkdir(output,{recursive:true});
  preview=spawn(process.execPath,[resolve('node_modules/vite/bin/vite.js'),'preview',
    '--host','127.0.0.1','--port','4187','--strictPort'],{stdio:'ignore'});
  for(let i=0;i<120;i++){
    try{const res=await fetch(base);if(res.ok)break;}catch{}
    if(preview.exitCode!==null)throw Error('VITE_PREVIEW_EXITED');
    if(i===119)throw Error('VITE_PREVIEW_TIMEOUT');
    await wait(150);
  }
  const candidates=[process.env.CHROMIUM_BIN,process.env.CHROME_BIN,
    process.env.CAPITAL_AI_CHROME_BIN,'/usr/bin/google-chrome','/usr/bin/chromium']
    .filter(Boolean);
  const binary=candidates.find(x=>x.startsWith('/')&&existsSync(x))||
    candidates.find(x=>!x.startsWith('/'))||'chromium';
  chrome=spawn(binary,['--headless=new','--no-sandbox','--disable-dev-shm-usage',
    '--disable-gpu','--no-first-run','--disable-extensions','--remote-debugging-port=0',
    '--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
  chrome.on('error',()=>{});
  let port=0;
  for(let i=0;i<240;i++){
    try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}
    if(chrome.exitCode!==null||chrome.signalCode!==null)throw Error('CHROMIUM_EXITED');
    await wait(100);
  }
  if(!port)throw Error('CHROMIUM_START_TIMEOUT');
  const tabs=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  const page=tabs.find(x=>x.type==='page');
  if(!page?.webSocketDebuggerUrl)throw Error('CHROMIUM_TAB_NOT_FOUND');
  ws=new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((ok,fail)=>{ws.onopen=ok;ws.onerror=()=>fail(Error('CHROMIUM_WS_FAILED'));});
  ws.onmessage=event=>{
    const msg=JSON.parse(event.data);
    if(msg.method==='Fetch.requestPaused'){
      const path=new URL(msg.params.request.url).pathname;
      const requestId=msg.params.requestId;
      let status=404,data={error:'not_found'};
      if(path==='/api/auth/session'){
        data={configured:true,authenticated:true,mfaRequired:false,
          user:{id:'qa-only',subject:'qa-only',name:'QA Test',email:'qa@example.invalid'},
          account:{available:true,iamRole:mode==='nonowner'?'user':'owner',
            subscription:{tier:'Free',status:'active',currentPeriodEnd:null},badges:[]}};
        status=200;
      }else if(path==='/api/profile/evidence-dashboard-readback'&&mode!=='nonowner'&&mode!=='error'){
        status=200;data=fixture();
      }else if(path==='/api/profile/render-owner-dashboard'&&mode!=='nonowner'){
        status=200;data={private:true,providers:[],sampleSymbols:[]};
      }
      void respond(requestId,status,data).catch(e=>failures.push('mock-response: '+String(e.message)));
      return;
    }
    const entry=pending.get(msg.id);
    if(entry){
      pending.delete(msg.id);clearTimeout(entry.timeout);
      if(msg.error)entry.reject(Error(msg.error.message));
      else entry.resolve(msg.result);
    }
  };
  await send('Page.enable');await send('Runtime.enable');
  await send('Fetch.enable',{patterns:[{urlPattern:base+'/api/*',requestStage:'Request'}]});
  for(const width of [320,390,1440])await visit('owner',width,'owner-'+width);
  // Screenshot path: the real user opens Owner Operations as a tab inside /profile/dashboard.
  // Exercise that exact route, not just the standalone owner-provider page.
  for(const width of [320,390,1440])
    await visit('owner',width,'private-owner-'+width,true,'/profile/dashboard');
  await visit('missing',390,'missing-390');
  await visit('nonowner',390,'nonowner-390',false);
  const report={schema:'CAPITAL_AI_OWNER_VISUAL_BROWSER_QA@1',
    source:'BUILT_VITE_PREVIEW_WITH_ISOLATED_API_FIXTURES',realOwnerSession:false,
    productionProviderData:false,realTenantIsolation:'NOT_PROVEN',
    widths:[320,390,1440],checks,failures,status:failures.length?'FAIL':'PASS'};
  await writeFile(join(output,'audit.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify({status:report.status,checks:checks.length,failures,
    screenshots:['owner-operations-owner-320.png','owner-operations-owner-390.png','owner-operations-owner-1440.png',
      'owner-operations-private-owner-320.png','owner-operations-private-owner-390.png','owner-operations-private-owner-1440.png',
      'owner-operations-missing-390.png','owner-operations-owner-320-zoom200.png','owner-operations-private-owner-320-zoom200.png'],
    realOwnerSession:false,productionProviderData:false},null,2));
  if(failures.length)process.exitCode=1;
}
try{await run();}
catch(error){
  process.exitCode=2;console.error('Owner Operations browser QA NOT_PROVEN:',error?.message||String(error));
}finally{
  try{ws?.close();}catch{}
  try{if(chrome?.exitCode===null)chrome.kill('SIGTERM');}catch{}
  try{if(preview?.exitCode===null)preview.kill('SIGTERM');}catch{}
  await wait(350);
  await rm(profile,{recursive:true,force:true,maxRetries:5,retryDelay:150});
}
