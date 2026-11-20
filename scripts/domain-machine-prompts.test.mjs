import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const domains = ['PRODUCT', 'MARKET', 'PLATFORM', 'TRUST', 'GROWTH'];
const read = (path) => JSON.parse(readFileSync(new URL('../' + path, import.meta.url), 'utf8'));
const app = read('.ai/prompts/app-orchestrator.machine.json');

test('app contract uses canonical root authority and ten-PR gate', () => {
  assert.equal(app.authority.primary, 'AGENTS.md');
  assert.equal(app.authority.flow, 'SOLO_MAINTAINER_FLOW@2');
  assert.equal(app.tenPrEfficiencyMilestone.requiredVerifiedMerges, 10);
  assert.match(app.tenPrEfficiencyMilestone.startAfter, /exclude already merged PR #850/);
  assert.match(app.tenPrEfficiencyMilestone.missingData, /NOT_PROVEN/);
});

for (const domain of domains) {
  test(domain + ' has parseable and safely routed machine prompt', () => {
    const entry = app.domainRouting[domain];
    assert.ok(entry?.directory);
    const doc = read(entry.directory + '/DOMAIN_PROMPT.machine.json');
    assert.equal(doc.domain, domain);
    assert.equal(doc.authority.primary, 'AGENTS.md');
    assert.equal(doc.authority.skills, '.agents/skills/registry.json');
    assert.equal(doc.canonicalEngineeringSkill, entry.engineeringSkill);
    assert.ok(doc.requiredChecks.length >= 3);
    assert.ok(doc.restrictions.some((x) => /No bypass/.test(x)));
  });
}

test('routing is complete and without extra domains', () => {
  assert.deepEqual(Object.keys(app.domainRouting).sort(), [...domains].sort());
});
