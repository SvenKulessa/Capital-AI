import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveAppRoute } from '../src/utils/appNavigation.ts';
import { resolveSeoIndexingPolicy, SEO_INDEXING_STATES } from '../shared/seo-indexing-policy.mjs';
import { isAnalyticsMeasurable } from '../shared/analytics-measurement-policy.mjs';

const page = readFileSync(new URL('../src/features/home/GovernanceEvidenceSprintPage.tsx', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../src/app/routing/AppRoutes.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
const commerce = readFileSync(new URL('../src/features/home/CommerceEntrySection.tsx', import.meta.url), 'utf8');
const sample = readFileSync(new URL('../docs/growth/GOVERNANCE-EVIDENCE-SPRINT-MUSTERBERICHT-20261119.md', import.meta.url), 'utf8');
const inquiry = readFileSync(new URL('../server/learning-inquiry.mjs', import.meta.url), 'utf8');
const routeAnalytics = readFileSync(new URL('../src/platform/analytics/useRouteAnalytics.ts', import.meta.url), 'utf8');
const measurable = readFileSync(new URL('../shared/analytics-measurement-policy.mjs', import.meta.url), 'utf8');
const consented = readFileSync(new URL('../src/utils/consentedAnalytics.ts', import.meta.url), 'utf8');

test('sprint route is public, canonical and discoverable on the homepage', () => {
  assert.equal(resolveAppRoute('/governance-evidence-sprint'), '/governance-evidence-sprint');
  assert.equal(resolveAppRoute('/evidence-sprint/'), '/governance-evidence-sprint');
  assert.match(routes, /GovernanceEvidenceSprintPage/);
  assert.match(home, /CommerceEntrySection/);
  assert.match(commerce, /\/governance-evidence-sprint/);
  assert.match(page, /href="#anfrage"/);
  assert.match(page, /href="#musterbericht"/);
  assert.equal(resolveSeoIndexingPolicy('/governance-evidence-sprint').classification, SEO_INDEXING_STATES.NOINDEX);
  assert.match(routeAnalytics, /'\/governance-evidence-sprint': \{/);
  assert.match(routeAnalytics, /canonicalPath: '\/governance-evidence-sprint'/);
});

test('offer clearly separates scoped manual deliverables, price hypothesis and exclusions', () => {
  for (const keyword of ['690 € netto', 'unverbindliche Kalkulationshypothese', 'zwei bestehende CI-Workflows', 'kein Checkout', 'Kein Penetrationstest', 'kein', 'NOT_PROVEN']) {
    assert.ok(page.includes(keyword), keyword);
  }
  assert.match(page, /keine Kunden-Evidence/);
  assert.match(sample, /MUSTER \/ NICHT DURCHGEFÜHRTE PRÜFUNG/);
  assert.match(sample, /keine echten Testergebnisse/);
  assert.match(sample, /keine Newsletter-Einwilligung/);
});

test('inquiry uses existing bounded mail endpoint and explicit privacy acknowledgement, never CRM or analytics with contact data', () => {
  assert.match(page, /\/api\/public\/contact/);
  assert.match(page, /MAIL_SERVER_ACCEPTED/);
  assert.match(page, /privacyAcknowledged/);
  assert.match(page, /type="checkbox" required/);
  assert.match(page, /href="\/datenschutz"/);
  assert.match(page, /maxLength=\{1800\}/);
  assert.match(page, /name="website"/);
  assert.match(page, /credentials: 'same-origin'/);
  assert.doesNotMatch(page, /trackEvent\(|localStorage|sessionStorage|GA4_MEASUREMENT_ID|STRIPE_SECRET_KEY/);
  assert.match(inquiry, /origin !== 'https:\/\/capital-ai\.online'/);
  assert.match(inquiry, /createLimiter\(3, 15 \* 60_000/);
  assert.match(inquiry, /body\.website !== ''/);
  assert.match(inquiry, /receipt: body\.requestId, status: 'MAIL_SERVER_ACCEPTED'/);
});

const agentPreview = readFileSync(new URL('../docs/product/agent-operations-pilot-preview.html', import.meta.url), 'utf8');
const agentCampaign = readFileSync(new URL('../docs/growth/AGENT-OPERATIONS-B2B-PILOT-CAMPAIGN-20261119.md', import.meta.url), 'utf8');

test('internal agent preview reuses established B2B contact path, no autonomous lead collection', () => {
  assert.match(agentPreview, /INTERNE VORSCHAU · NICHT VERÖFFENTLICHT/);
  assert.match(agentPreview, /noindex,nofollow,noarchive/);
  assert.match(agentPreview, /DRAFT_ONLY · NO_AUTO_PUBLISH/);
  assert.match(agentPreview, /https:\/\/capital-ai\.online\/governance-evidence-sprint#anfrage/);
  for (const id of ['ci-evidence', 'credential-expiry', 'media-rights']) {
    assert.match(agentPreview, new RegExp('data-workflow="' + id + '"'));
  }
  assert.doesNotMatch(agentPreview, /<form\b|\bfetch\s*\(|\bsendBeacon\s*\(|\bgtag\s*\(|\bdataLayer\b|\blocalStorage\b|\bsessionStorage\b/i);
  assert.match(page, /\/api\/public\/contact/);
  assert.match(page, /privacyAcknowledged/);
});

test('organic campaign contains three qualified human-reviewed draft messages without paid activation', () => {
  assert.match(agentCampaign, /DRAFT_ONLY \/ NO_AUTO_PUBLISH \/ NO_PAID_ADS/);
  for (const audience of ['IT-Dienstleister', 'DevSecOps', 'Content- und Medienrechte-Operations']) {
    assert.ok(agentCampaign.includes(audience), audience);
  }
  assert.match(agentCampaign, /utm_medium=organic/);
  assert.match(agentCampaign, /Mailserver-Receipt/);
  assert.match(agentCampaign, /NOT_PROVEN/);
  assert.match(agentCampaign, /[Kk]eine neue Tracker-Initialisierung/);
  assert.doesNotMatch(agentCampaign, /STRIPE_SECRET_KEY|OPENAI_API_KEY|<script|AGENT_OPERATIONS_PILOT_ENABLED\s*=\s*true/i);
});

test('B2B conversion attribution is consented and emits only after SMTP receipt', () => {
  assert.ok(measurable.includes("'/governance-evidence-sprint'"));
  assert.ok(page.includes('trackReceivedGovernanceSprintInquiry(result.receipt)'));
  assert.ok(page.indexOf("result.status !== 'MAIL_SERVER_ACCEPTED'") <
    page.indexOf('trackReceivedGovernanceSprintInquiry(result.receipt)'));
  assert.ok(consented.includes("window.location.origin !== 'https://capital-ai.online'"));
  assert.ok(consented.includes("window.location.pathname !== '/governance-evidence-sprint'"));
  assert.ok(consented.includes("lead_type: 'governance_evidence_sprint_inquiry'"));
  assert.doesNotMatch(page, /trackEvent\(|localStorage|sessionStorage|GA4_MEASUREMENT_ID|STRIPE_SECRET_KEY/);
});

test('B2B pageview allowlist remains separate from SEO and private-surface denial', () => {
  assert.equal(resolveSeoIndexingPolicy('/governance-evidence-sprint').classification, SEO_INDEXING_STATES.NOINDEX);
  assert.equal(isAnalyticsMeasurable('/governance-evidence-sprint'), true);
  for (const path of ['/profile', '/api/public/contact', '/governance-evidence-sprint?email=private@example.invalid',
    '/governance-evidence-sprint#receipt', 'https://unknown.invalid/governance-evidence-sprint']) {
    assert.equal(isAnalyticsMeasurable(path), false, path);
  }
});
