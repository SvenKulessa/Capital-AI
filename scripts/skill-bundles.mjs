import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const DAY = 86_400_000;
const IDENTIFIER = /^[a-z][a-z0-9-]{0,63}$/;
const TRUSTED_SOURCE_HOSTS = new Set([
  'a2a-protocol.org', 'developers.google.com', 'docs.stripe.com', 'eur-lex.europa.eu',
  'mba.tuck.dartmouth.edu', 'modelcontextprotocol.io', 'openid.net', 'opentelemetry.io',
  'spec.openapis.org', 'support.google.com', 'www.nist.gov', 'www.rfc-editor.org', 'www.w3.org',
]);
const OFFER_MODELS = {
  FOUNDER: 'FIXED_SCOPE_QUOTE',
  B2B: 'SETUP_AND_SUBSCRIPTION_QUOTE',
  ENTERPRISE: 'CONTRACT_QUOTE',
};

function fail(reason) {
  throw new TypeError('Skill catalog: ' + reason);
}

function entries(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) fail('expected a record');
  return Object.entries(value);
}

function hasKey(record, id) {
  return typeof id === 'string' && IDENTIFIER.test(id) && Object.hasOwn(record, id);
}

function isDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

function isText(value) {
  return typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 160;
}

function validList(values, predicate, min = 1) {
  return Array.isArray(values) && values.length >= min && values.length <= 30
    && new Set(values).size === values.length && values.every(predicate);
}

function validSourceUrl(value) {
  if (typeof value !== 'string') return false;
  try {
    const url = new URL(value);
    return url.href === value && url.protocol === 'https:' && TRUSTED_SOURCE_HOSTS.has(url.hostname)
      && !url.port && !url.username && !url.password && !url.search && !url.hash;
  } catch {
    return false;
  }
}

export function validateSkillCatalog(registry) {
  const { skillGovernance, skillSourceInventory: inventory, skillBundleCatalog: catalog } = registry ?? {};
  if (inventory?.schema !== 'CAPITAL_AI_SKILL_SOURCE_INVENTORY@1'
      || catalog?.schema !== 'CAPITAL_AI_SKILL_BUNDLE_CATALOG@1') fail('schema');
  const sources = entries(inventory.sources);
  if (sources.length < 1 || sources.length > 30) fail('source count');
  for (const [id, source] of sources) {
    if (!IDENTIFIER.test(id) || !validSourceUrl(source?.url) || !isDate(source.reviewedAt)
        || !isText(source.observedVersion) || !isText(source.searchAnchor)
        || !Number.isInteger(source.reviewIntervalDays)
        || source.reviewIntervalDays < 7 || source.reviewIntervalDays > 365) fail('source ' + id);
  }
  entries(skillGovernance);
  const knownSource = id => hasKey(inventory.sources, id);
  const knownSkill = id => hasKey(skillGovernance, id);
  for (const [id, refs] of entries(inventory.skillSources)) {
    if (!knownSkill(id) || !validList(refs, knownSource)) fail('source mapping ' + id);
  }
  const profiles = entries(catalog.connectionProfiles);
  if (!profiles.length) fail('no connection profiles');
  for (const [id, profile] of profiles) {
    if (!IDENTIFIER.test(id) || !validList(profile?.sourceRefs, knownSource)
        || !validList(profile.verificationSteps, step => typeof step === 'string' && IDENTIFIER.test(step))) {
      fail('connection profile ' + id);
    }
  }
  const audiences = new Set();
  for (const [id, bundle] of entries(catalog.bundles)) {
    if (!IDENTIFIER.test(id) || !Object.hasOwn(OFFER_MODELS, bundle?.audience)
        || audiences.has(bundle.audience) || !/^\d+\.\d+\.\d+$/.test(bundle.version)
        || bundle.offerModel !== OFFER_MODELS[bundle.audience]
        || !validList(bundle.baseSkills, knownSkill)
        || !validList(bundle.addOnSkills, id => knownSkill(id) && !bundle.baseSkills.includes(id), 0)
        || !validList(bundle.connectionProfiles, id => hasKey(catalog.connectionProfiles, id))
        || !validList(bundle.deliverables, isText)) fail('bundle ' + id);
    audiences.add(bundle.audience);
  }
  if (audiences.size !== Object.keys(OFFER_MODELS).length) fail('audience coverage');
}

function sourceStatus(source, asOf) {
  const reviewed = Date.parse(source.reviewedAt);
  const due = reviewed + source.reviewIntervalDays * DAY;
  const checked = Date.parse(asOf);
  return {
    ...source,
    dueAt: new Date(due).toISOString().slice(0, 10),
    reviewState: checked < reviewed ? 'NOT_PROVEN' : checked >= due ? 'REVIEW_DUE' : 'RECORDED',
  };
}

