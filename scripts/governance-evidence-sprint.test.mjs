import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolveAppRoute } from '../src/utils/appNavigation.ts';
import { resolveSeoIndexingPolicy, SEO_INDEXING_STATES } from '../shared/seo-indexing-policy.mjs';

const page = readFileSync(new URL('../src/features/home/GovernanceEvidenceSprintPage.tsx', import.meta.url), 'utf8');
const routes = readFileSync(new URL('../src/app/routing/AppRoutes.tsx', import.meta.url), 'utf8');
const home = readFileSync(new URL('../src/features/home/HomePage.tsx', import.meta.url), 'utf8');
const sample = readFileSync(new URL('../docs/growth/GOVERNANCE-EVIDENCE-SPRINT-MUSTERBERICHT-20261119.md', import.meta.url), 'utf8');
const inquiry = readFileSync(new URL('../server/learning-inquiry.mjs', import.meta.url), 'utf8');
const routeAnalytics = readFileSync(new URL('../src/platform/analytics/useRouteAnalytics.ts', import.meta.url), 'utf8');

test('sprint route is public, canonical and discoverable on the homepage', () => {
  assert.equal(resolveAppRoute('/governance-evidence-sprint'), '/governance-evidence-sprint');
  assert.equal(resolveAppRoute('/evidence-sprint/'), '/governance-evidence-sprint');
  assert.match(routes, /GovernanceEvidenceSprintPage/);
  assert.match(home, /\/governance-evidence-sprint/);
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
