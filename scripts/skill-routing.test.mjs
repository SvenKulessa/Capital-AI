import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { normalizeSkillText, selectSpecialists, selectSkillPlan } from './skill-routing.mjs';
import { evaluateSpecialistRouting } from './skill-routing-evaluation.mjs';
import { composeSkillBundle, probeSkillSources, skillSourceAudit, validateSkillCatalog } from './skill-bundles.mjs';

const readJson = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const registry = readJson('../.agents/skills/registry.json');
const corpus = readJson('./skill-routing-cases.json');
const domains = Object.keys(registry.domains);
const ids = registry.sharedSkills.specialists;
const sorted = items => [...items].sort();

test('routing lexicon matches the central shared-skill registry', () => {
  assert.equal(registry.specialistRouting.version, 'CAPITAL_AI_SPECIALIST_ROUTING@1');
  assert.deepEqual(sorted(Object.keys(registry.specialistRouting.signals)), sorted(ids));
  assert.equal(new Set(ids).size, 10);
  for (const id of ids) {
    const signals = registry.specialistRouting.signals[id];
    assert.ok(Array.isArray(signals) && signals.length >= 7, id);
    assert.equal(new Set(signals.map(normalizeSkillText)).size, signals.length, id);
    assert.ok(registry.specialistSkillMetadata[id], id);
    assert.match(readFileSync(new URL('../.agents/skills/' + id + '/SKILL.md', import.meta.url), 'utf8'), /AGENTS\.md/);
  }
});

test('corpus covers ten specialists, five domains, cross-skills and abstention', () => {
  assert.equal(corpus.schemaVersion, 'CAPITAL_AI_SKILL_EVALUATION@1');
  assert.equal(corpus.cases.length, 41);
  assert.equal(new Set(corpus.cases.map(c => c.id)).size, 41);
  assert.deepEqual(sorted(new Set(corpus.cases.map(c => c.domain))), sorted(domains));
  assert.ok(corpus.cases.filter(c => c.expectedSpecialists.length >= 2).length >= 6);
  assert.ok(corpus.cases.filter(c => c.expectedSpecialists.length === 0).length >= 5);
  for (const id of ids) {
    assert.ok(corpus.cases.filter(c => c.expectedSpecialists.length === 1 && c.expectedSpecialists[0] === id).length >= 3, id);
  }
});

test('all 41 curated prompts produce the exact expected specialist set', async t => {
  for (const c of corpus.cases) {
    await t.test(c.id, () => {
      const result = selectSpecialists(c.task, { domain: c.domain, registry });
      assert.deepEqual(sorted(result.skills), sorted(c.expectedSpecialists));
      assert.equal(result.status, c.expectedSpecialists.length ? 'MATCHED' : 'REVIEW_REQUIRED');
      assert.equal(result.primaryDomain, c.domain);
      assert.equal(result.scope, 'DETERMINISTIC_TEXT_SIGNALS_ONLY');
      assert.deepEqual(result.matchedSignals.map(s => s.skill), result.skills);
      for (const matched of result.matchedSignals) {
        assert.ok(matched.signals.length > 0);
        assert.ok(matched.signals.every(s => registry.specialistRouting.signals[matched.skill].includes(s)));
      }
    });
  }
});

test('specialist choice stays independent of the invoking domain', () => {
  for (const c of corpus.cases) for (const domain of domains) {
    const result = selectSpecialists(c.task, { domain, registry });
    assert.deepEqual(sorted(result.skills), sorted(c.expectedSpecialists), c.id + '/' + domain);
  }
});

test('normalize, abstain and reject malformed task or registry without execution', () => {
  assert.deepEqual(selectSpecialists('Prüfe Datenqualität + (ETL)?', { registry }).skills, ['data-engineering']);
  assert.deepEqual(selectSpecialists('..* [a-z] shell | sudo rm -rf /', { registry }).skills, []);
  assert.equal(selectSpecialists('Ein unklares Problem', { registry }).status, 'REVIEW_REQUIRED');
  assert.throws(() => selectSpecialists(42, { registry }), /task must be/);
  assert.throws(() => selectSpecialists('a'.repeat(8193), { registry }), /task must be/);
  assert.throws(() => selectSpecialists('RAG', { domain: 'OTHER', registry }), /unknown primary domain/);
  assert.throws(() => selectSpecialists('RAG', { registry: {} }), /invalid specialist routing registry/);
  const broken = structuredClone(registry);
  delete broken.specialistRouting.signals['quant-research'];
  assert.throws(() => selectSpecialists('RAG', { registry: broken }), /specialist signals must match/);
});

