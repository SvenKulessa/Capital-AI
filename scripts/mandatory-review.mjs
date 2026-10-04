import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { instrumentCatalog } from '../shared/market-contracts.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (file, fallback = null) => {
  try { return JSON.parse(readFileSync(file, 'utf8')); } catch { return fallback; }
};
const readText = (file, fallback = '') => {
  try { return readFileSync(file, 'utf8'); } catch { return fallback; }
};
const deploys = value => Array.isArray(value) ? value.map(x => x?.deploy || x) : [];
const liveDeploy = value => deploys(value).find(x => x?.status === 'live') || null;
const activeRules = value => Array.isArray(value) ? value.filter(r => r?.enforcement === 'active' && r?.target === 'branch') : [];

export function evaluateMandatoryReview(snapshot) {
  const currentMainSha = snapshot.main?.commit?.sha || null;
  const openPullRequests = Array.isArray(snapshot.openPullRequests) ? snapshot.openPullRequests.length : null;
  const rulesets = activeRules(snapshot.rulesets);
  const requiredContexts = [...new Set(rulesets.flatMap(r =>
    (r.rules || []).filter(rule => rule?.type === 'required_status_checks')
      .flatMap(rule => rule?.parameters?.required_status_checks || [])
      .map(item => item.context).filter(Boolean)))].sort();
  const mainProtection = rulesets.length > 0 &&
    requiredContexts.includes('Docker Security Gate') &&
    requiredContexts.includes('Domain Governance') &&
    rulesets.every(r => (r.bypass_actors || []).length === 0);

  const appDeploy = liveDeploy(snapshot.renderAppDeploys);
  const natsDeploy = liveDeploy(snapshot.renderNatsDeploys);
  const runtimeSourceSha = snapshot.health?.buildIdentity?.sourceSha || null;
  const runtimeIdentityBound = snapshot.health?.buildIdentity?.bound === true;
  const runtimeMatchesMain = Boolean(currentMainSha && runtimeSourceSha && currentMainSha === runtimeSourceSha);

  const infra = snapshot.health?.infrastructure || {};
  const natsAvailability = snapshot.renderNats?.suspended === 'not_suspended' && Boolean(natsDeploy) && infra.nats === 'connected';
  const valkeyAvailability = infra.redis === 'connected';
  const pubsubAvailability = infra.pubsub === 'connected' || infra.pubsub === 'disabled';

  const natsFinding = snapshot.natsFinding || {};
  const openpgpSearchCount = Number.isInteger(snapshot.natsOpenPgpSearch?.total_count)
    ? snapshot.natsOpenPgpSearch.total_count : null;
  const xCrypto057 = /golang\.org\/x\/crypto\s+v0\.57\.0\b/.test(snapshot.natsGoMod || '');
  const findingVisible = natsFinding.id === 'GO-2026-5932' && natsFinding.severity === 'UNKNOWN';
  const findingReachability = openpgpSearchCount === 0
    ? 'NOT_OBSERVED_IN_NATS_REPOSITORY_CODE_SEARCH'
    : openpgpSearchCount == null ? 'UNKNOWN' : 'OPENPGP_REFERENCE_OBSERVED';

  const catalog = Object.values(instrumentCatalog);
  const cryptoConfigured = catalog.filter(i => i.category === 'KRYPTO').length;
  const stocksConfigured = catalog.filter(i => i.category === 'AKTIEN').length;
  const targetCrypto = 100;
  const targetStocks = 100;
  const universeCoverage = cryptoConfigured >= targetCrypto && stocksConfigured >= targetStocks;
  const providerRights = Array.isArray(snapshot.license?.providers) ? snapshot.license.providers : [];
  const providerRightsVerified = providerRights.length > 0 && providerRights.every(p => p?.deployEligible === true && p?.status !== 'CONTRACT_SCOPE_UNVERIFIED');
  const top100Activation = universeCoverage && providerRightsVerified ? 'READY_FOR_RUNTIME_VALIDATION' : 'BLOCKED';

  const authConfiguration = snapshot.auth?.configurationPass === true;
  const authCredentialAuthentication = snapshot.auth?.credentialAuthenticationVerified === true;
  const authLoginVerified = snapshot.auth?.loginVerified === true;
  const licenseApproved = snapshot.license?.status === 'APPROVED' && snapshot.license?.deployEligible === true &&
    (snapshot.license?.applicationSourceSha || snapshot.license?.sourceSha) === currentMainSha;

  const blockers = [];
  if (!mainProtection) blockers.push('MAIN_PROTECTION');
  if (!runtimeMatchesMain) blockers.push('SOURCE_CURRENT_MAIN');
  if (!runtimeIdentityBound) blockers.push('RUNTIME_IDENTITY');
  if (!licenseApproved) blockers.push('LICENSE_REDISTRIBUTION_REVIEW');
  if (!natsAvailability) blockers.push('NATS_AVAILABILITY');
  if (!valkeyAvailability) blockers.push('VALKEY_AVAILABILITY');
  if (!findingVisible) blockers.push('GO_2026_5932_VISIBILITY');
  if (!xCrypto057) blockers.push('NATS_X_CRYPTO_VERSION_CORRELATION');
  if (findingReachability === 'OPENPGP_REFERENCE_OBSERVED') blockers.push('GO_2026_5932_REACHABILITY_REVIEW');
  if (!universeCoverage) blockers.push('TOP100_CRYPTO_AND_STOCK_UNIVERSE');
  if (!providerRightsVerified) blockers.push('MARKET_DATA_RIGHTS');
  if (!authConfiguration) blockers.push('SUPABASE_AUTH_CONFIGURATION');
  if (!authCredentialAuthentication) blockers.push('SUPABASE_AUTH_CREDENTIAL_AUTHENTICATION');
  if (!authLoginVerified) blockers.push('SUPABASE_AUTH_REAL_LOGIN');

  return {
    schema: 'CAPITAL_AI_MANDATORY_REVIEW@1',
    generatedAt: new Date().toISOString(),
    currentMainSha,
    openPullRequests,
    mainProtection: { pass: mainProtection, requiredContexts },
    runtime: {
      appLive: Boolean(appDeploy),
      appImageRef: appDeploy?.image?.ref || null,
      sourceSha: runtimeSourceSha,
      identityBound: runtimeIdentityBound,
      matchesCurrentMain: runtimeMatchesMain,
    },
    brokers: {
      nats: { available: natsAvailability, liveDeployId: natsDeploy?.id || null, appConnection: infra.nats || 'unknown' },
      valkey: { available: valkeyAvailability, appConnection: infra.redis || 'unknown' },
      pubsub: { available: pubsubAvailability, state: infra.pubsub || 'unknown' },
    },
    vulnerabilityEvidence: {
      id: natsFinding.id || 'GO-2026-5932',
      package: natsFinding.package || 'golang.org/x/crypto',
      installed: natsFinding.installed || 'v0.57.0',
      severity: natsFinding.severity || 'UNKNOWN',
      visible: findingVisible,
      fixedVersion: natsFinding.fixed ?? null,
      moduleVersionCorrelated: xCrypto057,
      reachability: findingReachability,
      suppressionAllowed: false,
    },
    marketUniverse: {
      cryptoConfigured,
      stocksConfigured,
      targetCrypto,
      targetStocks,
      coveragePass: universeCoverage,
      providerRightsVerified,
      activation: top100Activation,
    },
    auth: {
      provider: 'supabase',
      configurationPass: authConfiguration,
      credentialAuthenticationVerified: authCredentialAuthentication,
      realLoginVerified: authLoginVerified,
      state: snapshot.auth?.state || 'BLOCKED',
    },
    license: {
      status: snapshot.license?.status || 'UNKNOWN',
      deployEligible: snapshot.license?.deployEligible === true,
      sourceSha: snapshot.license?.applicationSourceSha || snapshot.license?.sourceSha || null,
      currentMainBound: licenseApproved,
    },
    productionHandoff: blockers.length ? 'BLOCKED' : 'REQUIRES_EXPLICIT_HANDOFF_WORKFLOW',
    blockers,
  };
}

