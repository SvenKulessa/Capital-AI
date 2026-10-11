import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { selectSpecialists } from './skill-routing.mjs';

const readJson = relativePath =>
  JSON.parse(readFileSync(new URL(relativePath, import.meta.url), 'utf8'));
const ordered = values => [...new Set(values)].sort();
const identical = (left, right) =>
  left.length === right.length && left.every((value, index) => value === right[index]);
const percent = (numerator, denominator) =>
  denominator ? Number((100 * numerator / denominator).toFixed(2)) : null;

/**
 * Offline evaluation of the repository's deterministic specialist router.
 * This does NOT execute ChatGPT agents, use models or prove live chat selection.
 * The five-domain sweep tests that a skill can be found from any domain.
 */
export function evaluateSkillRouting({
  registry = readJson('../.agents/skills/registry.json'),
  corpus = readJson('./skill-routing-cases.json'),
  selector = selectSpecialists,
} = {}) {
  const skills = registry?.sharedSkills?.specialists;
  const domains = Object.keys(registry?.domains ?? {});
  if (!Array.isArray(skills) || !skills.length || !domains.length
      || typeof selector !== 'function' || corpus?.schemaVersion !== 'CAPITAL_AI_SKILL_EVALUATION@1'
      || !Array.isArray(corpus.cases) || !corpus.cases.length) {
    throw new TypeError('invalid routing evaluation inputs');
  }
  const specialistIds = new Set(skills);
  if (specialistIds.size !== skills.length) throw new TypeError('duplicate specialist id');

  const seenCases = new Set();
  const perSkill = Object.fromEntries(skills.map(skill =>
    [skill, { truePositive: 0, falsePositive: 0, falseNegative: 0 }]));
  let exact = 0;
  let truePositive = 0;
  let falsePositive = 0;
  let falseNegative = 0;
  let abstentionCases = 0;
  let correctAbstentions = 0;
  const failures = [];
  const domainFailures = [];

  function run(task, domain) {
    const result = selector(task, { domain, registry });
    if (!Array.isArray(result?.skills)
        || result.skills.some(skill => typeof skill !== 'string')) {
      throw new TypeError('router must return a string array in skills');
    }
    if (new Set(result.skills).size !== result.skills.length) {
      throw new TypeError('router returned duplicate skills');
    }
    return ordered(result.skills);
  }

  for (const example of corpus.cases) {
    if (typeof example?.id !== 'string' || !example.id.trim() || seenCases.has(example.id)
        || typeof example.task !== 'string' || !example.task.trim()
        || !domains.includes(example.domain)
        || !Array.isArray(example.expectedSpecialists)
        || example.expectedSpecialists.some(skill => !specialistIds.has(skill))
        || new Set(example.expectedSpecialists).size !== example.expectedSpecialists.length) {
      throw new TypeError('invalid or duplicate evaluation case');
    }
    seenCases.add(example.id);
    const expected = ordered(example.expectedSpecialists);
    const actual = run(example.task, example.domain);
    const wanted = new Set(expected);
    const found = new Set(actual);
    const extra = actual.filter(skill => !wanted.has(skill));
    const missing = expected.filter(skill => !found.has(skill));
    if (identical(expected, actual)) exact++;
    else failures.push({ id: example.id, domain: example.domain, expected, actual, extra, missing });

    if (!expected.length) {
      abstentionCases++;
      if (!actual.length) correctAbstentions++;
    }
    for (const skill of expected) {
      if (found.has(skill)) {
        truePositive++;
        perSkill[skill].truePositive++;
      } else {
        falseNegative++;
        perSkill[skill].falseNegative++;
      }
    }
    for (const skill of extra) {
      falsePositive++;
      if (specialistIds.has(skill)) perSkill[skill].falsePositive++;
    }

    for (const domain of domains) {
      const routed = run(example.task, domain);
      if (!identical(expected, routed)) {
        domainFailures.push({ id: example.id, domain, expected, actual: routed });
      }
    }
  }

  const precision = truePositive / (truePositive + falsePositive || 1);
  const recall = truePositive / (truePositive + falseNegative || 1);
  const f1 = precision + recall ? 2 * precision * recall / (precision + recall) : 0;
  return {
    schemaVersion: 'CAPITAL_AI_SKILL_EVALUATION_REPORT@1',
    status: failures.length || domainFailures.length ? 'FAIL' : 'PASS',
    scope: 'OFFLINE_DETERMINISTIC_ROUTING_ONLY',
    chatAgentBehaviorVerified: false,
    modelCalls: 0,
    corpusVersion: corpus.schemaVersion,
    cases: corpus.cases.length,
    specialists: skills.length,
    domains: domains.length,
    exactMatches: exact,
    exactMatchPercent: percent(exact, corpus.cases.length),
    precisionPercent: Number((100 * precision).toFixed(2)),
    recallPercent: Number((100 * recall).toFixed(2)),
    f1Percent: Number((100 * f1).toFixed(2)),
    truePositive,
    falsePositive,
    falseNegative,
    abstentionCases,
    correctAbstentions,
    domainSweep: {
      comparisons: corpus.cases.length * domains.length,
      failures: domainFailures.length,
      mismatches: domainFailures
    },
    perSkill,
    mismatches: failures
  };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length && (args.length !== 1 || args[0] !== '--json')) {
      throw new TypeError('Usage: node scripts/skill-routing-evaluation.mjs [--json]');
    }
    const report = evaluateSkillRouting();
    process.stdout.write(JSON.stringify(report, null, 2) + '\n');
    if (report.status !== 'PASS') process.exitCode = 1;
  } catch (error) {
    process.stderr.write(error.message + '\n');
    process.exitCode = 2;
  }
}
