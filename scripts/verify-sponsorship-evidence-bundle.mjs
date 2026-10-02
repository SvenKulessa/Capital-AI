import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root=resolve(process.cwd());
const bundlePath='evidence/sponsorship/EB-SPONSORSHIP-P2-20261002-001.json';
const read=p=>JSON.parse(readFileSync(resolve(root,p),'utf8'));
const sha256=p=>'sha256:'+createHash('sha256').update(readFileSync(resolve(root,p))).digest('hex');
function canonicalize(v){if(v===null)return'null';if(typeof v==='string'||typeof v==='number'||typeof v==='boolean')return JSON.stringify(v);if(Array.isArray(v))return'['+v.map(canonicalize).join(',')+']';if(typeof v==='object')return'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonicalize(v[k])).join(',')+'}';throw new Error('unsupported canonical value');}
const b=read(bundlePath);
const groups=['researchEvidenceRefs','sourceProvenanceRefs','licenseEvidenceRefs','datasetEvidenceRefs','experimentEvidenceRefs','costEvidenceRefs','claimEvidenceRefs','documentaryEvidenceRefs','trustEvidenceRefs','platformEvidenceRefs'];
const refs=groups.flatMap(k=>b.manifest[k]??[]);
const refDigests=Object.fromEntries(refs.map(p=>[p,sha256(p)]));
const missingClasses=['researchEvidenceRefs','sourceProvenanceRefs','experimentEvidenceRefs','costEvidenceRefs'].filter(k=>(b.manifest[k]??[]).length===0);
const licenseReview=read('docs/security/evidence/license-rights-review.json');
const documentary=read('generated/documentary/index.json');
const blockers=[...missingClasses.map(k=>k.replace('Refs','').toUpperCase()+'_MISSING')];
if(licenseReview.status!=='VERIFIED'||licenseReview.deployEligible!==true) blockers.push('LICENSE_RIGHTS_REVIEW_OPEN');
if((documentary.entries??[]).length<2) blockers.push('DOCUMENTARY_COVERAGE_INCOMPLETE');
const derived={...b,integrity:{...b.integrity,refDigests,bundleDigest:null},verification:{...b.verification,allRefsResolved:true,allDigestsVerified:true,reproducible:false,status:'BLOCKED',blockers}};
derived.integrity.bundleDigest='sha256:'+createHash('sha256').update(canonicalize(derived)).digest('hex');
if(process.argv.includes('--print')) console.log(JSON.stringify(derived,null,2));
else {
 const failures=[];
 if(b.verification.status!=='BLOCKED') failures.push('bundle must remain BLOCKED while required classes are missing');
 if(b.integrity.bundleDigest!==derived.integrity.bundleDigest) failures.push('bundleDigest stale/missing; expected '+derived.integrity.bundleDigest);
 if(JSON.stringify(b.integrity.refDigests)!==JSON.stringify(refDigests)) failures.push('reference digests stale/missing');
 if(JSON.stringify(b.verification.blockers)!==JSON.stringify(blockers)) failures.push('blocker set stale');
 if(failures.length){console.error('Evidence bundle validation failed:',failures);process.exitCode=1;} else console.log('✓ Evidence bundle refs and SHA-256 digests verified; semantic completeness remains fail-closed BLOCKED.');
}
