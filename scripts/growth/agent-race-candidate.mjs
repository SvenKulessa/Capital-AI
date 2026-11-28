// Offline Agent Race benchmark projection; no authenticated source, storage, runner or publishing authority.
function exact(value, keys) {
  return !!value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).sort().join(',') === [...keys].sort().join(',');
}

function bounded(value) { return Number.isFinite(value) && value >= 0 && value <= 100; }

export function scoreRaceCandidate(input, contract) {
  const hold = reason => ({state:'NOT_PROVEN',reason,technicalScore:null,publicRankingAllowed:false,providerCalls:0,campaignSpend:0});
  if (contract?.schema !== 'CAPITAL_AI_AGENT_RACE@1' || contract.status !== 'DRAFT_ONLY' || contract.publicPublishAllowed !== false) return hold('CONTRACT_INVALID');
  const keys=['correctness','instruction','efficiency','robustness'];
  const weights=contract.benchmark?.weights;
  if (!exact(weights,keys) || keys.some(k=>!bounded(weights[k])) || keys.reduce((n,k)=>n+weights[k],0)!==100) return hold('WEIGHTS_INVALID');
  if (!exact(input,['runId','taskDigest','modelDigest','budgetDigest','evidenceDigest','security','dimensions'])) return hold('INPUT_INVALID');
  if (!/^[a-zA-Z0-9_-]{1,80}$/.test(input.runId) || !['taskDigest','modelDigest','budgetDigest','evidenceDigest'].every(k=>typeof input[k]==='string' && /^[a-f0-9]{64}$/.test(input[k]))) return hold('IDENTITY_MISSING');
  if (input.security!=='PASS') return hold('SECURITY_NOT_PASSED');
  if (!exact(input.dimensions,keys) || keys.some(k=>!bounded(input.dimensions[k]))) return hold('DIMENSIONS_INCOMPLETE');
  const technicalScore=keys.reduce((n,k)=>n+input.dimensions[k]*weights[k]/100,0);
  return {state:'OFFLINE_CANDIDATE_UNAUTHENTICATED',reason:'SOURCE_SIGNATURE_NOT_VERIFIED',technicalScore,runId:input.runId,taskDigest:input.taskDigest,modelDigest:input.modelDigest,budgetDigest:input.budgetDigest,evidenceDigest:input.evidenceDigest,publicRankingAllowed:false,providerCalls:0,campaignSpend:0};
}

export function compareRaceCandidates(baseline,candidate,contract) {
  const a=scoreRaceCandidate(baseline,contract), b=scoreRaceCandidate(candidate,contract);
  const valid=a.technicalScore!==null&&b.technicalScore!==null&&a.runId!==b.runId&&a.evidenceDigest!==b.evidenceDigest&&['taskDigest','modelDigest','budgetDigest'].every(k=>a[k]===b[k]);
  return {state:valid?'OFFLINE_CANDIDATE_UNAUTHENTICATED':'NOT_PROVEN',delta:valid?b.technicalScore-a.technicalScore:null,promotionAllowed:false,publicRankingAllowed:false};
}

export function projectRaceAmviCandidate(input) {
  const weights={technical:40,marketing:25,improvement:20,demand:15};
  const keys=Object.keys(weights);
  const valid=exact(input,keys)&&keys.every(k=>bounded(input[k]));
  return {schema:'CAPITAL_AI_AGENT_RACE_AMVI_CANDIDATE@1',state:valid?'OFFLINE_CANDIDATE_UNAUTHENTICATED':'NOT_PROVEN',candidateIndex:valid?keys.reduce((n,k)=>n+input[k]*weights[k]/100,0):null,liveIndex:null,nonMonetary:true,publicRankingAllowed:false,promotionAllowed:false};
}

function exactPromptInput(value,keys){return !!value&&typeof value==='object'&&!Array.isArray(value)&&Object.keys(value).sort().join(',')===[...keys].sort().join(',');}

export function buildRacePromptCandidate(input,registry,contract) {
  if(contract?.schema!=='CAPITAL_AI_AGENT_RACE@1'||contract.status!=='DRAFT_ONLY'||contract.publicPublishAllowed!==false||registry?.authority!=='AGENTS.md'||!registry.skillGovernance)throw Error('RACE_CONTRACT_INVALID');
  if(!exactPromptInput(input,['task','skills','vfdTags','animal','participantMode','publicProfileOptIn']))throw Error('RACE_INPUT_INVALID');
  if(typeof input.task!=='string'||!input.task.trim()||input.task.length>4000||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(input.task))throw Error('RACE_TASK_INVALID');
  if(!Array.isArray(input.skills)||input.skills.length>12||input.skills.some(s=>typeof s!=='string'||!Object.hasOwn(registry.skillGovernance,s))||new Set(input.skills).size!==input.skills.length)throw Error('RACE_SKILL_NOT_REGISTERED');
  if(!Array.isArray(input.vfdTags)||input.vfdTags.length>12||input.vfdTags.some(s=>typeof s!=='string'||!/^[A-Z][A-Z0-9_]{1,79}@[1-9]\d*(?:\.\d+){0,2}$/.test(s))||new Set(input.vfdTags).size!==input.vfdTags.length)throw Error('RACE_VFD_TAG_INVALID');
  if(!contract.identity.animals.includes(input.animal)||!['GUEST','PROFILE_CANDIDATE'].includes(input.participantMode)||typeof input.publicProfileOptIn!=='boolean'||(input.participantMode==='GUEST'&&input.publicProfileOptIn))throw Error('RACE_IDENTITY_INVALID');
  const envelope={schema:'CAPITAL_AI_AGENT_RACE_PROMPT_CANDIDATE@1',state:'COPY_ONLY',task:{trust:'UNTRUSTED_DATA',text:input.task},skills:input.skills.map(id=>({id,domainOwner:registry.skillGovernance[id].domainOwner})),vfdTags:input.vfdTags.map(label=>({label,state:'UNVERIFIED_TAG_ONLY'})),identity:{animal:input.animal,participantMode:input.participantMode,publicProfileOptInRequested:input.publicProfileOptIn,publicProfileEnabled:false,avatarUploadEnabled:false},permissionExpansion:false,executionAllowed:false,providerCalls:0,campaignSpend:0,publicPublishAllowed:false};
  return {envelope,plainText:'Agent Race · copy-only candidate\n'+JSON.stringify(envelope,null,2),json:JSON.stringify(envelope)};
}
