/** Isolated Chromium QA for Analytics Hub News; never approves or publishes news. */
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {mkdtemp,mkdir,readFile,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const origin=process.argv[2]||'http://127.0.0.1:17871';
const url=new URL(origin);
assert.equal(url.hostname,'127.0.0.1');
assert.equal(url.protocol,'http:');
const output='artifacts/news-archive-browser';
await mkdir(output,{recursive:true});
const profile=await mkdtemp(join(tmpdir(),'news-archive-chrome-'));
const chrome=spawn(process.env.CAPITAL_AI_CHROME_BIN||'chromium',[
  '--headless=new','--no-sandbox','--disable-dev-shm-usage','--no-first-run',
  '--disable-extensions','--remote-debugging-port=0','--user-data-dir='+profile,'about:blank'],{stdio:'ignore'});
chrome.on('error',()=>{});
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let socket,sequence=0;
const pending=new Map(),errors=[];
const report={version:'CAPITAL_AI_NEWS_ARCHIVE_BROWSER@1',sha:process.env.GITHUB_SHA??null,
  scope:'Isolated loopback Chromium, not live deployment',checks:[],status:'NOT_PROVEN'};
function send(method,params={}){
  return new Promise((resolve,reject)=>{
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(Error('CDP_TIMEOUT_'+method));},15000);
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params}));
  });
}
async function evaluate(expression){
  const result=await send('Runtime.evaluate',{expression,returnByValue:true,awaitPromise:true});
  if(result.exceptionDetails)throw Error('EVALUATION_FAILED: '+result.exceptionDetails.text);
  return result.result?.value;
}
async function until(expression,label){
  for(let i=0;i<160;i++){try{if(await evaluate(expression))return;}catch{}await wait(100);}
  throw Error('TIMEOUT_'+label);
}
async function navigate(path,id){
  await send('Page.navigate',{url:origin+path});
  await until("document.readyState==='complete'&&!!document.getElementById("+JSON.stringify(id)+")",path);
  assert.equal(await evaluate('location.origin'),origin);
}
async function inspect(id,width,label){
  const metrics=await evaluate("(() => { const root=document.getElementById("+JSON.stringify(id)+").closest('section');"+
    "const visible=e=>e.getClientRects().length>0&&getComputedStyle(e).visibility!=='hidden';"+
    "return {heading:document.getElementById("+JSON.stringify(id)+").textContent.trim(),actualWidth:innerWidth,"+
    "overflow:document.documentElement.scrollWidth-document.documentElement.clientWidth,"+
    "cards:root.querySelectorAll('article').length,"+
    "unlabeled:[...root.querySelectorAll('input')].filter(visible).filter(e=>!e.labels?.length&&!e.getAttribute('aria-label')).length,"+
    "short:[...root.querySelectorAll('a,input,summary')].filter(visible).filter(e=>e.getBoundingClientRect().height<40).length,"+
    "text:root.textContent.slice(0,2000)};})()");
  assert.equal(metrics.actualWidth,width,'Viewport mismatch: '+label);
  assert.ok(metrics.overflow<=2,label+' horizontal overflow: '+metrics.overflow);
  assert.equal(metrics.unlabeled,0,label+' unlabeled fields');
  assert.equal(metrics.short,0,label+' undersized targets');
  await evaluate("document.getElementById("+JSON.stringify(id)+").scrollIntoView({block:'start',behavior:'instant'})");
  await wait(150);
  const shot=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:false});
  await writeFile(join(output,label+'-'+width+'.png'),Buffer.from(shot.data,'base64'));
  return metrics;
}
try{
  let port;
  for(let i=0;i<300;i++){
    try{port=Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]);if(port)break;}catch{}
    if(chrome.exitCode!==null||chrome.signalCode!==null)throw Error('CHROMIUM_EXITED');
    await wait(100);
  }
  if(!port)throw Error('CHROMIUM_NOT_READY');
  const targets=await(await fetch('http://127.0.0.1:'+port+'/json/list')).json();
  socket=new WebSocket(targets.find(t=>t.type==='page').webSocketDebuggerUrl);
  await new Promise((resolve,reject)=>{socket.onopen=resolve;socket.onerror=reject;});
  socket.onmessage=event=>{
    const message=JSON.parse(event.data),task=pending.get(message.id);
    if(task){pending.delete(message.id);clearTimeout(task.timer);
      message.error?task.reject(Error(message.error.message)):task.resolve(message.result);}
    if(message.method==='Runtime.exceptionThrown')errors.push(message.params.exceptionDetails.text);
  };
  await send('Page.enable');await send('Runtime.enable');await send('Accessibility.enable');
  for(const width of [320,390,1440]){
    await send('Emulation.setDeviceMetricsOverride',{width,height:width===320?800:width===390?844:900,
      deviceScaleFactor:1,mobile:width<768});
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    await navigate('/marketscreener/uebersicht','analytics-news-overview');
    const overview=await inspect('analytics-news-overview',width,'overview');
    assert.equal(overview.heading,'Frühere Marktnews');
    assert.ok(overview.cards<=3,'Overview news capacity exceeded');
    assert.equal(await evaluate("document.querySelector('#analytics-news-overview').closest('section').querySelector('a[href*=news-archiv]')?.getAttribute('href')"),'/marketscreener/news-archiv');
    assert.equal(await evaluate("(() => {const a=document.querySelector('.hub-navigation a[data-page=newsArchive]');a?.focus();return !!a&&document.activeElement===a&&a.textContent.includes('News-Archiv');})()"),true,'Hub navigation not keyboard focusable');
    await navigate('/marketscreener/news-archiv','analytics-news-archive');
    const archive=await inspect('analytics-news-archive',width,'archive');
    assert.equal(archive.heading,'News-Archiv');
    assert.ok(archive.text.includes('Keine freigegebenen Nachrichten'),'Unreviewed news publicly visible');
    const fields=await evaluate("(() => {const r=document.getElementById('analytics-news-archive').closest('section');"+
      "const all=[...r.querySelectorAll('input')];const search=all.find(e=>e.type==='text');search?.focus();"+
      "return {count:all.length,focus:document.activeElement===search,date:all.some(e=>e.type==='date'),"+
      "csv:!!r.querySelector('a[download]')};})()");
    assert.equal(fields.count,2,'Archive filters missing');
    assert.ok(fields.focus&&fields.date&&fields.csv,'Archive filters or BI export inaccessible');
    const ax=await send('Accessibility.getFullAXTree');
    assert.ok(ax.nodes.some(n=>n.role?.value==='heading'&&n.name?.value==='News-Archiv'),'Accessible heading missing');
    report.checks.push({width,overviewCards:overview.cards,overviewOverflow:overview.overflow,
      archiveOverflow:archive.overflow,keyboard:'PASS',date:'PASS',csv:'PASS',rights:'PASS'});
  }
  assert.deepEqual(errors,[],'Uncaught browser exceptions');
  report.status='TARGETED_PASS';
}catch(error){report.status='FAILED';report.error=String(error?.stack||error);process.exitCode=1;}
finally{
  await writeFile(join(output,'result.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report,null,2));
  try{socket?.close();}catch{}
  if(chrome.exitCode===null&&chrome.signalCode===null)chrome.kill('SIGTERM');
  await rm(profile,{recursive:true,force:true,maxRetries:10,retryDelay:150});
}
