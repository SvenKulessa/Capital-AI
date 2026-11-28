import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { importMediaKitV5Draft } from '../../src/platform/SocialMediaEngine/Editing/MediaKitV5Import.ts';
const sha=b=>createHash('sha256').update(b).digest('hex');
const script=fileURLToPath(new URL('./growth-intelligence-image-drafts.mjs',import.meta.url));
test('existing Resvg to pinned Sharp to real MediaKit receipt and responsive preview',async()=>{
  const root=await mkdtemp(join(tmpdir(),'cai-visual-test-'));
  try {
    await mkdir(join(root,'docs/growth/drafts'),{recursive:true});
    // Use the repository's tsx loader while the create-only output is isolated.
    const tsx=import.meta.resolve('tsx');
    const args=['--import',tsx,script,'--write-visual'];
    const result=JSON.parse(execFileSync(process.execPath,args,{cwd:root,encoding:'utf8',maxBuffer:1024*1024}));
    assert.equal(result.state,'DRAFT_ONLY');assert.equal(result.publicPublishAllowed,false);
    assert.equal(result.drafts.length,2);assert.ok(result.assetCount>=6&&result.assetCount<=8);
    assert.equal(result.manualTimeSavedMs,null);
    const dir=join(root,result.output);
    const report=JSON.parse(await readFile(join(dir,'visual-evidence.json'),'utf8'));
    assert.equal(report.assetCount,result.assetCount);
    for(const draft of report.drafts){
      assert.equal(draft.sharpVersion,'0.35.5');assert.ok(draft.altText.length>0);
      assert.equal(draft.mediaKitReview,'REVIEW_REQUIRED');assert.equal(draft.publicPublishAllowed,false);
      const manifestPath=draft.assets[0].reference.replace(/\.svg$/,'-mediakit.json');
      const manifestBytes=await readFile(join(root,manifestPath));
      assert.equal(sha(manifestBytes),draft.manifestSha256);
      assert.equal(importMediaKitV5Draft(JSON.parse(manifestBytes)).publicPublishAllowed,false);
      for(const asset of draft.assets){
        const bytes=await readFile(join(root,asset.reference));
        assert.equal(sha(bytes),asset.sha256);assert.equal(bytes.length,asset.byteLength);
      }
      assert.ok(draft.selected.byteLength<=draft.inputBytes);
    }
    const graph=JSON.parse(await readFile(join(dir,'visual-graph-input.json'),'utf8'));
    assert.equal(graph.contractVersion,'CAPITAL_AI_VISUAL_GRAPH_INPUT@1');assert.equal(graph.publicPublishAllowed,false);
    const preview=await readFile(join(dir,'preview.html'),'utf8');
    assert.equal((preview.match(/alt="/g)||[]).length,2);
    assert.doesNotMatch(preview,/<script|<iframe|https?:\/\//);
    assert.throws(()=>execFileSync(process.execPath,args,{cwd:root,encoding:'utf8',stdio:'pipe'}));
  }finally{await rm(root,{recursive:true,force:true});}
});
