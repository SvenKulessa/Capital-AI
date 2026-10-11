import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, inspect, evaluate, hasErrors, logErrors } from './common.js';
import { renderReports } from './reports.js';
const s=inspect();
for(const [kind,errors] of Object.entries(s.errors)) logErrors(kind,errors);
if(hasErrors(s.errors)) process.exit(1);
const reports=renderReports(s,evaluate(s));
mkdirSync(join(ROOT,'generated'),{recursive:true});
for(const [filename,content] of Object.entries(reports)) {
  writeFileSync(join(ROOT,filename),content,'utf8');
  console.log('Generated '+filename);
}
