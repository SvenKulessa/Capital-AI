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
// Scope Growth interactions to the standalone Owner provider route; fixtures only.
const growthRoot='document.querySelector(\'section[aria-label="Growth Intelligence Control Center"]\')';
async function growthClick(label){
  const ok=await evaluate(`(() => {const root=${growthRoot};const b=[...root.querySelectorAll('button')].find(e=>e.textContent.trim()===${JSON.stringify(label)});if(!b||b.disabled)return false;b.click();return true;})()`);
  assert.equal(ok,true,'Growth button unavailable: '+label);
}
async function growthUpload(raw,kind){
  const ok=await evaluate(`(() => {const root=${growthRoot};const label=${JSON.stringify(kind)};const b=[...root.querySelectorAll('button')].find(e=>e.textContent.trim()===label);const input=b?.nextElementSibling;if(input?.type!=='file')return false;const dt=new DataTransfer();dt.items.add(new File([${JSON.stringify(raw)}],'synthetic.json',{type:'application/json'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  assert.equal(ok,true,'Growth import input unavailable');
}
async function growthInteractionFixture(){
  await growthClick('GA4 Read-only prüfen');
  await awaitPage(`${growthRoot}.textContent.includes('Sessions 12, Engaged Sessions 4')`);
  await growthClick('Vorher / Nachher');
  await awaitPage(`${growthRoot}.textContent.includes('Vorher') && ${growthRoot}.textContent.includes('Sessions 12, Engaged Sessions 4')`);
  await growthClick('Integrationen');
  const filter=await evaluate(`(() => {const root=${growthRoot};const s=[...root.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='MARKET'));if(!s)return false;s.value='MARKET';s.dispatchEvent(new Event('change',{bubbles:true}));return true;})()`);
  assert.equal(filter,true);await awaitPage(`${growthRoot}.querySelectorAll('article').length===1 && ${growthRoot}.textContent.includes('Marktnews-Pipeline')`);
  await evaluate(`(() => {const s=[...${growthRoot}.querySelectorAll('select')].find(e=>[...e.options].some(o=>o.value==='MARKET'));s.value='ALL';s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
  await growthClick('Engine-Readback prüfen');
  await awaitPage(`${growthRoot}.textContent.includes('Build-Artefakte gelesen')`);
  const report=JSON.stringify({contractVersion:'CAPITAL_AI_GROWTH_GRAPH_HANDOFF@1',engine:'langgraph',quality:'PASS_WITH_GAPS',
    sources:['GA4','GSC','INSTAGRAM','YOUTUBE'].map(source=>({source,status:'NOT_PROVEN_NO_READBACK',transport:'DISABLED',evidenceSha256:null})),
    eligibleForDraftReview:false,providerAuthentication:'NOT_PROVEN_BY_GRAPH',attributionEvents:[],publicationAllowed:false,costActivationAllowed:false,automaticChanges:false});
  await growthUpload(report,'LangGraph-Statusbericht importieren');
  await awaitPage(`${growthRoot}.textContent.includes('Graph-Statusbericht als Dokumentation übernommen')`);
  await growthClick('Integrationen');
  await awaitPage(`${growthRoot}.textContent.includes('GA4 · Graph-Import') && ${growthRoot}.textContent.includes('Sessions 12, Engaged Sessions 4')`);
  // Capture the actual exported Blob in this isolated fixture; suppress filesystem download only.
  await evaluate(`(() => {const original=URL.createObjectURL,click=HTMLAnchorElement.prototype.click;window.__growthExport=null;URL.createObjectURL=function(blob){blob.text().then(s=>window.__growthExport=s);return original.call(URL,blob);};HTMLAnchorElement.prototype.click=function(){if(this.download?.startsWith('capital-ai-growth-owner-'))return;return click.call(this);};})()`);
  await growthClick('JSON exportieren');await awaitPage("typeof window.__growthExport==='string'");
  const exported=await evaluate('window.__growthExport');
  const bundle=JSON.parse(exported);assert.equal(bundle.schema,'CAPITAL_AI_GROWTH_OWNER_WORKSPACE@1');
  assert.ok(bundle.snapshots.length>=4);assert.equal(bundle.snapshots.at(-1).rows.find(r=>r.id==='ga4').status,'VERIFIED');
  await growthUpload(exported,'JSON importieren (ersetzt Arbeitsstand)');
  await awaitPage(`${growthRoot}.textContent.includes('Import übernommen')`);
  assert.equal(await evaluate(`[...${growthRoot}.querySelectorAll('article')].some(a=>a.textContent.includes('VERIFIED ·'))`),false,'Imported VERIFIED must downgrade');
  await evaluate(`${growthRoot}.querySelector('details').open=true`);
  await growthClick('Archiv prüfen');
  await awaitPage(`${growthRoot}.textContent.includes('Archiv nicht verfügbar')`);
  assert.equal(await evaluate(`[...${growthRoot}.querySelectorAll('button')].find(b=>b.textContent.trim()==='Aktuellen Stand archivieren')?.disabled`),true);
  checks.push({scenario:'growth-control-center-interactions',viewport:390,mode:'ISOLATED_FIXTURE_NOT_PRODUCTION',ga4Fixture:true,domainFilter:true,comparison:true,engineReadbackFixture:true,graphImport:true,jsonRoundtrip:true,archiveFailClosed:true,inputMethod:'DOM fixture events; not native touch'});
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
      ga4Cards:root?.querySelectorAll('.ops-mock-ga4-metric').length||0,
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
    if(!state.ownerTitle||state.kpis!==4||state.panels!==5||state.ga4Cards!==6||state.agents!==6||!state.donut||(role!=='missing'&&!state.lineSvg))
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
  if(route==='/profile/render-dashboard'){
    if(expected){
      await awaitPage(`!!${growthRoot}`);
      const bounds=await evaluate(`(() => {const e=${growthRoot};const r=e.getBoundingClientRect();return {right:r.right,width:r.width,scrollWidth:document.documentElement.scrollWidth};})()`);
      checks.push({scenario:'growth-layout-'+role,viewport:width,...bounds,mode:'ISOLATED_FIXTURE_NOT_PRODUCTION'});
      if(bounds.right>width+2||bounds.scrollWidth>width+2)failures.push(tag+': Growth panel horizontal overflow');
      if(role==='owner'&&width===390)await growthInteractionFixture();
    }else if(await evaluate(`!!${growthRoot}`))failures.push(tag+': non-owner Growth panel exposed');
  }
  if(expected){
    if(role==='owner'&&width===390&&route==='/profile/dashboard'){
      // Native touch admission exercises the actual owner navigation route.
      // Standalone provider fixture receives layout QA but its touch remains NOT_PROVEN.
      // Chrome 157 evidence: JS scrollY was 2725 but the first real
      // touchStart hit-tested at 478; touchEnd then observed scrollY 2725.
      // Flush the compositor input state with a CANCELLED native touch on a
      // verified non-interactive viewport corner. No click or tab selection.
      await send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:1});
      const found=await evaluate(`(() => {
        const element=[...document.querySelectorAll('button[role="tab"]')].find(e=>e.textContent.trim()==='Evidence');
        if(!element)return false;
        element.scrollIntoView({behavior:'instant',block:'center',inline:'nearest'});
        return true;
      })()`);
      if(!found)failures.push(tag+': Evidence tab inaccessible');
      else{
        const neutral=await evaluate(`(() => {
          // A fixed-position skip-link or overlay can occupy (2,2); resolve
          // against the actual hit-tested viewport rather than assuming a corner.
          const candidates=[[8,450],[382,450],[195,16],[195,884],[8,16],[382,884],
            [20,300],[370,300],[20,650],[370,650]];
          for(const [x,y] of candidates){
            if(x>=innerWidth||y>=innerHeight)continue;
            const hit=document.elementFromPoint(x,y);
            if(hit && !hit.closest('a,button,input,select,textarea,[role="button"],[role="tab"],[tabindex]:not([tabindex="-1"])'))
              return {x,y};
          }
          return null;
        })()`);
        if(!neutral)failures.push(tag+': safe compositor synchronization point unavailable');
        else{
          await send('Input.dispatchTouchEvent',{
            type:'touchStart',touchPoints:[{x:neutral.x,y:neutral.y,radiusX:1,radiusY:1,force:1}],
          });
          await send('Input.dispatchTouchEvent',{type:'touchCancel',touchPoints:[]});
          await wait(180);
        }
        // On long mobile dashboards the document may continue moving after
        // scrollIntoView. Admit touch only after both viewport and target box
        // remain stable across repeated animation frames; never DOM-click.
        const settled=await evaluate(`(async () => {
          const element=[...document.querySelectorAll('button[role="tab"]')].find(e=>e.textContent.trim()==='Evidence');
          if(!element)return false;
          let previous='',stableFrames=0;
          for(let i=0;i<90;i++){
            await new Promise(resolve=>requestAnimationFrame(resolve));
            const r=element.getBoundingClientRect();
            const signature=[scrollX,scrollY,r.left,r.top,r.width,r.height].map(v=>Math.round(v*2)/2).join(':');
            stableFrames=signature===previous?stableFrames+1:0;
            if(stableFrames>=12)return true;
            previous=signature;
          }
          return false;
        })()`);
        if(!settled)failures.push(tag+': mobile Evidence tab layout never settled before native touch');
        if(settled){
          // Chrome 157 can dispatch the touchstart against the *previous* compositor
          // scroll offset even when scrollY/getBoundingClientRect are already stable.
          // Flush a viewport-only compositor frame before native input; never click
          // the tab programmatically or accept the screenshot as touch evidence.
          await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false,fromSurface:true});
          await wait(120);
        }
        const touch=settled&&neutral?await evaluate(`(() => {
          const element=[...document.querySelectorAll('button[role="tab"]')].find(e=>e.textContent.trim()==='Evidence');
          if(!element)return null;
          const r=element.getBoundingClientRect();
          const x=r.left+r.width/2, y=r.top+r.height/2;
          const hit=document.elementFromPoint(x,y);
          return {x,y,hit:!!hit && (hit===element || element.contains(hit)),
            withinViewport:x>=0 && x<innerWidth && y>=0 && y<innerHeight,
            scrollY:Math.round(window.scrollY)};
        })()`):null;
        if(!touch?.withinViewport||!touch.hit)failures.push(tag+': Evidence tab native touch target obscured or outside viewport');
        else{
          // Record event *types only*, never session data, to distinguish real
          // touch-delivery failures from delayed click activation or rerenders.
          await evaluate(`(() => {
            window.__qaTouchEvents=[];
            for(const type of ['pointerdown','pointerup','touchstart','touchend','click']){
              document.addEventListener(type,event=>{
                if(window.__qaTouchEvents.length<12)window.__qaTouchEvents.push({
                  type,role:event.target?.closest?.('[role="tab"]')?.getAttribute('role')||'other',
                  trusted:event.isTrusted===true,
                  targetTag:event.target?.tagName||'unknown',
                  targetClass:typeof event.target?.className==='string'?event.target.className.slice(0,100):null,
                  targetId:typeof event.target?.id==='string'?event.target.id.slice(0,80):null,
                  x:Math.round((event.changedTouches?.[0]?.clientX ?? event.clientX ?? -1)*10)/10,
                  y:Math.round((event.changedTouches?.[0]?.clientY ?? event.clientY ?? -1)*10)/10,
                  scrollY:Math.round(window.scrollY),
                  targetTop:Math.round(event.target?.getBoundingClientRect?.().top??-1),
                  hitRole:document.elementFromPoint(event.changedTouches?.[0]?.clientX ?? event.clientX ?? -1,
                    event.changedTouches?.[0]?.clientY ?? event.clientY ?? -1)?.closest?.('[role="tab"]')?.getAttribute('role')||'other'
                });
              },{capture:true});
            }
            return true;
          })()`);
          // Input.dispatchTouchEvent gives Chrome 157 explicit viewport-CSS
          // touchStart/touchEnd, rather than delegating compositor placement to
          // synthesizeTapGesture. This is still native CDP touch, never DOM .click().
          // Local isolated Chrome 144 reproduction: synthesizeTapGesture missed the
          // button click, while dispatchTouchEvent completed it.
          await send('Input.dispatchTouchEvent',{
            type:'touchStart',touchPoints:[{x:touch.x,y:touch.y,radiusX:1,radiusY:1,force:1}],
          });
          await wait(110);
          await send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
          let selected=false;
          for(let attempt=0;attempt<20;attempt++){
            selected=await evaluate("!![...document.querySelectorAll('button[role=tab]')].find(e=>e.textContent.trim()==='Evidence'&&e.getAttribute('aria-selected')==='true')");
            if(selected)break;
            await wait(150);
          }
          const verifiedNativeTarget=await evaluate(`(() => (
            (window.__qaTouchEvents||[]).some(e=>e.type==='touchstart' &&
              e.role==='tab' && e.trusted===true)
          ))()`);
          if(!selected||!verifiedNativeTarget){
            const events=await evaluate("window.__qaTouchEvents||[]");
            const metrics=await evaluate(`(() => ({innerWidth,innerHeight,scrollX,scrollY,
              offsetX:visualViewport?.offsetLeft??null,offsetY:visualViewport?.offsetTop??null,
              pageTop:visualViewport?.pageTop??null,scale:visualViewport?.scale??null}))()`);
            const cdp=await send('Page.getLayoutMetrics');
            const view=cdp.cssVisualViewport||{};
            const layout=cdp.cssLayoutViewport||{};
            const compositor={visual:{offsetX:view.offsetX,offsetY:view.offsetY,pageX:view.pageX,
              pageY:view.pageY,scale:view.scale,clientWidth:view.clientWidth,clientHeight:view.clientHeight},
              layout:{pageX:layout.pageX,pageY:layout.pageY,clientWidth:layout.clientWidth,
                clientHeight:layout.clientHeight}};
            failures.push(tag+': native touch did not activate Evidence tab · '+JSON.stringify({selected,verifiedNativeTarget,events,target:touch,metrics,compositor}));
          }
          await send('Emulation.setTouchEmulationEnabled',{enabled:false});
        }
      }
    }
    // Capture the full-page screenshot after native touch QA: Chrome may change
    // compositor viewport metrics during captureBeyondViewport, making an
    // immediately subsequent synthetic tap hit a different composited target.
    const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,fromSurface:true});
    await writeFile(join(output,'owner-operations-'+tag+'.png'),Buffer.from(shot.data,'base64'));
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
      }else if(path==='/api/profile/growth-intelligence/ga4-readback'&&mode==='owner'){
        status=200;data={schema:'CAPITAL_AI_GROWTH_GA4_READBACK@1',source:'GA4_DATA_API',private:true,readOnly:true,publicPublishAllowed:false,
          attributionAuthority:'SEPARATE_FROM_UMAMI_GSC_SOCIAL',observedAt:new Date().toISOString(),status:'PROVIDER_READ_VERIFIED',metrics:{sessions:12,engagedSessions:4}};
      }else if(path==='/api/profile/growth-intelligence/engine-readback'&&mode==='owner'){
        status=200;data={schema:'CAPITAL_AI_OWNER_ENGINE_SNAPSHOT@1',scope:'BUILD_ARTIFACT_ONLY',private:true,readOnly:true,publicPublishAllowed:false,
          market:{state:'SOURCE_SNAPSHOT_ONLY',date:'2026-11-24',homepage:3,overview:0,archive:0,editionSha256:'a'.repeat(64),indexSha256:'b'.repeat(64)},
          content:{state:'DRAFT_ONLY',drafts:7,sourceSha256:'c'.repeat(64),bundleSha256:'d'.repeat(64)},
          langgraph:{state:'SOURCE_ONLY_RUNTIME_NOT_PROVEN',sourceSha256:'e'.repeat(64)}};
      }else if(path==='/api/profile/growth-intelligence/evidence-history'&&mode==='owner'){
        status=503;data={status:'BLOCKED',reason:'ARCHIVE_ACTIVATION_OR_RECOVERY_NOT_VERIFIED'};
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
    widths:[320,390,1440],nativeTouchRoute:'/profile/dashboard',
    standaloneProviderRouteNativeTouch:'NOT_PROVEN',
    checks,failures,status:failures.length?'FAIL':'PASS'};
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
