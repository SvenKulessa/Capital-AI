// Offline hygiene measurement profile in the existing benchmark core.
// Inputs are observations, not verified receipts or authority. No provider calls or writes.
export const HYGIENE_VERSION="CAPITAL_AI_DOCUMENT_HYGIENE@1";
export const HYGIENE_WEIGHTS=Object.freeze({"freshness":15,"correctness":20,"provenance":20,"structure":10,"promptRouting":15,"securityCompliance":15,"maintainability":5});
const CRITICAL_CONTROLS=Object.freeze(["security","privacy","rights","integrity"]);
const idPattern=/^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/;
const digestPattern=/^[a-f0-9]{64}$/;
function validId(x){return typeof x==="string"&&idPattern.test(x)}
function validDigest(x){return typeof x==="string"&&digestPattern.test(x)}
function exactKeys(value, keys){return value!==null&&typeof value==="object"&&!Array.isArray(value)&&Object.keys(value).length===keys.length&&keys.every(k=>Object.hasOwn(value,k))}
function refs(value){
  if(!Array.isArray(value)||value.length<1||value.length>100||!value.every(validId)||new Set(value).size!==value.length) throw new TypeError("INVALID_EVIDENCE_REFS");
  return [...value].sort();
}
export function createDocumentHygieneBenchmark(input){
  if(!input||!validId(input.runId)||!validDigest(input.scopeDigest)||!validId(input.methodId)||!exactKeys(input.dimensions,Object.keys(HYGIENE_WEIGHTS))||!exactKeys(input.criticalControls,CRITICAL_CONTROLS)) throw new TypeError("INVALID_HYGIENE_INPUT");
  let earned=0,coverage=0;
  const dimensions={};
  for(const [key,weight] of Object.entries(HYGIENE_WEIGHTS)){
    const d=input.dimensions[key];
    if(d===null){dimensions[key]={status:"NOT_PROVEN",score:null,sampleSize:null,evidenceRefs:[]};continue}
    if(!exactKeys(d,["score","sampleSize","evidenceRefs"])||!Number.isInteger(d.score)||d.score<0||d.score>100||!Number.isSafeInteger(d.sampleSize)||d.sampleSize<1) throw new TypeError("INVALID_HYGIENE_DIMENSION:"+key);
    dimensions[key]={status:"MEASURED_INPUT",score:d.score,sampleSize:d.sampleSize,evidenceRefs:refs(d.evidenceRefs)};
    earned+=d.score*weight;coverage+=weight;
  }
  const criticalControls={};
  for(const key of CRITICAL_CONTROLS){
    const c=input.criticalControls[key];
    if(c===null){criticalControls[key]={status:"NOT_PROVEN",evidenceRefs:[]};continue}
    if(!exactKeys(c,["status","evidenceRefs"])||!["PASS","FAIL"].includes(c.status)) throw new TypeError("INVALID_HYGIENE_CONTROL:"+key);
    criticalControls[key]={status:c.status,evidenceRefs:refs(c.evidenceRefs)};
  }
  const controls=Object.values(criticalControls);
  const status=controls.some(c=>c.status==="FAIL")?"BLOCKED":controls.some(c=>c.status==="NOT_PROVEN")||coverage!==100?"NOT_PROVEN":"REVIEW_REQUIRED";
  return {schemaVersion:HYGIENE_VERSION,runId:input.runId,scopeDigest:input.scopeDigest,methodId:input.methodId,score:coverage?Math.round(earned/coverage*100)/100:null,coverage,dimensions,criticalControls,status,authorityGranted:false,productionEligible:false,commercialEligible:false};
}
export function compareDocumentHygieneBenchmarks(beforeInput,afterInput){
  const before=createDocumentHygieneBenchmark(beforeInput),after=createDocumentHygieneBenchmark(afterInput);
  const comparable=before.runId!==after.runId&&before.scopeDigest===after.scopeDigest&&before.methodId===after.methodId&&before.score!==null&&after.score!==null&&Object.keys(HYGIENE_WEIGHTS).every(k=>before.dimensions[k].status===after.dimensions[k].status&&before.dimensions[k].sampleSize===after.dimensions[k].sampleSize);
  const delta=comparable?Math.round((after.score-before.score)*100)/100:null;
  return {comparable,deltaPoints:delta,relativePercent:comparable&&before.score!==0?Math.round(delta/before.score*10000)/100:null,coverageBefore:before.coverage,coverageAfter:after.coverage,criticalRegression:CRITICAL_CONTROLS.some(k=>before.criticalControls[k].status==="PASS"&&after.criticalControls[k].status!=="PASS"),authorityGranted:false};
}
