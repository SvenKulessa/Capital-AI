// Optional browser QA; dependencies stay outside the production dependency tree.
const {default:Chromium}=await import(process.env.CHROMIUM_HELPER_MODULE_PATH || '@sparticuz/chromium');
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE_PATH || 'playwright-core');
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFile,mkdir,mkdtemp} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {tmpdir} from 'node:os';
const root=resolve(process.env.QA_REPO_ROOT || process.cwd());
const output=process.env.QA_OUTPUT_DIR || await mkdtemp(join(tmpdir(),'capital-ai-learning-qa-'));
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4173'],{cwd:root,stdio:'ignore'});
for(let attempt=0;attempt<50;attempt++){try{if((await fetch('http://127.0.0.1:4173/')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH || await Chromium.executablePath(),headless:true,args:Chromium.args.filter(arg=>arg!=='--single-process')});
const result={browser:browser.version(),scope:'Local built frontend, synthetic API fixtures; server authorization covered separately',viewports:[],cases:[]};
const stores=new Map([['alice',new Set()],['bob',new Set()]]);
async function fixture(page,user='alice',options={}) {
 page.setDefaultTimeout(8000);page.on('pageerror',e=>console.log('PAGE_ERROR',e.message));
 await page.route('**/api/**',async route=>{
  const req=route.request(),url=new URL(req.url());
  if(url.pathname==='/api/learning/favorites') {
   if(options.anonymous)return route.fulfill({status:401,json:{error:'unauthorized'}});
   if(options.failed)return route.fulfill({status:503,json:{error:'unavailable'}});
   const ids=stores.get(user),id=url.searchParams.get('id');
   if(req.method()==='POST')ids.add(id);
   if(req.method()==='DELETE')ids.delete(id);
   return route.fulfill({json:{favorites:[...ids]}});
  }
  if(url.pathname==='/api/profile/notes')return route.fulfill({json:{notes:'QA fixture'}});
  if(url.pathname.includes('/access'))return route.fulfill({json:{entitled:false,quantProEntitled:false,atlasEntitled:false,quizUsed:false}});
  if(url.pathname.endsWith('/preview')||url.pathname.endsWith('/quant-pro'))return route.fulfill({json:{terms:[]}});
  return route.fulfill({json:{configured:true,authenticated:!options.anonymous,user:options.anonymous?null:{id:user,name:'QA fixture',email:'qa@example.invalid'},account:{available:true,iamRole:'user',subscription:{tier:'Free',status:null},badges:[]}}});
 });
}
async function drag(page,locator,dx) {
 await locator.scrollIntoViewIfNeeded();const box=await locator.boundingBox();
 const x=box.x+box.width/2,y=box.y+Math.min(100,box.height/2);

 await page.mouse.move(x,y);await page.mouse.down();await page.mouse.move(x+dx,y+2,{steps:8});await page.mouse.up();
}
try {
const mediaPage=await browser.newPage();await fixture(mediaPage);await mediaPage.goto('http://127.0.0.1:4173/learning',{waitUntil:'domcontentloaded'});
const playback=await mediaPage.evaluate(async()=>{const video=document.createElement('video');video.muted=true;video.src='/learning/videos/capital-ai-tour-short-1080x1920.mp4';document.body.append(video);await video.play();await new Promise(resolve=>setTimeout(resolve,400));return {duration:video.duration,time:video.currentTime,frames:video.getVideoPlaybackQuality().totalVideoFrames,error:video.error?.code??null};});
assert.equal(playback.duration,20);assert.ok(playback.time>0);assert.ok(playback.frames>0);assert.equal(playback.error,null);result.cases.push({h264VideoPlayback:'PASS',decodedFrames:playback.frames,duration:playback.duration});await mediaPage.close();
for(const width of [320,390,768,1440]){
 const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});await fixture(page);
 await page.goto('http://127.0.0.1:4173/learning?tab=flashcards',{waitUntil:'networkidle'});

 if(await page.getByRole('button',{name:'Nur notwendige',exact:true}).isVisible())await page.getByRole('button',{name:'Nur notwendige',exact:true}).click();
 const deck=page.locator('[data-design-profile="CAPITAL_AI_VOCABULARY_FLASHCARD@3"]');await deck.waitFor();
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 const first=await deck.locator('h3').innerText();await drag(page,deck.locator('.touch-pan-y'),-85);

 await deck.getByRole('status').filter({hasText:'wurde im privaten Lernfeld gespeichert'}).waitFor();
 assert.equal(stores.get('alice').size,1);
 assert.notEqual(await deck.locator('h3').innerText(),first);
 const before=[...stores.get('alice')];const next=await deck.locator('h3').innerText();await drag(page,deck.locator('.touch-pan-y'),85);
 assert.notEqual(await deck.locator('h3').innerText(),next);assert.deepEqual([...stores.get('alice')],before);
 const strip=page.getByRole('navigation',{name:'Learning Hub Unterseiten'});
 const horizontal=await strip.evaluate(e=>({width:e.clientWidth,total:e.scrollWidth,wrap:getComputedStyle(e).flexWrap}));assert.equal(horizontal.wrap,'nowrap');
 if(width<768){assert.ok(horizontal.total>horizontal.width);await strip.evaluate(e=>e.scrollLeft=e.scrollWidth);assert.ok(await strip.evaluate(e=>e.scrollLeft>0));}
 await strip.getByRole('link',{name:'Kontakt',exact:true}).focus();assert.ok(await strip.getByRole('link',{name:'Kontakt',exact:true}).evaluate(e=>e===document.activeElement));
 if(width===390){await deck.scrollIntoViewIfNeeded();await page.screenshot({path:join(output,'learning-cards-390.png')});}
 await page.goto('http://127.0.0.1:4173/profile/dashboard',{waitUntil:'networkidle'});
 await page.getByRole('tab',{name:'Lernfeld',exact:true}).waitFor();await page.getByRole('button',{name:`${first}: aus dem Lernfeld entfernen`,exact:true}).waitFor();
 await page.reload({waitUntil:'networkidle'});await page.getByRole('button',{name:`${first}: aus dem Lernfeld entfernen`,exact:true}).click();
 await page.getByRole('status').filter({hasText:'Dein Lernfeld ist leer'}).waitFor();assert.equal(stores.get('alice').size,0);
 await page.getByRole('tab',{name:'Lernfeld',exact:true}).focus();await page.keyboard.press('ArrowRight');assert.equal(await page.getByRole('tab',{name:'Notizen',exact:true}).getAttribute('aria-selected'),'true');
 result.viewports.push({width,mouseLeft:'PASS',mouseRight:'PASS',dashboardReloadAndRemove:'PASS',horizontalTabs:'PASS',overflow:'PASS',keyboard:'PASS'});
 await page.close();
}
const touchPage=await browser.newPage({viewport:{width:390,height:900},isMobile:true,hasTouch:true,reducedMotion:'reduce'});await fixture(touchPage);
await touchPage.goto('http://127.0.0.1:4173/learning?tab=flashcards',{waitUntil:'networkidle'});
if(await touchPage.getByRole('button',{name:'Nur notwendige',exact:true}).isVisible())await touchPage.getByRole('button',{name:'Nur notwendige',exact:true}).click();
const touchDeck=touchPage.locator('[data-design-profile="CAPITAL_AI_VOCABULARY_FLASHCARD@3"]');
const cdp=await touchPage.context().newCDPSession(touchPage);
async function touchSwipe(locator,dx){await locator.scrollIntoViewIfNeeded();const b=await locator.boundingBox();const x=b.x+b.width/2,y=b.y+Math.min(100,b.height/2);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});for(let i=1;i<=8;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+dx*i/8,y}]});}await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});}
const firstTouch=await touchDeck.locator('h3').innerText();await touchSwipe(touchDeck.locator('.touch-pan-y'),-85);await touchDeck.getByRole('status').filter({hasText:'wurde im privaten Lernfeld gespeichert'}).waitFor();assert.notEqual(await touchDeck.locator('h3').innerText(),firstTouch);const touchStored=[...stores.get('alice')];const secondTouch=await touchDeck.locator('h3').innerText();await touchSwipe(touchDeck.locator('.touch-pan-y'),85);assert.notEqual(await touchDeck.locator('h3').innerText(),secondTouch);assert.deepEqual([...stores.get('alice')],touchStored);
const touchStrip=touchPage.getByRole('navigation',{name:'Learning Hub Unterseiten'});await touchStrip.evaluate(e=>e.scrollLeft=0);await touchSwipe(touchStrip,-120);assert.ok(await touchStrip.evaluate(e=>e.scrollLeft>0));result.cases.push({touchLeft:'PASS',touchRight:'PASS',touchTabScroll:'PASS'});await touchPage.close();stores.get('alice').clear();
const zoomPage=await browser.newPage({viewport:{width:320,height:900},reducedMotion:'reduce'});await fixture(zoomPage);await zoomPage.goto('http://127.0.0.1:4173/learning?tab=flashcards',{waitUntil:'networkidle'});await zoomPage.evaluate(()=>document.documentElement.style.fontSize='200%');assert.ok(await zoomPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));result.cases.push({fontZoom200percent320:'PASS'});await zoomPage.close();
const glossaryPage=await browser.newPage({viewport:{width:390,height:900},reducedMotion:'reduce'});await fixture(glossaryPage,'alice',{anonymous:true});
await glossaryPage.goto('http://127.0.0.1:4173/vocabulary/vwap',{waitUntil:'networkidle'});
await glossaryPage.getByRole('heading',{name:'VWAP',exact:true}).waitFor();
if(await glossaryPage.getByRole('button',{name:'Nur notwendige',exact:true}).isVisible())await glossaryPage.getByRole('button',{name:'Nur notwendige',exact:true}).click();
await glossaryPage.goto('http://127.0.0.1:4173/vocabulary/brier-score',{waitUntil:'networkidle'});await glossaryPage.getByRole('heading',{name:'Brier Score',exact:true}).waitFor();await glossaryPage.getByRole('link',{name:'scikit-learn: brier_score_loss',exact:true}).waitFor();assert.equal(await glossaryPage.locator('#quant-demo-title').count(),1);
await glossaryPage.getByRole('heading',{name:'Brier Score',exact:true}).scrollIntoViewIfNeeded();await glossaryPage.evaluate(()=>window.scrollBy(0,-100));
await glossaryPage.screenshot({path:join(output,'public-brier-score-390.png')});
await glossaryPage.goto('http://127.0.0.1:4173/vocabulary',{waitUntil:'networkidle'});
await glossaryPage.getByPlaceholder(/Begriff, Abkürzung oder Thesaurus/).fill('Realzins');await glossaryPage.getByRole('heading',{name:'Realzins',exact:true}).waitFor();result.cases.push({anonymousFormerQuantDeepLink:'PASS',anonymousResearchedDeepLink:'PASS',primarySourceLink:'PASS',publicGlossarySearch:'PASS',singleQuantDemo:'PASS'});await glossaryPage.close();
for(const [options,label] of [[{anonymous:true},'anonymous'],[{failed:true},'storage unavailable']]){
 const page=await browser.newPage({viewport:{width:390,height:900}});await fixture(page,'alice',options);await page.goto('http://127.0.0.1:4173/learning?tab=flashcards',{waitUntil:'networkidle'});
 if(await page.getByRole('button',{name:'Nur notwendige',exact:true}).isVisible())await page.getByRole('button',{name:'Nur notwendige',exact:true}).click();
 const deck=page.locator('[data-design-profile="CAPITAL_AI_VOCABULARY_FLASHCARD@3"]');const before=await deck.locator('h3').innerText();await deck.getByRole('button',{name:'← Weiß ich nicht',exact:true}).click();await deck.getByRole('alert').waitFor();assert.equal(await deck.locator('h3').innerText(),before);result.cases.push({label,errorAndRetainedCard:'PASS'});await page.close();
}
const page=await browser.newPage({viewport:{width:390,height:900}});await fixture(page,'bob');await page.goto('http://127.0.0.1:4173/profile/dashboard',{waitUntil:'networkidle'});await page.getByRole('status').filter({hasText:'Dein Lernfeld ist leer'}).waitFor();result.cases.push({userIsolationFixture:'PASS'});await page.close();
} finally {await browser.close();server.kill();}
await writeFile(join(output,'learning-browser-evidence.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
