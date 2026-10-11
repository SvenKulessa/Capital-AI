// Projection of source-declared tooling and licensing; NO runtime, pricing or legal attestation.
const PERMISSIVE = new Set(['MIT', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', 'ISC', '0BSD', 'Unlicense']);
const COPYLEFT = /^(?:AGPL|GPL|LGPL|MPL|EPL)-/;
const NON_RELEASE = /^(?:managed(?:-cloud)?|unknown|unbekannt|not installed|null)$/i;
function matchField(block, field) {
  const safe = field.replace(/[^a-zA-Z]/g, '');
  const found = block.match(new RegExp('(?:^|\\n)\\s*' + safe + ":\\s*'([^'\\n]*)'", 'm'));
  return found?.[1] || null;
}
export function parseDeclaredComponentInventory(source) {
  const result = new Map();
  // This first-party TS file is a static curated registry, not executable backend input.
  for (const block of String(source || '').split(/\n(?=  \{\n    id: ')/)) {
    const name = matchField(block, 'name');
    const id = matchField(block, 'id');
    if (!name || !id) continue;
    const alternativesSection = block.match(/\balternatives:\s*\[([\s\S]*?)\]\s*,\s*evidence:/)?.[1] || '';
    const alternatives = [...alternativesSection.matchAll(/\{\s*name:\s*'([^']+)'\s*,\s*role:\s*'([^']+)'\s*,\s*license:\s*'([^']+)'\s*\}/g)]
      .slice(0, 6).map(hit => ({ name: hit[1], role: hit[2], licenseDeclared: hit[3] }));
    result.set(name.toLocaleLowerCase('en'), {
      id, name, licenseDeclared: matchField(block, 'license'),
      inventoryVersion: matchField(block, 'activeVersion'),
      lifecycle: matchField(block, 'lifecycle'),
      alternatives,
      source: 'src/data/externalComponentInventory.ts',
    });
  }
  return result;
}
export function classifyDeclaredLicense(value, source) {
  const declared = typeof value === 'string' && value.trim().length < 100 ? value.trim() : null;
  if (!declared) return {
    declared: null, source: null, commercial: 'NOT_PROVEN', redistribution: 'NOT_PROVEN',
    approval: 'NOT_PROVEN',
  };
  if (PERMISSIVE.has(declared)) return {
    declared, source, commercial: 'GENERALLY_ALLOWED_WITH_CONDITIONS',
    redistribution: 'LICENSE_NOTICE_AND_OBLIGATIONS', approval: 'REVIEW_REQUIRED',
  };
  if (COPYLEFT.test(declared)) return {
    declared, source, commercial: 'CONDITIONAL_COPYLEFT',
    redistribution: 'REVIEW_REQUIRED', approval: 'REVIEW_REQUIRED',
  };
  return { declared, source, commercial: 'NOT_PROVEN', redistribution: 'NOT_PROVEN',
    approval: 'REVIEW_REQUIRED' };
}
function dailyCronCount(source) {
  const schedules = [...String(source || '').matchAll(/^\s*-?\s*cron:\s*["']?([^\n"'#]+)["']?/gm)]
    .map(m => m[1].trim());
  if (!schedules.length) return { perDay: null, declaredCron: [] };
  let total = 0;
  for (const cron of schedules) {
    const terms = cron.split(/\s+/);
    if (terms.length !== 5 || terms[2] !== '*' || terms[3] !== '*' || terms[4] !== '*')
      return { perDay: null, declaredCron: schedules };
    const [minute, hour] = terms;
    const pieces = value => {
      if (value === '*') return 60;
      if (/^\d+$/.test(value)) return 1;
      const every = /^\*\/(\d+)$/.exec(value);
      return every && Number(every[1]) >= 1 ? Math.ceil(60 / Number(every[1])) : null;
    };
    const minuteCount = pieces(minute);
    const hourCount = hour === '*' ? 24 : /^\d+$/.test(hour) ? 1
      : /^\*\/(\d+)$/.test(hour) ? Math.ceil(24 / Number(hour.slice(2))) : null;
    if (minuteCount === null || hourCount === null) return { perDay: null, declaredCron: schedules };
    total += minuteCount * hourCount;
  }
  return { perDay: total, declaredCron: schedules };
}
export function assessCatalogEntries(entries, { lock, supplementary = {}, inventorySource = '' } = {}) {
  const inventory = parseDeclaredComponentInventory(inventorySource);
  return entries.map(entry => {
    const matching = inventory.get(entry.name.toLocaleLowerCase('en')) ||
      inventory.get(entry.name.replace('NATS JetStream', 'NATS + JetStream').toLocaleLowerCase('en'));
    const isNpm = entry.id.startsWith('npm:');
    const isExternal = entry.kind === 'EXTERNER_DIENST';
    const primaryPath = entry.path.split(' → ')[0];
    const locked = isNpm ? (entry.id.startsWith('npm:deploy/')
      ? supplementary[entry.id.slice(4, entry.id.lastIndexOf(':')) + '/package-lock.json']
      : lock)?.packages?.['node_modules/' + entry.name] : null;
    const license = classifyDeclaredLicense(
      isNpm ? locked?.license : matching?.licenseDeclared,
      isNpm ? 'package-lock.json (Paketmetadaten, kein Lizenztext)' : matching?.source);
    const curatedVersion = matching?.inventoryVersion && !NON_RELEASE.test(matching.inventoryVersion)
      ? matching.inventoryVersion : null;
    const schedule = entry.kind === 'GITHUB_ACTION'
      ? dailyCronCount(supplementary[primaryPath]) : { perDay: null, declaredCron: [] };
    const priceModel = isNpm
      ? 'OSS_PACKAGE_NO_LICENSE_FEE_ASSUMED'
      : isExternal ? 'PROVIDER_TARIFF_NOT_PROVEN'
      : 'REPOSITORY_COMPONENT_NO_SEPARATE_TARIFF';
    const consumption = isExternal ? (matching?.lifecycle === 'ACTIVE'
      ? 'DECLARED_ACTIVE_NOT_RUNTIME_VERIFIED' : 'REPO_BINDING_ONLY')
      : entry.kind === 'GITHUB_ACTION' ? 'SCHEDULE_CONFIGURED_NOT_EXECUTION'
        : ['NPM_DEVTOOL','BUILD_TOOL','GITHUB_ACTION_PIN'].includes(entry.kind)
          ? 'BUILD_CI_ONLY_NOT_RUNTIME_VERIFIED'
          : 'SOURCE_PRESENT_NOT_RUNTIME_VERIFIED';
    return {
      ...entry,
      inventoryVersion: curatedVersion,
      inventoryVersionBasis: curatedVersion ? 'Kuratiertes Komponentenregister, kein aktueller Runtime-Readback' : null,
      license,
      commercialServiceRights: 'NOT_PROVEN', // software SPDX never grants provider API, redistribution or data rights
      priceModel, freeTier: 'NOT_PROVEN', paidTier: 'NOT_PROVEN', dailyQuota: null,
      use: {
        state: consumption,
        actualCallsPerDay: null, actualCallsEvidence: 'NOT_PROVEN',
        scheduledRunsPerDay: schedule.perDay, scheduledCrons: schedule.declaredCron,
        measurementWindow: null,
      },
      alternatives: matching?.alternatives || [],
      alternativesBasis: matching?.alternatives.length ? matching.source + ' (unbewertete Optionen)' : 'NOT_PROVEN',
    };
  });
}
export function summarizeCatalog(entries) {
  const tally = key => entries.reduce((acc, row) => {
    acc[row[key]] = (acc[row[key]] || 0) + 1; return acc;
  }, {});
  return {
    byKind: tally('kind'),
    byDomain: tally('domain'),
    declaredExternal: entries.filter(row => row.kind === 'EXTERNER_DIENST').length,
    runtimeConsumptionVerified: entries.filter(row => row.use?.actualCallsEvidence === 'VERIFIED').length,
    dailyUsageMeasurements: entries.filter(row => row.use?.actualCallsPerDay !== null &&
      Number.isInteger(row.use?.actualCallsPerDay)).length,
    unresolvedCommercialRights: entries.filter(row => row.commercialServiceRights !== 'VERIFIED').length,
  };
}
