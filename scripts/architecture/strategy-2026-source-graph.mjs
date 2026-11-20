import { createHash } from 'node:crypto';
import { posix as path } from 'node:path';
import { pathToFileURL } from 'node:url';
import { collectLiveInventory } from './strategy-2026-pr-live.mjs';

const SHA = /^[a-f0-9]{40}$/i;
const safePath = p => typeof p === 'string' && p.length <= 512 && /^(?!\/)(?!.*(?:^|\/)\.\.(?:\/|$))[A-Za-z0-9._/@+ -]+$/.test(p);
const requireValid = (ok, reason) => { if (!ok) throw new Error(reason); };
const codeFile = p => /\.(?:[cm]?js|[cm]?ts|jsx|tsx|sql)$/.test(p) || /(?:^|\/)package\.json$/.test(p);

export function factsFromGitBlob({prNumber, headSha, sourcePath, blobSha, base64Content, size}) {
  requireValid(Number.isSafeInteger(prNumber) && prNumber > 0 && SHA.test(headSha) && safePath(sourcePath) && SHA.test(blobSha), 'invalid source identity');
  requireValid(typeof base64Content === 'string' && base64Content.length <= 150_000 && /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64Content.replace(/\s+/g,'')), 'invalid encoded blob');
  const bytes = Buffer.from(base64Content.replace(/\s+/g,''), 'base64');
  requireValid(bytes.length <= 100_000 && bytes.length === size, 'source size mismatch or over limit');
  const computed = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex');
  requireValid(computed.toLowerCase() === blobSha.toLowerCase(), 'Git blob SHA mismatch');
  const contentSha256 = createHash('sha256').update(bytes).digest('hex');
  const text = bytes.toString('utf8');
  requireValid(Buffer.from(text,'utf8').equals(bytes), 'source is not valid UTF-8');
  const facts = [];
  const push=(kind,target)=>facts.push({prNumber,headSha:headSha.toLowerCase(),sourcePath,blobSha:blobSha.toLowerCase(),contentSha256,kind,target});
  if (/\.(?:[cm]?js|[cm]?ts|jsx|tsx)$/.test(sourcePath)) {
    const imports = /\b(?:import\s*(?:[^'";\n]*?\s+from\s*)?|export\s+[^'";\n]*?\s+from\s*|require\s*\(\s*|import\s*\(\s*)['"](\.{1,2}\/[^'"\n]+)['"]/g;
    for(const match of text.matchAll(imports)) {
      const target=path.normalize(path.join(path.dirname(sourcePath),match[1]));
      if(safePath(target))push(target.startsWith('contracts/')||target.includes('/contracts/')?'CONTRACT_IMPORT':'SOURCE_IMPORT',target);
    }
  } else if(sourcePath.endsWith('.sql')) {
    for(const m of text.matchAll(/\b(?:CREATE\s+TABLE(?:\s+IF\s+NOT\s+EXISTS)?|ALTER\s+TABLE|REFERENCES)\s+((?:[A-Za-z_]\w*\.)?[A-Za-z_]\w*)/gi))
      push('DB_TABLE_REFERENCE',m[1].toLowerCase());
  } else if(sourcePath.endsWith('package.json')) {
    let json;try{json=JSON.parse(text)}catch{throw new Error('invalid package manifest')}
    requireValid(json && typeof json==='object' && !Array.isArray(json), 'invalid package manifest');
    for(const key of ['dependencies','devDependencies','peerDependencies','optionalDependencies']) {
      const deps=json[key]; if(deps === undefined)continue;
      requireValid(deps && typeof deps==='object' && !Array.isArray(deps), 'invalid dependency list');
      for(const dep of Object.keys(deps))if(/^(?:@[-\w.]+\/)?[-\w.]+$/.test(dep))push('PACKAGE_REFERENCE',dep);
    }
  }
  return [...new Map(facts.map(f=>[f.kind+'|'+f.target,f])).values()].sort((a,b)=>(a.kind+a.target).localeCompare(b.kind+b.target));
}

export async function collectGitHubSourceEvidence({snapshot,token,fetchImpl=fetch,maxFiles=24,now=Date.now,maxAgeMs=300_000}={}) {
  requireValid(snapshot?.snapshotType==='LIVE_GITHUB'&&snapshot.inventoryComplete===true&&/^[\w.-]+\/[\w.-]+$/.test(snapshot.repo||''), 'requires complete live snapshot');
  requireValid(Array.isArray(snapshot.pullRequests) && snapshot.pullRequests.length<=200 && Number.isSafeInteger(maxFiles)&&maxFiles>0&&maxFiles<=50,'invalid snapshot or source limit');
  requireValid(typeof snapshot.observedAt==='string' && Number.isFinite(Date.parse(snapshot.observedAt)) && Number.isFinite(maxAgeMs) && maxAgeMs>=0 && typeof now==='function','invalid snapshot freshness');
  const age=now()-Date.parse(snapshot.observedAt);
  requireValid(Number.isFinite(age) && age>=-30_000 && age<=maxAgeMs, 'stale or future source snapshot');
  const selections=[];
  for(const pr of snapshot.pullRequests){
    requireValid(Number.isSafeInteger(pr.number)&&SHA.test(pr.headSha)&&Array.isArray(pr.changedFiles),'invalid PR identity');
    for(const f of pr.changedFiles.filter(codeFile).sort())if(safePath(f))selections.push({pr,path:f});
  }
  const facts=[];
  for(const {pr,path:filename} of selections.slice(0,maxFiles)){
    const safeName=filename.split('/').map(encodeURIComponent).join('/');
    const url=`https://api.github.com/repos/${snapshot.repo}/contents/${safeName}?ref=${pr.headSha}`;
    const headers={Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
    if(token)headers.Authorization='Bearer '+token;
    const response=await fetchImpl(url,{method:'GET',redirect:'error',headers});
    requireValid(response?.ok,'GitHub source read failed: HTTP '+(response?.status ?? 'unknown'));
    const f=await response.json();
    requireValid(f?.type==='file'&&f?.encoding==='base64'&&typeof f.content==='string'&&SHA.test(f.sha),'invalid GitHub source blob');
    facts.push(...factsFromGitBlob({prNumber:pr.number,headSha:pr.headSha,sourcePath:filename,blobSha:f.sha,base64Content:f.content,size:f.size}));
  }
  requireValid(now()-Date.parse(snapshot.observedAt)<=maxAgeMs,'source evidence expired during collection');
  return {schemaVersion:'CAPITAL_AI_SOURCE_EVIDENCE@1',source:'GITHUB_CONTENTS_GET_BY_HEAD_SHA',observedAt:snapshot.observedAt,
    examinedFiles:Math.min(selections.length,maxFiles),candidateFiles:selections.length,coverage:selections.length<=maxFiles?'SELECTED_CHANGED_SOURCE_FILES':'PARTIAL_LIMIT',facts};
}

export function buildSourceBoundReviewGraph(snapshot,evidence,{maxPaths=500}={}) {
  requireValid(snapshot?.snapshotType==='LIVE_GITHUB'&&Array.isArray(snapshot.pullRequests)&&snapshot.pullRequests.length<=200,'requires live snapshot');
  requireValid(evidence?.schemaVersion==='CAPITAL_AI_SOURCE_EVIDENCE@1'&&Array.isArray(evidence.facts)&&evidence.facts.length<=10000 && evidence.observedAt===snapshot.observedAt,'invalid source evidence or snapshot mismatch');
  requireValid(Number.isSafeInteger(maxPaths)&&maxPaths>0&&maxPaths<=2000,'invalid path limit');
  const prs=new Map(snapshot.pullRequests.map(p=>[p.number,p]));
  const facts=evidence.facts;
  for(const f of facts){const p=prs.get(f.prNumber);
    requireValid(p&&p.headSha.toLowerCase()===f.headSha&&p.changedFiles.includes(f.sourcePath)&&SHA.test(f.blobSha)&&
      ['SOURCE_IMPORT','CONTRACT_IMPORT','DB_TABLE_REFERENCE','PACKAGE_REFERENCE'].includes(f.kind) && /^[a-f0-9]{64}$/.test(f.contentSha256), 'source evidence not bound to PR head and changed file');
    requireValid(typeof f.target==='string'&&f.target.length<=512,'invalid referenced target');
  }
  const edges=new Map();
  const add=(a,b,relation,target,evidenceFacts)=>{
    if(a===b)return;
    const [left,right]=[a,b].sort((x,y)=>x-y);
    const key=[left,right,relation,target].join('|');
    if(!edges.has(key)) {
      requireValid(edges.size<5000,'source dependency graph exceeds safe edge limit');
      edges.set(key,{left,right,relation,target,strength:'REVIEW_REQUIRED',sourceEvidence:evidenceFacts.map(x=>({prNumber:x.prNumber,headSha:x.headSha,sourcePath:x.sourcePath,blobSha:x.blobSha,contentSha256:x.contentSha256}))});
    }
  };
  const pathMatches=(ref,changed)=>changed===ref||['.ts','.tsx','.js','.jsx','.mjs','.cjs','.json','/index.ts','/index.tsx','/index.js'].some(s=>changed===ref+s);
  for(const f of facts){
    if(f.kind==='SOURCE_IMPORT'||f.kind==='CONTRACT_IMPORT')for(const p of prs.values()){
      if(p.number!==f.prNumber&&p.changedFiles.some(file=>pathMatches(f.target,file)))add(f.prNumber,p.number,f.kind==='CONTRACT_IMPORT'?'EXPLICIT_CONTRACT_IMPORT':'EXPLICIT_SOURCE_IMPORT',f.target,[f]);
    }
  }
  const groups=new Map();
  for(const f of facts){
    if(!['DB_TABLE_REFERENCE','PACKAGE_REFERENCE'].includes(f.kind))continue;
    const key=f.kind+'|'+f.target;
    if(!groups.has(key))groups.set(key,new Map());
    if(!groups.get(key).has(f.prNumber))groups.get(key).set(f.prNumber,f);
  }
  for(const group of groups.values()){
    const sources=[...group.values()].sort((a,b)=>a.prNumber-b.prNumber);
    for(let i=0;i<sources.length;i++)for(let j=i+1;j<sources.length;j++){
      const a=sources[i],b=sources[j];
      add(a.prNumber,b.prNumber,a.kind==='DB_TABLE_REFERENCE'?'EXPLICIT_DATABASE_ENTITY':'EXPLICIT_PACKAGE_REFERENCE',a.target,[a,b]);
    }
  }
  const directEdges=[...edges.values()].sort((a,b)=>a.left-b.left||a.right-b.right||a.relation.localeCompare(b.relation)||a.target.localeCompare(b.target));
  const adj=new Map([...prs.keys()].map(x=>[x,new Set()]));
  for(const e of directEdges){adj.get(e.left).add(e.right);adj.get(e.right).add(e.left)}
  const transitivePaths=[]; let truncated=false;
  const nums=[...prs.keys()].sort((a,b)=>a-b);
  for(let i=0;i<nums.length;i++){
    const origin=nums[i],queue=[[origin]],seen=new Set([origin]);
    while(queue.length){const walk=queue.shift(),last=walk.at(-1);
      for(const n of [...adj.get(last)].sort((a,b)=>a-b)){
        if(seen.has(n))continue;seen.add(n);
        const next=[...walk,n];queue.push(next);
        if(next.length>2&&n>origin){
          if(transitivePaths.length>=maxPaths){truncated=true;break}
          transitivePaths.push({left:origin,right:n,path:next,relation:'TRANSITIVE_REVIEW_PATH',mergeEligibility:'NOT_PROVEN'});
        }
      }
      if(truncated)break;
    }
    if(truncated)break;
  }
  return {schemaVersion:'CAPITAL_AI_PR_SOURCE_REVIEW_GRAPH@1',authority:'READ_ONLY_NOT_MERGE_AUTHORIZATION',
    evidenceCoverage:evidence.coverage,sourceObservedAt:evidence.observedAt,mainSha:snapshot.mainSha,
    directEdges,transitivePaths,transitivePathsTruncated:truncated,decision:'REVIEW_REQUIRED_NOT_CONFLICT_PROOF'};
}

async function main(){
  const token=process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const {snapshot}=await collectLiveInventory({token});
  const evidence=await collectGitHubSourceEvidence({snapshot,token});
  const graph=buildSourceBoundReviewGraph(snapshot,evidence);
  process.stdout.write(JSON.stringify(graph,null,2)+'\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href)
  main().catch(e=>{console.error('SOURCE_GRAPH_ERROR: '+e.message);process.exitCode=2});