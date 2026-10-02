import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const SHA256=/^sha256:[0-9a-f]{64}$/;
export function classifyTs7CompilerReachability({messages,openvex,buildInfo,binarySha256,trivyFindings}) {
 const config=messages.find(m=>m?.config)?.config||null;
 const findings=messages.filter(m=>m?.finding).map(m=>m.finding);
 const symbolFrames=findings.flatMap(f=>Array.isArray(f.trace)?f.trace:[]).filter(f=>typeof f?.function==='string'&&f.function);
 const high=trivyFindings.filter(v=>v.severity==='HIGH'&&(v.package==='stdlib'||v.package==='golang.org/x/text'));
 const exact=buildInfo.includes('go1.26.4')&&/(?:^|\s)dep\s+golang\.org\/x\/text\s+v0\.38\.0(?:\s|$)/m.test(buildInfo);
 const statements=Array.isArray(openvex?.statements)?openvex.statements:[];
 const affected=statements.filter(s=>s.status==='affected');
 const notAffected=statements.filter(s=>s.status==='not_affected'&&['vulnerable_code_not_present','vulnerable_code_not_in_execute_path'].includes(s.justification));
 const prerequisites={binaryDigestValid:SHA256.test(binarySha256||''),exactCompilerBuildInfo:exact,binaryMode:config?.scan_mode==='binary',symbolLevel:config?.scan_level==='symbol',trivyHighFindingsPresent:high.length>0,openVexPresent:statements.length>0};
 let decision='INCONCLUSIVE',reason='REACHABILITY_PREREQUISITES_NOT_PROVEN';
 if(Object.values(prerequisites).every(Boolean)){if(affected.length||symbolFrames.length){decision='AFFECTED';reason='VULNERABLE_SYMBOL_PRESENT_IN_TS7_COMPILER';}else if(notAffected.length){decision='NOT_AFFECTED';reason='GOVULNCHECK_BINARY_SYMBOL_ANALYSIS_NOT_AFFECTED';}else reason='NO_NOT_AFFECTED_VEX_STATEMENT';}
 return {schema:'TS7_COMPILER_REACHABILITY@1',component:'@typescript/typescript-linux-x64',componentVersion:'7.0.2',binarySha256:binarySha256||null,buildInfo:{goVersion:'go1.26.4',xTextVersion:'v0.38.0',exactMatch:exact},scanner:{name:config?.scanner_name||'govulncheck',version:config?.scanner_version||null,scanMode:config?.scan_mode||null,scanLevel:config?.scan_level||null},evidence:{trivyHighFindings:high,govulncheckFindingCount:findings.length,symbolFindingCount:symbolFrames.length,openVexStatementCount:statements.length,affectedStatementCount:affected.length,notAffectedStatementCount:notAffected.length},prerequisites,decision,reason,blocking:decision!=='NOT_AFFECTED',trivyFindingRetained:true,trivySuppressionApplied:false};
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){const [m,v,b,t,o]=process.argv.slice(2);if(!o)throw new Error('Usage: verify-ts7-compiler-reachability.mjs <messages.json> <openvex.json> <go-version-m.txt> <trivy-summary.json> <output.json>');const r=classifyTs7CompilerReachability({messages:JSON.parse(readFileSync(m,'utf8')),openvex:JSON.parse(readFileSync(v,'utf8')),buildInfo:readFileSync(b,'utf8'),trivyFindings:JSON.parse(readFileSync(t,'utf8')).vulnerabilities||[],binarySha256:process.env.TS7_BINARY_SHA256});writeFileSync(o,JSON.stringify(r,null,2)+'\n');console.log(JSON.stringify({decision:r.decision,reason:r.reason}));if(r.blocking)process.exitCode=1;}
