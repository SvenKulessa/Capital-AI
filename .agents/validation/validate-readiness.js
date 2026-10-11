import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, inspect, evaluate, hasErrors } from './common.js';
import { renderReports } from './reports.js';
const snapshot=inspect();
const rating=evaluate(snapshot);
mkdirSync(join(ROOT,'generated'),{recursive:true});
writeFileSync(join(ROOT,'generated/SKILL-READINESS.md'),
  renderReports(snapshot,rating)['generated/SKILL-READINESS.md'],'utf8');
console.log('Readiness '+rating.score+'/100, Governance '+rating.governance+'/10, Security '+rating.security+'/10; '+rating.status);
if(rating.status!=='DOCUMENTED'||hasErrors(snapshot.errors)) {
  for(const [kind,problems] of Object.entries(snapshot.errors))
    for(const problem of problems) console.error(kind+': '+problem);
  console.error('BLOCKED: required validator failure or below readiness threshold');
  process.exitCode=1;
}
