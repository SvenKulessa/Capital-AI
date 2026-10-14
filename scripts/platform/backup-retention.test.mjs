import test from 'node:test';
import assert from 'node:assert/strict';
import { planBackupRetention } from './backup-retention.mjs';
const NOW = '2026-10-14T12:00:00Z';
const sha = 'b'.repeat(64);
function archive(days, overrides = {}) {
  const date = new Date(Date.parse(NOW) - days*86400000).toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'');
  return { id: 'synthetic_id_'+days, name: `capital-ai-supabase-${date}-${sha}.sql.age`, sha256:sha, readbackSha256:sha, size:512, ...overrides };
}
test('fresh verified set: preserve at least seven and delete only aged surplus', () => {
  const records = [0,1,2,3,4,5,6,35,45].map(d=>archive(d));
  const result = planBackupRetention({objects:records,now:NOW});
  assert.equal(result.state,'DRY_RUN_ONLY');
  assert.deepEqual(result.deleteIds,['synthetic_id_35','synthetic_id_45']);
  assert.equal(result.keep,7);
});
test('tampered or unchecked uploaded hash blocks all removal', () => {
  const records = [0,1,2,3,4,5,6,40].map(d=>archive(d));
  assert.deepEqual(planBackupRetention({objects:records.map((o,i)=>i===7?{...o,readbackSha256:'a'.repeat(64)}:o),now:NOW}).deleteIds,[]);
});
test('stale most-recent backup disables pruning', () => {
  const result = planBackupRetention({objects:[3,4,5,6,7,8,35,40].map(d=>archive(d)),now:NOW});
  assert.equal(result.state,'BLOCKED_NO_FRESH_VERIFIED_BACKUP');
});
test('unrelated file is never considered for retention', () => {
  const objects = [0,1,2,3,4,5,6,40].map(d=>archive(d));
  objects.push({id:'other_user_document',name:'invoice.pdf'});
  assert.deepEqual(planBackupRetention({objects,now:NOW}).deleteIds,['synthetic_id_40']);
});
test('unknown archive shape fails closed', () => {
  const objects=[0,1,2,3,4,5,6,40].map(d=>archive(d));
  objects[1].name='capital-ai-supabase-corrupt.sql.age';
  assert.equal(planBackupRetention({objects,now:NOW}).state,'BLOCKED_UNVERIFIED_ARCHIVE');
});
