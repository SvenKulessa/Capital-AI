import { pathToFileURL } from 'node:url';

export async function discoverBillingMetadata({token,fetcher=fetch,signalFactory=()=>AbortSignal.timeout(15000)}={}){
  const project="aifinancial-500208",base="https://bigquery.googleapis.com/bigquery/v2/projects/"+project;
  const summary={schema:"CAPITAL_AI_664_BILLING_METADATA@1",project,readOnly:true,datasetsVisible:null,exportTablesVisible:null,inventory:"NOT_PROVEN",costStatus:"NOT_PROVEN",actualCostEur:null,labelCostEur:null,sqlJobsCreated:0,productionExportAllowed:false};
  if(typeof token!=="string"||token.length<10||/[\s\x00-\x1f]/.test(token))return {...summary,inventory:"BLOCKED_TOKEN"};
  let calls=0;
  async function pages(path,key,reference,validate){
    let cursor="",seen=new Set(),ids=new Set(),out=[];
    for(let i=0;i<20;i++){
      if(++calls>100)throw Error("LIMIT");
      const url=base+path+"?maxResults=100"+(cursor?"&pageToken="+encodeURIComponent(cursor):"");
      let res;try{res=await fetcher(url,{method:"GET",redirect:"error",headers:{Authorization:"Bearer "+token,Accept:"application/json"},signal:signalFactory()});}catch{throw Error("TRANSPORT");}
      if(res.status!==200)throw Error(res.status===401||res.status===403?"ACCESS":"PROVIDER");
      let obj;try{obj=await res.json();}catch{throw Error("RESPONSE");}
      if(!obj||typeof obj!=="object"||Array.isArray(obj))throw Error("RESPONSE");
      const rows=obj[key]??[];
      if(!Array.isArray(rows)||rows.length>100)throw Error("RESPONSE");
      for(const row of rows){
        const id=validate(row?.[reference]);
        if(ids.has(id)||out.length>=1000)throw Error("RESPONSE");
        ids.add(id);out.push(id);
      }
      const next=obj.nextPageToken??"";
      if(typeof next!=="string"||next.length>2048||seen.has(next))throw Error("PAGINATION");
      if(!next)return out;
      seen.add(next);cursor=next;
    }
    throw Error("LIMIT");
  }
  try{
    const ds=await pages("/datasets","datasets","datasetReference",r=>{
      if(r?.projectId!==project||typeof r.datasetId!=="string"||!/^[A-Za-z0-9_]{1,1024}$/.test(r.datasetId))throw Error("IDENTITY");
      return r.datasetId;
    });
    summary.datasetsVisible=ds.length;
    let matches=0;
    for(const d of ds){
      const tables=await pages("/datasets/"+encodeURIComponent(d)+"/tables","tables","tableReference",r=>{
        if(r?.projectId!==project||r.datasetId!==d||typeof r.tableId!=="string"||r.tableId.length>1024)throw Error("IDENTITY");
        return r.tableId;
      });
      matches+=tables.filter(t=>/^gcp_billing_export_(?:v1_|resource_v1_|focus_)[A-Za-z0-9_]+$/.test(t)).length;
    }
    return {...summary,exportTablesVisible:matches,inventory:matches?"EXPORT_VISIBLE":"NO_EXPORT_VISIBLE_IN_PROJECT"};
  }catch(e){
    const code=["LIMIT","TRANSPORT","ACCESS","PROVIDER","RESPONSE","PAGINATION","IDENTITY"].includes(e?.message)?e.message:"RESPONSE";
    return {...summary,inventory:"BLOCKED_"+code};
  }
}

if(process.argv[1] && import.meta.url===pathToFileURL(process.argv[1]).href){
  const report=await discoverBillingMetadata({token:process.env.GOOGLE_CLOUD_ADMIN_ACCESS_TOKEN});
  console.log('CAI664_BILLING_METADATA '+JSON.stringify(report));
  if(report.inventory.startsWith('BLOCKED'))process.exitCode=2;
}