test('standalone CLI returns inspectable JSON and does not call providers', () => {
  const file = fileURLToPath(new URL('./skill-routing.mjs', import.meta.url));
  const actual = JSON.parse(execFileSync(process.execPath, [file, '--domain', 'TRUST', 'DSGVO RAG'], { encoding: 'utf8' }));
  assert.deepEqual(sorted(actual.skills), ['ai-engineering', 'legal-compliance']);
  assert.equal(actual.primaryDomain, 'TRUST');
  assert.equal(actual.scope, 'DETERMINISTIC_TEXT_SIGNALS_ONLY');
});

const challenges = readJson('./skill-routing-challenges.json');

test('challenge corpus covers ten skills, five domains, compound cases and abstention', () => {
  assert.equal(challenges.schemaVersion, 'CAPITAL_AI_SKILL_CHALLENGES@1');
  assert.equal(challenges.cases.length, 35);
  assert.equal(new Set(challenges.cases.map(c => c.id)).size, 35);
  assert.deepEqual(sorted(new Set(challenges.cases.map(c => c.domain))), sorted(domains));
  for (const id of ids)
    assert.equal(challenges.cases.filter(c => c.expectedSpecialists.length === 1 &&
      c.expectedSpecialists[0] === id).length, 2, id);
  assert.equal(challenges.cases.filter(c => c.expectedSpecialists.length >= 2).length, 7);
  assert.equal(challenges.cases.filter(c => c.expectedSpecialists.length === 0).length, 8);
});

test('challenge tasks select exact specialist sets in every invoking domain', () => {
  for (const c of challenges.cases) for (const domain of domains) {
    const actual = selectSpecialists(c.task, {domain,registry});
    assert.deepEqual(sorted(actual.skills), sorted(c.expectedSpecialists), c.id + '/' + domain);
  }
});

test('76 curated tasks report exact match, micro precision/recall and per-skill results', () => {
  const report = evaluateSpecialistRouting([...corpus.cases,...challenges.cases],registry);
  assert.equal(report.corpusSize, 76);
  assert.deepEqual(report.exactSet,{matched:76,total:76,accuracy:1});
  assert.deepEqual([report.micro.precision,report.micro.recall,report.micro.f1],[1,1,1]);
  assert.equal(report.failures.length,0);
  assert.deepEqual(sorted(Object.keys(report.bySpecialist)),sorted(ids));
  assert.deepEqual(sorted(Object.keys(report.byDomain)),sorted(domains));
  for(const stats of Object.values(report.bySpecialist)) assert.ok(stats.tp>=5);
});

test('evaluator surfaces false positives, false negatives and malformed samples', () => {
  const probe=[
    {id:'probe-fp',domain:'TRUST',task:'RAG',expectedSpecialists:[]},
    {id:'probe-fn',domain:'PRODUCT',task:'Unbekannter neutraler Satz',expectedSpecialists:['ai-engineering']},
    {id:'probe-tp',domain:'MARKET',task:'Backtesting',expectedSpecialists:['quant-research']}
  ];
  const report=evaluateSpecialistRouting(probe,registry);
  assert.equal(report.exactSet.matched,1);
  assert.deepEqual([report.micro.tp,report.micro.fp,report.micro.fn],[1,1,1]);
  assert.deepEqual(report.failures.map(x=>x.id),['probe-fp','probe-fn']);
  assert.ok(report.micro.f1<1);
  assert.throws(()=>evaluateSpecialistRouting([...probe,probe[0]],registry),/invalid or duplicate/);
});


test('task plan combines SEO, commerce and GA4 skills without changing the primary agent', () => {
  for (const domain of domains) {
    const plan = selectSkillPlan('SEO Search Console checkout GA4', {domain, registry});
    assert.equal(plan.agent, registry.domains[domain].chatAgent);
    assert.deepEqual(plan.skills.slice(0, 2), [registry.domains[domain].engineering, registry.domains[domain].advisory]);
    for (const id of ['seo-engineering','revenue-engineering','analytics-intelligence']) assert.ok(plan.skills.includes(id));
    assert.equal(new Set(plan.skills).size, plan.skills.length);
    assert.equal(plan.scope, 'ADVISORY_SKILL_PLAN_NO_EXECUTION_OR_AUTHORIZATION');
    for (const file of plan.skillFiles) assert.ok(readFileSync(new URL('../'+file, import.meta.url),'utf8').includes('AGENTS.md'));
  }
});

