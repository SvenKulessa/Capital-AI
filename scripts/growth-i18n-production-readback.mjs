// Read-only production smoke. Mobile viewport is emulated Chromium, not physical iOS/Android.
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const origin = new URL(process.env.CAPITAL_I18N_ORIGIN || 'https://capital-ai-uvsl.onrender.com').origin;
const languages = {de:'Marktdaten',en:'Understand',it:'Comprendere',fr:'Comprendre',pt:'Compreenda',es:'Comprende'};
async function get(path, extra={}) {
  const response = await fetch(origin + path, {redirect:'manual',signal:AbortSignal.timeout(20000),
    headers:{'User-Agent':'CAPITAL-AI-I18N-readback/1.0',...extra}});
  assert.equal(response.status,200,`${path}: expected 200, got ${response.status}`);
  return {headers:response.headers,html:await response.text()};
}
async function httpTests(){
  const health=await get('/healthz');
  assert.ok(JSON.parse(health.html).buildIdentity,'missing build identity in health response');
  console.log('HEALTH_RESPONSE_OK');
  for(const code of Object.keys(languages)){
    // A conflicting persisted locale may never override an explicit shareable URL.
    const {headers,html}=await get('/'+code+'/',{Cookie:'capital_ai_locale=es'});
    assert.equal(headers.get('content-language'),code);
    assert.equal(headers.get('x-robots-tag'),'noindex, nofollow');
    assert.ok(html.includes(`<html lang="${code}" data-locale-source="path"`));
    assert.match(html,/<meta name="robots" content="noindex, nofollow"/);
    assert.doesNotMatch(html,/<link rel="canonical"/);
    assert.doesNotMatch(html,/rel="alternate"[^>]+hreflang=/);
    console.log('LANGUAGE_HTTP_PASS',code);
  }
  const {headers,html}=await get('/',{Cookie:'capital_ai_locale=fr','Accept-Language':'de-DE'});
  assert.equal(headers.get('content-language'),'fr');
  assert.ok(html.includes('data-locale-source="manual"'));
  for (const value of ['CF-IPCountry','Accept-Language','Cookie']) assert.ok((headers.get('vary')||'').includes(value));
  console.log('MANUAL_COOKIE_PRECEDENCE_PASS');
  console.log('TRUSTED_EDGE_GEO_IP_NOT_PROVEN');
}
function chrome(url,viewport){
  assert.ok(process.env.CHROME_BIN,'Chrome/Chromium executable was not provided');
  const dir=mkdtempSync(join(tmpdir(),'capital-ai-i18n-'));
  try{
    const flags=['--headless=new','--disable-gpu','--disable-dev-shm-usage','--no-first-run',
      '--disable-extensions','--disable-background-networking',`--user-data-dir=${dir}`,
      `--window-size=${viewport.width},${viewport.height}`,'--virtual-time-budget=16000','--dump-dom'];
    if(viewport.mobile)flags.push('--user-agent=Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131 Mobile Safari/537.36');
    const result=spawnSync(process.env.CHROME_BIN,[...flags,url],{encoding:'utf8',timeout:65000,maxBuffer:8*1024*1024});
    if(result.error)throw result.error;
    assert.equal(result.status,0,(result.stderr||'').slice(-600));
    return result.stdout;
  }finally{rmSync(dir,{recursive:true,force:true});}
}
function browserTests(){
  for(const [lang,word] of Object.entries(languages)){
    for(const viewport of [{width:1440,height:900,mobile:false},{width:390,height:844,mobile:true}]){
      const html=chrome(origin+'/'+lang+'/',viewport);
      assert.match(html,new RegExp(`<html[^>]+lang="${lang}"`));
      assert.ok(html.includes('id="header-language-switcher"'),lang+' language selector absent');
      assert.ok(html.includes(word),lang+' translated hero absent, hydration may have failed');
      assert.ok(!html.includes('Die Anwendung konnte nicht gestartet werden.'),lang+' bootstrap error');
      console.log('BROWSER_DOM_PASS',lang,viewport.mobile?'mobile-emulated':'desktop');
    }
  }
  for(const route of ['/login','/login?mode=forgot','/login?mode=reset']){
    const html=chrome(origin+route,{width:390,height:844,mobile:true});
    assert.ok(html.includes('id="header-language-switcher"'),route+' login language selector absent');
    console.log('AUTH_LANGUAGE_SWITCHER_PASS',route);
  }
  console.log('NATIVE_SAFARI_IOS_AND_INTERACTIVE_BROWSER_ACTIONS_NOT_PROVEN');
}
try{if(process.argv.includes('--browser'))browserTests();else await httpTests();}
catch(error){console.error('I18N_READBACK_FAILED',error instanceof Error?error.message:String(error));process.exitCode=1;}
