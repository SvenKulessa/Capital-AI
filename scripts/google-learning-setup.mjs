#!/usr/bin/env node
// Fixed resources and explicit mode; no token, raw reports or PII in logs/artifacts.
import { pathToFileURL } from 'node:url';
import { createGoogleMaintenance } from '../server/google-maintenance-api.mjs';

export async function runLearningSetup(mode, maintenance) {
  if (!['audit', 'apply'].includes(mode)) throw new Error('INVALID_MODE');
  const before = await maintenance.call('ga4_learning_configuration');
  const result = { mode, property: before.property.name,
    websiteStreamVerified: before.stream.associatedDomainVerified,
    leadDefinition: before.leadDefinition,
    browserCollectionVerified: false, actualLeadsVerified: false,
    writes: null };
  if (mode === 'apply') {
    result.writes = { ga4: await maintenance.call('ga4_configure_learning'),
      sitemap: await maintenance.call('gsc_submit_canonical_sitemap') };
  }
  const after = mode === 'apply' ? await maintenance.call('ga4_learning_configuration') : before;
  result.configuration = { leadEventConfigured: after.leadEventConfigured,
    emailRedactionEnabled: after.emailRedactionEnabled,
    queryParameterRedactionEnabled: after.queryParameterRedactionEnabled,
    formInteractionsEnabled: after.formInteractionsEnabled };
  // Reports stay inside the trusted runner and are never written to artifacts.
  const ga4 = await maintenance.call('ga4_learning_report');
  const gsc = await maintenance.call('gsc_country_report', { days: 28 });
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
