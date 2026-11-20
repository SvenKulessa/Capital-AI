import { pathToFileURL } from 'node:url';
import { correlatePullRequests } from './strategy-2026-pr-correlation.mjs';

const REPO = 'SvenKulessa/Capital-AI';
const check = (b,m) => { if (!b) throw new Error(m); };
const sha = s => typeof s === 'string' && /^[0-9a-f]{40}$/i.test(s);
const api = (repo, path) => `https://api.github.com/repos/${repo}/${path}`;

// Injectable fetch for synthetic tests. GET-only. No endpoint accepts user-provided URLs.
export async function collectLiveInventory({repo=REPO, token, fetchImpl=fetch, now=Date.now, maxPRs=200} = {}) {
  check(/^[\w.-]+\/[\w.-]+$/.test(repo), 'invalid repo');
  check(Number.isSafeInteger(maxPRs) && maxPRs>=1 && maxPRs<=200, 'invalid PR bound');
  const headers = {Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'};
  if (token) headers.Authorization = 'Bearer '+token;
  const get = async path => {
    const response = await fetchImpl(api(repo,path), {method:'GET',headers,redirect:'error'});
    check(response && response.ok, 'GitHub inventory fetch failed: HTTP '+(response?.status ?? 'unknown'));
    return response.json();
  };
  const readMain = async () => {
    const ref = await get('git/ref/heads/main');
    check(sha(ref?.object?.sha) && ref?.object?.type === 'commit', 'invalid main ref');
    return ref.object.sha.toLowerCase();
  };
  const firstMain = await readMain();
  const prs = [];
  for (let page=1;page<=3;page++) {
    const batch = await get(`pulls?state=open&per_page=100&page=${page}`);
    check(Array.isArray(batch) && batch.length<=100, 'invalid PR page');
    prs.push(...batch);
    check(prs.length<=maxPRs, 'PR inventory exceeds bound');
    if (batch.length<100) break;
    check(page<3, 'PR pagination incomplete');
  }
  const out = [];
  for (const p of prs) {
    check(Number.isSafeInteger(p?.number) && sha(p?.head?.sha) && sha(p?.base?.sha), 'invalid PR metadata');
    // Base-SHA freshness is a per-PR observation, not an inventory-wide failure.
    const files=[];
    for(let page=1;page<=11;page++) {
      const rows=await get(`pulls/${p.number}/files?per_page=100&page=${page}`);
      check(Array.isArray(rows) && rows.length<=100,'invalid files page');
      for (const item of rows) {
        check(typeof item?.filename === 'string', 'missing filename');
        files.push(item.filename);
        if (item.status === 'renamed') {
          check(typeof item.previous_filename === 'string','missing previous filename');
          files.push(item.previous_filename);
        }
      }
      check(files.length<=1000,'file count exceeds safe limit');
      if(rows.length<100) break;
      check(page<11,'changed files pagination incomplete');
    }
    // Detect incomplete GitHub file lists or concurrent PR writes. Never silently skip files.
    const actualFiles=await get(`pulls/${p.number}`);
    check(actualFiles.state==='open' && actualFiles.head?.sha===p.head.sha &&
      actualFiles.base?.sha===p.base.sha && actualFiles.draft===p.draft,
      'PR metadata changed during inventory');
    check(Number.isSafeInteger(actualFiles.changed_files) && actualFiles.changed_files<3000,
      'GitHub changed_files count unavailable or capped');
    const fileNames=new Set(files);
    check(fileNames.size>=actualFiles.changed_files && fileNames.size<=actualFiles.changed_files*2,
      'file list incomplete');
    out.push({number:p.number,title:p.title,headSha:p.head.sha,baseSha:p.base.sha,
      baseStatus:p.base.sha.toLowerCase() === firstMain ? 'CURRENT_MAIN' : 'BEHIND_MAIN',
      state:'open',draft:p.draft,changedFiles:[...fileNames].sort(),changedFilesComplete:true});
  }
  const finalMain=await readMain();
  check(finalMain===firstMain,'main changed during inventory');
  const observedAt = new Date(now()).toISOString();
  const snapshot={snapshotType:'LIVE_GITHUB',authority:'LIVE_READ_ONLY',inventoryComplete:true,
    observedAt,mainSha:firstMain,repo,pullRequests:out};
  return {snapshot,report:correlatePullRequests(snapshot,{now:now(),currentMainSha:finalMain})};
}
if(process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  collectLiveInventory({token:process.env.GH_TOKEN || process.env.GITHUB_TOKEN}).then(({report})=>
    process.stdout.write(JSON.stringify(report,null,2)+'\n')).catch(e=>{
      console.error('PR_LIVE_ERROR: '+e.message);process.exitCode=2;
    });
}