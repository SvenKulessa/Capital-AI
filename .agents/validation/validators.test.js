import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cpSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, inspect, evaluate, hasErrors } from './common.js';
function fixture(fn) {
 const root=mkdtempSync(join(tmpdir(),'capital-ai-skill-'));
 try {
  mkdirSync(join(root,'.agents'),{recursive:true});
  mkdirSync(join(root,'.github/workflows'),{recursive:true});
  cpSync(join(ROOT,'.agents/skills'),join(root,'.agents/skills'),{recursive:true});
  for(const name of ['AGENTS.md','README.md'])
    cpSync(join(ROOT,name),join(root,name));
  cpSync(join(ROOT,'.github/workflows/build-security.yml'),join(root,'.github/workflows/build-security.yml'));
  return fn(root);
 } finally {rmSync(root,{recursive:true,force:true});}
}
const regpath=root=>join(root,'.agents/skills/registry.json');
function mutate(root,fn) {
 const p=regpath(root),r=JSON.parse(readFileSync(p,'utf8'));
 fn(r);writeFileSync(p,JSON.stringify(r));
}
test('main catalog has 26 uniquely owned skills and meets structural thresholds',()=>{
 const s=inspect();
 assert.deepEqual(s.errors,{registry:[],skills:[],agents:[],ownership:[]});
 assert.equal(s.records.length,26);
 const rating=evaluate(s);
 assert.equal(rating.status,'DOCUMENTED');
 assert.ok(rating.score>=85&&rating.governance>=8&&rating.security>=8);
});
test('missing skill documents fail',()=>fixture(root=>{
 unlinkSync(join(root,'.agents/skills/quant-research/RESPONSIBILITIES.md'));
 assert.match(inspect(root).errors.skills.join('\n'),/quant-research: missing RESPONSIBILITIES/);
}));
test('orphan directory fails',()=>fixture(root=>{
 mkdirSync(join(root,'.agents/skills/rogue-skill'));
 assert.match(inspect(root).errors.registry.join('\n'),/rogue-skill: orphan physical skill/);
}));
test('double ownership fails',()=>fixture(root=>{
 mutate(root,r=>r.domains.GROWTH.ownedSkills.push('quant-research'));
 assert.match(inspect(root).errors.ownership.join('\n'),/multiple domains/);
}));
test('absent governance owner fails',()=>fixture(root=>{
 mutate(root,r=>delete r.skillGovernance['ai-engineering'].governanceOwner);
 assert.match(inspect(root).errors.ownership.join('\n'),/escalation\/governance owner invalid/);
}));
test('missing fail-closed policy fails',()=>fixture(root=>{
 const p=join(root,'.agents/skills/quant-research/RESPONSIBILITIES.md');
 writeFileSync(p,readFileSync(p,'utf8').replaceAll('Fail Closed Policy:','Undefined Policy:'));
 assert.match(inspect(root).errors.skills.join('\n'),/quant-research: missing Fail Closed Policy/);
}));
test('agent reference drift fails',()=>fixture(root=>{
 const p=join(root,'AGENTS.md'),q=String.fromCharCode(96);
 writeFileSync(p,readFileSync(p,'utf8').replaceAll(q+'revenue-engineering'+q,'revenue-engineering'));
 assert.match(inspect(root).errors.agents.join('\n'),/revenue-engineering: missing AGENTS reference/);
}));
test('malformed registry JSON fails closed',()=>fixture(root=>{
 writeFileSync(regpath(root),'{"broken":');
 assert.ok(hasErrors(inspect(root).errors));
 assert.match(inspect(root).errors.registry.join('\n'),/invalid/);
}));

test('duplicate keys in JSON registry fail closed',()=>fixture(root=>{
 const p=regpath(root);
 writeFileSync(p,readFileSync(p,'utf8').replace('"ai-engineering": {','"ai-engineering": {}, "ai-engineering": {'));
 assert.match(inspect(root).errors.registry.join('\\n'),/duplicate JSON key: ai-engineering/);
}));
