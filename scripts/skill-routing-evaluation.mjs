import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { selectSpecialists } from './skill-routing.mjs';
const readJson = name => JSON.parse(readFileSync(new URL(name, import.meta.url), 'utf8'));
const ratio = (n, d) => d ? n / d : 1;
const scored = ({tp, fp, fn}) => {
  const precision = ratio(tp, tp + fp), recall = ratio(tp, tp + fn);
  return {tp, fp, fn, precision, recall,
    f1: precision + recall ? (2 * precision * recall) / (precision + recall) : 0};
};
export function evaluateSpecialistRouting(cases, registry) {
  if (!Array.isArray(cases) || !cases.length) throw new TypeError('nonempty cases required');
  if (!registry || !Array.isArray(registry.sharedSkills?.specialists)) throw new TypeError('invalid registry');
  const ids = registry.sharedSkills.specialists;
  const bySkill = Object.fromEntries(ids.map(id => [id, {tp:0,fp:0,fn:0}]));
  const byDomain = Object.fromEntries(Object.keys(registry.domains).map(id => [id, {total:0,exact:0}]));
  const seen = new Set(), failures = [];
  let exact = 0, abstentions = 0;
  for (const item of cases) {
    if (!item || typeof item.id !== 'string' || !item.id || seen.has(item.id) ||
      typeof item.task !== 'string' || !item.task.trim() ||
      !Object.hasOwn(byDomain, item.domain) ||
      !Array.isArray(item.expectedSpecialists) ||
      new Set(item.expectedSpecialists).size !== item.expectedSpecialists.length ||
      item.expectedSpecialists.some(id => !ids.includes(id)))
      throw new TypeError('invalid or duplicate evaluation case');
    seen.add(item.id);
    const expected = new Set(item.expectedSpecialists);
    const actual = new Set(selectSpecialists(item.task, {domain:item.domain,registry}).skills);
    byDomain[item.domain].total += 1;
    if (!actual.size) abstentions += 1;
    const missed = [...expected].filter(id => !actual.has(id));
    const unexpected = [...actual].filter(id => !expected.has(id));
    if (!missed.length && !unexpected.length) { exact += 1; byDomain[item.domain].exact += 1; }
    else failures.push({id:item.id,domain:item.domain,expected:[...expected],selected:[...actual],missed,unexpected});
    for (const id of ids) {
      if (expected.has(id) && actual.has(id)) bySkill[id].tp += 1;
      else if (actual.has(id)) bySkill[id].fp += 1;
      else if (expected.has(id)) bySkill[id].fn += 1;
    }
  }
  const micro = Object.values(bySkill).reduce((a,b)=>({tp:a.tp+b.tp,fp:a.fp+b.fp,fn:a.fn+b.fn}),{tp:0,fp:0,fn:0});
  return {corpusSize:cases.length,exactSet:{matched:exact,total:cases.length,accuracy:exact/cases.length},
    micro:scored(micro),abstentions,
    byDomain:Object.fromEntries(Object.entries(byDomain).map(([id,v])=>[id,{...v,accuracy:v.exact/v.total}])),
    bySpecialist:Object.fromEntries(Object.entries(bySkill).map(([id,v])=>[id,scored(v)])),
    failures};
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const registry=readJson('../.agents/skills/registry.json');
  const baseline=readJson('./skill-routing-cases.json');
  const challenge=readJson('./skill-routing-challenges.json');
  const report=evaluateSpecialistRouting([...baseline.cases,...challenge.cases],registry);
  process.stdout.write(JSON.stringify({corpusVersions:[baseline.schemaVersion,challenge.schemaVersion],
    ...report,scope:'DETERMINISTIC_REPOSITORY_LEXICON_NOT_HOSTED_CHATGPT'},null,2)+'\n');
  if (report.failures.length) process.exitCode=1;
}
