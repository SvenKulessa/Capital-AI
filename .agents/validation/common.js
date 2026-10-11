import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const DOMAINS = ['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH'];
export const SECTIONS = ['Mission','Scope','Inputs','Outputs','Dependencies','Domain Ownership','KPIs','Evidence Requirements','Security Constraints','Failure Conditions','Validation Rules','Acceptance Criteria','Escalation Matrix'];
export const DOCS = ['SKILL.md','RESPONSIBILITIES.md','INTERFACES.md'];
const read = (root, path) => { try { return readFileSync(join(root, path),'utf8'); } catch { return ''; } };
const uniq = xs => new Set(xs).size === xs.length;
const validId = id => typeof id === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id);
const heading = (doc,s) => doc.includes('## '+s+'\n');
export function inspect(root=ROOT) {
 const errors={registry:[],skills:[],agents:[],ownership:[]};
 let registry;
 try { registry=JSON.parse(readFileSync(join(root,'.agents/skills/registry.json'),'utf8')); }
 catch(e) { for (const key of Object.keys(errors)) errors[key].push('registry missing/invalid: '+e.message); return {root,registry:null,errors,ids:[],records:[]}; }
 if (!registry || typeof registry!=='object' || Array.isArray(registry)) {
   for(const key of Object.keys(errors)) errors[key].push('registry must be object');
   return {root,registry:null,errors,ids:[],records:[]};
 }
 if(registry.schemaVersion!=='CAPITAL_AI_DOMAIN_SKILLS@1' || registry.authority!=='AGENTS.md' ||
   registry.skillGovernanceVersion!=='CAPITAL_AI_SKILL_GOVERNANCE@1') errors.registry.push('schema/authority mismatch');
 if(!registry.domains || Object.keys(registry.domains).length!==5 ||
   DOMAINS.some(d=>!registry.domains[d])) errors.registry.push('exactly five domains required');
 const governs=registry.skillGovernance;
 if(!governs || typeof governs!=='object' || Array.isArray(governs)) errors.registry.push('invalid skillGovernance');
 const owners=governs && typeof governs==='object' && !Array.isArray(governs) ? governs : {};
 const ids=Object.keys(owners);
 if(ids.some(id=>!validId(id))) errors.registry.push('unsafe skill identifier');
 const owned=[];
 for(const domain of DOMAINS) {
   const d=registry.domains?.[domain];
   if(!d) continue;
   if(!Array.isArray(d.ownedSkills) || !uniq(d.ownedSkills) || d.ownedSkills.some(id=>!validId(id))) {
      errors.registry.push(domain+': invalid ownedSkills'); continue;
   }
   for(const id of d.ownedSkills) owned.push({domain,id});
   if(!d.ownedSkills.includes(d.engineering) || !d.ownedSkills.includes(d.advisory))
      errors.registry.push(domain+': standard skills missing from ownership');
 }
 if(!uniq(owned.map(x=>x.id))) errors.ownership.push('one skill owned by multiple domains');
 for(const {domain,id} of owned) {
   if(!owners[id]) errors.ownership.push(id+': governance entry missing');
   else if(owners[id].domainOwner!==domain) errors.ownership.push(id+': owner mismatch');
 }
 for(const id of ids) if(!owned.some(o=>o.id===id)) errors.registry.push(id+': orphan governance entry');
 const shared=registry.sharedSkills?.specialists;
 if(!Array.isArray(shared) || !uniq(shared)) errors.registry.push('legacy shared specialists invalid');
 else for(const id of shared) {
   if(!owners[id] || !registry.specialistSkillMetadata?.[id] || !registry.specialistRouting?.signals?.[id])
     errors.registry.push(id+': legacy routing/specialist missing');
 }
 if(Array.isArray(shared) && (Object.keys(registry.specialistSkillMetadata??{}).some(id=>!shared.includes(id)) ||
   Object.keys(registry.specialistRouting?.signals??{}).some(id=>!shared.includes(id))))
   errors.registry.push('legacy specialist catalog mismatch');
 let directories=[];
 try {directories=readdirSync(join(root,'.agents/skills'),{withFileTypes:true}).filter(x=>x.isDirectory()).map(x=>x.name);}
 catch {errors.registry.push('skill root missing');}
 for(const id of directories) if(!ids.includes(id)) errors.registry.push(id+': orphan physical skill');
 for(const id of ids) {
   if(!directories.includes(id)) errors.registry.push(id+': physical directory missing');
   if(!validId(id)) continue;
   const parts=Object.fromEntries(DOCS.map(f=>[f,read(root,'.agents/skills/'+id+'/'+f)]));
   const all=DOCS.map(f=>parts[f]).join('\n');
   for(const file of DOCS) if(!parts[file]) errors.skills.push(id+': missing '+file);
   if(!new RegExp('^---\\nname:\\s*'+id+'\\n').test(parts['SKILL.md']))
     errors.skills.push(id+': invalid SKILL frontmatter name');
   for(const section of SECTIONS) if(!heading(all,section)) errors.skills.push(id+': missing section '+section);
   for(const term of ['Security Boundary:','Threat Assumptions:','Failure Behaviour:','Fail Closed Policy:'])
     if(!all.includes(term)) errors.skills.push(id+': missing '+term);
   const g=owners[id];
   if(!g || typeof g!=='object' || Array.isArray(g)) {errors.ownership.push(id+': ownership object missing');continue;}
   if(!DOMAINS.includes(g.domainOwner) || !owned.some(o=>o.id===id && o.domain===g.domainOwner))
      errors.ownership.push(id+': invalid Domain Owner');
   if(g.escalationOwner!=='CAPITAL-AI-'+g.domainOwner || g.governanceOwner!=='CAPITAL-AI-TRUST')
      errors.ownership.push(id+': escalation/governance owner invalid');
   if(g.governanceLevel!=='G2' || g.status!=='DOCUMENTED' ||
      !Array.isArray(g.frameworks) || g.frameworks.length<2 || !uniq(g.frameworks))
      errors.ownership.push(id+': governance fields invalid');
   if(!Array.isArray(g.kpis) || g.kpis.length<2 || g.kpis.some(v=>typeof v!=='string'||!v.trim()) || !uniq(g.kpis))
      errors.skills.push(id+': invalid KPIs');
   else for(const kpi of g.kpis) if(!all.includes(kpi)) errors.skills.push(id+': KPI not documented '+kpi);
   for(const role of ['Domain Owner','Escalation Owner','Governance Owner']) {
      const value=role==='Domain Owner'?g.domainOwner:role==='Escalation Owner'?g.escalationOwner:g.governanceOwner;
      for(const f of ['RESPONSIBILITIES.md','INTERFACES.md'])
        if(!parts[f].includes(role+': '+value)) errors.ownership.push(id+': '+role+' mismatch in '+f);
   }
 }
 const agents=read(root,'AGENTS.md'),readme=read(root,'README.md'),q=String.fromCharCode(96);
 for(const domain of DOMAINS) if(!agents.includes(domain)||!readme.includes(domain))
   errors.agents.push('missing domain '+domain);
 if(!agents.includes('.agents/skills/registry.json') || !readme.includes('.agents/skills/registry.json'))
   errors.agents.push('registry reference missing');
 for(const id of ids) if(validId(id)) {
   if(!agents.includes(q+id+q)) errors.agents.push(id+': missing AGENTS reference');
   if(!readme.includes(q+id+q)) errors.agents.push(id+': missing README reference');
 }
 return {root,registry,errors,ids,records:ids.filter(validId).map(id=>({id,...owners[id]}))};
}
export const hasErrors = errors => Object.values(errors).some(values=>values.length);
export function evaluate(s) {
 const tests=read(s.root,'.agents/validation/validators.test.js');
 const workflow=read(s.root,'.github/workflows/build-security.yml');
 const coverage=tests.includes('test(')&&workflow.includes('npm run validate:all')?9:1;
 const results=s.records.map(r=>{
  const docs=DOCS.map(f=>read(s.root,'.agents/skills/'+r.id+'/'+f)),full=docs.join('\n');
  const documentation=Math.max(1,Math.round(10*SECTIONS.filter(x=>heading(full,x)).length/13));
  const security=Math.max(1,Math.round(10*['Security Boundary:','Threat Assumptions:','Failure Behaviour:','Fail Closed Policy:'].filter(t=>full.includes(t)).length/4));
  const ownerOk=!s.errors.ownership.some(e=>e.startsWith(r.id+':')||e.includes('multiple domains'));
  const ownership=ownerOk?10:1;
  const governance=r.governanceLevel==='G2'&&Array.isArray(r.frameworks)&&r.frameworks.length>=2&&ownerOk?10:1;
  const evidence=Math.max(1,2*['Inputs','Outputs','KPIs','Evidence Requirements','Acceptance Criteria'].filter(x=>heading(full,x)).length);
  const maintainability=docs.every(Boolean)&&heading(full,'Validation Rules')?9:1;
  const scalability=docs[2].includes('## Dependencies')&&docs[2].includes('## Security Boundary')?8:1;
  const readiness=Math.round((documentation+security+ownership+governance+evidence+coverage)*10/6);
  const blocked=Object.values(s.errors).some(es=>es.some(e=>e.startsWith(r.id+':'))) || readiness<85 || security<8 || governance<8;
  return {...r,documentation,security,ownership,governance,evidence,testCoverage:coverage,maintainability,scalability,readiness,result:blocked?'BLOCKED':'DOCUMENTED'};
 });
 const score=results.length?Math.min(...results.map(x=>x.readiness)):0;
 const security=results.length?Math.min(...results.map(x=>x.security)):0;
 const governance=results.length?Math.min(...results.map(x=>x.governance)):0;
 return {results,score,security,governance,status:!hasErrors(s.errors)&&score>=85&&security>=8&&governance>=8&&results.every(x=>x.result==='DOCUMENTED')?'DOCUMENTED':'BLOCKED'};
}
export function logErrors(kind,errors) {
 if(!errors.length) {console.log(kind+': PASS');return;}
 for(const e of errors) console.error(kind+': '+e);
 process.exitCode=1;
}