test('task plan abstains on unrelated text and rejects unregistered skills', () => {
  const plan = selectSkillPlan('Unbekannte neutrale Aufgabe', {domain:'GROWTH', registry});
  assert.equal(plan.status,'REVIEW_REQUIRED');
  assert.ok(!plan.skills.includes('seo-engineering'));
  assert.ok(!plan.skills.includes('revenue-engineering'));
  assert.throws(()=>selectSkillPlan('SEO',{registry}),/primary domain required/);
  const bad = structuredClone(registry);
  bad.taskSkillRouting.signals['unknown-skill']=['seo'];
  assert.throws(()=>selectSkillPlan('SEO',{domain:'GROWTH',registry:bad}),/invalid task skill/);
  assert.ok(!selectSkillPlan('pseudoseology checkoutless',{domain:'GROWTH',registry}).skills.includes('seo-engineering'));
});

test('CLI plan exposes the bounded skill plan while legacy output stays unchanged', () => {
  const file = fileURLToPath(new URL('./skill-routing.mjs', import.meta.url));
  const plan = JSON.parse(execFileSync(process.execPath,[file,'--plan','--domain','GROWTH','SEO checkout GA4'],{encoding:'utf8'}));
  assert.ok(plan.skills.includes('seo-engineering'));
  assert.ok(plan.skills.includes('revenue-engineering'));
  const legacy = selectSpecialists('SEO checkout GA4',{domain:'GROWTH',registry});
  assert.deepEqual(legacy.skills,['analytics-intelligence']);
});

test('integration, lifecycle and evaluation match specific signals in the existing plan', () => {
  const plan = selectSkillPlan('MCP Adapter, Skill Inventar und RAG Evaluation', {
    domain: 'PLATFORM', registry, asOf: '2026-11-21',
  });
  for (const id of ['integration-engineering', 'skill-lifecycle', 'agent-evaluation']) {
    assert.ok(plan.skills.includes(id));
    assert.equal(plan.sourceReviews.find(skill => skill.id === id).reviewState, 'RECORDED');
  }
  const ordinary = selectSkillPlan('MCPAdapterfoo', { domain: 'PRODUCT', registry });
  assert.ok(!ordinary.skills.includes('integration-engineering'));
});

test('skill source inventory exposes deadlines and future or unmapped evidence', () => {
  const before = skillSourceAudit(registry, '2026-11-20');
  assert.equal(before.sources.openapi.reviewState, 'NOT_PROVEN');
  const during = skillSourceAudit(registry, '2026-11-21');
  assert.equal(during.sources.openapi.reviewState, 'RECORDED');
  assert.equal(during.sources.openapi.dueAt, '2026-12-21');
  assert.equal(skillSourceAudit(registry, '2026-12-21').sources.openapi.reviewState, 'REVIEW_DUE');
  assert.equal(during.skills.length, Object.keys(registry.skillGovernance).length);
  const withoutMapping = structuredClone(registry);
  delete withoutMapping.skillSourceInventory.skillSources['agent-evaluation'];
  assert.equal(skillSourceAudit(withoutMapping, '2026-11-21').skills.find(s => s.id === 'agent-evaluation').reviewState, 'NOT_PROVEN');
  assert.throws(() => skillSourceAudit(registry, '2026-02-30'), /invalid as-of date/);
});

test('different audiences get configurable offers without enabling purchase or access', () => {
  const founder = composeSkillBundle(registry, {
    bundleId: 'founder-launch', addOns: ['seo-engineering'], connections: ['mcp-tools'],
  });
  assert.equal(founder.audience, 'FOUNDER');
  assert.ok(founder.skills.some(skill => skill.id === 'seo-engineering'));
  assert.ok(founder.skills.some(skill => skill.id === 'integration-engineering'));
  assert.ok(founder.connectionProfiles[0].verificationSteps.includes('protocol-negotiation'));
  assert.equal(founder.sources.mcp.observedVersion, '2026-07-28');
  assert.equal(founder.commercialRights, 'NOT_PROVEN');
  assert.equal(founder.billingEnabled, false);
  assert.equal(founder.quoteAmount, null);
  assert.equal(founder.accessGranted, false);
  const b2b = composeSkillBundle(registry, {
    bundleId: 'b2b-integration', connections: ['api-webhook', 'a2a-workflow'],
  });
  assert.equal(b2b.audience, 'B2B');
  assert.deepEqual(b2b.connectionProfiles.map(item => item.runtimeState), ['NOT_PROVEN', 'NOT_PROVEN']);
  const enterprise = composeSkillBundle(registry, {
    bundleId: 'enterprise-orchestration', connections: ['scim-provisioning'],
  });
  assert.equal(enterprise.audience, 'ENTERPRISE');
  assert.ok(enterprise.connectionProfiles[0].verificationSteps.includes('deprovisioning'));
});

