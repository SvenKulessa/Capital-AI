/** Synthetic-only loopback visual QA. NEVER grants real content, graphic or data rights. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { archiveContentSnapshot, archiveRightsAdmitted, NEWS_ARCHIVE_REVIEW_VERSION, NEWS_ARCHIVE_USE_CASES } from '../../shared/news-archive-rights.mjs';
import { newsArchivePath, newsBiCsv, publishedNews } from '../../shared/news-lifecycle.mjs';

assert.equal(process.env.GITHUB_ACTIONS, 'true');
assert.equal(process.env.GITHUB_EVENT_NAME, 'pull_request');
assert.equal(process.env.CAPITAL_AI_NEWS_FIXTURE_QA, '1');
const origin = process.argv[2] || 'http://127.0.0.1:17871';
assert.equal(origin, 'http://127.0.0.1:17871');
const root = process.cwd();
const indexPath = resolve(root, 'src/features/analysis/newsLifecycleIndex.json');
const rightsPath = resolve(root, 'shared/news-archive-rights.mjs');
const originalIndex = await readFile(indexPath, 'utf8');
const originalRights = await readFile(rightsPath, 'utf8');
assert.deepEqual(JSON.parse(originalIndex), {version:1,overview:[],archive:[]});
const marker = 'export const NEWS_ARCHIVE_PUBLIC_REVIEWS = Object.freeze([]);';
assert.equal(originalRights.split(marker).length, 2);
assert.ok(originalRights.includes('export const NEWS_IMPACT_PUBLIC_REVIEWS = Object.freeze([]);'));
const fixtureLabel = 'CAPITAL_AI_SYNTHETIC_FIXTURE_NEVER_PUBLIC';
const specs = [
  ['overview-ledger','Ledger Testnet','2026-11-16','Synthetic Ledger Overview','overview',true],
  ['overview-stablecoin','Stablecoin','2026-11-17','Synthetic Stablecoin Overview','overview',true],
  ['overview-regulation','Regulierung','2026-11-18','Synthetic Regulation Overview','overview',true],
  ['archive-ledger','Ledger Testnet','2026-11-10','Synthetic Ledger Archive','archive',true],
  ['archive-stablecoin','Stablecoin','2026-11-11','Synthetic Stablecoin Archive','archive',true],
  ['archive-regulation','Regulierung','2026-11-12','Synthetic Regulation Archive','archive',true],
  ['archive-unreviewed','Marktstruktur','2026-11-13','Synthetic Unapproved Hidden','archive',false],
];
const index={version:1,overview:[],archive:[]},reviews=[];
for(const [idSuffix,topic,date,title,section,admitted] of specs){
  const id='synthetic-'+idSuffix;
  const category=topic==='Ledger Testnet'?'blockchain':topic==='Stablecoin'?'stablecoins':topic==='Regulierung'?'regulierung':'marktstruktur';
  const item={id,title,topic,summary:'SYNTHETIC ONLY - not market information',context:fixtureLabel,
    source:{name:'Synthetic Fixture',url:'https://example.invalid/'+id,date},
    publishedAt:date,retiredAt:'2026-11-19',category,archivePath:newsArchivePath({id,topic,source:{date}}),
    graphic:{kind:'flow',caption:'Synthetic structure',labels:['A','B']},
    rights:{status:'APPROVED',evidenceRef:'synthetic-fixture:'+id},
    marketImpact: id==='synthetic-archive-stablecoin'?{status:'VERIFIED',verifiedScore:95,assessments:[]}:{status:'NOT_PROVEN',assessments:[]}};
  index[section].push(item);
  if(admitted)for(const [kind,allowedUse] of Object.entries(NEWS_ARCHIVE_USE_CASES)) reviews.push({
    version:NEWS_ARCHIVE_REVIEW_VERSION,decision:'APPROVED',kind,allowedUse,storyId:id,
    evidenceRef:item.rights.evidenceRef,reviewer:'synthetic-test-not-license-approval',
    reviewedAt:'2026-11-19',contentSnapshot:archiveContentSnapshot(item),
  });
}
assert.equal(index.overview.length,3);
assert.equal(publishedNews(index.overview,reviews).length,3);
assert.equal(publishedNews(index.archive,reviews).length,3);
assert.equal(publishedNews(index.archive).length,0);
assert.equal(archiveRightsAdmitted(index.archive[3],reviews),false);
assert.equal(archiveRightsAdmitted({...index.archive[0],summary:'changed'},reviews),false);
assert.equal(archiveRightsAdmitted({...index.archive[0],graphic:{kind:'flow',caption:'changed'}},reviews),false);
assert.equal(archiveRightsAdmitted(index.archive[0],reviews.filter(x=>x.kind!=='graphic')),false);
assert.equal(new Set([...index.overview,...index.archive].map(x=>x.id)).size,7);
assert.equal(new Set(index.archive.slice(0,3).map(x=>x.category)).size,3);
const csv=newsBiCsv(publishedNews(index.archive,reviews));
assert.equal(csv.trimEnd().split('\r\n').length,4);
assert.ok(!csv.includes('archive-unreviewed')&&!csv.includes('"95"'));
assert.equal((csv.match(/"NOT_PROVEN"/g)||[]).length,3);
assert.match(newsBiCsv([{...index.archive[0],id:'=HYPERLINK("unsafe")'}]),/"'=HYPERLINK/);
const run=(args,env=process.env)=>{
  const p=spawnSync(process.execPath,args,{cwd:root,stdio:'inherit',env,timeout:180000});
  if(p.error)throw p.error;
  if(p.status!==0)throw Error('FIXTURE_CI_CHILD_FAILED '+JSON.stringify({command:args[0],status:p.status,signal:p.signal}));
};
async function sourceClean(){
  assert.equal(await readFile(indexPath,'utf8'),originalIndex);
  assert.equal(await readFile(rightsPath,'utf8'),originalRights);
  const status=spawnSync('git',['diff','--exit-code','--','src/features/analysis/newsLifecycleIndex.json','shared/news-archive-rights.mjs'],{cwd:root,encoding:'utf8'});
  assert.equal(status.status,0,'Fixture source leaked into git worktree');
}
let error=null,ready=false;
try{
  await writeFile(indexPath,JSON.stringify(index,null,2)+'\n');
  await writeFile(rightsPath,originalRights.replace(marker,'export const NEWS_ARCHIVE_PUBLIC_REVIEWS = Object.freeze('+JSON.stringify(reviews)+');'));
  run(['node_modules/vite/bin/vite.js','build']);
  ready=true;
}catch(e){error=e;}
finally{
  await writeFile(indexPath,originalIndex);
  await writeFile(rightsPath,originalRights);
  await sourceClean();
}
try{if(ready)run(['scripts/qa/news-archive-browser.mjs',origin],{...process.env,CAPITAL_AI_NEWS_FIXTURE_QA_MODE:'populated'});}
catch(e){error??=e;}
finally{
  try{
    run(['node_modules/vite/bin/vite.js','build']);
    await sourceClean();
    const files=await readdir(resolve(root,'dist/assets'));
    assert.ok(files.length>0);
    for(const name of files.filter(x=>x.endsWith('.js'))){
      const content=await readFile(join(root,'dist/assets',name),'utf8');
      assert.ok(!content.includes(fixtureLabel),'Fixture marker leaked into restored build '+name);
    }
    console.log(JSON.stringify({schema:'CAPITAL_AI_NEWS_FIXTURE_RESTORE@1',status:'PASS',scope:'CI_ONLY',productionIndexRestored:true,rightsLedgerRestored:true,distFixtureFree:true}));
  }catch(e){error??=e;}
}
if(error)throw error;
