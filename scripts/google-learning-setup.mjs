#!/usr/bin/env node
// Fixed resources and explicit mode; no token, raw reports or PII in logs/artifacts.
import { pathToFileURL } from 'node:url';
import { createGoogleMaintenance } from '../server/google-maintenance-api.mjs';

/** Country totals only: never expose raw pages, queries or contact information. */
export function summarizeLearningReports(traffic, leads, search) {
  const markets = [['Germany', 'deu'], ['Italy', 'ita'], ['Spain', 'esp'], ['Portugal', 'prt'], ['United Kingdom', 'gbr']];
  function sum(report, country, period, metric) {
    const dimensions = (report.dimensionHeaders || []).map(h => h.name);
    const metrics = (report.metricHeaders || []).map(h => h.name);
    if (!dimensions.includes('country') || !dimensions.includes('dateRange') || !metrics.includes(metric)) return null;
    let total = 0;
    for (const row of report.rows || []) {
      if (row.dimensionValues?.[dimensions.indexOf('country')]?.value !== country || row.dimensionValues?.[dimensions.indexOf('dateRange')]?.value !== period) continue;
      const value = row.metricValues?.[metrics.indexOf(metric)]?.value;
      if (!/^\d+$/.test(value || '') || !Number.isSafeInteger(Number(value))) return null;
      total += Number(value);
      if (!Number.isSafeInteger(total)) return null;
    }
    return total;
  }
  return { scope: 'BOUNDED_AGGREGATES_NOT_SITEWIDE_TOTALS',
    coverage: { ga4MaximumRows: 100, ga4Truncated: traffic.rowCount > 100 || leads.rowCount > 100,
      gscMaximumPagesPerCountry: 20, searchWindow: { start: search.startDate, end: search.endDate },
      periods: { current: '28daysAgo through yesterday', previous: '56daysAgo through 29daysAgo' } },
    countries: markets.map(([country, code]) => {
      const report = search.reports.find(item => item.country === code);
      const rows = (report?.rows || []).filter(row => {
        try { const url = new URL(row.keys?.[0]); return url.origin === 'https://capital-ai.online' && !url.search && !url.hash; } catch { return false; }
      });
      const searchValid = !!report && rows.length === (report.rows || []).length && rows.every(row => Number.isSafeInteger(row.clicks) && row.clicks >= 0 && Number.isSafeInteger(row.impressions) && row.impressions >= 0);
      return { country, organicLearning: { currentSessions: sum(traffic, country, 'current', 'sessions'), previousSessions: sum(traffic, country, 'previous', 'sessions'),
        currentGenerateLeadEvents: sum(leads, country, 'current', 'eventCount'), previousGenerateLeadEvents: sum(leads, country, 'previous', 'eventCount'),
        actualEnquiries: 'NOT_PROVEN', paidPurchases: 'NOT_PROVEN' },
        searchTopPages: { clicks: searchValid ? rows.reduce((n, row) => n + row.clicks, 0) : null, impressions: searchValid ? rows.reduce((n, row) => n + row.impressions, 0) : null,
          completeSiteTotals: false } };
    }), note: 'GSC clicks, GA4 sessions and generate_lead events are separate measures. Consent, attribution, thresholds and reporting lag prevent a one-to-one comparison. No uplift or purchase attribution is inferred.' };
}

// Only disclose the exact public canonical sitemap, never other sitemap URLs.
export function summarizeCanonicalSitemap(report) {
  const canonical = 'https://capital-ai.online/sitemap.xml';
  if (report?.property !== 'sc-domain:capital-ai.online' || !Array.isArray(report.sitemaps)) throw new Error('GSC_SITEMAP_RESPONSE_INVALID');
  const matches = report.sitemaps.filter(item => item?.path === canonical);
  if (matches.length > 1) throw new Error('GSC_SITEMAP_RESPONSE_INVALID');
  const item = matches[0];
  const count = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value :
    typeof value === 'string' && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? Number(value) : null;
  const timestamp = value => typeof value === 'string' && value.length <= 40 && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
  return { status: 'PROVIDER_READ_VERIFIED', property: report.property, canonicalSitemap: canonical,
    registered: matches.length === 1, otherSitemaps: report.sitemaps.length - matches.length,
    isPending: typeof item?.isPending === 'boolean' ? item.isPending : null,
    lastDownloaded: timestamp(item?.lastDownloaded), errors: count(item?.errors), warnings: count(item?.warnings),
    indexingConfirmed: false, writes: false };
}

