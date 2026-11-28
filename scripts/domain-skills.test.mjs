import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const registry = JSON.parse(read('.agents/skills/registry.json'));
const expected = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'];

const frontmatter = (file) => {
  const match = /^---\n([\s\S]*?)\n---\n/.exec(file);
  assert.ok(match, 'SKILL.md must have frontmatter');
  const lines = Object.fromEntries(match[1].split('\n').filter(Boolean).map(line => {
    const i = line.indexOf(':');
    assert.ok(i > 0, 'invalid frontmatter line');
    return [line.slice(0, i), line.slice(i + 1).trim().replace(/^"|"$/g, '')];
  }));
  return lines;
};

test('registry contains exactly five domains, two skills each, and one chat agent each', () => {
  assert.equal(registry.schemaVersion, 'CAPITAL_AI_DOMAIN_SKILLS@1');
  assert.equal(registry.authority, 'AGENTS.md');
  assert.equal(registry.contract, 'SOLO_MAINTAINER_FLOW@2');
  assert.deepEqual(Object.keys(registry.domains).sort(), [...expected].sort());
  const ids = new Set();
  for (const domain of expected) {
    const entry = registry.domains[domain];
    for (const kind of ['engineering', 'advisory']) {
      const name = entry[kind];
      assert.match(name, /^[a-z0-9]+-(engineering|advisory)$/);
      assert.equal(name, `${domain.toLowerCase()}-${kind}`);
      assert.ok(!ids.has(name), 'duplicate skill'); ids.add(name);
      const markdown = read(`.agents/skills/${name}/SKILL.md`);
      const metadata = frontmatter(markdown);
      assert.equal(metadata.name, name);
      assert.ok(metadata.description.length > 40 && metadata.description.length <= 1024);
      assert.match(markdown, /AGENTS\.md/);
      assert.match(markdown, /NOT_VERIFIED/);
    }
    assert.equal(entry.chatAgent, `.github/agents/capital-ai-${domain.toLowerCase()}.agent.md`);
    const agent = read(entry.chatAgent);
    assert.ok(agent.includes(`.agents/skills/${entry.engineering}/SKILL.md`));
    assert.ok(agent.includes(`.agents/skills/${entry.advisory}/SKILL.md`));
  }
  assert.equal(ids.size, 10);
});

test('one root policy and chat integrations describe skill routing without authorizing new gates', () => {
  const policy = read('AGENTS.md');
  const copilot = read('.github/copilot-instructions.md');
  assert.match(policy, /SOLO_MAINTAINER_FLOW@2/);
  assert.match(policy, /Domain Skills und beratende Fähigkeiten im Chat/);
  assert.match(policy, /\.agents\/skills\/registry\.json/);
  assert.match(copilot, /AGENTS\.md/);
  assert.match(copilot, /\.agents\/skills\/registry\.json/);
  assert.match(copilot, /no gates/i);
});

