import {createHash} from 'node:crypto';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const REPO='SvenKulessa/Capital-AI', REPO_ID=1293009324, OWNER_ID=84307769;
const SHA=/^[a-f0-9]{40}$/;
const clean=s=>String(s??'').replace(/[\u0000-\u001f\u007f<>\x60*_{}\[\]#|]/g,' ').replace(/\s+/g,' ').trim().slice(0,150);
const digest=s=>createHash('sha256').update(s).digest('hex');
export function buildCandidate(event,filenames,registry){
 const p=event?.pull_request;
 if(event?.action!=='closed'||p?.merged!==true||p?.base?.ref!=='main'||
 event?.repository?.id!==REPO_ID||event.repository?.owner?.id!==OWNER_ID||
 p.base?.repo?.id!==REPO_ID||p.base?.repo?.full_name!==REPO||
 !Number.isSafeInteger(p.number)||p.number<1||!SHA.test(p.merge_commit_sha??'')){
  throw Error('MERGE_SOURCE_NOT_AUTHORIZED');
 }
 if(!Array.isArray(filenames)||filenames.length<1||filenames.length>500||
 filenames.some(x=>typeof x!=='string'||x.length>240||x.startsWith('/')||x.includes('\\')||x.split('/').includes('..')||/[\u0000-\u001f]/.test(x))){
  throw Error('MERGE_FILE_INVENTORY_INVALID');
 }
 const paths=[...new Set(filenames)].sort(),domains=new Set();
 for(const x of paths){
  if(/^(CAPITAL-AI-TRUST\/|docs\/(security|licenses)\/|server\/auth|src\/features\/auth)/.test(x))domains.add('TRUST');
  if(/^(CAPITAL-AI-MARKET\/|src\/platform\/(FinTech|Scoring|Finance)|server\/market)/i.test(x))domains.add('MARKET');
  if(/^(CAPITAL-AI-PLATFORM\/|\.github\/workflows\/|deploy\/|supabase\/|server\/)/.test(x))domains.add('PLATFORM');
  if(/^(CAPITAL-AI-GROWTH\/|docs\/growth\/|server\/social-media\/|src\/contracts\/content|src\/platform\/SocialMediaEngine\/)/.test(x))domains.add('GROWTH');
  if(/^(CAPITAL-AI-PRODUCT\/|src\/features\/|src\/components\/|apps\/)/.test(x))domains.add('PRODUCT');
 }
 domains.add('GROWTH'); // Editorial pipeline is always GROWTH even for non-domain file changes.
 const route=[...domains].sort();
 if(registry?.authority!=='AGENTS.md'||registry?.contract!=='SOLO_MAINTAINER_FLOW@1'||
 route.some(d=>!registry.domains?.[d]?.engineering||!registry.domains?.[d]?.advisory))throw Error('MERGE_SKILL_REGISTRY_INVALID');
 const fingerprint=digest(JSON.stringify({repoId:REPO_ID,pr:p.number,sha:p.merge_commit_sha,paths}));
 const campaignId='pr-merge-'+p.number+'-'+p.merge_commit_sha.slice(0,12);
 const contentId='release-'+p.number+'-'+fingerprint.slice(0,12);
 const canonicalUrl='https://capital-ai.online/learning-platform';
 const utm=ch=>canonicalUrl+'?utm_source='+ch+'&utm_medium=organic_social&utm_campaign='+campaignId+'&utm_content='+contentId;
 const title=clean(p.title)||'Repository-Änderung';
 return {schema:'CAPITAL_AI_SOCIAL_RELEASE_CANDIDATE@1',state:'DRAFT_ONLY',publicPublishAllowed:false,
  repository:REPO,sourceSha:p.merge_commit_sha,sourcePr:p.number,contentId,campaignId,fingerprint,
  sourceUrls:['https://github.com/'+REPO+'/pull/'+p.number,'https://github.com/'+REPO+'/commit/'+p.merge_commit_sha],
  domainRouting:route,suggestedSkillRouting:route.flatMap(d=>[registry.domains[d].engineering,registry.domains[d].advisory]),
  executedSkills:[],rightsStatus:'REVIEW_REQUIRED',claimsStatus:'REVIEW_REQUIRED',audienceStatus:'REVIEW_REQUIRED',providerStatus:'NOT_PROVEN',
  summary:'PR #'+p.number+' gemergt: '+title+'. Wirkung und Produktionsfreigabe nicht bestätigt.',
  platformDrafts:[
   {channel:'WEBSITE',audience:'Learning-Interessierte',text:'Entwicklungsupdate: '+title,targetUrl:canonicalUrl},
   {channel:'LINKEDIN',audience:'FinTech- und Engineering-Teams',text:'CAPITAL-AI Entwicklung: '+title+'. PR-Nachweis, kein Produktionsversprechen.',targetUrl:utm('linkedin')},
   {channel:'X',audience:'Developer-Community',text:'CAPITAL-AI Dev Update: '+title+'. Stand im PR.',targetUrl:utm('x')},
   {channel:'YOUTUBE',audience:'Erwachsene Finanz-Lerninteressierte',text:'Storyboard-Entwurf: '+title,format:'SHORT_STORYBOARD_ONLY',targetUrl:utm('youtube')}],
  delivery:{stage:'EDITORIAL_REVIEW',providerCalls:0,publishAttempts:0,externalSpendAllowed:false}};
}
export async function readMergedFileInventory({prNumber,token,fetchImpl=fetch}={}){
 if(!Number.isSafeInteger(prNumber)||prNumber<1||!token)throw Error('MERGE_CRAWL_CONFIG_INVALID');
 const paths=[];
 for(let page=1;page<=5;page++){
  const url='https://api.github.com/repos/'+REPO+'/pulls/'+prNumber+'/files?per_page=100&page='+page;
  const res=await fetchImpl(url,{headers:{Authorization:'Bearer '+token,Accept:'application/vnd.github+json'},redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw Error('MERGE_CRAWL_HTTP_'+res.status);
  const rows=await res.json();
  if(!Array.isArray(rows)||rows.length>100||rows.some(x=>typeof x.filename!=='string'))throw Error('MERGE_CRAWL_RESPONSE_INVALID');
  paths.push(...rows.map(x=>x.filename));
  if(rows.length<100)return paths;
 }
 throw Error('MERGE_CRAWL_PAGINATION_LIMIT');
}
async function main(){
 if(process.env.GITHUB_REPOSITORY!==REPO||!process.env.GITHUB_EVENT_PATH||!process.env.GH_TOKEN)throw Error('MERGE_RUNTIME_NOT_AUTHORIZED');
 const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
 const registry=JSON.parse(await readFile('.agents/skills/registry.json','utf8'));
 buildCandidate(event,['AGENTS.md'],registry);
 const files=await readMergedFileInventory({prNumber:event.pull_request.number,token:process.env.GH_TOKEN});
 const candidate=buildCandidate(event,files,registry);
 const target='artifacts/social-content-candidates/pr-'+candidate.sourcePr+'-'+candidate.sourceSha.slice(0,12)+'.json';
 await mkdir(dirname(target),{recursive:true});
 await writeFile(target,JSON.stringify(candidate,null,2)+'\n',{flag:'wx',mode:0o600});
 process.stdout.write('SOCIAL_DRAFT_CANDIDATE_CREATED pr='+candidate.sourcePr+' state=DRAFT_ONLY\n');
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{process.stderr.write('SOCIAL_DRAFT_ERROR '+e.message+'\n');process.exitCode=1;});
}
