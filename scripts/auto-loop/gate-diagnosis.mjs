import { createHash } from 'node:crypto';
import { stripVTControlCharacters } from 'node:util';
import { readFile, writeFile } from 'node:fs/promises';
const RULES=Object.freeze([
{code:'SECURITY_FINDING',retryable:false,patterns:[/critical|high severity|vulnerabilit|secret detected|misconfiguration/i]},
{code:'GENERATED_DRIFT',retryable:false,patterns:[/git diff --exit-code|generated\/.+diff|working tree.*dirty/i]},
{code:'TEST_FAILURE',retryable:false,patterns:[/not ok|tests? failed|assertionerror|npm error.*test/i]},
{code:'BUILD_FAILURE',retryable:false,patterns:[/docker build.*failed|failed to solve|vite build.*failed|typescript.*error/i]},
{code:'RUNNER_TRANSIENT',retryable:true,patterns:[/runner.*lost|hosted runner.*error|internal server error|connection reset|tls handshake timeout|http 5\d\d/i]},
{code:'REGISTRY_TRANSIENT',retryable:true,patterns:[/toomanyrequests|rate limit|registry.*unavailable/i]},
{code:'TIMEOUT',retryable:true,patterns:[/timed out|timeout|job exceeded.*time/i]}]);
const REDACTIONS=[
[/(?:gh[opusr]_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,})/g,'[REDACTED_GITHUB_TOKEN]'],
[/(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{12,}/g,'[REDACTED_PROVIDER_KEY]'],
[/whsec_[A-Za-z0-9_]{8,}/g,'[REDACTED_WEBHOOK_SECRET]'],
[/(authorization\s*:\s*bearer\s+)[^\s]+/gi,'$1[REDACTED]'],
[/([A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|API_KEY)[A-Z0-9_]*\s*[=:]\s*)[^\s]+/gi,'$1[REDACTED]']];
export function sanitizeGateLog(input){if(typeof input!=='string')throw Error('GATE_DIAGNOSIS_INPUT');let value=stripVTControlCharacters(input.replace(/(?:\x1b\]|\x9d)[^\x07\x1b\x9c]*(?:\x07|\x1b\\|\x9c|$)/g,'')).replace(/\r\n/g,'\n').replace(/[\x00-\x09\x0b-\x1f\x7f-\x9f]/g,'');for(const[p,r]of REDACTIONS)value=value.replace(p,r);return value.slice(-1000000);}
export function diagnoseGateFailure({log,runId,attempt,headSha,jobId}){const sanitized=sanitizeGateLog(log);const matched=RULES.find(rule=>rule.patterns.some(pattern=>pattern.test(sanitized)))??{code:'UNKNOWN_REPRODUCTION_REQUIRED',retryable:false};const evidenceLines=sanitized.split(/\r?\n/).filter(line=>/error|fail|fatal|timeout|critical|vulnerab|not ok/i.test(line)).slice(-40).map(line=>line.slice(0,1000));const fingerprint=createHash('sha256').update(JSON.stringify({classification:matched.code,evidenceLines:evidenceLines.map(line=>line.replace(/\d{6,}/g,'<N>'))})).digest('hex');const boundedAttempt=Number.isInteger(attempt)&&attempt>0?attempt:1;return{contract:'CAPITAL_AI_GATE_DIAGNOSIS@1',runId:String(runId),jobId:String(jobId),headSha,attempt:boundedAttempt,classification:matched.code,retryable:matched.retryable===true,autoRerunAllowed:matched.retryable===true&&boundedAttempt<2,repairAuthority:'NONE',securityGateBypassAllowed:false,fingerprint,evidenceLines};}
if(process.argv[1]?.endsWith('gate-diagnosis.mjs')){const[inputPath,outputPath,runId='',attempt='1',headSha='',jobId='']=process.argv.slice(2);if(!inputPath||!outputPath||!/^[a-f0-9]{40}$/.test(headSha))throw Error('GATE_DIAGNOSIS_ARGS');const log=await readFile(inputPath,'utf8');const report=diagnoseGateFailure({log,runId,attempt:Number(attempt),headSha,jobId});await writeFile(outputPath,JSON.stringify(report,null,2)+'\n',{mode:0o600});process.stdout.write(`${report.classification}\t${report.autoRerunAllowed}\t${report.fingerprint}\n`);}
