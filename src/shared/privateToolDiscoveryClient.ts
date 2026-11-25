// Only the public domain enum crosses the network. Private prompt text stays local.
export type DiscoveryDomain='PRODUCT'|'MARKET'|'PLATFORM'|'TRUST'|'GROWTH';
export type CandidateRow={id:string;name:string;domain:DiscoveryDomain;endpoint:string;operation:string;approvals:string;dependencies:string;evidence:string;status:'NOT_PROVEN'};
export type DiscoveryResult={schema:'GROWTH_TOOL_DISCOVERY@1';storage:string;rows:CandidateRow[];persisted?:boolean;observedAt?:string;topics?:{topic:string;status:string}[];pluginDirectory?:string};
const repo=/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const domains=['PRODUCT','MARKET','PLATFORM','TRUST','GROWTH'];
function parse(value:unknown):DiscoveryResult{
 const v=value as DiscoveryResult;
 if(!v||v.schema!=='GROWTH_TOOL_DISCOVERY@1'||!['AVAILABLE','BLOCKED_RECOVERY','NOT_PROVEN'].includes(v.storage)||!Array.isArray(v.rows)||v.rows.length>100||!v.rows.every(r=>r&&/^tool-[a-f0-9]{48}$/.test(r.id)&&repo.test(r.name)&&r.name.length<=110&&domains.includes(r.domain)&&r.endpoint==='https://github.com/'+r.name&&r.status==='NOT_PROVEN'&&[r.operation,r.approvals,r.dependencies,r.evidence].every(x=>typeof x==='string'&&x.length<=1000)))throw Error('INVALID_DISCOVERY');
 return v;
}
export async function ownerToolDiscovery(domain?:DiscoveryDomain,signal?:AbortSignal):Promise<DiscoveryResult>{
 const response=await fetch('/api/internal/growth-tool-candidates',{method:domain?'POST':'GET',credentials:'same-origin',cache:'no-store',headers:domain?{'Content-Type':'application/json',Accept:'application/json'}:{Accept:'application/json'},...(domain?{body:JSON.stringify({domain})}:{}),signal:signal??AbortSignal.timeout(30000)});
 if(!response.ok)throw Error('DISCOVERY_UNAVAILABLE');
 return parse(await response.json());
}
export function discoveryPromptEvidence(result:DiscoveryResult|null):string{
 if(!result||!Array.isArray(result.topics)||!result.topics.some(t=>t.status==='METADATA_OBSERVED'))return '\n\nTool-Recherche: NOT_PROVEN; keine verifizierte externe Recherche verfügbar. Plugin-Verzeichnis bei Ausführung prüfen.';
 return '\n\nTool-Recherche: GitHub-Metadaten geprüft; Kandidaten (keine Freigabe): '+(result.rows.slice(0,5).map(r=>r.name).join(', ')||'keine Treffer im begrenzten Suchfenster')+'. Version, kommerzielle Rechte und Kosten NOT_PROVEN; Plugin-Verzeichnis separat prüfen. Archiv: '+(result.persisted?'gespeichert':'nicht nachgewiesen')+'.';
}
