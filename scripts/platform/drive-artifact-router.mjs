// CAPITAL_AI_DRIVE_ARTIFACT_ROUTING@1: deterministic, read-only planning; NO Drive writes.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
export const routingContract = Object.freeze(JSON.parse(readFileSync(new URL('../../.agents/contracts/drive-artifact-routing.json',import.meta.url),'utf8')));
export const acodeContract = Object.freeze(JSON.parse(readFileSync(new URL('../../.agents/contracts/acode-shared-delivery.json',import.meta.url),'utf8')));
export function planArtifact(input, contract, acodeContract) {
  const hold = reason=>({status:"BLOCKED",reason,driveUpload:"NOT_PROVEN",driveParent:"NOT_PROVEN",deviceSync:"NOT_PROVEN"});
  if (!input || typeof input!=="object" || Array.isArray(input) || input.project!=="CAPITAL-AI") return hold("PROJECT_SCOPE_MISMATCH");
  if (input.sensitivity!=="PUBLIC" && input.sensitivity!=="REDACTED") return hold("CONTENT_PRIVACY_REVIEW_REQUIRED");
  if (input.scope!=="ACODE" && input.scope!=="PROJECT") return hold("DESTINATION_SCOPE_REQUIRED");
  if (typeof input.topic!=="string" || !/^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/.test(input.topic) || input.topic.length>72) return hold("INVALID_TOPIC");
  const date=input.date;
  if (typeof date!=="string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(Date.parse(date+"T00:00:00Z")) || new Date(date+"T00:00:00Z").toISOString().slice(0,10)!==date) return hold("INVALID_DATE");
  const extension=input.extension;
  if (typeof extension!=="string" || !/^[a-z0-9]{2,6}$/.test(extension)) return hold("INVALID_EXTENSION");
  const category=input.category;
  let folder, domain, prefix;
  if (input.scope==="ACODE") {
    if (category!=="ACODE_CODE") return hold("ACODE_SHARED_IS_ACODE_ONLY");
    domain=input.domain;
    if (!acodeContract.allowedDomains.includes(domain)||!acodeContract.allowedExtensions.includes(extension)) return hold("ACODE_CONTRACT_REJECTED");
    folder={folderId:acodeContract.driveFolderId,folder:acodeContract.driveFolder};
    prefix=`${date}_${domain}_CHATGPT_${input.topic}_v`;
  } else {
    if (category==="ACODE_CODE") return hold("ACODE_CODE_REQUIRES_ACODE_SCOPE");
    folder=contract.routes[category];
    if (!folder || !folder.folderId) return hold("CATEGORY_NOT_MAPPED");
    domain=folder.domain||input.domain;
    if (!contract.domains.includes(domain)) return hold("INVALID_DOMAIN");
    if (folder.domain && input.domain && input.domain!==folder.domain) return hold("DOMAIN_CATEGORY_MISMATCH");
    if (!contract.generalExtensions.includes(extension)) return hold("EXTENSION_NOT_ALLOWED");
    let status="";
    if (input.fileStatus!==undefined) {
      if (!contract.statuses.includes(input.fileStatus)) return hold("INVALID_FILE_STATUS");
      if (input.fileStatus==="APPROVED" && input.statusEvidence!=="VERIFIED") return hold("APPROVAL_NOT_PROVEN");
      status="_"+input.fileStatus;
    }
    prefix=`${date}_${domain}_${input.topic}${status}_v`;
  }
  const parent={folderId:folder.folderId,folder:folder.folder};
  const filenameFor=version=>`${prefix}${version}.${extension}`;
  if (!Array.isArray(input.existingNames) || input.existingNames.some(v=>typeof v!=="string"||v.length>240)) return {...hold("FOLDER_LISTING_REQUIRED"),target:parent};
  const prior=new Set(input.existingNames);
  let version=1; while (prior.has(filenameFor(version))) {version++;if(version>9999)return hold("VERSION_SPACE_EXHAUSTED");}
  const filename=filenameFor(version);
  const readback=input.listingComplete===true && input.listedParentId===folder.folderId;
  return {status:readback?"ROUTE_READY":"WAIT",reason:readback?null:"PARENT_LISTING_NOT_VERIFIED",filename,folderId:folder.folderId,driveFolder:folder.folder,category,domain,version,project:contract.project,naming:"VERIFIED",uploadAdmission:readback?"READY_FOR_AUTHORIZED_CONNECTOR":"HOLD",driveUpload:"NOT_PROVEN",driveParent:"NOT_PROVEN",deviceSync:"NOT_PROVEN",sha256:"NOT_PROVEN"};
}
export function planDriveArtifact(input){ return planArtifact(input,routingContract,acodeContract); }
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  // Local classification plan only. Input file contains metadata, never secrets or raw user data.
  const file=process.argv[2];
  if(!file){ console.error('Usage: node scripts/platform/drive-artifact-router.mjs <redacted-metadata.json>'); process.exitCode=2; }
  else { try {const obj=JSON.parse(readFileSync(file,'utf8'));const outcome=planDriveArtifact(obj);console.log(JSON.stringify(outcome,null,2));if(outcome.status==='BLOCKED')process.exitCode=2;}catch{console.error('ROUTING=BLOCKED (invalid metadata input)');process.exitCode=2;} }
}