test('invalid bundle and source references fail closed', () => {
  for (const spec of [
    { bundleId: 'constructor' },
    { bundleId: 'founder-launch', addOns: ['trust-engineering'] },
    { bundleId: 'founder-launch', connections: ['scim-provisioning'] },
    { bundleId: 'founder-launch', connections: ['mcp-tools', 'mcp-tools'] },
  ]) assert.throws(() => composeSkillBundle(registry, spec), /Skill catalog/);
  const badUrl = structuredClone(registry);
  badUrl.skillSourceInventory.sources.openapi.url = 'https://spec.openapis.org@127.0.0.1/';
  assert.throws(() => validateSkillCatalog(badUrl), /source openapi/);
  const orphan = structuredClone(registry);
  orphan.skillSourceInventory.skillSources['skill-lifecycle'] = ['unknown-ref'];
  assert.throws(() => validateSkillCatalog(orphan), /source mapping/);
  const invalid = structuredClone(registry);
  invalid.skillBundleCatalog.bundles['founder-launch'].baseSkills.push('missing-skill');
  assert.throws(() => validateSkillCatalog(invalid), /bundle founder-launch/);
});

test('source probe reports missing anchors, redirects and errors without updating review evidence', async () => {
  const records = registry.skillSourceInventory.sources;
  const report = await probeSkillSources(registry, {
    asOf: '2026-12-21',
    fetchImpl: async (url, options) => {
      assert.equal(options.redirect, 'manual');
      assert.equal(options.credentials, 'omit');
      const record = Object.values(records).find(entry => entry.url === url);
      assert.ok(record);
      if (url === records.openapi.url) return new Response(record.searchAnchor);
      if (url === records.mcp.url) return Response.redirect('https://127.0.0.1/');
      if (url === records.a2a.url) throw new Error('unavailable');
      return new Response('anchor missing');
    },
  });
  assert.equal(report.sources.openapi.probe.state, 'ANCHOR_OBSERVED');
  assert.equal(report.sources.openapi.reviewState, 'REVIEW_DUE');
  assert.deepEqual(report.sources.mcp.probe, { state: 'REVIEW_SOURCE', httpStatus: 302 });
  assert.equal(report.sources.a2a.probe.state, 'NOT_PROVEN');
  assert.equal(report.sources.wcag.probe.state, 'REVIEW_SOURCE');
});

test('cross-domain advice preserves the first domain and incorporates explicit or matching specialists', () => {
  const plan = selectSkillPlan('OpenAPI und Datenschutz', {
    domain: 'PRODUCT', relatedDomains: ['GROWTH', 'MARKET'], registry,
  });
  assert.equal(plan.primaryDomain, 'PRODUCT');
  assert.deepEqual(plan.advisoryDomains, ['PRODUCT', 'GROWTH', 'MARKET', 'PLATFORM', 'TRUST']);
  assert.ok(plan.skills.includes('platform-advisory'));
  assert.ok(plan.skills.includes('trust-advisory'));
  assert.ok(plan.skills.includes('growth-advisory'));
  assert.equal(plan.advisoryTracks.length, 5);
  assert.ok(plan.advisoryTracks.every(track => track.advisers.length >= 2));
  assert.ok(!plan.advisoryTracks.some(track => Object.hasOwn(track, 'signals')));
  assert.throws(() => selectSkillPlan('OpenAPI', { domain: 'PRODUCT', relatedDomains: ['PRODUCT'], registry }),
    /invalid related advisory domains/);
  assert.throws(() => selectSkillPlan('OpenAPI', { domain: 'PRODUCT', relatedDomains: ['ROOT'], registry }),
    /invalid related advisory domains/);

  const malformed = structuredClone(registry);
  malformed.advisoryRouting.domains.PRODUCT.advisers[1].skill = 'unregistered-skill';
  assert.throws(() => selectSkillPlan('OpenAPI', { domain: 'PRODUCT', registry: malformed }), /invalid advisory routing profile/);
});
