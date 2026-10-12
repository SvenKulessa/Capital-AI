// Public, anonymous UI checks only. Never starts login, checkout or publishing.
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import assert from 'node:assert/strict';

const requestedOrigin = process.env.CAPITAL_LEARNING_ORIGIN || 'https://capital-ai.online';
assert.ok(requestedOrigin === 'https://capital-ai.online' || requestedOrigin === 'https://capital-ai-uvsl.onrender.com', 'Unapproved public origin');
// Construct every navigation from a trusted literal, never a substring match.
const origin = requestedOrigin === 'https://capital-ai-uvsl.onrender.com'
  ? 'https://capital-ai-uvsl.onrender.com' : 'https://capital-ai.online';
assert.ok(process.env.CHROME_BIN, 'CHROME_BIN is required');
const output = 'browser-readback';
await mkdir(output, { recursive: true });
const profile = await mkdtemp(join(tmpdir(), 'capital-learning-readback-'));
const chrome = spawn(process.env.CHROME_BIN, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-debugging-port=0', `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
let socket;
const pending = new Map();
let id = 0;
const report = { schemaVersion: 1, origin, capturedAt: new Date().toISOString(), status: 'FAIL', checks: [], purchase: 'NOT_PROVEN', marketplace: 'NOT_PROVEN', publishing: 'NOT_PROVEN', nativeMobile: 'NOT_PROVEN' };
const pause = () => new Promise(resolve => setTimeout(resolve, 250));
async function until(fn, label) {
  const end = Date.now() + 30000;
  while (Date.now() < end) { if (await fn()) return; await pause(); }
  throw new Error(`Timed out: ${label}`);
}
function command(method, params = {}) {
  const callId = ++id;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(callId); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
    pending.set(callId, { resolve, reject, timer });
    socket.send(JSON.stringify({ id: callId, method, params }));
  });
}
async function evaluate(expression) {
  const response = await command('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
  assert.ok(!response.exceptionDetails, 'DOM evaluation failed');
  return response.result.value;
}
async function navigate(path, ready) {
  await command('Page.navigate', { url: origin + path });
  await until(() => evaluate(ready), path);
  assert.equal(await evaluate('location.origin'), origin, 'Unexpected navigation');
}
async function capture(name) {
  const metrics = await evaluate(`(() => { const d=document.documentElement; return {width:innerWidth, client:d.clientWidth, scroll:d.scrollWidth}; })()`);
  assert.equal(metrics.width, report.viewport.width, 'Viewport override did not apply');
  assert.ok(metrics.scroll <= metrics.client + 1, `Horizontal page overflow: ${JSON.stringify(metrics)}`);
  const png = await command('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  await writeFile(join(output, name + '.png'), Buffer.from(png.data, 'base64'));
  report.checks.push({ name, metrics, status: 'PASS' });
}
try {
  let port;
  await until(async () => { try { port = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]; return /^\d+$/.test(port); } catch { return false; } }, 'Chromium startup');
  const target = await (await fetch(`http://127.0.0.1:${port}/json/new?about:blank`, { method: 'PUT', signal: AbortSignal.timeout(10000) })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => { socket.addEventListener('open', resolve, { once: true }); socket.addEventListener('error', reject, { once: true }); });
  socket.addEventListener('message', event => {
    const response = JSON.parse(event.data);
    const task = pending.get(response.id);
    if (!task) return;
    clearTimeout(task.timer); pending.delete(response.id);
    if (response.error) task.reject(new Error(response.error.message)); else task.resolve(response.result);
  });
  await command('Page.enable'); await command('Runtime.enable');

  // Direct public HTTP response, not a Render dashboard or container health inference.
  const healthResponse = await fetch(origin + '/healthz', {
    redirect: 'manual', signal: AbortSignal.timeout(15000),
    headers: { 'User-Agent': 'CAPITAL-AI-production-mobile-qa/1.0', Accept: 'application/json' },
  });
  assert.equal(healthResponse.status, 200, 'Production /healthz must return HTTP 200');
  const health = await healthResponse.json();
  assert.equal(health.status, 'ok', 'Production health payload must be ok');
  assert.match(health.runtimeIdentity?.sourceSha ?? '', /^[a-f0-9]{40}$/, 'Runtime Source SHA not bound');
  report.health = {
    httpStatus: healthResponse.status,
    sourceSha: health.runtimeIdentity.sourceSha,
    identityEvidence: health.runtimeIdentity.evidence,
    buildBound: health.buildIdentity?.bound === true,
  };
  report.checks.push({ name: 'production-healthz-runtime-sha', status: 'PASS' });

  // Check customer-domain HTML directly, not a cached external text extractor.
  for (const path of ['/pricing', '/marketscreener/dokumentation']) {
    const page = await fetch(origin + path, {
      redirect: 'manual', signal: AbortSignal.timeout(15000),
      headers: { 'User-Agent': 'CAPITAL-AI-production-mobile-qa/1.0', Accept: 'text/html' },
    });
    assert.equal(page.status, 200, path + ': HTTP 200 required');
    const html = await page.text();
    assert.match(html, /<meta name="robots" content="noindex, nofollow"/, path + ': expected NOINDEX');
    assert.doesNotMatch(html, /<link rel="canonical"/, path + ': unapproved canonical');
    if (path === '/pricing') {
      assert.match(html, /id="capital-ai-pricing-fallback"/, 'Pricing HTML fallback absent');
      assert.match(html, /Tarife und Leistungen/, 'Pricing fallback content absent');
    }
    report.checks.push({ name: path + '-html-noindex-readback', status: 'PASS', httpStatus: page.status });
  }

  for (const viewport of [
    { name: 'narrow-mobile', width: 320, height: 720, mobile: true },
    { name: 'mobile', width: 390, height: 844, mobile: true },
    { name: 'desktop', width: 1440, height: 900, mobile: false },
  ]) {
    report.viewport = viewport;
    await command('Emulation.setDeviceMetricsOverride', {
      width: viewport.width, height: viewport.height, mobile: viewport.mobile, deviceScaleFactor: 1,
    });

    // Preserve the authoritative main access boundary after PR #387: anonymous
    // accounts must never see subscription-gated charts or their interactions.
    await navigate('/learning?tab=patterns',
      `document.body.textContent.includes('Chart-Lernatlas: mit Learning ') && document.body.textContent.includes('Starter-, Pro- oder Enterprise-Abonnement nutzbar.')`);
    assert.equal(await evaluate(`!!document.querySelector('[aria-label="Chart-Lernatlas"]')`),
      false, 'Paid chart content exposed to an anonymous visitor');
    await capture(viewport.name + '-chart-access-gate');
    report.checks.at(-1).chartAccess = 'ANONYMOUS_ACCESS_GATED';
    report.checks.at(-1).paidChartInteractions = 'NOT_PROVEN';

    // #428 moved four blueprint cards from home to documentation. During a
    // rolling deployment both public home layouts are acceptable, but both
    // MUST offer real learning and commerce navigation; documentation MUST
    // still expose all four evidence-neutral demos (checked below).
    await navigate('/', `!!document.querySelector('section[aria-label="Produkt entdecken"] button')
      || document.querySelectorAll('#market-blueprint-catalog article').length === 4`);
    const homepage = await evaluate(`(() => {
      const legacy=document.querySelectorAll('#market-blueprint-catalog article').length===4;
      if(legacy) return {mode:'blueprint-cards',links:['/learning','/pricing','/marketscreener/dokumentation'].every(
        path=>!!document.querySelector('#market-blueprint-catalog a[href="'+path+'"]'))};
      const cta=document.querySelector('section[aria-label="Produkt entdecken"] button');
      return {mode:'product-discovery',links:!!cta && cta.textContent.includes('Produkt entdecken')
        && ['/learning','/pricing'].every(path=>!!document.querySelector('a[href="'+path+'"]'))};
    })()`);
    assert.equal(homepage.links, true, 'Homepage learning/commerce entrypoints missing');
    assert.equal(await evaluate(`!document.querySelector('#capital-ai-bootstrap-fallback:not([hidden])')`), true, 'Visible bootstrap failure');
    await capture(viewport.name + '-blueprints-home');
    report.checks.at(-1).homeMode=homepage.mode;

    if (viewport.mobile) {
      await until(() => evaluate(`!!document.querySelector('[aria-controls="capital-ai-mobile-navigation"]')`), 'Mobile menu toggle');
      await evaluate(`document.querySelector('[aria-controls="capital-ai-mobile-navigation"]').click()`);
      await until(() => evaluate(`!!document.querySelector('#capital-ai-mobile-navigation[role="dialog"]')`), 'Mobile navigation opens');
      // Framer Motion starts with x:-100%; measure only the settled drawer.
      await until(() => evaluate(`(() => {const d=document.querySelector('#capital-ai-mobile-navigation');
        if(!d) return false; const r=d.getBoundingClientRect();
        return r.left >= -1 && r.right <= innerWidth + 1;})()`), 'Mobile drawer finished sliding in');
      const drawer = await evaluate(`(() => { const d=document.querySelector('#capital-ai-mobile-navigation'),r=d.getBoundingClientRect();
        return {left:r.left,right:r.right,client:d.clientWidth,scroll:d.scrollWidth}; })()`);
      assert.ok(drawer.left >= -1 && drawer.right <= viewport.width + 1 &&
        drawer.scroll <= drawer.client + 1, 'Mobile navigation overflow');
      await capture(viewport.name + '-menu');
      await evaluate(`document.querySelector('[aria-label="Navigation schließen"]').click()`);
      await until(() => evaluate(`!document.querySelector('#capital-ai-mobile-navigation')`), 'Mobile navigation closes');
    }

    await navigate('/marketscreener/dokumentation',
      `document.querySelectorAll('#market-blueprint-catalog article').length === 4`);
    await capture(viewport.name + '-blueprints-documentation');

    // The public glossary and its offer must work without subscription access.
    // Never submit a checkout request: only test the local consent/disabled state.
    await navigate('/learning?tab=glossar',
      `!!document.querySelector('[aria-label="Learning Portal kaufen"] input[type="checkbox"]')`);
    const purchase = await evaluate(`(() => {const section=document.querySelector('[aria-label="Learning Portal kaufen"]');
      const consent=section.querySelector('input[type="checkbox"]');
      const button=section.querySelector('button');
      return {consent:consent.checked,disabled:button.disabled,text:button.textContent};})()`);
    assert.equal(purchase.consent, false, 'Consent must initially be unchecked');
    assert.equal(purchase.disabled, true, 'Purchase cannot begin without consent');
    assert.match(purchase.text, /Learning Portal/, 'Learning purchase CTA missing');
    // Native anchor panel replaces the mobile select. During a rolling deploy,
    // validate the legacy select by its values rather than a stale option count.
    // Old canonical /learning/quiz links and the newer ?tab=quiz links both
    // enforce the same route and focus contract during production rollout.
    const quizLink = `nav a[href="/learning?tab=quiz"],nav a[href="/learning/quiz"]`;
    const glossaryLink = `nav a[href="/learning?tab=glossar"],nav a[href="/learning/glossar"]`;
    const panel = await evaluate(`!!document.querySelector(${JSON.stringify(quizLink)})`);
    if (panel) {
      await evaluate(`document.querySelector(${JSON.stringify(quizLink)}).click()`);
      await until(() => evaluate(`(() => {
        const correctRoute = (location.pathname === '/learning' && new URLSearchParams(location.search).get('tab') === 'quiz')
          || location.pathname === '/learning/quiz';
        return correctRoute && !!document.querySelector('a[aria-current="page"]');
      })()`), 'Learning panel quiz navigation');
      await capture(viewport.name + '-learning-navigation-panel');
      await evaluate(`document.querySelector(${JSON.stringify(glossaryLink)}).click()`);
      await until(() => evaluate(`(() => {
        const correctRoute = (location.pathname === '/learning' && new URLSearchParams(location.search).get('tab') === 'glossar')
          || location.pathname === '/learning/glossar';
        return correctRoute && !!document.querySelector('[aria-label="Learning Portal kaufen"]');
      })()`), 'Glossary restored');
    } else if (viewport.mobile) {
      const tabSelect = `Array.from(document.querySelectorAll('select')).find(s =>
        Array.from(s.options).some(o => o.value === 'quiz') && Array.from(s.options).some(o => o.value === 'glossar'))`;
      assert.equal(await evaluate(`(() => {const s=${tabSelect}; return !!s && s.getBoundingClientRect().width > 0;})()`),
        true, `Mobile learning navigation not visible; public-nav=${JSON.stringify(await evaluate(`Array.from(document.querySelectorAll('nav')).map(n=>({label:n.getAttribute('aria-label'),hrefs:Array.from(n.querySelectorAll('a')).map(a=>a.getAttribute('href')).filter(Boolean).slice(0,12)}))`))}`);
      await evaluate(`(() => {const s=${tabSelect}; s.value='quiz';
        s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await until(() => evaluate(`(${tabSelect})?.value === 'quiz'`), 'Learning tab change');
      await evaluate(`(() => {const s=${tabSelect}; s.value='glossar';
        s.dispatchEvent(new Event('change',{bubbles:true}));})()`);
      await until(() => evaluate(`!!document.querySelector('[aria-label="Learning Portal kaufen"]')`), 'Glossary restored');
    }
    await capture(viewport.name + '-learning-commerce');

    await navigate('/pricing', `!!document.querySelector('#pricing-dialog-title')`);
    assert.equal(await evaluate(`['Starter','Pro','Enterprise'].every(
      t => document.querySelector('[role="dialog"]').textContent.includes(t))`), true, 'Pricing tiers missing');
    const pricing = await evaluate(`(() => {const d=document.querySelector('[role="dialog"]'),
      r=d.getBoundingClientRect();return {left:r.left,right:r.right,client:d.clientWidth,scroll:d.scrollWidth};})()`);
    assert.ok(pricing.left >= -1 && pricing.right <= viewport.width + 1 &&
      pricing.scroll <= pricing.client + 1, 'Pricing dialog horizontal overflow');
    await capture(viewport.name + '-pricing-route');
    report.checks.at(-1).dialog = pricing;
    await evaluate(`document.querySelector('[aria-label="Preisliste schließen"]').click()`);
    await until(() => evaluate(`!document.querySelector('#pricing-dialog-title')`), 'Pricing dialog closes');

    // Retain the existing CADS pricing entrypoint and monthly/annual switch.
    // The commerce entrypoint is a semantic /pricing link, not the retired CTA button.
    // Keep this a real browser navigation and still assert the pricing switch below.
    await navigate('/', `!!document.querySelector('section[aria-labelledby="commerce-entry-title"] a[href="/pricing"]')`);
    await evaluate(`document.querySelector('section[aria-labelledby="commerce-entry-title"] a[href="/pricing"]').click()`);
    await until(() => evaluate(`!!document.querySelector('[role="dialog"] [role="switch"]')`), 'CADS pricing dialog');
    await evaluate(`(() => {const t=document.querySelector('[role="dialog"] [role="switch"]');
      if(t.getAttribute('aria-checked')==='true') t.click();})()`);
    await until(() => evaluate(`document.querySelector('[role="dialog"] [role="switch"]')?.getAttribute('aria-checked')==='false'`), 'Monthly pricing');
    await capture(viewport.name + '-cads-pricing');
    await evaluate(`document.querySelector('[aria-label="Preisliste schließen"]').click()`);
  }
  delete report.viewport;
  report.status = 'PASS';
  console.log(JSON.stringify(report));
} catch (error) {
  // Preserve the actual browser assertion; teardown must not replace it.
  report.error = error instanceof Error ? error.message : String(error);
  console.error('LEARNING_COMMERCE_BROWSER_READBACK_FAILED', report.error);
  process.exitCode = 1;
} finally {
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  socket?.close();
  for (const task of pending.values()) clearTimeout(task.timer);
  chrome.kill('SIGTERM');
  await new Promise(resolve => { if (chrome.exitCode !== null || chrome.signalCode) resolve(); else { chrome.once('exit', resolve); setTimeout(() => { chrome.kill('SIGKILL'); resolve(); }, 3000).unref(); } });
  await rm(profile, { recursive: true, force: true, maxRetries: 12, retryDelay: 250 })
    .catch(error => console.error('CHROME_PROFILE_CLEANUP_WARNING', String(error?.code || error?.message)));
}
