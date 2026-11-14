import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const policy = read('AGENTS.md');
const section = (text, title) => {
  const start = text.indexOf(`${title}\n`);
  assert.ok(start >= 0, `missing section: ${title}`);
  const end = text.indexOf('\n## ', start + title.length);
  return text.slice(start, end < 0 ? undefined : end);
};
const safeguards = [
  'ACTIVE_CONSERVATIVE ist der Standard',
  'READ_ONLY gilt bei ausdrücklich lesenden Aufträgen',
  'Explizite Verbote von Merge, Deployment oder Publishing',
  'Fehlerursache reproduzieren',
  'Tests einschließlich Negativtests',
  'Blocker effizient beseitigen',
  'Keine produktiven Datenbankmutationen ohne gesonderte Autorisierung',
  'Keine kostenpflichtige Aktivierung ohne die bestehende ausdrückliche Owner-Zustimmung',
  'Keine unautorisierten OAuth-/Provider-/Secret-/Berechtigungsänderungen',
  'keinen automatischen Produktionspfad',
];
const missing = text => safeguards.filter(s => !text.includes(s));

test('sole authoritative V2 contract is active conservative rather than read only', () => {
  assert.match(policy, /^Contract: `SOLO_MAINTAINER_FLOW@2`$/m);
  assert.match(policy, /einzige repositoryweite autorisierende Engineering-\/Governance-Richtlinie/);
  const mode = section(policy, '## Standardmodus: ACTIVE_CONSERVATIVE');
  assert.deepEqual(missing(mode), []);
  assert.match(mode, /Der Agent prüft nicht nur/);
  assert.match(mode, /Kein `NOT_PROVEN` als `VERIFIED`/);
});

test('merge, main, costs, trust and existing required checks are preserved', () => {
  const checks = section(policy, '## Required Checks');
  assert.deepEqual([...checks.matchAll(/^- `([^`]+)`$/gm)].map(m => m[1]),
    ['Docker Security Gate', 'Domain Governance']);
  assert.match(policy, /Vor \*\*jedem\*\* Merge/);
  assert.match(policy, /GitHub-Rulesets, Branch Protection, Tool-Rechte und Least Privilege niemals umgehen/);
  assert.match(policy, /Alle anwendbaren CI-\/Pipeline-Tests und Security-Jobs/i);
  assert.match(policy, /Production ausschließlich aus `main`/);
  assert.match(policy, /Vertragsabschluss und Zahlungsfreigabe bleiben Owner-Handlungen/);
  assert.match(policy, /nutzereigene Secrets/);
});

test('negative regressions detect removal of each default-mode guard', () => {
  const mode = section(policy, '## Standardmodus: ACTIVE_CONSERVATIVE');
  for (const guard of safeguards) {
    const weakened = mode.replace(guard, '[REMOVED]');
    assert.deepEqual(missing(weakened), [guard], `missing protection: ${guard}`);
  }
});

test('active skills and copilot instructions point at V2', () => {
  const copilot = read('.github/copilot-instructions.md');
  assert.match(copilot, /SOLO_MAINTAINER_FLOW@2/);
  assert.doesNotMatch(copilot, /SOLO_MAINTAINER_FLOW@1/);
  const registry = JSON.parse(read('.agents/skills/registry.json'));
  for (const skill of registry.sharedSkills.specialists) {
    const content = read(`.agents/skills/${skill}/SKILL.md`);
    assert.match(content, /SOLO_MAINTAINER_FLOW@2/, skill);
    assert.doesNotMatch(content, /SOLO_MAINTAINER_FLOW@1/, skill);
  }
});

test('the V2 regression executes in the existing offline Docker test stage', () => {
  const dockerfile = read('Dockerfile');
  const dockerignore = read('.dockerignore');
  assert.match(dockerfile, /^COPY scripts\/domain-skills\.test\.mjs scripts\/solo-maintainer-flow\.test\.mjs \.\/scripts\/$/m);
  assert.match(dockerignore, /^!scripts\/solo-maintainer-flow\.test\.mjs$/m);
});

test('lean merge risk budget keeps core checks and limits unrelated evidence', () => {
  const merge = section(policy, '## Delegierte Agenten-Merge-Regel');
  const required = ['Docker Security Gate', 'Domain Governance', 'Post-Deployment-Abnahme', 'verlinken statt kopieren', 'expected_head_sha', 'MERGE_BLOCKED', 'Risikobudget'];
  for (const item of required) assert.ok(merge.includes(item), `missing lean-merge contract: ${item}`);
  assert.match(merge, /aktivierten Effekt/);
  // PR templates are intentionally excluded from the offline Docker test context.
  // Guard the effective policy here; review the template through the PR diff.
});
