import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { exportVisualDraft, loadPinnedSharp } from './visual-export.mjs';
const require = createRequire(import.meta.url);
const sharp = process.env.CAI_TEST_LOCAL_SHARP==='1' ? require('sharp') : loadPinnedSharp();
const hash = b=>createHash('sha256').update(b).digest('hex');
async function fixture(channel='X',width=144,height=96) {
  const svg='<svg xmlns="http://www.w3.org/2000/svg" width="'+width+'" height="'+height+'"><rect width="100%" height="100%" fill="#050b18"/><circle cx="40" cy="40" r="30" fill="#22d3ee"/></svg>';
  const png=await sharp(Buffer.from(svg)).png().toBuffer();
  return {png,svg,pngSha256:hash(png),svgSha256:hash(svg),width,height,channel};
}
test('hash-bound adaptive WebP and JPEG draft; PNG fallback retained',async()=>{
  const f=await fixture(); const a=await exportVisualDraft(f,sharp); const b=await exportVisualDraft(f,sharp);
  assert.ok(a.webp); assert.equal(hash(a.webp.bytes),a.webp.sha256); assert.equal(hash(a.jpeg.bytes),a.jpeg.sha256);
  assert.equal(a.webp.sha256,b.webp.sha256); assert.equal(a.evidence.publicPublishAllowed,false);
  assert.equal(a.evidence.rights,'REVIEW_REQUIRED'); assert.equal(a.evidence.channelCandidate,'PNG_CANDIDATE');
  assert.equal(a.evidence.manualTimeSavedMs,null); assert.ok(a.evidence.elapsedMs>=0);
  assert.ok(a.selected.byteLength<=f.png.length); assert.equal(a.evidence.pngSha256,f.pngSha256);
  assert.equal(a.evidence.webp.bytes,undefined);
});
test('Instagram JPEG candidate is not a publication or carousel approval',async()=>{
  const a=await exportVisualDraft(await fixture('INSTAGRAM',1080,1350),sharp);
  assert.equal(a.evidence.channelCandidate,'JPEG_CAROUSEL_CANDIDATE_ONLY'); assert.equal(a.evidence.publicPublishAllowed,false);
  assert.equal((await sharp(a.jpeg.bytes).metadata()).format,'jpeg');
});
test('rejects tampering, incorrect dimensions, invalid channel and non-PNG',async()=>{
  const f=await fixture();
  for(const bad of [{pngSha256:'0'.repeat(64)},{svg:f.svg+'x'},{width:145},{height:5000},{channel:'UNKNOWN'},{png:Buffer.from('fake')}]) await assert.rejects(()=>exportVisualDraft({...f,...bad},sharp),/VISUAL_/);
});
