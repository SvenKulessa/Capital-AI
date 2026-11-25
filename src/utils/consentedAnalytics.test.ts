import test from 'node:test';
import assert from 'node:assert/strict';
import { saveCookieConsent } from '../privacy/cookieConsentV3';
import { PRIVACY_NOTICE_VERSION } from '../../shared/legal-identity.mjs';
import { buildInstagramLearningTrackingUrl } from '../contracts/instagramCampaignTracking.ts';
import { startConsentedAnalytics, sendPageView, trackReceivedLearningInquiry, trackReceivedGovernanceSprintInquiry, trackVerifiedLearningPurchase, trackCommerceEvent, CONSENT_CHANGED_EVENT } from './consentedAnalytics';

test('basic consent mode loads only after opt-in, sanitizes public events and revokes without further events', async () => {
  const oldWindow = globalThis.window, oldDocument = globalThis.document, oldFetch = globalThis.fetch;
  const listeners = new Map<string, Function>();let stored: string | null = null, fetches = 0, scripts = 0, removed = 0, reloads = 0;
  const writes: string[] = [];
  const w: any = { location: { origin: 'https://capital-ai.online', pathname: '/learning', search: new URL(buildInstagramLearningTrackingUrl()).search, reload() { reloads++; } },
    addEventListener(name: string, callback: Function) { listeners.set(name, callback); },
    localStorage: { getItem: () => stored, removeItem() { stored = null; } } };
  globalThis.window = w;
  globalThis.document = { referrer: 'https://www.google.de/search?q=private-search', get cookie() { return '_ga=test; _ga_0542DT2HCE=test'; }, set cookie(value: string) { writes.push(value); },
    createElement() { scripts++;return { remove() { removed++; } }; }, head: { appendChild() {} } } as any;
  globalThis.fetch = async () => { fetches++;return Response.json({ measurementId: 'G-0542DT2HCE' }); };
  const settle = () => new Promise(resolve => setTimeout(resolve, 0));
  try {
    startConsentedAnalytics();sendPageView('/learning');trackReceivedLearningInquiry('5cf37f93-3eaf-4d6d-9c4c-4247d05a7d72');
    trackVerifiedLearningPurchase({transactionId:'a'.repeat(64), value:25, currency:'EUR'});
    await settle();assert.equal(fetches, 0);assert.equal(scripts, 0);
    stored = JSON.stringify({ version: 'COOKIE_CONSENT_V3', privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: Date.now(), analytics: true, marketing: false });
    listeners.get(CONSENT_CHANGED_EVENT)!();await settle();
    assert.equal(fetches, 1);assert.equal(scripts, 1);
    const commands = () => w.dataLayer.map((args: IArguments) => Array.from(args));
    const defaults = commands().find((c: any[]) => c[0] === 'consent')[2];
    assert.equal(defaults.ad_storage, 'denied');assert.equal(defaults.ad_user_data, 'denied');assert.equal(defaults.ad_personalization, 'denied');
    assert.equal(defaults.analytics_storage, 'denied');
    const consentCommands = commands().filter((command: any[]) => command[0] === 'consent');
    assert.deepEqual(consentCommands.map((command: any[]) => command[1]), ['default', 'update']);
    assert.deepEqual(consentCommands[1][2], { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    const grantIndex = commands().findIndex((command: any[]) => command[0] === 'consent' && command[1] === 'update');
    assert.ok(grantIndex < commands().findIndex((command: any[]) => command[0] === 'config'));
    assert.ok(grantIndex < commands().findIndex((command: any[]) => command[0] === 'event'));

    sendPageView('/learning?email=private@example.test#private');sendPageView('/blog?token=private-token');
    const receipt = '5cf37f93-3eaf-4d6d-9c4c-4247d05a7d72';trackReceivedLearningInquiry(receipt);trackReceivedLearningInquiry(receipt);
    const events = commands().filter((c: any[]) => c[0] === 'event');
    const campaignEvents = events.filter((c: any[]) => c[1] === 'campaign_landing');
    assert.equal(campaignEvents.length, 1, 'only consented, allowlisted landing should be measured');
    assert.equal(campaignEvents[0][2].campaign_source, 'instagram');
    assert.equal(campaignEvents[0][2].campaign_medium, 'organic_social');
    assert.equal(campaignEvents[0][2].page_location, 'https://capital-ai.online/learning');
    assert.equal(campaignEvents[0][2].page_referrer, '');
    w.location.search += '&fbclid=opaque&email=private@example.test';
    sendPageView('/learning');
    assert.equal(commands().filter((c: any[]) => c[1] === 'campaign_landing').length, 1);
    assert.doesNotMatch(JSON.stringify(campaignEvents), /fbclid|private@example|opaque/);
    assert.equal(events.filter((c: any[]) => c[1] === 'generate_lead').length, 1);
    assert.equal(events.filter((c: any[]) => c[1] === 'page_view').length, 2);
    assert.equal(events.find((c: any[]) => c[1] === 'page_view')[2].page_referrer, 'https://www.google.de/');
    assert.doesNotMatch(JSON.stringify(events), /private@example|private-token|private-search|5cf37f93|value|currency/);
    // X uses the exact existing Growth plan tuple, never raw UTM or user data.
    const xQuery = '?utm_source=x&utm_medium=social&utm_campaign=capital-ai-growth-20261120&utm_content=CAP-GROW-005';
    const xEvents = () => commands().filter((c: any[]) => c[1] === 'campaign_landing' && c[2]?.campaign_source === 'x');
    w.location.pathname = '/';
    for (const invalid of [xQuery.replace('CAP-GROW-005','CAP-GROW-999'),
      xQuery+'&utm_content=CAP-GROW-005', xQuery.replace('utm_medium=social','utm_medium=paid'),
      xQuery.replace('utm_source=x','utm_source=private@example.test')]) {
      w.location.search = invalid; sendPageView('/');
    }
    assert.equal(xEvents().length,0);
    w.location.search=xQuery;
    w.location.pathname='/learning';sendPageView('/learning');
    assert.equal(xEvents().length,0);
    w.location.pathname='/';w.location.origin='https://preview.example.test';sendPageView('/');
    assert.equal(xEvents().length,0);
    w.location.origin='https://capital-ai.online';
    w.location.search=xQuery+'&email=private@example.test&opaque=secret-token';
    sendPageView('/');sendPageView('/');
    assert.equal(xEvents().length,1);
    assert.deepEqual(xEvents()[0][2], {send_to:'G-0542DT2HCE',
      campaign_id:'capital-ai-growth-20261120',content_id:'CAP-GROW-005',
      campaign_source:'x',campaign_medium:'social',
      page_location:'https://capital-ai.online/',page_referrer:''});
    assert.doesNotMatch(JSON.stringify(xEvents()),/private@example|secret-token|utm_/);
    w.location.search='';
    // The public NOINDEX B2B route remains measurable only with analytics opt-in.
    // A receipt is local-only deduplication evidence and must never be transmitted.
    w.location.pathname = '/governance-evidence-sprint';
    sendPageView('/governance-evidence-sprint?utm_source=private@example.test');
    const b2bReceipt = '3d70e92c-36bf-4b75-95ad-5339d40fd6a3';
    const beforeB2b = commands().filter((c: any[]) => c[1] === 'generate_lead').length;
    trackReceivedGovernanceSprintInquiry('forged-receipt');
    trackReceivedGovernanceSprintInquiry(b2bReceipt);
    trackReceivedGovernanceSprintInquiry(b2bReceipt);
    const b2bEvents = commands().filter((c: any[]) =>
      c[1] === 'generate_lead' && c[2]?.lead_type === 'governance_evidence_sprint_inquiry');
    assert.equal(b2bEvents.length, 1, 'exactly one event after verified SMTP receipt');
    assert.equal(commands().filter((c: any[]) => c[1] === 'generate_lead').length, beforeB2b + 1);
    assert.equal(b2bEvents[0][2].page_location, 'https://capital-ai.online/governance-evidence-sprint');
    assert.deepEqual(Object.keys(b2bEvents[0][2]).sort(),
      ['lead_type','page_location','page_referrer','send_to']);
    assert.doesNotMatch(JSON.stringify(b2bEvents), /3d70e92c|private@example|utm_source|email|message|value|currency/i);
    w.location.pathname = '/learning';
    const purchase = {transactionId:'b'.repeat(64), value:20, currency:'EUR'};
    trackVerifiedLearningPurchase(purchase);trackVerifiedLearningPurchase(purchase);
    trackVerifiedLearningPurchase({...purchase, transactionId:'cs_private'});
    trackVerifiedLearningPurchase({...purchase, transactionId:'c'.repeat(64), value:-1});
    assert.equal(commands().filter((c: any[]) => c[1] === 'purchase').length, 1);
    assert.equal(commands().find((c: any[]) => c[1] === 'purchase')[2].value, 20);
    w.location.pathname = '/pricing';
    sendPageView('/pricing?session_id=cs_private');
    const item = {currency:'EUR',value:7,items:[{item_id:'saas-starter-monthly',item_name:'private@example.org',price:7,quantity:1}],email:'private@example.org'};
    trackCommerceEvent('view_item', item);trackCommerceEvent('view_item', item);
    trackCommerceEvent('begin_checkout', item);
    trackCommerceEvent('purchase', {...item,transactionId:'e'.repeat(64)});
    trackCommerceEvent('purchase', {...item,transactionId:'e'.repeat(64)});
    assert.equal(commands().filter((c: any[]) => c[1] === 'view_item').length, 1);
    assert.equal(commands().filter((c: any[]) => c[1] === 'begin_checkout').length, 1);
    assert.equal(commands().filter((c: any[]) => c[1] === 'purchase').length, 2);
    assert.doesNotMatch(JSON.stringify(commands()), /private@example|cs_private/);
    w.location.pathname = '/profile';
    const privateCount = commands().length;
    trackCommerceEvent('begin_checkout', item);
    trackReceivedLearningInquiry('e4f044bc-1103-467d-9810-ea98f93fdca3');
    trackReceivedGovernanceSprintInquiry('0fc4e399-8470-4fc8-bede-fbe5a22d102d');
    assert.equal(commands().length, privateCount);
    w.location.pathname = '/learning';
    stored = JSON.stringify({ version: 'COOKIE_CONSENT_V3', privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: Date.now(), analytics: false, marketing: false });
    listeners.get(CONSENT_CHANGED_EVENT)!();await settle();const count = commands().length;
    trackVerifiedLearningPurchase({transactionId:'d'.repeat(64), value:25, currency:'EUR'});
    sendPageView('/learning');trackReceivedLearningInquiry('b4f044bc-1103-467d-9810-ea98f93fdca3');
    w.location.pathname = '/governance-evidence-sprint';
    trackReceivedGovernanceSprintInquiry('c70f9f48-9d26-475f-9a95-f41cc0527825');
    assert.equal(commands().length, count);
    w.location.pathname = '/learning';assert.equal(reloads, 1);assert.equal(removed, 1);
    assert.ok(writes.some(value => value.includes('Max-Age=0')));assert.equal(w['ga-disable-G-0542DT2HCE'], true);
    // A failed persistent revocation must not reload and immediately restore the old saved grant.
    stored = JSON.stringify({ version: 'COOKIE_CONSENT_V3', privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: Date.now(), analytics: true, marketing: false });
    listeners.get(CONSENT_CHANGED_EVENT)!();await settle();assert.equal(scripts, 2);
    w.localStorage.setItem = () => { throw Error('write-denied'); };
    w.localStorage.removeItem = () => { throw Error('remove-denied'); };
    w.dispatchEvent = (event: Event) => { listeners.get(event.type)?.(event); return true; };
    assert.equal(saveCookieConsent({ analytics: false, marketing: false }), null);await settle();
    assert.equal(reloads, 1);assert.equal(w['ga-disable-G-0542DT2HCE'], true);
    const blockedCount = commands().length;sendPageView('/learning');assert.equal(commands().length, blockedCount);
    w.localStorage.setItem = (_key: string, value: string) => { stored = value; };
    w.localStorage.removeItem = () => { stored = null; };
    saveCookieConsent({ analytics: false, marketing: false });
    stored = JSON.stringify({ version: 'COOKIE_CONSENT_V3', privacyNoticeVersion: PRIVACY_NOTICE_VERSION, savedAt: Date.now(), analytics: true, marketing: false });
    let resolveConfig: (response: Response) => void;
    globalThis.fetch = () => new Promise<Response>(resolve => { resolveConfig = resolve; });
    listeners.get(CONSENT_CHANGED_EVENT)!();await settle();
    w.location.pathname = '/profile';
    resolveConfig!(Response.json({ measurementId: 'G-0542DT2HCE' }));await settle();
    assert.equal(scripts, 2, 'late configuration must not load tracking after entering a private route');

  } finally { globalThis.window = oldWindow;globalThis.document = oldDocument;globalThis.fetch = oldFetch; }
});
