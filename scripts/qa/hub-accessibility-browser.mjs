// Optional local browser audit. External test dependencies do not enter production packages.
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
const {default:Chromium} = await import(process.env.CHROMIUM_HELPER_MODULE_PATH);
const {chromium} = await import(process.env.PLAYWRIGHT_MODULE_PATH);
const root=process.cwd(),output=resolve(process.env.QA_OUTPUT_DIR);
await mkdir(output,{recursive:true});
const server=spawn(process.execPath,[join(root,'node_modules/vite/bin/vite.js'),'preview','--host','127.0.0.1','--port','4175'],{stdio:'ignore'});
for(let i=0;i<60;i++){try{if((await fetch('http://127.0.0.1:4175')).ok)break;}catch{}await new Promise(resolve=>setTimeout(resolve,100));}
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE_PATH,headless:true,args:Chromium.args.filter(arg=>arg!=='--single-process')});
const report={browser:browser.version(),axeVersion:'4.10.3',scope:'Built app, local mocked session and archive APIs; not a screen-reader or live-account certification',pages:[],cases:[]};
async function fixture(page,role='owner',tier='Free',available=true) {
  page.setDefaultTimeout(10000);
  await page.route('**/api/**',async route=>{
    const path=new URL(route.request().url()).pathname;
    if(path.endsWith('/access'))return route.fulfill({json:{entitled:false,quantProEntitled:false,atlasEntitled:false}});
    if(path==='/api/analytics/owner-archive-demo')return route.fulfill({json:{mode:'owner-archive',assets:['BTC','ETH','SOL'].map(symbol=>({symbol,name:symbol,index:[100,99,98,99,100,101,100,102]}))}});
    if(path==='/api/auth/session')return route.fulfill({json:{configured:true,authenticated:true,user:{id:'qa-user',name:role==='owner'?'QA Owner':'QA Pro',email:'qa@example.invalid'},account:{available,iamRole:role,subscription:{tier,status:'active'},badges:[]}}});
    if(path==='/api/learning/favorites')return route.fulfill({json:{favorites:[]}});
    return route.fulfill({json:{values:[],assets:[],terms:[]}});
  });
}
try {
 for(const width of [320,390,768,1440]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});await fixture(page);
  for(const route of ['/marketscreener','/learning?tab=flashcards','/dokumentation','/profile','/profile/rights','/login','/legal']) {
   await page.goto(`http://127.0.0.1:4175${route}`,{waitUntil:'networkidle'});
   const cookie=page.getByRole('button',{name:'Nur notwendige',exact:true});if(await cookie.isVisible())await cookie.click();
   await page.addScriptTag({path:process.env.AXE_MODULE_PATH});
   const audit=await page.evaluate(async()=>{const result=await window.axe.run(document,{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21aa','wcag22aa']}});return {violations:result.violations.map(issue=>({id:issue.id,impact:issue.impact,description:issue.description,nodes:issue.nodes.map(node=>({target:node.target,summary:node.failureSummary}))})),incomplete:result.incomplete.map(issue=>({id:issue.id,count:issue.nodes.length}))};});
   const noOverflow=await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth);
   report.pages.push({width,route,noOverflow,...audit});
   if(width===390&&route==='/marketscreener')await page.screenshot({path:join(output,'analytics-hub-390.png'),fullPage:true});
   if(width===1440&&route==='/marketscreener')await page.screenshot({path:join(output,'analytics-hub-1440.png'),fullPage:true});
   if(width===390&&route==='/profile')await page.screenshot({path:join(output,'owner-profile-390.png'),fullPage:true});
   if(route==='/profile')assert.ok((await page.locator('body').innerText()).includes('Owner'));
  }
  await page.goto('http://127.0.0.1:4175/marketscreener',{waitUntil:'networkidle'});
  await page.getByLabel('Asset suchen').fill('ETH');assert.equal(await page.locator('.historical-demo article').count(),1);
  await page.getByLabel('Asset suchen').fill('');await page.getByLabel('Sortierung').selectOption('change');
  assert.equal(await page.locator('.historical-demo article h2').first().innerText(),'Solana');
  await page.getByRole('button',{name:'Historisches Archiv ansehen',exact:true}).click();await page.getByText('Privater Archiv-Auszug',{exact:true}).waitFor();
  await page.getByRole('button',{name:'Öffentliche Demo',exact:true}).click();
  const strip=page.getByRole('navigation',{name:'Analytics Hub Unterseiten'});await strip.getByRole('link',{name:'Kontakt',exact:true}).focus();assert.ok(await strip.getByRole('link',{name:'Kontakt',exact:true}).evaluate(e=>e===document.activeElement));
  if(width<=768){await strip.evaluate(e=>e.scrollLeft=0);await page.getByRole('button',{name:'Unterseiten nach rechts scrollen'}).click();await page.waitForTimeout(100);assert.ok(await strip.evaluate(e=>e.scrollLeft>0));}
  report.cases.push({width,search:'PASS',sort:'PASS',ownerArchiveAndReset:'PASS',keyboardLastTab:'PASS',scrollButton:'PASS'});
  if(width===320){await page.evaluate(()=>document.documentElement.style.fontSize='200%');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));report.cases.push({fontZoom200percent320:'PASS'});}
  await page.close();
 }
 for(const scenario of [{role:'user',tier:'Pro',available:true,label:'Pro'},{role:'owner',tier:'Free',available:false,label:'Kontostatus offen'}]) {
  const page=await browser.newPage({viewport:{width:1440,height:900}});await fixture(page,scenario.role,scenario.tier,scenario.available);await page.goto('http://127.0.0.1:4175/profile',{waitUntil:'networkidle'});
  assert.ok((await page.locator('body').innerText()).includes(scenario.label));
  if(!scenario.available)assert.equal(await page.getByRole('button',{name:'Control Center',exact:true}).count(),0);
  report.cases.push({account:scenario.label,display:'PASS'});await page.close();
 }
 await writeFile(join(output,'accessibility-audit.json'),JSON.stringify(report,null,2));
 const issues=report.pages.flatMap(page=>page.violations.map(v=>({width:page.width,route:page.route,...v})));
 assert.equal(issues.length,0,'Accessibility violations remain; see audit JSON');
 assert.equal(report.pages.filter(page=>!page.noOverflow).length,0,'Page overflow remains');
 console.log(JSON.stringify({pages:report.pages.length,cases:report.cases,overflowFailures:report.pages.filter(page=>!page.noOverflow).map(page=>({width:page.width,route:page.route})),violations:issues},null,2));
} finally {await browser.close();server.kill();}
