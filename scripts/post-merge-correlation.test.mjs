import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function classify(files) {
  const dir=fs.mkdtempSync(path.join(os.tmpdir(),"post-merge-"));
  const file=path.join(dir,"event.json");
  fs.writeFileSync(file,JSON.stringify({mainSha:"a".repeat(40),mergedPr:75,files}));
  return JSON.parse(execFileSync(process.execPath,["scripts/post-merge-correlation.mjs",file],{encoding:"utf8"}));
}

test("irrelevant docs do not trigger correlation",()=>assert.equal(classify(["README.md"]).required,false));
test("lockfile triggers dependency correlation",()=>assert.equal(classify(["package-lock.json"]).impact.dependency,true));
test("new head alone never authorizes NATS redeploy",()=>assert.equal(classify(["shared/contracts.mjs"]).policy.natsHeadOnlyRedeploy,false));
test("automation remains non-deploying and bounded",()=>{
  const r=classify(["Dockerfile"]);
  assert.equal(r.policy.deploy,false);
  assert.equal(r.policy.autoFix,"bounded-only-after-3-positive-validations");
});
