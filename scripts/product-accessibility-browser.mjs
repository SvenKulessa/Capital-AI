#!/usr/bin/env node
/**
 * Browser accessibility smoke test with real Chromium + CDP (no external npm
 * dependencies). Not a screenreader test or a complete WCAG certification.
 * node scripts/product-accessibility-browser.mjs https://staging.example
 * Override browser path with CAPITAL_AI_CHROME_BIN.
 */
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

let base;
try {
  base = new URL(process.argv[2]);
  if (!['http:', 'https:'].includes(base.protocol) || base.username || base.password || base.search || base.hash) throw Error();
} catch {
  console.error('Usage: node scripts/product-accessibility-browser.mjs https://staging-host');
  process.exit(2);
}
const startedAt = new Date().toISOString();
const profile = await mkdtemp(join(tmpdir(), 'capital-ai-product-a11y-'));
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const failures = [], pages = [];
let chrome, socket, sequence = 0;
const pending = new Map();
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++sequence;
  const timeout = setTimeout(() => { pending.delete(id); reject(new Error('CDP_TIMEOUT_' + method)); }, 15000);
  pending.set(id, { resolve, reject, timeout });
  socket.send(JSON.stringify({ id, method, params }));
});
const evaluate = async expression => {
  const result = await send('Runtime.evaluate', { expression, returnByValue:true, awaitPromise:true });
  if (result.exceptionDetails) throw Error('EVALUATION_FAILED');
  return result.result?.value;
};
async function navigate(path) {
  const url = new URL(path, base);
  if (url.origin !== base.origin) throw Error('ORIGIN_CHANGED');
  await send('Page.navigate', { url: url.href });
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const target = path === '/' ? '#hub-directory' : path === '/learning/simulator' ? '#sim-title'
        : path.startsWith('/learning') ? '.hub-navigation nav.hub-tab-strip' : 'main,nav,header';
      const ready = await evaluate("document.readyState === 'complete' && !!document.querySelector(" + JSON.stringify(target) + ")");
      if (ready) { await pause(800); return; }
    } catch { /* navigation in progress */ }
    await pause(100);
  }
  throw Error('PAGE_TIMEOUT_' + path);
}
const domExpression = String.raw`(() => {
  const visible = el => el.getClientRects().length > 0 && getComputedStyle(el).visibility !== 'hidden';
  const name = el => (el.getAttribute('aria-label') || el.innerText || el.getAttribute('title') || '').trim();
  return {
    documentLanguage: document.documentElement.lang,
    imagesWithoutAlt: [...document.querySelectorAll('img')].filter(el => !el.hasAttribute('alt')).length,
    unlabeledFields: [...document.querySelectorAll('input:not([type="hidden"]),select,textarea')]
      .filter(visible).filter(el => !el.labels?.length && !el.getAttribute('aria-label') && !el.getAttribute('aria-labelledby')).length,
    unnamedButtons: [...document.querySelectorAll('button')].filter(visible)
      .filter(el => !name(el) && !el.getAttribute('aria-labelledby')).length,
    scrollNav: [...document.querySelectorAll('.hub-navigation')].map(container => {
      const el = container.querySelector('nav.hub-tab-strip');
      return el ? ({
      hub: container.getAttribute('data-hub'),
      wrap: getComputedStyle(el).flexWrap,
      scroll: getComputedStyle(el).overflowX,
      width: el.clientWidth, contentWidth: el.scrollWidth,
      linkNames: [...el.querySelectorAll('a[href]')].map(name),
    }) : null;
    }).filter(Boolean),
  };
})()`;
async function checkPage(path, viewport) {
  await send('Emulation.setDeviceMetricsOverride', {
    width:viewport.width, height:viewport.height, deviceScaleFactor:2, mobile:viewport.mobile,
  });
  await navigate(path);
  if (path === '/' || path.startsWith('/blog/')) {
    await evaluate(`(() => {
      const panel = document.querySelector('[aria-labelledby="cookie-consent-v3-title"]');
      const reject = panel?.querySelector('button[data-consent-choice="necessary"]');
      reject?.click();
    })()`);
    await pause(200);
    const consent = await evaluate(`({ panelOpen: !!document.querySelector('[aria-labelledby="cookie-consent-v3-title"]'), analyticsLoaded: !!document.querySelector('#capital-ai-ga4') })`);
    if (consent.panelOpen || consent.analyticsLoaded) failures.push(path + ': necessary-only choice must close banner without GA4');
  }
  const dom = await evaluate(domExpression);
  const ax = await send('Accessibility.getFullAXTree');
  const nodes = ax.nodes || [];
  const nav = nodes.filter(node => node.role?.value === 'navigation');
  const simulator = path === '/learning/simulator' ? await evaluate(String.raw`(() => ({
    visible: !!document.querySelector('#sim-title'),
    title: document.querySelector('#sim-title')?.textContent?.trim() || '',
    baseline: document.body.textContent?.includes('9.53 %') || false,
    tasks: [...document.querySelectorAll('button')].filter(el => el.textContent?.includes('Aufgabe ')).length,
    rangeFields: document.querySelectorAll('input[type="range"]').length,
    tabularRows: document.querySelectorAll('table tbody tr').length,
    horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
    privateEditorVisible: !!document.querySelector('#sim-name'),
    universeStage: !!document.querySelector('[data-learning-universe-simulator="v1"]'),
    universeAtoms: document.querySelectorAll('[data-learning-universe-simulator="v1"] [data-universe-atom]').length,
    universePoster: !!document.querySelector('[data-learning-universe-simulator="v1"] img[alt="Stilisierte CAPITAL-AI-Erde mit umlaufenden Lichtbahnen"]'),
    universeCanvasInitiallyLoaded: !!document.querySelector('[data-learning-universe-simulator="v1"] canvas'),
    universeBuddyButton: !![...document.querySelectorAll('[data-learning-universe-simulator="v1"] button')].find(button => button.textContent?.includes('JaJa Universe Buddy öffnen')),
    universeMotionToggle: !![...document.querySelectorAll('[data-learning-universe-simulator="v1"] button')].find(button => button.textContent?.includes('3D-Erde einschalten')),
  }))()` ) : null;
  const record = { path, viewport, dom, simulator, AX: { nodes:nodes.length, navigations:nav.map(n => n.name?.value || '') } };
  pages.push(record);
  if (path === '/') {
    // Explicit public hub contract; independent from other navigation landmarks.
    const home = await evaluate(String.raw`(() => {
      const directory = document.querySelector('#hub-directory');
      const links = [...(directory?.querySelectorAll('a[data-hub][href]') || [])];
      return {
        heading: directory?.querySelector('#hub-directory-heading')?.textContent?.trim() || '',
        links: links.map(el => ({ id: el.dataset.hub, path: new URL(el.href).pathname,
          name: el.textContent.trim(), local: new URL(el.href).origin === location.origin,
          height: el.getBoundingClientRect().height,
          focusable: el.tabIndex >= 0 })),
        ownerLink: !!directory?.querySelector('a[href^="/control-center"],a[href^="/profile"]'),
        internalPanel: !!document.querySelector('#content-engine-heading'),
      };
    })()`);
    record.publicHome = home;
    const expected = { marketscreener:'/marketscreener', learning:'/learning',
      studio:'/studio', documentation:'/dokumentation' };
    if (!home.heading || home.ownerLink || home.internalPanel ||
      !Object.entries(expected).every(([id, path]) => home.links.some(link => link.id === id && link.path === path)) ||
      new Set(home.links.map(link => link.id)).size !== home.links.length ||
      home.links.some(link => !link.local || !link.name || !link.focusable || link.height < 44)) {
      failures.push('/: public hub destination, name, isolation or touch-target regression at ' + viewport.width);
    }
    const focused = await evaluate(`(() => {
      const links = document.querySelectorAll('#hub-directory a[data-hub][href]');
      links[0]?.focus();
      return links.length > 1 && document.activeElement === links[0];
    })()`);
    if (focused) {
      await send('Input.dispatchKeyEvent', {type:'rawKeyDown',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
      await send('Input.dispatchKeyEvent', {type:'keyUp',key:'Tab',code:'Tab',windowsVirtualKeyCode:9,nativeVirtualKeyCode:9});
    }
    home.keyboardNext = focused && await evaluate(`(() => {
      const second = document.querySelectorAll('#hub-directory a[data-hub][href]')[1];
      const style = second && getComputedStyle(second);
      return !!second && document.activeElement === second && second.matches(':focus-visible') &&
        parseFloat(style.outlineWidth) >= 2 && style.outlineStyle !== 'none';
    })()`);
    if (!home.keyboardNext) failures.push('/: public hub keyboard focus or indicator regression at ' + viewport.width);
    // Lab measurements only. No claim about real-user p75, INP or WCAG.
    record.homeLab = await evaluate(`(() => {
      const m = window.__caiPublicHomeLab;
      return m ? { lcpMs: m.lcpMs, cls: m.cls, scope: 'ISOLATED_LAB_NOT_FIELD', inpMs: null } : null;
    })()`);
    if (process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR) {
      await mkdir(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, { recursive: true });
      const shot = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
      await writeFile(join(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, 'public-home-' + viewport.width + '.png'), Buffer.from(shot.data,'base64'));
    }
  }
  if (path.startsWith('/blog/') && process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR) {
    await mkdir(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, { recursive: true });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, path.slice(6) + '-' + viewport.width + '.png'), Buffer.from(shot.data, 'base64'));
    const overflow = await evaluate('Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)');
    if (overflow > 2) failures.push(path + ': page horizontal overflow (' + overflow + 'px)');
    const text = await evaluate('document.body.textContent');
    if (!text.includes('Learning-Angebot')) failures.push(path + ': Learning offer link missing');
  }
  if (path === '/learning/simulator' && process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR) {
    await mkdir(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, { recursive: true });
    const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
    await writeFile(join(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR,
      'simulator-' + viewport.width + 'x' + viewport.height + '.png'), Buffer.from(shot.data, 'base64'));
    const buttonPressed = await evaluate(`(() => {
      const button = [...document.querySelectorAll('button')].find(el => el.textContent?.includes('Aufgabe 1: Diversifikation'));
      if (!button || button.disabled) return false;
      button.click(); return true;
    })()`);
    await pause(150);
    const feedbackVisible = await evaluate("document.body.textContent.includes('Gleichgewichtetes Portfolio:')");
    if (!buttonPressed || !feedbackVisible) failures.push(path + ': keyboard-accessible learning task not responding');
  }
  if (!dom.documentLanguage) failures.push(path + ': document lang missing (WCAG 3.1.1)');
  if (dom.imagesWithoutAlt) failures.push(path + ': ' + dom.imagesWithoutAlt + ' images without alt (WCAG 1.1.1 partial)');
  if (dom.unlabeledFields) failures.push(path + ': ' + dom.unlabeledFields + ' unnamed form controls (WCAG 3.3.2 partial)');
  if (dom.unnamedButtons) failures.push(path + ': ' + dom.unnamedButtons + ' unnamed buttons (WCAG 4.1.2 partial)');
  if (!nodes.length || !nav.length) failures.push(path + ': accessible navigation tree missing');
  if (path === '/learning/simulator') {
    if (!simulator?.visible || !simulator?.title.includes('Financial Learning Simulator')) failures.push(path + ': route did not render simulator');
    if (!simulator?.baseline) failures.push(path + ': synthetic baseline 9.53 % not rendered');
    if (simulator?.tasks !== 3 || simulator?.rangeFields < 3 || simulator?.tabularRows < 3) failures.push(path + ': learning controls or accessible data table missing');
    if (simulator?.horizontalOverflow > 2) failures.push(path + ': page horizontal overflow (' + simulator.horizontalOverflow + 'px)');
    if (simulator?.privateEditorVisible) failures.push(path + ': private Pro controls visible without verified session');
    if (!simulator?.universeStage || simulator?.universeAtoms !== 7 || !simulator?.universePoster) failures.push(path + ': Universe Earth stage or seven atoms missing');
    if (simulator?.universeCanvasInitiallyLoaded) failures.push(path + ': 3D Earth initialized before explicit opt-in');
    if (!simulator?.universeBuddyButton || !simulator?.universeMotionToggle) failures.push(path + ': accessible JaJa/3D controls missing');
  }
  if (path === '/learning') {
    const overview = await evaluate(`(() => {
      const search = document.querySelector('#learning-topic-search');
      search?.focus();
      return {
        visible: !!document.querySelector('[data-learning-overview="v1"]'),
        atoms: document.querySelectorAll('.lhu-atom').length,
        topics: document.querySelectorAll('.lhu-topic').length,
        searchFocusable: document.activeElement === search,
        overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
      };
    })()`);
    record.overview = overview;
    if (!overview.visible || overview.atoms !== 7 || overview.topics !== 7 || !overview.searchFocusable) {
      failures.push(path + ': Learning Universe overview missing interactive category navigation');
    }
    if (overview.overflow > 2) failures.push(path + ': Learning overview horizontal overflow at ' + viewport.width);
    // Real CDP keyboard events exercise React onChange, not a DOM property setter.
    record.overviewSearch = [];
    for (const [query, expectedCount] of [['Charts', 1], ['zznonexistenttopiczz', 0]]) {
      const focused = await evaluate(`(() => {
        const input = document.querySelector('#learning-topic-search');
        if (!input) return false;
        input.focus(); input.select(); return document.activeElement === input;
      })()`);
      if (!focused) { failures.push(path + ': topic search not focusable for ' + query); break; }
      await send('Input.insertText', { text: query });
      await pause(200);
      const state = await evaluate(`(() => ({
        count: document.querySelectorAll('.lhu-topic').length,
        labels: [...document.querySelectorAll('.lhu-topic .lhu-topic-label')].map(el => el.textContent?.trim()),
        value: document.querySelector('#learning-topic-search')?.value ?? null,
        empty: !!document.querySelector('.lhu-empty'),
      }))()`);
      record.overviewSearch.push({ query, expectedCount, ...state });
      if (state.count !== expectedCount || state.value !== query
        || (query === 'Charts' && (state.labels.length !== 1 || state.labels[0] !== 'Charts'))
        || (expectedCount === 0 && !state.empty)) {
        failures.push(path + ': topic search failed for ' + query + ' at ' + viewport.width);
      }
    }
    const resetFocused = await evaluate(`(() => {
      const input = document.querySelector('#learning-topic-search');
      if (!input) return false;
      input.focus(); input.select(); return document.activeElement === input;
    })()`);
    if (resetFocused) {
      await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
      await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Backspace', code: 'Backspace', windowsVirtualKeyCode: 8, nativeVirtualKeyCode: 8 });
      await pause(200);
    }
    const restored = await evaluate(`(() => ({
      count: document.querySelectorAll('.lhu-topic').length,
      value: document.querySelector('#learning-topic-search')?.value ?? null,
      empty: !!document.querySelector('.lhu-empty'),
    }))()`);
    record.overviewSearchReset = { focused: resetFocused, ...restored };
    if (!resetFocused || restored.count !== 7 || restored.value !== '' || restored.empty) {
      failures.push(path + ': clearing topic search must restore seven atoms at ' + viewport.width);
    }
    if (process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR) {
      await mkdir(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, { recursive: true });
      const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
      await writeFile(join(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, 'learning-overview-' + viewport.width + '.png'), Buffer.from(shot.data, 'base64'));
    }
  }
  if (path === '/learning?tab=glossar') {
    record.glossary = [];
    for (const [query, expected] of [['land graph', 'LangGraph'], ['supression', 'Suppression'], ['midi', 'MiFID'], ['zznonexistenttermzz', null]]) {
      const focused = await evaluate(`(() => {
        const input = document.querySelector('input[aria-label="Vocabulary durchsuchen"]');
        if (!input) return false;
        input.focus(); input.select(); return document.activeElement === input;
      })()`);
      if (!focused) throw Error('GLOSSARY_SEARCH_NOT_FOCUSABLE');
      await send('Input.insertText', { text: query });
      await pause(200);
      const state = await evaluate(`({
        titles: [...document.querySelectorAll('article[data-vocabulary-category] h3')].map(el => el.textContent),
        empty: document.body.textContent.includes('Keine passenden Begriffe gefunden.'),
        overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth)
      })`);
      record.glossary.push({ query, expected, ...state });
      if (expected ? !state.titles.some(title => title.includes(expected)) : state.titles.length || !state.empty)
        failures.push('/learning: glossary search failed for ' + query);
      if (state.overflow > 2) failures.push('/learning: glossary overflow at ' + viewport.width);
      if (process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR && query === 'supression') {
        await mkdir(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, { recursive: true });
        const shot = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
        await writeFile(join(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, 'glossary-' + viewport.width + '.png'), Buffer.from(shot.data, 'base64'));
      }
    }
  }
  if (path === '/learning' && !dom.scrollNav.some(item =>
    item.hub === 'learning' && item.wrap === 'nowrap' && item.scroll === 'auto' && item.linkNames.length >= 4
  )) failures.push(path + ': Learning Hub mobile scroll navigation missing');
}
try {
  chrome = spawn(process.env.CAPITAL_AI_CHROME_BIN || 'chromium', [
    '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--no-first-run',
    '--disable-extensions', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
  ], { stdio:'ignore' });
  chrome.on('error', () => {});
  let port;
  // Cold Chromium startup on shared CI runners can exceed ten seconds.
  // Keep page/assertion deadlines unchanged and still fail if the browser exits.
  for (let attempt = 0; attempt < 300; attempt++) {
    try { port = Number((await readFile(join(profile,'DevToolsActivePort'),'utf8')).split('\n')[0]); if (port) break; }
    catch { /* still starting */ }
    if (chrome.exitCode !== null || chrome.signalCode !== null) throw Error('CHROMIUM_EXITED');
    await pause(100);
  }
  if (!port) throw Error('CHROMIUM_NOT_READY');
  const tabs = await (await fetch('http://127.0.0.1:' + port + '/json/list')).json();
  const tab = tabs.find(t => t.type === 'page');
  if (!tab?.webSocketDebuggerUrl) throw Error('CDP_PAGE_MISSING');
  socket = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((resolve,reject) => { socket.onopen=resolve; socket.onerror=()=>reject(Error('CDP_CONNECTION')); });
  socket.onmessage = event => {
    const message = JSON.parse(event.data);
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id); clearTimeout(entry.timeout);
    if (message.error) entry.reject(Error(message.error.message || 'CDP_ERROR'));
    else entry.resolve(message.result);
  };
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Accessibility.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {source: String.raw`(() => {
    if (location.pathname !== '/') return;
    const data = {lcpMs:null, cls:null};
    Object.defineProperty(window, '__caiPublicHomeLab', {value:data});
    try {
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) data.lcpMs = entry.startTime;
      }).observe({type:'largest-contentful-paint',buffered:true});
    } catch { /* unsupported metrics remain null */ }
    try {
      let windowStart = null, previous = null, session = 0;
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          if (entry.hadRecentInput) continue;
          if (windowStart === null || entry.startTime - previous >= 1000 || entry.startTime - windowStart >= 5000) {
            windowStart = entry.startTime; session = 0;
          }
          session += entry.value; previous = entry.startTime;
          data.cls = Math.max(data.cls ?? 0, session);
        }
        if (data.cls === null) data.cls = 0;
      }).observe({type:'layout-shift',buffered:true});
    } catch { /* unsupported metrics remain null */ }
  })()`});
  for (const viewport of [{width:320,height:800,mobile:true},{width:390,height:844,mobile:true},{width:768,height:1024,mobile:true},{width:1440,height:900,mobile:false}]) {
    for (const path of ['/', '/learning', '/learning?tab=glossar', '/learning/simulator', '/login', '/blog/datenkonzept-blueprint', '/blog/screener-scoring-lernen']) await checkPage(path,viewport);
    // Same actual Chromium/CDP session: all ten original tab artworks, not a static CSS assertion.
    for (const tab of ['glossar','flashcards','guides','patterns','videos','quiz','quizzes','news','kontakt','simulator']) {
      const path = '/learning?tab=' + tab;
      await navigate(path);
      const scene = await evaluate("(() => { const tab = " + JSON.stringify(tab) + "; const host = document.querySelector('[data-learning-universe-tab=\"' + tab + '\"]'); const svg = host?.querySelector('svg.lhu-tab-art'); const button = host?.querySelector('.lhu-tab-overview-link'); const rect = host?.getBoundingClientRect(); return { exists: !!host, heading: !!host?.querySelector('h2#lhu-tab-scene-title'), vector: !!svg && svg.querySelectorAll('path').length > 0, orbits: svg?.querySelectorAll('ellipse').length || 0, iconAlt: host?.querySelector('[role=\"img\"]')?.getAttribute('aria-label') || '', back: !!button, tabLinks: document.querySelectorAll('.hub-navigation[data-hub=\"learning\"] a[href]').length, visible: !!rect && rect.width > 0 && rect.height > 0, overflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth) }; })()");
      pages.push({path,viewport:viewport.width,universeTab:scene});
      if (!scene.exists || !scene.heading || !scene.vector || scene.orbits !== 2
        || !scene.iconAlt.startsWith('Originalillustration:') || !scene.back || !scene.visible
        || scene.tabLinks < 10 || scene.overflow > 2) {
        failures.push(path + ': original artwork/nav/overflow regression at ' + viewport.width + ': ' + JSON.stringify(scene));
      }
      if (process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR && [390,1440].includes(viewport.width)) {
        await mkdir(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, { recursive: true });
        const screenshot = await send('Page.captureScreenshot', {format:'png',captureBeyondViewport:false});
        await writeFile(join(process.env.CAPITAL_AI_BROWSER_EVIDENCE_DIR, 'learning-tab-' + tab + '-' + viewport.width + '.png'), Buffer.from(screenshot.data,'base64'));
      }
      if (tab === 'glossar') {
        const focused = await evaluate("(() => { const b=document.querySelector('.lhu-tab-overview-link'); b?.focus(); return document.activeElement===b; })()");
        if (!focused) failures.push(path + ': return-to-overview keyboard focus lost at ' + viewport.width);
        await send('Input.dispatchKeyEvent',{type:'rawKeyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
        await send('Input.dispatchKeyEvent',{type:'char',key:'Enter',code:'Enter',text:'\r',unmodifiedText:'\r',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,nativeVirtualKeyCode:13});
        await pause(250);
        const returned = await evaluate("(() => ({overview: !!document.querySelector('[data-learning-overview=\"v1\"]'), search: window.location.search}))()");
        if (!returned.overview || !returned.search.includes('tab=overview')) failures.push(path + ': Enter did not navigate back to overview at ' + viewport.width + ': ' + JSON.stringify(returned));
      }
    }
  }
  console.log(JSON.stringify({schemaVersion:'CAPITAL_AI_PRODUCT_BROWSER_A11Y@1',target:base.origin,startedAt,
    pages,failures,status:failures.length?'FAILED':'TARGETED_PASS',
    actualScreenReader:'NOT_PROVEN',liveTenantIsolation:'NOT_PROVEN',fullWCAGConformance:'NOT_PROVEN'},null,2));
  process.exitCode = failures.length ? 1 : 0;
} catch (err) {
  console.error('Browser audit NOT_PROVEN: ' + String(err?.message || err));
  process.exitCode = 2;
} finally {
  try { socket?.close(); } catch {}
  if (chrome && chrome.exitCode === null && chrome.signalCode === null) {
    await new Promise(resolve => {
      let settled = false;
      const finish = () => { if (settled) return; settled = true; resolve(); };
      chrome.once('close', finish);
      try { chrome.kill('SIGTERM'); } catch { finish(); }
      const timer = setTimeout(() => { try { chrome.kill('SIGKILL'); } catch {} finish(); }, 3000);
      timer.unref();
    });
  }
  await rm(profile,{recursive:true,force:true,maxRetries:12,retryDelay:150});
}