export function renderMandatoryReview(report) {
  const yes = value => value ? 'PASS' : 'BLOCKED';
  return [
    'CAPITAL-AI Pflichtreview',
    `Zeit: ${report.generatedAt}`,
    `CURRENT_MAIN: ${report.currentMainSha || 'UNKNOWN'}`,
    `Offene Pull Requests: ${report.openPullRequests ?? 'UNKNOWN'}`,
    '',
    `Main-Schutz: ${yes(report.mainProtection.pass)} (${report.mainProtection.requiredContexts.join(', ') || 'keine Required Contexts'})`,
    `Runtime ↔ Main: ${yes(report.runtime.matchesCurrentMain)} (Runtime ${report.runtime.sourceSha || 'UNKNOWN'})`,
    `NATS-Verfügbarkeit: ${yes(report.brokers.nats.available)} (${report.brokers.nats.appConnection})`,
    `Valkey-Verfügbarkeit: ${yes(report.brokers.valkey.available)} (${report.brokers.valkey.appConnection})`,
    `GO-2026-5932: ${report.vulnerabilityEvidence.visible ? 'VISIBLE' : 'EVIDENCE_MISSING'} / ${report.vulnerabilityEvidence.severity} / Reachability ${report.vulnerabilityEvidence.reachability} / suppress=false`,
    `Top-100 Krypto: ${report.marketUniverse.cryptoConfigured}/${report.marketUniverse.targetCrypto}`,
    `Top-100 Aktien: ${report.marketUniverse.stocksConfigured}/${report.marketUniverse.targetStocks}`,
    `Provider-Rechte: ${yes(report.marketUniverse.providerRightsVerified)}`,
    `Supabase Auth Konfiguration: ${yes(report.auth.configurationPass)}`,
    `Supabase Credential-Authentifizierung: ${yes(report.auth.credentialAuthenticationVerified)}`,
    `Supabase echter Login: ${yes(report.auth.realLoginVerified)}`,
    `Lizenz/Redistribution: ${report.license.status} / deployEligible=${report.license.deployEligible}`,
    '',
    `Production Handoff: ${report.productionHandoff}`,
    `Blocker: ${report.blockers.length ? report.blockers.join(', ') : 'keine im Pflichtreview erkannt; expliziten Handoff-Workflow ausführen'}`,
    '',
    'Hinweis: Ein erfolgreicher Test oder Scan ist keine eigenständige Lizenz-, Security- oder Production-Freigabe.',
  ].join('\n') + '\n';
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const evidenceDir = path.resolve(process.argv[2] || 'mandatory-review');
  const outputJson = path.resolve(process.argv[3] || path.join(evidenceDir, 'mandatory-review.json'));
  const outputText = path.resolve(process.argv[4] || path.join(evidenceDir, 'mandatory-review.txt'));
  const trivyUpdate = readJson(path.join(root, 'docs/security/evidence/trivy-0.75.0-update-20261001.json'), {});
  const snapshot = {
    main: readJson(path.join(evidenceDir, 'main.json'), {}),
    openPullRequests: readJson(path.join(evidenceDir, 'open-prs.json'), null),
    rulesets: readJson(path.join(evidenceDir, 'rulesets.json'), []),
    renderApp: readJson(path.join(evidenceDir, 'render-app.json'), {}),
    renderAppDeploys: readJson(path.join(evidenceDir, 'render-app-deploys.json'), []),
    renderNats: readJson(path.join(evidenceDir, 'render-nats.json'), {}),
    renderNatsDeploys: readJson(path.join(evidenceDir, 'render-nats-deploys.json'), []),
    health: readJson(path.join(evidenceDir, 'health.json'), {}),
    auth: readJson(path.join(evidenceDir, 'auth.json'), {}),
    license: readJson(path.join(root, 'docs/security/evidence/license-rights-review.json'), {}),
    natsFinding: trivyUpdate?.validation?.natsFindingPreserved || {},
    natsOpenPgpSearch: readJson(path.join(evidenceDir, 'nats-openpgp-search.json'), null),
    natsGoMod: readText(path.join(evidenceDir, 'nats-go.mod'), ''),
  };
  const report = evaluateMandatoryReview(snapshot);
  writeFileSync(outputJson, JSON.stringify(report, null, 2) + '\n');
  writeFileSync(outputText, renderMandatoryReview(report));
  console.log(JSON.stringify({ status: report.productionHandoff, blockers: report.blockers }));
}
