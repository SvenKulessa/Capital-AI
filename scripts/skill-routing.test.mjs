import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { normalizeSkillText, selectSpecialists } from './skill-routing.mjs';
import { evaluateSkillRouting } from './skill-routing-evaluation.mjs';

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


test('offline evaluation reports reproducible set-precision, recall, F1 and domain portability', () => {
  const report = evaluateSkillRouting({ registry, corpus });
  assert.equal(report.status, 'PASS');
  assert.equal(report.scope, 'OFFLINE_DETERMINISTIC_ROUTING_ONLY');
  assert.equal(report.chatAgentBehaviorVerified, false);
  assert.equal(report.modelCalls, 0);
  assert.equal(report.cases, 41);
  assert.equal(report.domains, 5);
  assert.equal(report.specialists, 10);
  assert.equal(report.exactMatches, 41);
  assert.equal(report.exactMatchPercent, 100);
  assert.equal(report.precisionPercent, 100);
  assert.equal(report.recallPercent, 100);
  assert.equal(report.f1Percent, 100);
  assert.equal(report.abstentionCases, 5);
  assert.equal(report.correctAbstentions, 5);
  assert.equal(report.domainSweep.comparisons, 205);
  assert.equal(report.domainSweep.failures, 0);
  assert.deepEqual(report.mismatches, []);
  for (const skill of ids) {
    assert.ok(report.perSkill[skill].truePositive >= 3, skill);
    assert.equal(report.perSkill[skill].falsePositive, 0);
    assert.equal(report.perSkill[skill].falseNegative, 0);
  }
});

test('offline evaluation detects fabricated wrong choices and domain-bound regressions', () => {
  const incorrect = evaluateSkillRouting({
    registry,
    corpus,
    selector: (task, options) => {
      const answer = selectSpecialists(task, options);
      return task.includes('RAG Chatbot') ? { ...answer, skills: ['legal-compliance'] } : answer;
    },
  });
  assert.equal(incorrect.status, 'FAIL');
  assert.equal(incorrect.falsePositive, 1);
  assert.equal(incorrect.falseNegative, 1);
  assert.ok(incorrect.f1Percent < 100);
  assert.ok(incorrect.mismatches.some(row => row.id === 'ai-rag'));
  const restricted = evaluateSkillRouting({
    registry,
    corpus,
    selector: (task, options) => {
      const answer = selectSpecialists(task, options);
      return options.domain === 'MARKET' ? { ...answer, skills: [] } : answer;
    },
  });
  assert.equal(restricted.status, 'FAIL');
  assert.ok(restricted.domainSweep.failures > 0);
  const malformed = structuredClone(corpus);
  malformed.cases[0].expectedSpecialists = ['unregistered-skill'];
  assert.throws(() => evaluateSkillRouting({ registry, corpus: malformed }), /invalid or duplicate evaluation case/);
});

test('evaluation CLI emits structured offline evidence without provider access', () => {
  const file = fileURLToPath(new URL('./skill-routing-evaluation.mjs', import.meta.url));
  const report = JSON.parse(execFileSync(process.execPath, [file, '--json'], { encoding: 'utf8' }));
  assert.equal(report.schemaVersion, 'CAPITAL_AI_SKILL_EVALUATION_REPORT@1');
  assert.equal(report.status, 'PASS');
  assert.equal(report.domainSweep.comparisons, 205);
  assert.equal(report.modelCalls, 0);
});
