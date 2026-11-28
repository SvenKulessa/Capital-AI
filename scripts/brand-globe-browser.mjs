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
// Use real pointer coordinates. HTMLElement.click() emits (0,0), which can
// falsely trigger JaJa's repeated-click assistance when consent and drawer
// controls are activated in the same short interval.
async function clickVisible(selector) {
  let point, previous, stableSamples = 0;
  await until(async () => {
    point = await evaluate(`(() => {
      const target = document.querySelector(${JSON.stringify(selector)});
      if (!target) return null;
      const rect = target.getBoundingClientRect();
      const x = rect.x + rect.width / 2, y = rect.y + rect.height / 2;
      return target.contains(document.elementFromPoint(x, y)) ? {x,y} : null;
    })()`);
    // Wait for the target to finish its spring transition, not merely become
    // visible at one moving coordinate. Preserve a real hit-tested pointer click.
    stableSamples = point && previous && Math.abs(point.x - previous.x) <= 0.5 &&
      Math.abs(point.y - previous.y) <= 0.5 ? stableSamples + 1 : 0;
    previous = point;
    return stableSamples >= 3;
  }, 'VISIBLE_STABLE_CLICK_' + selector);
  await send('Input.dispatchMouseEvent', {type:'mousePressed', ...point, button:'left', clickCount:1});
  await send('Input.dispatchMouseEvent', {type:'mouseReleased', ...point, button:'left', clickCount:1});
}
async function navigate() {
  loaded = false;
  await send('Page.navigate', { url: origin + '/' });
  await until(() => loaded, 'PAGE_LOAD');
  await until(() => evaluate("document.readyState === 'complete' && !!document.querySelector('.capital-ai-hero .brand-globe-art')"), 'HERO');
  assert.equal(await evaluate('location.origin'), origin);
  await until(() => evaluate(`(() => {
    const panel = document.querySelector('[aria-labelledby="cookie-consent-v3-title"]');
    if (panel) {
      panel.querySelector('[data-consent-choice="necessary"]')?.click();
      return false;
    }
    const choice = JSON.parse(localStorage.getItem('capital-ai-cookie-consent-v3') || 'null');
    return choice?.analytics === false && choice?.marketing === false;
  })()`), 'CONSENT_PANEL_CLOSED');
  await evaluate("window.scrollTo({ top: 0, behavior: 'instant' })");
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
  await send('Network.enable');
  await send('Network.setExtraHTTPHeaders', { headers: { 'Accept-Language': 'de-DE' } });
  // Validate actual HTTP bytes, not merely the source-tree inventory or a successful status.
  for (const [name, expected] of Object.entries({
    'owner-nebula-v4.webp': 'e9b0935ecae9e5c5b663e10f57e77ab7a3a9a8d76a7820bf9a8073f6549e199e',
    'analytics-overview-v4.webp': '587808fe3a7660e22cdb9f95eb599ef00e0694bc3bfa56d9d27d1130a4ffa435',
    'capital-ai-mark-v4.webp': '61bc0831b4868544b3982787dde4f1911583e27c993a89e8b46c514e07ea0993',
    'analytics-universe-orbit.webp': 'e691753fd5ffd8db1a9b0ad878c56f091409a55a8fcd8c06ecbe9ebef0b69c65',
  })) {
    const response = await fetch(origin + '/branding/universe/' + name);
    assert.equal(response.status, 200, name);
    assert.match(response.headers.get('content-type') || '', /^image\/webp(?:;|$)/i);
    assert.equal(createHash('sha256').update(Buffer.from(await response.arrayBuffer())).digest('hex'), expected, name);
    report.checks.push({asset:name,sha256:expected,http:200});
  }
  for (const viewport of [{ width: 320, height: 800, mobile: true }, { width: 390, height: 844, mobile: true }, { width: 768, height: 1024, mobile: true }, { width: 1440, height: 1000, mobile: false }]) {
    await send('Emulation.setDeviceMetricsOverride', { ...viewport, deviceScaleFactor: 1 });
    await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
    await navigate();
    assert.ok((await evaluate("getComputedStyle(document.querySelector('.universe-space'),'::before').backgroundImage")).includes('/branding/universe/owner-nebula-v4.webp'), 'Home uses the global v4 background');
    await until(() => evaluate("document.querySelector('.brand-globe-poster').complete && document.querySelector('.brand-globe-poster').naturalWidth === 1254"), 'POSTER');
    assert.equal(await evaluate("document.querySelector('.brand-globe-art').dataset.globeState"), 'poster');
    assert.equal(await evaluate("!!document.querySelector('.hero-globe-pause')"), false);
    await clickVisible('#mobile-menu-btn');
    await until(() => evaluate("!!document.querySelector('#capital-ai-mobile-navigation nav')"), 'HUB_DRAWER_OPEN');
    const hubLinks = await evaluate(`(() => {
      const drawer = document.getElementById('capital-ai-mobile-navigation');
      return ['/learning', '/marketscreener'].map(path => {
        const link = drawer.querySelector('nav a[href="' + path + '"]');
        const style = getComputedStyle(link);
        return {label:link.textContent.trim(),border:style.borderTopColor,style:style.borderTopStyle,height:link.getBoundingClientRect().height};
      });
    })()`);
    assert.deepEqual(hubLinks.map(({label,border,style})=>({label,border,style})), [
      {label:'Learning Hub',border:'rgb(249, 191, 33)',style:'solid'},
      {label:'Analytics Hub',border:'rgb(183, 148, 244)',style:'solid'},
    ]);
    assert.ok(hubLinks.every(link=>link.height>=44), 'Hub touch target below 44px');
    await clickVisible('#close-menu-btn');
    try {
      await until(() => evaluate(`document.getElementById('mobile-menu-btn')?.getAttribute('aria-expanded') === 'false' &&
        !document.getElementById('capital-ai-mobile-navigation') &&
        !document.querySelector('[class*="z-[100]"][class*="backdrop-blur-sm"]')`), 'HUB_DRAWER_AND_BACKDROP_CLOSED');
    } catch (error) {
      report.checks.push({viewport, drawerCloseDiagnostic: await evaluate(`(() => ({
        expanded: document.getElementById('mobile-menu-btn')?.getAttribute('aria-expanded'),
        drawer: !!document.getElementById('capital-ai-mobile-navigation'),
        backdrops: [...document.querySelectorAll('[class*="z-[100]"][class*="backdrop-blur-sm"]')].map(e => ({className:e.className,opacity:getComputedStyle(e).opacity})),
        bodyOverflow: document.body.style.overflow
      }))()`)});
      throw error;
    }
    report.checks.push({viewport,canonicalHubOutlines:'PASS'});
    assert.ok(await evaluate("document.documentElement.scrollWidth <= innerWidth + 2"), 'Page horizontal overflow');
    assert.ok(await evaluate("[...document.querySelectorAll('.hero-copy a')].every(b=>b.getBoundingClientRect().height>=44)"), 'Small hero touch target');
    assert.equal(await evaluate("document.querySelectorAll('h1').length"), 1, 'Homepage must have one H1');
    assert.equal(await evaluate("document.querySelectorAll('#public-entry-title + div article').length"), 3, 'Expected three public intent cards');
    const learningCta = await evaluate(`(() => {
      const action = document.getElementById('hero-open-learning-link');
      const bounds = action.getBoundingClientRect();
      const hit = document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      return { href: action.getAttribute('href'), top: bounds.top, bottom: bounds.bottom,
        height: bounds.height, clickable: action.contains(hit), obstruction: hit ? {tag:hit.tagName,id:hit.id,classes:hit.getAttribute('class'),buddy:!!hit.closest('[data-hero-buddy]'),drawer:!!hit.closest('#capital-ai-mobile-navigation')} : null,
        primary: getComputedStyle(action).backgroundColor !== getComputedStyle(document.getElementById('hero-start-analysis-btn')).backgroundColor };
    })()`);
    report.checks.push({ viewport, learningCta });
    assert.equal(learningCta.href, '/learning');
    assert.equal(learningCta.primary, true, 'Learning Hub must be the emphasized action');
    assert.ok(learningCta.top >= 0 && learningCta.bottom <= viewport.height, 'Learning CTA below the initial viewport');
    assert.ok(learningCta.height >= 44 && learningCta.clickable, 'Learning CTA target is too small or obstructed');
    assert.equal(await evaluate(`[...document.querySelectorAll('.hero-copy a')].some(a => a.getAttribute('href') === '/marketscreener/scorer')`), true, 'Methodology link missing');
    await evaluate("document.querySelector('.capital-ai-hero').scrollIntoView()");
    const layout = await evaluate(`(() => {
      const logo=document.querySelector('.hero-brand-logo'), copy=document.querySelector('.hero-copy'), globe=document.querySelector('.hero-globe-background');
      const r=logo.getBoundingClientRect(), style=getComputedStyle(logo);
      const borderX=parseFloat(style.borderLeftWidth)+parseFloat(style.borderRightWidth);
      const borderY=parseFloat(style.borderTopWidth)+parseFloat(style.borderBottomWidth);
      const copyRect=copy.getBoundingClientRect(), globeRect=globe.getBoundingClientRect();
      return {logoRatio:(r.width-borderX)/(r.height-borderY), naturalRatio:logo.naturalWidth/logo.naturalHeight,
        foregroundLayer:Number(getComputedStyle(copy).zIndex), backgroundLayer:Number(getComputedStyle(globe).zIndex),
        copyOverlapY:Math.min(copyRect.bottom,globeRect.bottom)-Math.max(copyRect.top,globeRect.top),
        copyOverlapX:Math.min(copyRect.right,globeRect.right)-Math.max(copyRect.left,globeRect.left)};
    })()`);
    assert.ok(Math.abs(layout.logoRatio-layout.naturalRatio)<.02, 'Logo frame leaves empty space or distorts artwork');
    assert.ok(layout.backgroundLayer<layout.foregroundLayer, 'Globe is not behind the copy');
    assert.ok(layout.copyOverlapY>0 && layout.copyOverlapX>0, 'Hero copy is detached into a separate globe row');
    const decoration = await evaluate(`(() => {
      const section=document.querySelector('.capital-ai-hero'), globe=document.querySelector('.hero-globe-background');
      const area=globe.getBoundingClientRect(), sectionArea=section.getBoundingClientRect();
      return { globeWidth:area.width, globeHeight:area.height, heroWidth:sectionArea.width,
        left:area.left, heroLeft:sectionArea.left, right:area.right, heroRight:sectionArea.right,
        outlinePresent:!!document.querySelector('.hero-brand-universe-outline'),
        copyVeil:getComputedStyle(document.querySelector('.hero-copy'),'::before').content,
        studioShortcut:!!document.querySelector('header button[title^="Studio Hub:"]') };
    })()`);
    assert.equal(decoration.studioShortcut, false, 'Redundant Studio Hub header action remains');
    assert.equal(decoration.outlinePresent, false, 'Removed silver outline remains in hero');
    assert.equal(decoration.copyVeil, 'none', 'Opaque hero-copy veil remains');
    assert.equal(await evaluate("getComputedStyle(document.querySelector('.hero-copy')).backgroundColor"), 'rgba(0, 0, 0, 0)', 'Hero copy covers the globe');
    if (viewport.width<=768) {
      assert.ok(decoration.globeWidth<=decoration.heroWidth+2, 'Mobile/tablet globe overshoots content width');
      assert.ok(Math.abs(decoration.globeHeight-decoration.globeWidth)<3, 'Mobile/tablet globe is not proportional');
      assert.ok(decoration.right<=decoration.heroRight+2, 'Mobile/tablet globe is clipped on the right');
      assert.ok(decoration.left>=decoration.heroLeft-2, 'Mobile/tablet globe starts outside the hero');
    }
    report.checks.push({viewport, layout, decoration});
    await shot('hero-reduced-' + viewport.width);
    // Simulate doubled text while retaining the same viewport.
    await evaluate("document.querySelectorAll('.hero-copy h1,.hero-copy p,.hero-copy button,.hero-copy a').forEach(e=>e.style.fontSize=(parseFloat(getComputedStyle(e).fontSize)*2)+'px')");
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
    await evaluate("document.querySelector('.capital-ai-hero').scrollIntoView()");
    await until(() => evaluate("document.querySelector('.brand-globe-art').dataset.globeState === '3d'"), 'WEBGL_READY');
    await pause(900); // Allow poster/copy entrance transitions to finish.
    // JaJa is an independent animated overlay, not part of globe playback.
    // Full-page reduced-motion screenshots above retain it. Isolate only the
    // subsequent globe pixel comparisons; do not change the product design.
    await evaluate("document.querySelectorAll('[data-hero-buddy=\"agent\"]').forEach(e=>e.style.visibility='hidden')");
    // Test complete UI above, then isolate playback from independent Framer
    // Motion/hero-copy animation. Hiding test-only copy does not modify runtime.
    await evaluate("document.querySelector('.hero-copy').style.visibility='hidden'");
    const clip = await evaluate(`(() => { const r=document.querySelector('.hero-globe-background').getBoundingClientRect(); const x=Math.max(0,r.x),y=Math.max(0,r.y); return {x,y,width:Math.min(innerWidth,r.right)-x,height:Math.min(innerHeight,r.bottom)-y,scale:1}; })()`);
    assert.ok(clip.width > 0 && clip.height > 0);
    const first = await shot('hero-3d-' + viewport.width, clip);
    await pause(900);
    const second = await shot(null, clip);
    assert.notEqual(first, second, '3D output is not changing');
    // Landing hero auto-rotates without a dedicated pause button. Check a third frame.
    assert.equal(await evaluate("!!document.querySelector('.hero-globe-pause')"), false);
    await pause(900);
    assert.notEqual(await shot(null, clip), second, 'Globe stopped rotating');
    const lost = await evaluate("(() => { const gl=document.querySelector('.brand-globe-canvas').getContext('webgl2'); const ext=gl?.getExtension('WEBGL_lose_context'); if(!ext)return false; ext.loseContext(); return true; })()");
    assert.equal(lost, true, 'Context-loss test unavailable');
    await until(() => evaluate("document.querySelector('.brand-globe-art').dataset.globeState==='poster'"), 'CONTEXT_LOSS_FALLBACK');
    await until(() => evaluate("!document.querySelector('.hero-globe-pause')"), 'FALLBACK_HAS_NO_PLAYBACK_CONTROL');
    await until(() => evaluate("getComputedStyle(document.querySelector('.brand-globe-poster')).opacity === '1'"), 'FALLBACK_POSTER_FULLY_VISIBLE');
    report.checks.push({ viewport, webgl: 'SOFTWARE_WEBGL_PASS', animatedFrames: 'PASS', continuousVisibleRotation: 'PASS', contextLossFallback: 'PASS' });
    // Actual article scene, existing anonymous browser QA; no external sources.
    await evaluate(`document.querySelector('[data-article-scene="portfolio"] button').click()`);
    await until(() => evaluate(`document.querySelector('[data-article-scene="portfolio"]').dataset.sceneState === '3d'`), 'ARTICLE_WEBGL_READY');
    await evaluate(`document.querySelector('[data-article-scene="portfolio"] canvas').scrollIntoView({block:'center',behavior:'instant'})`);
    const articleClip=await evaluate(`(() => {const r=document.querySelector('[data-article-scene="portfolio"] canvas').getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,scale:1};})()`);
    assert.ok(articleClip.width>0 && articleClip.height>0 && articleClip.y>=0 && articleClip.y+articleClip.height<=viewport.height);
    // CDP clipping uses document coordinates, not viewport-relative coordinates.
    const articleDocumentClip=await evaluate(`(() => {const r=document.querySelector('[data-article-scene="portfolio"] canvas').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:1};})()`);
    const articleShot=async(name)=>{const image=await send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:articleDocumentClip});const bytes=Buffer.from(image.data,'base64');if(name)await writeFile(join(output,name+'.png'),bytes);return createHash('sha256').update(bytes).digest('hex');};
    const articleBefore=await articleShot('article-3d-'+viewport.width);
    const modelBefore=await evaluate(`document.querySelector('[data-article-scene="portfolio"] [aria-live]').textContent`);
    await evaluate(`document.querySelector('[data-article-scene="portfolio"] input[type="range"]').focus({preventScroll:true})`);
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'ArrowRight',code:'ArrowRight',windowsVirtualKeyCode:39});
    await until(async()=>await evaluate(`document.querySelector('[data-article-scene="portfolio"] [aria-live]').textContent`)!==modelBefore,'ARTICLE_MODEL_CHANGE');
    await until(async()=>await articleShot(null)!==articleBefore,'ARTICLE_3D_GEOMETRY_CHANGE');
    const articleLost=await evaluate(`(() => {const ext=document.querySelector('[data-article-scene="portfolio"] canvas').getContext('webgl2')?.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();return true;})()`);
    assert.equal(articleLost,true,'Article context-loss test unavailable');
    await until(()=>evaluate(`document.querySelector('[data-article-scene="portfolio"]').dataset.sceneState==='fallback'`),'ARTICLE_CONTEXT_LOSS');
    assert.match(await evaluate(`document.querySelector('[data-article-scene="portfolio"]').textContent`),/Textmodell bleibt nutzbar/);
    report.checks.push({viewport,article3d:'SOFTWARE_WEBGL_PASS',keyboardScenario:'PASS',articleFallback:'PASS'});
    const growth=await evaluate(`(() => {const el=document.getElementById('growth-intelligence');const pipe=el.querySelector('[data-growth-pipeline]');return {label:!!el.querySelector('[data-growth-engine-label]'),steps:pipe.querySelectorAll('button').length,badges:pipe.querySelectorAll('[data-growth-pipeline-badge]').length,orbitBadges:el.querySelector('[data-growth-globe-core]').querySelectorAll('button').length,original:el.querySelector('[data-growth-globe-core] img').getAttribute('src'),buttons:[...pipe.querySelectorAll('button')].every(b=>b.getBoundingClientRect().height>=44),overflow:el.scrollWidth>el.clientWidth+2,canvas:!!el.querySelector('canvas')};})()`);
    assert.equal(growth.label,true);assert.equal(growth.steps,7);assert.equal(growth.badges,7);assert.equal(growth.orbitBadges,0);assert.equal(growth.original,'/branding/universe/hero-universe-globe.webp');assert.equal(growth.buttons,true);assert.equal(growth.overflow,false);assert.equal(growth.canvas,false);
    await evaluate(`document.querySelectorAll('#growth-intelligence [data-growth-pipeline] button')[3].click()`);
    await until(()=>evaluate(`document.getElementById('growth-stage-title').textContent.includes('Content & 3D')`),'GROWTH_PIPELINE_SELECTION');
    assert.equal(await evaluate(`document.querySelectorAll('#growth-intelligence [data-growth-pipeline] button[aria-pressed="true"]').length`),1);
    await evaluate(`document.querySelector('#growth-intelligence').scrollIntoView({block:'start',behavior:'instant'})`);
    await shot('growth-article-'+viewport.width);
    await evaluate(`(() => {const el=document.getElementById('growth-intelligence');el.querySelector('[data-growth-globe-core]').scrollIntoView({block:'center',behavior:'instant'});[...el.querySelectorAll('button')].find(b=>b.textContent==='3D-Globus starten').click();})()`);
    await until(()=>evaluate(`document.querySelector('[data-growth-globe-core] .brand-globe-art')?.dataset.globeState==='3d'`),'GROWTH_ORIGINAL_WEBGL_READY');
    assert.equal(await evaluate(`document.querySelector('[data-growth-globe-core] .brand-globe-poster').getAttribute('src')`),'/branding/universe/hero-universe-globe.webp');
    await evaluate(`[...document.querySelectorAll('#growth-intelligence button')].find(b=>b.textContent==='Globus pausieren').click()`);
    await until(()=>evaluate(`[...document.querySelectorAll('#growth-intelligence button')].some(b=>b.textContent==='Globus fortsetzen'&&b.getAttribute('aria-pressed')==='true')`),'GROWTH_GLOBE_PAUSE');
    await evaluate(`[...document.querySelectorAll('#growth-intelligence button')].find(b=>b.textContent==='Globus schließen').click()`);
    await until(()=>evaluate(`!document.querySelector('[data-growth-globe-core] canvas')`),'GROWTH_GLOBE_CLOSE');
    report.checks.push({viewport,growthGlobe:'ORIGINAL_COMPONENT_SOFTWARE_WEBGL',growthGlobePause:'PASS',pipelineBadges:7});
    report.checks.push({viewport,growthArticle:'PRESENT',pipeline:'INTERACTION_PASS',touchTargets:'PASS',initialWebgl:'OPT_IN'});

    // Verify the isolated Analytics overview with the existing browser session.
    loaded=false;
    await send('Page.navigate',{url:origin+'/marketscreener?tab=overview'});
    await until(()=>loaded,'ANALYTICS_PAGE_LOAD');
    await until(()=>evaluate("!!document.getElementById('analytics-hub-universe-article')"),'ANALYTICS_ARTICLE');
    await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
    const articleSelector='#analytics-hub-universe-article';
    const stages=['Quellen','Datenqualität','Scoring','Risiko','Evidenz','Marktnews'];
    const layoutAnalytics=await evaluate("(()=>{const el=document.getElementById('analytics-hub-universe-article');const stars=[...el.querySelectorAll('[data-analytics-orbit-star]')];return {stars:stars.length,targets:stars.map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height]}),overflow:el.scrollWidth>el.clientWidth+2,pageOverflow:document.documentElement.scrollWidth>innerWidth+2,demo:el.querySelector('[data-analytics-example-cards]').textContent.includes('Statische Beispieldaten'),learningLinks:el.querySelectorAll('a[href^=\"/learning\"]').length,history:!!document.querySelector('.historical-demo'),archiveVisible:[...document.querySelectorAll('.historical-demo button')].some(b=>b.textContent.includes('Historisches Archiv ansehen')),defaultStage:stars.findIndex(b=>b.getAttribute('aria-pressed')==='true')};})()");
    assert.equal(layoutAnalytics.stars,6);
    assert.equal(await evaluate("document.querySelector('#analytics-hub-universe-article svg image').getAttribute('href')"),'/branding/universe/analytics-overview-v4.webp');
    assert.ok((await evaluate("getComputedStyle(document.querySelector('.universe-space'),'::before').backgroundImage")).includes('/branding/universe/owner-nebula-v4.webp'), 'Analytics uses the global v4 background');
    assert.ok(layoutAnalytics.targets.every(([w,h])=>w>=44&&h>=44),'Analytics star touch target');
    assert.equal(layoutAnalytics.overflow,false,'Analytics article overflow');
    assert.equal(layoutAnalytics.pageOverflow,false,'Analytics overview page overflow');
    assert.equal(layoutAnalytics.demo,true);
    assert.equal(layoutAnalytics.learningLinks,0);
    assert.equal(layoutAnalytics.history,true);
    assert.equal(layoutAnalytics.archiveVisible,false,'Anonymous archive control visible');
    assert.equal(layoutAnalytics.defaultStage,1);
    for(let i=0;i<stages.length;i++){
      const selector=articleSelector+' [data-analytics-orbit-star="'+i+'"]';
      await evaluate('document.querySelector('+JSON.stringify(selector)+').scrollIntoView({block:"center",behavior:"instant"})');
      await clickVisible(selector);
      await until(()=>evaluate('document.querySelector('+JSON.stringify(selector)+').getAttribute("aria-pressed")==="true"'),'ANALYTICS_STAR_'+i);
      assert.equal(await evaluate("document.querySelector('#analytics-hub-universe-article [aria-live=polite] h3').textContent"),stages[i]);
      assert.equal(await evaluate("document.querySelector('#analytics-hub-universe-article [data-analytics-technical-report]')?.querySelectorAll('dt').length"),5);
      const stepSelector=articleSelector+' section[aria-label="Technischer Prozessablauf"] button:nth-child(3)';
      await evaluate('document.querySelector('+JSON.stringify(stepSelector)+').scrollIntoView({block:"center",behavior:"instant"})');
      await clickVisible(stepSelector);
      await until(()=>evaluate('document.querySelector('+JSON.stringify(stepSelector)+').getAttribute("aria-pressed")==="true"'),'ANALYTICS_PROCESS_'+i);
    }
    const keyboardSelector=articleSelector+' [data-analytics-orbit-star="1"]';
    await evaluate('document.querySelector('+JSON.stringify(keyboardSelector)+').scrollIntoView({block:"center",behavior:"instant"})');
    await evaluate('document.querySelector('+JSON.stringify(keyboardSelector)+').focus({preventScroll:true})');
    assert.equal(await evaluate('document.activeElement===document.querySelector('+JSON.stringify(keyboardSelector)+')'),true,'Analytics keyboard focus');
    await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13});
    await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
    await until(()=>evaluate('document.querySelector('+JSON.stringify(keyboardSelector)+').getAttribute("aria-pressed")==="true"'),'ANALYTICS_KEYBOARD');
    await evaluate("document.getElementById('analytics-hub-universe-article').scrollIntoView({block:'start',behavior:'instant'})");
    await shot('analytics-overview-'+viewport.width);
    report.checks.push({viewport,analyticsOverview:'PASS',sixStars:'POINTER_PASS',technicalReports:6,processSteps:'PASS',keyboard:'PASS',...layoutAnalytics});


  }
  await navigate();
  await evaluate("document.getElementById('hero-open-learning-link').focus()");
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', text: '\r', unmodifiedText: '\r', windowsVirtualKeyCode: 13 });
  await until(() => evaluate("location.pathname === '/learning' && !!document.querySelector('.hub-navigation')"), 'LEARNING_CTA_NAVIGATION');
  report.checks.push({ learningCtaKeyboardNavigation: 'PASS' });
  // Verify real static documents, not just SPA routes. Redirected BYOK files remain outside this scope.
  const staticRoutes = ['/agb', '/datenschutz', '/impressum', '/dokumentation/pipeline-architekturen', '/dokumentation/preiskatalog', '/dokumentation/domains', '/dokumentation/oss-market'];
  for (const viewport of [{width:320,height:800,mobile:true},{width:1440,height:1000,mobile:false}]) {
    await send('Emulation.setDeviceMetricsOverride', {...viewport,deviceScaleFactor:1});
    for (const route of staticRoutes) {
      loaded=false;
      await send('Page.navigate',{url:origin+route});
      await until(()=>loaded,'STATIC_PAGE_LOAD_'+route);
      await until(()=>evaluate("document.readyState === 'complete' && !!document.querySelector('main')"),'STATIC_MAIN_'+route);
      const result=await evaluate("(()=>({background:getComputedStyle(document.body,'::before').backgroundImage,overflow:document.documentElement.scrollWidth>innerWidth+2}))()");
      assert.ok(result.background.includes('/branding/universe/owner-nebula-v4.webp'),route+' v4 canvas');
      assert.equal(result.overflow,false,route+' horizontal overflow');
      report.checks.push({viewport,route,staticCanvas:'PASS',horizontalOverflow:false});
    }
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
