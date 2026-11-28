import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {scoreRaceCandidate,compareRaceCandidates,projectRaceAmviCandidate} from './agent-race-candidate.mjs';
const contract=JSON.parse(readFileSync(new URL('../../.agents/contracts/agent-race.json',import.meta.url),'utf8'));
function check(assert,contract,score,compare,amvi){
  const base={runId:'synthetic-1',taskDigest:'a'.repeat(64),modelDigest:'b'.repeat(64),budgetDigest:'c'.repeat(64),evidenceDigest:'d'.repeat(64),security:'PASS',dimensions:{correctness:80,instruction:80,efficiency:80,robustness:80}};
  const candidate={...base,runId:'synthetic-2',evidenceDigest:'e'.repeat(64),dimensions:{...base.dimensions,correctness:100}};
  assert(score(base,contract).technicalScore===80,'weighted score');
  assert(score(base,contract).publicRankingAllowed===false,'no public ranking');
  assert(score({...base,security:'FAIL'},contract).technicalScore===null,'security fail closed');
  assert(score({...base,dimensions:{...base.dimensions,correctness:101}},contract).technicalScore===null,'range rejected');
  assert(score({...base,traffic:100},contract).technicalScore===null,'traffic cannot alter score');
  assert(compare(base,candidate,contract).delta===10,'matched delta');
  assert(compare(base,{...candidate,modelDigest:'f'.repeat(64)},contract).delta===null,'unmatched model rejected');
  assert(compare(base,{...candidate,evidenceDigest:base.evidenceDigest},contract).delta===null,'duplicate evidence rejected');
  assert(compare(base,base,contract).delta===null,'duplicate run rejected');
  assert(amvi({technical:100,marketing:0,improvement:0,demand:0}).candidateIndex===40,'AMVI weights');
  assert(amvi({technical:80,marketing:null,improvement:70,demand:50}).candidateIndex===null,'no partial AMVI');
  assert(amvi({technical:80,marketing:80,improvement:80,demand:80}).liveIndex===null,'no live claim');
}
test('Agent Race offline candidate score, matched deltas and AMVI fail closed',()=>check((v,m)=>assert.ok(v,m),contract,scoreRaceCandidate,compareRaceCandidates,projectRaceAmviCandidate));