export async function runLearningSetup(mode, maintenance) {
  if (!['audit', 'apply'].includes(mode)) throw new Error('INVALID_MODE');
  const before = await maintenance.call('ga4_learning_configuration');
  const result = { mode, property: before.property.name,
    websiteStreamVerified: before.stream.associatedDomainVerified,
    measurementId: before.stream.measurementId,
    leadDefinition: before.leadDefinition,
    browserCollectionVerified: false, actualLeadsVerified: false,
    writes: null };
  if (mode === 'apply') {
    result.writes = { ga4: await maintenance.call('ga4_configure_learning'),
      sitemap: await maintenance.call('gsc_submit_canonical_sitemap') };
  }
  const after = mode === 'apply' ? await maintenance.call('ga4_learning_configuration') : before;
  result.configuration = { leadEventConfigured: after.leadEventConfigured,
    purchaseEventConfigured: after.purchaseEventConfigured,
    propertySettings: after.property, retention: after.retention, attribution: after.attribution, googleSignals: after.googleSignals,
    permissions: 'READ_ACCESS_VERIFIED; IAM_ROLE_AND_WRITE_ACCESS_NOT_INFERRED',
    checkoutStartsAreKeyEvents: after.checkoutStartsAreKeyEvents,
    emailRedactionEnabled: after.emailRedactionEnabled,
    queryParameterRedactionEnabled: after.queryParameterRedactionEnabled,
    formInteractionsEnabled: after.formInteractionsEnabled,
    enhancedMeasurementDisabled: after.enhancedMeasurementDisabled };
  // Reports stay inside the trusted runner and are never written to artifacts.
  try {
    result.indexInspection = await maintenance.call('gsc_inspect_public_urls');
  } catch (error) {
    // URL-Inspection authorization/availability is a separate evidence boundary.
    // Never replace missing evidence with PASS or block independent GA4 reports.
    result.indexInspection = { status: 'NOT_PROVEN', error: /^GOOGLE_HTTP_[45][0-9]{2}$/.test(error?.message || '') ? error.message : 'GSC_INSPECTION_UNAVAILABLE' };
  }
  try {
    result.sitemapRegistration = summarizeCanonicalSitemap(await maintenance.call('gsc_list_sitemaps'));
  } catch (error) {
    result.sitemapRegistration = { status: 'NOT_PROVEN', error: /^GOOGLE_HTTP_[45][0-9]{2}$/.test(error?.message || '') ? error.message : 'GSC_SITEMAP_READBACK_UNAVAILABLE' };
  }
  try {
    const report = await maintenance.call('ga4_commerce_report');
    const allowed = new Set(['view_item', 'begin_checkout', 'generate_lead', 'purchase']);
    result.commerceFunnel = { status: 'PROVIDER_READ_VERIFIED', period: '28daysAgo..yesterday',
      events: (report.rows || []).flatMap(row => {
        const eventName = row.dimensionValues?.[0]?.value;
        const raw = row.metricValues?.[0]?.value;
        return allowed.has(eventName) && /^\d+$/.test(raw || '') && Number.isSafeInteger(Number(raw))
          ? [{ eventName, eventCount: Number(raw) }] : [];
      }),
      note: 'Separate event counts; missing rows are not proof of zero sales. Stripe remains payment truth.' };
  } catch { result.commerceFunnel = { status: 'NOT_PROVEN', error: 'GA4_COMMERCE_REPORT_UNAVAILABLE' }; }
  const ga4 = await maintenance.call('ga4_learning_report');
  const leads = await maintenance.call('ga4_learning_lead_report');
  const gsc = await maintenance.call('gsc_country_report', { days: 28 });
  result.countryAnalysis = summarizeLearningReports(ga4, leads, gsc);
  result.reporting = { ga4ReadVerified: true, ga4LearningRowsAvailable: !!ga4.rows?.length,
    gscReadVerified: true, gscCountryRowsAvailable: gsc.reports.some(report => report.rows.length > 0),
    note: 'Availability only; no ranking/lead increase claimed. GA4 browser collection and true enquiry receipt need independent verification.' };
  return result;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const mode = process.argv[2] || 'audit';
  if (process.argv.length > 3 || !['audit', 'apply'].includes(mode)) {
    console.error('INVALID_MODE'); process.exitCode = 1;
  } else {
    const env = { ...process.env, GOOGLE_MAINTENANCE_GA4_WRITES_ENABLED: String(mode === 'apply'), GOOGLE_MAINTENANCE_GSC_WRITES_ENABLED: String(mode === 'apply') };
    runLearningSetup(mode, createGoogleMaintenance({ env })).then(result => console.log(JSON.stringify(result, null, 2))).catch(error => {
      // No external error body or credential-bearing subprocess output.
      console.error(/^[A-Z][A-Z0-9_]+$/.test(error.message) ? error.message : 'GOOGLE_LEARNING_SETUP_FAILED'); process.exitCode = 1;
    });
  }
}
