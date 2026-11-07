/** Server/CLI transport; source content never grants publishing authority. */
export function firecrawlConfiguration(env=process.env) {
  const url=new URL(env.FIRECRAWL_BASE_URL || 'https://api.firecrawl.dev');
  const cloud=url.href==='https://api.firecrawl.dev/';
  const local=url.protocol==='http:' && ['127.0.0.1','localhost','[::1]'].includes(url.hostname)
    && url.port==='3002' && url.pathname==='/' && !url.search && !url.hash;
  if ((!cloud&&!local)||url.username||url.password) throw Error('FIRECRAWL_ENDPOINT_NOT_ALLOWED');
  return {endpoint:url.origin+'/v2/scrape',cloud,
    authorized:env.SOCIAL_BATCH_EXTERNAL_WORKERS==='enabled'&&(!cloud||Boolean(env.FIRECRAWL_API_KEY))};
}
export async function readWorkerJson(response,maxBytes) {
  if (!response.body?.getReader) throw Error('WORKER_RESPONSE_BODY_MISSING');
  const reader=response.body.getReader(),chunks=[];let size=0;
  try {
    for (;;) {
      const {done,value}=await reader.read();if(done)break;
      size+=value.byteLength;if(size>maxBytes)throw Error('WORKER_RESPONSE_OVERSIZE');chunks.push(value);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel(); }
}
export async function scrapePublicSource(sourceUrl,{allowedUrls,env=process.env,fetchImpl=fetch}={}) {
  const source=new URL(sourceUrl);
  if (!allowedUrls?.has(sourceUrl)||source.protocol!=='https:'||source.username||source.password)
    throw Error('FIRECRAWL_SOURCE_NOT_ALLOWED');
  const configuration=firecrawlConfiguration(env);
  if (!configuration.authorized) throw Error('FIRECRAWL_NOT_AUTHORIZED');
  const headers={'Content-Type':'application/json'};
  // An API key for the hosted product must never be forwarded to a local process.
  if(configuration.cloud)headers.Authorization='Bearer '+env.FIRECRAWL_API_KEY;
  const response=await fetchImpl(configuration.endpoint,{method:'POST',redirect:'error',signal:AbortSignal.timeout(10000),headers,
    body:JSON.stringify({url:sourceUrl,formats:['markdown'],onlyMainContent:true})});
  if(!response.ok)throw Error('FIRECRAWL_HTTP_FAILURE');
  const data=await readWorkerJson(response,50000),markdown=data.data?.markdown??data.markdown;
  if(data.success===false||typeof markdown!=='string'||!markdown.trim())throw Error('FIRECRAWL_RESPONSE_INVALID');
  return markdown;
}
