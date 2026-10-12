import { boundedJson } from './http-security.mjs';
import { projectHistoricalDemo, ARCHIVE_WINDOW } from '../shared/analytics-demo.mjs';
/** Read-only owner preview. Archive lacks public redistribution provenance, so never serve anonymously or to paid users. */
export function createHistoricalAnalyticsDemo({auth,env=process.env,fetchImpl=fetch}) {
  return {async handle(req,res,url,json) {
    if (url.pathname !== '/api/analytics/owner-archive-demo') return false;
    if (req.method !== 'GET') {json(res,405,{error:'METHOD_NOT_ALLOWED'});return true;}
    const user = await auth.verify(req,res);
    if (!user?.userId || !await auth.authorizeIamRole(req,res,'owner')) {json(res,403,{error:'OWNER_REQUIRED'});return true;}
    try {
      const base = new URL(env.SUPABASE_URL);
      const key = env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY;
      if (base.protocol !== 'https:' || !/^[a-z0-9-]+\.supabase\.co$/.test(base.hostname) || !key) throw new Error('ARCHIVE_UNAVAILABLE');
      const target = new URL('/rest/v1/score_snapshots',base);
      target.searchParams.set('select','symbol,price,snapshot_date');
      target.searchParams.set('symbol','in.(BTC,ETH,SOL)');
      target.searchParams.set('and',`(snapshot_date.gte.${ARCHIVE_WINDOW.start},snapshot_date.lte.${ARCHIVE_WINDOW.end})`);
      target.searchParams.set('order','symbol.asc,snapshot_date.asc');
      target.searchParams.set('limit','25');
      const response = await fetchImpl(target,{headers:{apikey:key,Authorization:`Bearer ${key}`,Accept:'application/json'},redirect:'error',signal:AbortSignal.timeout(7000)});
      if (!response.ok) throw new Error('ARCHIVE_UNAVAILABLE');
      const assets = projectHistoricalDemo(await boundedJson(response));
      res.setHeader('Cache-Control','private, no-store');
      json(res,200,{mode:'owner-archive',window:ARCHIVE_WINDOW,assets});
    } catch {json(res,503,{error:'ARCHIVE_UNAVAILABLE'});}
    return true;
  }};
}