export function skillSourceAudit(registry, asOf = new Date().toISOString().slice(0, 10)) {
  validateSkillCatalog(registry);
  if (!isDate(asOf)) fail('invalid as-of date');
  const { sources, skillSources } = registry.skillSourceInventory;
  const reviewed = Object.fromEntries(Object.entries(sources).map(([id, source]) => [id, sourceStatus(source, asOf)]));
  const skills = Object.entries(registry.skillGovernance).map(([id, skill]) => {
    const sourceRefs = skillSources[id] ?? [];
    const states = sourceRefs.map(ref => reviewed[ref].reviewState);
    let reviewState = 'RECORDED';
    if (!states.length || states.includes('NOT_PROVEN')) reviewState = 'NOT_PROVEN';
    else if (states.includes('REVIEW_DUE')) reviewState = 'REVIEW_DUE';
    return { id, domainOwner: skill.domainOwner, sourceRefs, reviewState };
  });
  return { schema: 'CAPITAL_AI_SKILL_SOURCE_AUDIT@1', asOf, sources: reviewed, skills };
}

export function composeSkillBundle(registry, { bundleId, addOns = [], connections = [], asOf } = {}) {
  const audit = skillSourceAudit(registry, asOf);
  const { bundles, connectionProfiles } = registry.skillBundleCatalog;
  if (!hasKey(bundles, bundleId)) fail('unknown bundle');
  const bundle = bundles[bundleId];
  if (!validList(addOns, id => bundle.addOnSkills.includes(id), 0)
      || !validList(connections, id => bundle.connectionProfiles.includes(id), 0)) {
    fail('unsupported or duplicate bundle selection');
  }
  const skillById = new Map(audit.skills.map(skill => [skill.id, skill]));
  const selected = [
    ...bundle.baseSkills.map(id => [id, 'BASE']),
    ...addOns.map(id => [id, 'ADD_ON']),
  ];
  if (connections.length && !selected.some(([id]) => id === 'integration-engineering')) {
    selected.push(['integration-engineering', 'CONNECTION_REQUIRED']);
  }
  const skills = selected.map(([id, selection]) => {
    const skill = skillById.get(id);
    if (!skill) fail('unregistered integration skill');
    return { ...skill, selection };
  });
  const profiles = connections.map(id => {
    const profile = connectionProfiles[id];
    return { id, ...profile, runtimeState: 'NOT_PROVEN' };
  });
  const refs = new Set([...skills, ...profiles].flatMap(item => item.sourceRefs));
  return {
    bundleId, audience: bundle.audience, version: bundle.version, offerModel: bundle.offerModel,
    asOf: audit.asOf, deliverables: [...bundle.deliverables], skills, connectionProfiles: profiles,
    availableAddOns: [...bundle.addOnSkills], availableConnections: [...bundle.connectionProfiles],
    sources: Object.fromEntries([...refs].map(id => [id, audit.sources[id]])),
    commercialState: 'OFFER_CANDIDATE', commercialRights: 'NOT_PROVEN',
    quoteAmount: null, billingEnabled: false, runtimeState: 'NOT_PROVEN', accessGranted: false,
  };
}

// Read only the leading part of allowlisted official pages. Markers are change signals.
async function probeSource(source, fetchImpl) {
  const maxBytes = 192 * 1024;
  try {
    const options = { redirect: 'manual', credentials: 'omit', signal: AbortSignal.timeout(8000) };
    let response = await fetchImpl(source.url, options);
    const location = response.headers.get('location');
    if ([301, 302, 303, 307, 308].includes(response.status) && location) {
      const target = new URL(location, source.url);
      if (target.origin === new URL(source.url).origin && validSourceUrl(target.href)) {
        await response.body?.cancel();
        response = await fetchImpl(target.href, options);
      }
    }
    if (response.status !== 200 || !response.body) {
      await response.body?.cancel();
      return { state: 'REVIEW_SOURCE', httpStatus: response.status };
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let bytes = 0, prefix = '';
    try {
      while (bytes < maxBytes && !prefix.includes(source.searchAnchor)) {
        const { done, value } = await reader.read();
        if (done) break;
        const sample = value.subarray(0, maxBytes - bytes);
        bytes += sample.length;
        prefix += decoder.decode(sample, { stream: true });
      }
    } finally {
      await reader.cancel();
    }
    return { state: prefix.includes(source.searchAnchor) ? 'ANCHOR_OBSERVED' : 'REVIEW_SOURCE' };
  } catch {
    return { state: 'NOT_PROVEN' };
  }
}

export async function probeSkillSources(registry, { asOf, fetchImpl = fetch } = {}) {
  const audit = skillSourceAudit(registry, asOf);
  const sources = Object.entries(audit.sources);
  for (let index = 0; index < sources.length; index += 4) {
    await Promise.all(sources.slice(index, index + 4).map(async ([, source]) => {
      source.probe = await probeSource(source, fetchImpl);
    }));
  }
  return audit;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const registry = JSON.parse(readFileSync(new URL('../.agents/skills/registry.json', import.meta.url), 'utf8'));
    const [mode, input, ...rest] = process.argv.slice(2);
    let report;
    if (mode === '--audit' && !rest.length) report = skillSourceAudit(registry, input);
    else if (mode === '--probe' && !input) report = await probeSkillSources(registry);
    else if (mode === '--bundle' && input && !rest.length) report = composeSkillBundle(registry, JSON.parse(input));
    else fail('usage: --audit [YYYY-MM-DD] | --probe | --bundle <selection JSON>');
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 2;
  }
}