test('ChatGPT plugin discovery is contextual, least-privileged and non-blocking', () => {
  const policy = read('AGENTS.md');
  assert.match(policy, /## ChatGPT-Plugin-Discovery und Tool-Nutzung/);
  assert.match(policy, /bereits installiertes und verbundenes ChatGPT-Plugin/);
  assert.match(policy, /direkt nutzen/);
  assert.match(policy, /Plugin-Suche/);
  assert.match(policy, /freiwilligen/);
  assert.match(policy, /NOT_PROVEN/);
  assert.match(policy, /Least Privilege/);
  assert.match(policy, /keine neuen CI-Checks/);
  for (const domain of expected) assert.match(policy, new RegExp(domain));
});

test('shared visual-chat skill is discoverable from every domain agent without inventing UI capabilities', () => {
  assert.equal(registry.sharedSkills.visualChat, 'visual-chat');
  const visual = read('.agents/skills/visual-chat/SKILL.md');
  const metadata = frontmatter(visual);
  assert.equal(metadata.name, 'visual-chat');
  assert.match(visual, /no gates/i);
  assert.match(visual, /Markdown/);
  assert.match(visual, /Mermaid/);
  assert.match(visual, /NOT_PROVEN/);
  assert.match(visual, /AGENTS\.md/);
  const root = read('AGENTS.md');
  const copilot = read('.github/copilot-instructions.md');
  assert.match(root, /## Einheitliche grafische Chat-Darstellung aller Domains/);
  assert.match(root, /keine ChatGPT-UI-Engine/);
  assert.match(copilot, /\.agents\/skills\/visual-chat\/SKILL\.md/);
  for (const domain of expected) {
    assert.equal(registry.domains[domain].presentation, registry.sharedSkills.visualChat);
    const agent = read(registry.domains[domain].chatAgent);
    assert.match(agent, /\.agents\/skills\/visual-chat\/SKILL\.md/);
  }
});

test('monetization assessment keeps license and runtime evidence separate', () => {
  const report = read('docs/business/MONETIZATION-DEEPSCAN-LEGAL-MATRIX-20261008.md');
  assert.match(report, /main@ed5c47611208ae4b145d110e03fb88657f51912c/);
  assert.match(report, /Massive/);
  assert.match(report, /MiCA/);
  assert.match(report, /GitHub Marketplace/);
  assert.match(report, /NOT_PROVEN/);
  assert.match(report, /Merge #288/);
  assert.match(report, /kein Live/);
  const ids = [...report.matchAll(/^\| (\d+) \|/gm)].map(row => Number(row[1]));
  assert.deepEqual(ids, Array.from({ length: 28 }, (_, i) => i + 1));
});


test('ten enterprise specialist skills are shared, discoverable and have bounded authority', () => {
  const specialists = ['ai-engineering', 'data-engineering', 'quant-research', 'customer-success',
    'sales-enterprise', 'legal-compliance', 'incident-response', 'analytics-intelligence',
    'mobile-engineering', 'accessibility-audit'];
  assert.deepEqual(registry.sharedSkills.specialists, specialists);
  assert.deepEqual(Object.keys(registry.specialistSkillMetadata), specialists);
  for (const id of specialists) {
    const meta = registry.specialistSkillMetadata[id];
    assert.ok(['high', 'medium'].includes(meta.priority));
    assert.ok(meta.leadDomains.length > 0 && meta.leadDomains.every(x => expected.includes(x)));
    const file = read(`.agents/skills/${id}/SKILL.md`);
    assert.equal(frontmatter(file).name, id);
    assert.ok(frontmatter(file).description.length > 40);
    assert.match(file, /AGENTS\.md/);
    assert.match(file, /SOLO_MAINTAINER_FLOW@2/);
    assert.match(file, /NOT_PROVEN/);
    assert.match(file, /keine zusätzlichen Required Checks/);
  }
  for (const domain of expected) {
    const entry = registry.domains[domain];
    assert.equal(entry.specialistAccess, 'shared');
    assert.ok(entry.recommendedSpecialists.length >= 3);
    assert.ok(entry.recommendedSpecialists.every(id => specialists.includes(id)));
    const agent = read(entry.chatAgent);
    assert.match(agent, /sharedSkills\.specialists/);
    assert.match(agent, /alle zehn Fach-Skills/);
    assert.match(agent, /Repository-Zugriff/);
  }
  assert.match(read('.github/copilot-instructions.md'), /sharedSkills\.specialists/);
  assert.match(read('AGENTS.md'), /Shared Enterprise Specialist Skills/);
});

test('machine-readable domain prompts are source-bound, scoped and discoverable', () => {
  assert.equal(registry.promptContracts.schema, 'CAPITAL_AI_PROMPT_CONTRACT_REFS@1');
  assert.equal(registry.promptContracts.application, '.agents/app.prompt.json');
  assert.equal(registry.promptContracts.authority, 'AGENTS.md');
  assert.deepEqual(Object.keys(registry.promptContracts.domains).sort(), [...expected].sort());
  const app = JSON.parse(read(registry.promptContracts.application));
  assert.equal(app.schema, 'CAPITAL_AI_APPLICATION_EXECUTION_PROMPT@1');
  assert.equal(app.authority.source, 'AGENTS.md');
  assert.equal(app.authority.contract, 'SOLO_MAINTAINER_FLOW@2');
  assert.equal(app.authority.permissionExpansion, false);
  assert.deepEqual(app.domainPrompts, registry.promptContracts.domains);
  assert.equal(app.multiAgent.singlePermissionContext, true);
  assert.equal(app.multiAgent.serializedWrites, true);
  assert.equal(app.metrics.noInventedGains, true);
  assert.ok(app.constraints.includes('NO_RULESET_BYPASS'));
  const validate = (candidate, domain) => {
    assert.equal(candidate.schema, 'CAPITAL_AI_DOMAIN_EXECUTION_PROMPT@1');
    assert.equal(candidate.domain, domain);
    assert.equal(candidate.projectFolder, 'CAPITAL-AI-' + domain);
    assert.equal(candidate.authority.source, 'AGENTS.md');
    assert.equal(candidate.authority.contract, 'SOLO_MAINTAINER_FLOW@2');
    assert.equal(candidate.authority.type, 'NON_AUTHORIZING_CONTEXT');
    assert.equal(candidate.authority.permissionExpansion, false);
    assert.equal(candidate.skillRegistry, '.agents/skills/registry.json');
    assert.equal(candidate.engineeringSkill, registry.domains[domain].engineering);
    assert.equal(candidate.advisorySkill, registry.domains[domain].advisory);
    assert.equal(candidate.chatAgent, registry.domains[domain].chatAgent);
    assert.equal(candidate.efficiency.maxDistinctRepairAttempts, 2);
    assert.equal(candidate.efficiency.oneActiveMutatingScope, true);
    assert.ok(candidate.prompt.includes('AGENTS.md'));
    assert.ok(candidate.trustBoundary.rightsCannotBeInferredFromCI);
    assert.ok(candidate.trustBoundary.productionMutationRequiresScopedEvidence);
  };
  for (const domain of expected) {
    const file = registry.promptContracts.domains[domain];
    assert.equal(file, 'CAPITAL-AI-' + domain + '/domain.prompt.json');
    const prompt = JSON.parse(read(file));
    validate(prompt, domain);
    const doc = read('CAPITAL-AI-' + domain + '/PROJECT.md');
    assert.match(doc, /SOLO_MAINTAINER_FLOW@2/);
    assert.doesNotMatch(doc, /SOLO_MAINTAINER_FLOW@1/);
    assert.ok(doc.includes(file));
    for (const [field,value] of [
      ['authority', { ...prompt.authority, permissionExpansion: true }],
      ['domain', 'OTHER'],
      ['engineeringSkill', 'non-existent-engineering'],
      ['efficiency', { ...prompt.efficiency, maxDistinctRepairAttempts: 99 }],
    ]) assert.throws(() => validate({ ...prompt, [field]: value }, domain));
  }
});

test('Docker build includes only the prompt validation inputs, with no broad context expansion', () => {
  const docker = read('Dockerfile');
  const ignore = read('.dockerignore');
  assert.ok(docker.includes('COPY .agents/app.prompt.json ./.agents/app.prompt.json'));
  assert.ok(ignore.split('\n').includes('!.agents/app.prompt.json'));
  for (const domain of expected) {
    const folder = 'CAPITAL-AI-' + domain;
    const copy = 'COPY ' + folder + '/domain.prompt.json ' + folder + '/PROJECT.md ./' + folder + '/';
    assert.ok(docker.includes(copy), 'missing build-only prompt copy: ' + folder);
    assert.ok(ignore.split('\n').includes('!' + folder + '/domain.prompt.json'));
    assert.ok(ignore.split('\n').includes('!' + folder + '/PROJECT.md'));
  }
  assert.doesNotMatch(docker, /^COPY \.agents\/ \.\/\.agents\/$/m);
  assert.doesNotMatch(ignore, /^!\.agents\/\*\*$/m);
});

test('machine-readable prompts are actually referenced by existing chat agents', () => {
  const copilot = read('.github/copilot-instructions.md');
  assert.match(copilot, /promptContracts\.application/);
  assert.match(copilot, /\.agents\/app\.prompt\.json/);
  assert.match(copilot, /Root .?AGENTS\.md/);
  for (const domain of expected) {
    const agent = read(registry.domains[domain].chatAgent);
    assert.ok(agent.includes('CAPITAL-AI-' + domain + '/domain.prompt.json'));
    assert.ok(agent.includes('promptContracts.domains.' + domain));
    assert.match(agent, /NON_AUTHORIZING_CONTEXT/);
  }
});

test('canonical skill-registry app preserves source-bound ten-PR efficiency milestone without a second prompt authority', () => {
  const app = JSON.parse(read(registry.promptContracts.application));
  const milestone = app.tenPrEfficiencyMilestone;
  assert.equal(milestone.schema, 'CAPITAL_AI_TEN_PR_EFFICIENCY_MILESTONE@1');
  assert.equal(milestone.sourcePr, 852);
  assert.equal(milestone.requiredVerifiedMerges, 10);
  assert.ok(milestone.appliesAfter.startsWith('2026-11-20 owner authorization'));
  assert.deepEqual(milestone.excludedPullRequests, [850]);
  assert.equal(milestone.missingData, 'NOT_PROVEN');
  assert.equal(milestone.groupBy, 'domain');
  assert.equal(milestone.permissionExpansion, false);
  assert.equal(milestone.createsScheduler, false);
  assert.equal(milestone.createsRequiredChecks, false);
  assert.equal(milestone.noInventedEfficiencyClaims, true);
  assert.deepEqual(app.domainPrompts, registry.promptContracts.domains);
  assert.equal(app.skillRegistry, '.agents/skills/registry.json');
  assert.equal(app.authority.type, 'NON_AUTHORIZING_CONTEXT');
  assert.ok(milestone.sources.some(s => s.includes('main merge commit SHA')));
  assert.ok(milestone.sources.some(s => s.includes('required-check conclusions')));
  assert.ok(milestone.metrics.some(s => s.includes('explicit denominator')));
  assert.ok(milestone.metrics.some(s => s.includes('PR lead time')));
  assert.ok(milestone.publication.includes('only after 10 individually VERIFIED'));
  assert.ok(milestone.publication.includes('Hero, Globe and Hub'));
  assert.doesNotMatch(read('.github/copilot-instructions.md'), /DOMAIN_PROMPT\.machine\.json|app-orchestrator\.machine\.json/);
  assert.ok(!Object.hasOwn(registry.promptContracts, 'legacyApplication'));
});

test('ten-PR admission refuses absent, stale, draft, excluded or non-SHA-bound evidence', () => {
  const app = JSON.parse(read(registry.promptContracts.application));
  const m = app.tenPrEfficiencyMilestone;
  const required = ['Docker Security Gate', 'Domain Governance'];
  const valid = {
    prNumber: 901, domain: 'PLATFORM', createdAt: '2026-11-21T01:00:00Z',
    mergedAt: '2026-11-21T02:00:00Z', mainMergeSha: 'a'.repeat(40),
    testedHeadSha: 'b'.repeat(40), requiredCheckRunIds: [1001, 1002],
    requiredCheckConclusions: Object.fromEntries(required.map(name => [name, 'success'])),
    githubSourceUrls: ['https://github.com/SvenKulessa/Capital-AI/pull/901'],
    sourceVerified: true, mainAncestryVerified: true, requiredCheckShaBound: true,
    isMerged: true, wasDraftAtMerge: false, afterOwnerAuthorizationVerified: true
  };
  const admits = p => !!p && p.sourceVerified === true
    && p.mainAncestryVerified === true && p.requiredCheckShaBound === true
    && p.afterOwnerAuthorizationVerified === true && p.isMerged === true
    && p.wasDraftAtMerge === false && !m.excludedPullRequests.includes(p.prNumber)
    && Number.isSafeInteger(p.prNumber) && p.prNumber > 0
    && Object.hasOwn(registry.domains, p.domain)
    && /^[a-f0-9]{40}$/.test(p.mainMergeSha ?? '')
    && /^[a-f0-9]{40}$/.test(p.testedHeadSha ?? '')
    && Date.parse(p.createdAt) < Date.parse(p.mergedAt)
    && p.requiredCheckRunIds?.length >= 2 && p.requiredCheckRunIds.every(Number.isSafeInteger)
    && required.every(key => p.requiredCheckConclusions?.[key] === 'success')
    && p.githubSourceUrls?.length > 0 && p.githubSourceUrls.every(
      url => /^https:\/\/github\.com\/SvenKulessa\/Capital-AI\/pull\/\d+$/.test(url)
    );
  assert.equal(admits(valid), true);
  const negativeCases = [
    null, {}, { ...valid, prNumber: 850 }, { ...valid, sourceVerified: false },
    { ...valid, afterOwnerAuthorizationVerified: false }, { ...valid, isMerged: false },
    { ...valid, wasDraftAtMerge: true }, { ...valid, mainAncestryVerified: false },
    { ...valid, requiredCheckShaBound: false }, { ...valid, mainMergeSha: null },
    { ...valid, testedHeadSha: 'unbound' }, { ...valid, domain: 'OTHER' },
    { ...valid, createdAt: valid.mergedAt }, { ...valid, requiredCheckRunIds: [] },
    { ...valid, requiredCheckConclusions: { ...valid.requiredCheckConclusions, 'Docker Security Gate': 'failure' } },
    { ...valid, githubSourceUrls: ['https://example.com/unverified'] }
  ];
  for (const candidate of negativeCases) assert.equal(admits(candidate), false);
  assert.equal(m.requiredVerifiedMerges, 10);
  assert.equal([valid].filter(admits).length < m.requiredVerifiedMerges, true);
});

test('SOLO2 domain-chat binding is shared, non-authorizing, and scoped to five registry domains', () => {
  const app = JSON.parse(read('.agents/app.prompt.json'));
  const loop = app.solo2DomainLoop;
  assert.equal(loop.schema, 'CAPITAL_AI_SOLO2_DOMAIN_LOOP@1');
  assert.equal(loop.kind, 'NON_AUTHORIZING_EXECUTION_PROFILE');
  assert.equal(loop.authority, 'AGENTS.md');
  assert.equal(loop.contract, 'SOLO_MAINTAINER_FLOW@2');
  assert.equal(loop.repository, 'SvenKulessa/Capital-AI');
  assert.equal(loop.projectIsolation, 'STRICT');
  assert.equal(loop.domainRegistry, '.agents/skills/registry.json');
  assert.equal(loop.orchestrator, 'scripts/growth-agent/auto_loop.py');
  assert.equal(loop.schedulerPolicy, 'REUSE_EXISTING_ONLY');
  assert.equal(loop.runtimeActivation, 'NOT_PROVEN');
  assert.equal(loop.permissionExpansion, false);
  assert.deepEqual(loop.evidenceLevels, [
    'CONTROL_PRESENT', 'CONTROL_TESTED', 'CI_VERIFIED', 'PRODUCTION_VERIFIED'
  ]);
  assert.equal(loop.orchestration.oneMutatingScopePerRepository, true);
  assert.equal(loop.orchestration.writesSerialized, true);
  assert.equal(loop.orchestration.maxDistinctRepairAttempts, 2);
  assert.equal(loop.orchestration.independentQualityPerspective, true);
  assert.equal(loop.orchestration.reuseStillValidEvidenceOnlyOnSameScopeAndSha, true);
  for (const restriction of Object.values(loop.claims)) assert.equal(restriction, false);
  assert.equal(loop.stateSemantics.STALE, 'REVALIDATE');
  assert.equal(loop.stateSemantics.PENDING, 'WAIT');
  assert.match(loop.stateSemantics.UNKNOWN, /NOT_PROVEN/);
  for (const domain of expected) {
    const prompt = JSON.parse(read(registry.promptContracts.domains[domain]));
    const p = prompt.solo2DomainLoop;
    assert.equal(p.profile, loop.schema);
    assert.equal(p.application, '.agents/app.prompt.json');
    assert.equal(p.primaryDomain, domain);
    assert.equal(p.linkedOrchestrator, loop.orchestrator);
    assert.equal(p.routeSkillsByRegistry, true);
    assert.equal(p.reuseExistingPRAndCheckpoint, true);
    assert.equal(p.serializedMutations, true);
    assert.equal(p.qualityIndependentPerspective, true);
    assert.equal(p.permissionExpansion, false);
    assert.equal(p.createsRequiredChecks, false);
    assert.equal(p.createsScheduler, false);
    for (const key of ['targetedInspection', 'negativeCasePriorities', 'evidenceDeliverables']) {
      assert.ok(Array.isArray(p[key]) && p[key].length >= 3);
    }
    const agent = read(registry.domains[domain].chatAgent);
    assert.match(agent, /SOLO2 Domain Loop/);
    assert.ok(agent.includes('CAPITAL-AI-' + domain + '/domain.prompt.json'));
    assert.match(agent, /QUALITY/);
    assert.match(agent, /PRODUCTION_VERIFIED/);
  }
});

test('SOLO2 domain-chat config negatives cannot expand authority or spoof a domain', () => {
  const app = JSON.parse(read('.agents/app.prompt.json'));
  const loop = app.solo2DomainLoop;
  const admits = candidate =>
    candidate?.schema === 'CAPITAL_AI_SOLO2_DOMAIN_LOOP@1'
    && candidate.authority === 'AGENTS.md'
    && candidate.contract === 'SOLO_MAINTAINER_FLOW@2'
    && candidate.repository === 'SvenKulessa/Capital-AI'
    && candidate.projectIsolation === 'STRICT'
    && candidate.permissionExpansion === false
    && candidate.runtimeActivation === 'NOT_PROVEN'
    && candidate.schedulerPolicy === 'REUSE_EXISTING_ONLY'
    && candidate.orchestration?.oneMutatingScopePerRepository === true
    && candidate.orchestration?.writesSerialized === true
    && candidate.orchestration?.maxDistinctRepairAttempts === 2
    && Object.values(candidate.claims ?? {}).length === 6
    && Object.values(candidate.claims).every(v => v === false);
  assert.equal(admits(loop), true);
  for (const altered of [
    {...loop, permissionExpansion:true},
    {...loop, authority:'PR_COMMENT'},
    {...loop, repository:'SvenKulessa/DeviceCare-KI'},
    {...loop, projectIsolation:'SHARED'},
    {...loop, runtimeActivation:'VERIFIED'},
    {...loop, schedulerPolicy:'CREATE_NEW'},
    {...loop, orchestration:{...loop.orchestration, writesSerialized:false}},
    {...loop, orchestration:{...loop.orchestration, maxDistinctRepairAttempts:99}},
    {...loop, claims:{...loop.claims, createsRequiredChecks:true}},
    {...loop, claims:{...loop.claims, allowsUnauthorizedProviderActivation:true}},
    {...loop, claims:{}},
    null
  ]) assert.equal(admits(altered), false);
});


test('Universe-7 presentation and adaptive profile are bounded, source-bound prompt metadata', () => {
  const p = registry.promptContracts.presentation;
  const a = registry.promptContracts.adaptiveProfile;
  assert.equal(p.schema, 'CAPITAL_AI_AGENT_BRAND_PROFILE@1');
  assert.equal(p.authority, 'AGENTS.md');
  assert.equal(p.permissionExpansion, false);
  assert.deepEqual(Object.keys(p.domains).sort(), [...expected].sort());
  assert.equal(new Set(Object.values(p.domains).map(x => x.id)).size, 5);
  assert.deepEqual(p.signature, Object.keys(p.palette));
  assert.equal(new Set(Object.values(p.palette)).size, 7);
  assert.deepEqual(p.palette, {cyan:'#67E8F9',violet:'#B794F4',gold:'#F9BF21',pink:'#F9A8D4',rose:'#F87171',blue:'#60A5FA',green:'#4ADE80'});
  for (const d of Object.values(p.domains)) assert.ok(Object.hasOwn(p.palette,d.accent));
  assert.notEqual(p.perspectives.TRUST_SECURITY.accent,p.perspectives.INDEPENDENT_QUALITY.accent);
  const app = JSON.parse(read('.agents/app.prompt.json'));
  assert.deepEqual(Object.keys(p.perspectives).sort(), [...app.multiAgent.perspectives].sort());
  assert.ok(p.render.statusUsesTextAndIcon && p.render.staticTextFallback && p.render.reducedMotion);
  assert.equal(p.logo.replacementAllowed,false);
  assert.equal(a.authority,'AGENTS.md');
  assert.equal(a.permissionExpansion,false);
  assert.equal(a.trigger.distinctCompletedRuns,3);
  assert.equal(a.trigger.idempotency,'RUN_ID');
  assert.ok(a.rollback.stopOnConflict && a.rollback.governanceRequiresConcreteOwnerApproval);
  assert.equal(a.rollback.forcePush,false);
  assert.equal(a.runtimeActivation,'NOT_PROVEN');
  assert.equal(p.targets.android,'NOT_PROVEN');
  assert.match(read('.agents/skills/visual-chat/SKILL.md'), /promptContracts\.presentation/);
});
