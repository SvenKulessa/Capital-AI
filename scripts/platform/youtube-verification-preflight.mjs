import { writeFile, appendFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
const REPO='SvenKulessa/Capital-AI';
const must=(ok,code)=>{if(!ok)throw Error(code);};
export async function preflight({artifactId,sha256,token,runId,fetchImpl=fetch}){
 must(/^[1-9][0-9]*$/.test(artifactId||'') && /^[1-9][0-9]*$/.test(runId||'') && /^[a-f0-9]{64}$/.test(sha256||''),'INPUT_INVALID');
 must(typeof token==='string' && token.length>8 && !/[\r\n]/.test(token),'GITHUB_AUTH_REQUIRED');
 const get=async path=>{const r=await fetchImpl('https://api.github.com/repos/'+REPO+path,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(15000)});must(r.ok,'GITHUB_READ_FAILED');return r.json();};
 const source=await get('/actions/artifacts/'+artifactId);
 must(source.name==='youtube-verification-media' && source.expired===false && source.size_in_bytes>0 && source.size_in_bytes<110*1024*1024,'ARTIFACT_INVALID');
 must(source.workflow_run?.head_branch==='main' && /^\d+$/.test(String(source.workflow_run.id)),'SOURCE_INVALID');
 const run=await get('/actions/runs/'+source.workflow_run.id);
 must(run.repository?.full_name===REPO && run.head_repository?.full_name===REPO && run.head_branch==='main' && run.event==='workflow_dispatch' && run.status==='completed' && run.conclusion==='success','SOURCE_UNTRUSTED');
 const claimName='youtube-demo-claim-'+sha256;
 for(let page=1;page<=100;page++){
  const data=await get('/actions/artifacts?per_page=100&page='+page);
  must(Array.isArray(data.artifacts),'ARTIFACT_LIST_INVALID');
  must(!data.artifacts.some(a=>a.name===claimName),'PRIOR_UPLOAD_CLAIM_REQUIRES_RECONCILIATION');
  if(data.artifacts.length<100)return {sourceRunId:String(source.workflow_run.id),claimName,sha256,runId,status:'CLAIMED_NO_AUTOMATIC_RETRY'};
 }
 throw Error('ARTIFACT_HISTORY_LIMIT');
}
if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
 try{
 const r=await preflight({artifactId:process.env.DEMO_ARTIFACT_ID,sha256:process.env.DEMO_SHA256,token:process.env.GH_TOKEN,runId:process.env.GITHUB_RUN_ID});
 await writeFile('youtube-upload-claim.json',JSON.stringify(r,null,2));
 await appendFile(process.env.GITHUB_OUTPUT,'source_run_id='+r.sourceRunId+'\nclaim_name='+r.claimName+'\n');
 }catch{console.error('YOUTUBE_UPLOAD_PREFLIGHT_STOPPED');process.exitCode=1;}
}
