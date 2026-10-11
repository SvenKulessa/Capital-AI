import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { normalizeSkillText, selectSpecialists } from './skill-routing.mjs';
import { evaluateSpecialistRouting } from './skill-routing-evaluation.mjs';

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
