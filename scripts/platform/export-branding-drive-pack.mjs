/** Offline export of original badge and rights bytes. No upload or publication authority. */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { UNIVERSE_VIEW_BRANDING } from '../../shared/hub-branding.mjs';

const root=resolve(import.meta.dirname,'../..');
const output=process.argv[2] && resolve(process.argv[2]);
if(!output || output===root || output.startsWith(root+'/') || existsSync(output)) throw Error('Fresh output directory outside repository required');
const sourceSha=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const read=path=>readFileSync(join(root,path));
const manifests=['docs/licenses/capital-ai-badges.manifest.json','docs/licenses/roadmap-domain-badges.manifest.json','docs/licenses/screener-blueprint-badges.manifest.json'];
const licenseDocs=[
 'docs/licenses/CAPITAL-AI-BADGE-ASSET-LICENSE-1.0.md',
 'docs/licenses/CAPITAL-AI-SUBSCRIPTION-ROLE-PRODUCT-BADGES.md',
 'docs/licenses/CAPITAL-AI-VOCABULARY-BADGE-CUSTOMER-LICENSE-1.0.md',
 'docs/licenses/CAPITAL-AI-DATA-PIPELINE-BLUEPRINT-BADGE.md',
 'docs/licenses/CAPITAL-AI-SCREENER-BLUEPRINT-PREVIEW-LICENSE.md',
 'docs/licenses/SCREENER-BLUEPRINT-BADGE-ASSET-V2.md',
 'docs/licenses/ROADMAP-DOMAIN-BADGES.md',
 'docs/licenses/Capital-AI-BRANDING.md',
 'CAPITAL-AI-PRODUCT/produkt.LICENSE.md','CAPITAL-AI-MARKET/market.LICENSE.md',
 'CAPITAL-AI-PLATFORM/plattform.LICENSE.md','CAPITAL-AI-TRUST/trust.LICENSE.md','CAPITAL-AI-GROWTH/growth.LICENSE.md',
];
const records=[];
const expected=new Map();
for(const manifest of manifests){
 for(const item of JSON.parse(read(manifest)).assets){
  if(expected.has(item.path)||!/^[a-f0-9]{64}$/.test(item.sha256)) throw Error('Invalid manifest: '+item.path);
  expected.set(item.path,{sha256:item.sha256,manifest,license:item.licenseRef??item.license??null,preview:item.publishReady===false});
 }
}
const legacy='public/branding/badges/screener-blueprint.svg';
const paths=[...readdirSync(join(root,'public/branding/badges')).filter(n=>n.endsWith('.svg')).map(n=>'public/branding/badges/'+n), ...[...expected.keys()].filter(p=>!p.startsWith('public/branding/badges/'))].sort();
for(const path of expected.keys())if(!paths.includes(path))throw Error('Manifest asset missing: '+path);
function put(kind,path,bytes){
 const dest=join(output,kind,path);mkdirSync(dirname(dest),{recursive:true});writeFileSync(dest,bytes,{flag:'wx'});
}
for(const path of paths){
 const bytes=read(path),digest=sha(bytes),entry=expected.get(path);
 if(entry && digest!==entry.sha256)throw Error('Manifest SHA mismatch: '+path);
 if(!entry && path!==legacy)throw Error('Unclassified badge: '+path);
 const preview=!entry||entry.preview;
 records.push({path,sha256:digest,bytes:bytes.length,manifest:entry?.manifest??null,license:entry?.license??'docs/licenses/CAPITAL-AI-SCREENER-BLUEPRINT-PREVIEW-LICENSE.md',classification:preview?'PREVIEW_NOT_FOR_SALE':'EXISTING_LICENSE_RECORD',manifestHashVerified:Boolean(entry)});
 put('branding',path,bytes);
}
for(const domain of ['growth','market','platform','product','trust']){
 const alias='public/documentation/badges/'+domain+'.svg',source='CAPITAL-AI-'+domain.toUpperCase()+'/badge.svg';
 const bytes=read(alias);if(sha(bytes)!==sha(read(source)))throw Error('Domain alias differs: '+alias);
 put('branding',alias,bytes);records.push({path:alias,sha256:sha(bytes),bytes:bytes.length,aliasOf:source,classification:'BYTE_IDENTICAL_ALIAS'});
}
for(const path of [...manifests,...licenseDocs])put('licenses',path,read(path));
for(const path of ['docs/branding/UNIVERSE-VIEW-BRANDING-20261126.md','public/branding/asset-pack/meta/social-render-tokens.json'])put('branding',path,read(path));
const evidence={schema:'CAPITAL_AI_BRANDING_DRIVE_EXPORT@1',sourceSha,publicationAuthority:false,driveUpload:'NOT_PERFORMED',design:UNIVERSE_VIEW_BRANDING,assetRecords:records,licenseDocuments:[...manifests,...licenseDocs].map(path=>({path,sha256:sha(read(path)),bytes:read(path).length})),route:{branding:'PRODUCT_BRANDING',licenses:'LEGAL_LICENSES'},rightsBoundary:'Private archive; original license terms and preview holds unchanged; no sale or publication approval.'};
for(const kind of ['branding','licenses'])put(kind,'ARCHIVE-MANIFEST.json',Buffer.from(JSON.stringify(evidence,null,2)+'\n'));
console.log(JSON.stringify({sourceSha,uniqueBadges:paths.length,aliasFiles:5,licenseDocuments:evidence.licenseDocuments.length,driveUpload:'NOT_PERFORMED'}));
