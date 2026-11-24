import assert from 'node:assert/strict';
import test from 'node:test';
import { appendSnapshot, applyOwnerEdit, exportWorkspace, importWorkspace, initialRows, projectGa4 } from './growthOwnerWorkspaceModel';
const at = '2026-11-24T12:00:00.000Z';
const row = initialRows()[0];
const good = { schema: 'CAPITAL_AI_GROWTH_GA4_READBACK@1', source: 'GA4_DATA_API', private: true, readOnly: true, publicPublishAllowed: false,
  attributionAuthority: 'SEPARATE_FROM_UMAMI_GSC_SOCIAL', observedAt: at, status: 'PROVIDER_READ_VERIFIED', metrics: { sessions: 10, engagedSessions: 3 } };
test('initial inventory is not live evidence and covers five domains', () => {
  assert.equal(new Set(initialRows().map(r => r.domain)).size, 5);
  assert.ok(initialRows().every(r => r.status === 'NOT_PROVEN'));
});
test('actual GA4 response is scoped, strict and zero distinct from missing', () => {
  assert.equal(projectGa4(good,row).status,'VERIFIED');
  assert.equal(projectGa4({...good,metrics:{sessions:0,engagedSessions:0}},row).status,'VERIFIED');
  assert.equal(projectGa4({...good,status:'NOT_PROVEN_NO_ROWS',metrics:null},row).status,'NOT_PROVEN');
  for (const payload of [{...good,private:false},{...good,publicPublishAllowed:true},{...good,metrics:null},{...good,metrics:{sessions:1,engagedSessions:2}}]) {
    assert.throws(() => projectGa4(payload,row));
  }
  assert.throws(() => projectGa4(good,initialRows()[1]));
});
test('versioned import preserves history but never promotes imported claims', () => {
  const a = appendSnapshot([],initialRows(),at);
  const b = appendSnapshot(a,[projectGa4(good,row)],at);
  assert.equal(a[0].rows[0].status,'NOT_PROVEN');
  assert.equal(b[1].version,2);
  const result = importWorkspace(exportWorkspace(b));
  assert.equal(result[1].rows[0].status,'NOT_PROVEN');
  assert.equal(result[1].rows[0].origin,'OWNER_NOTE');
  assert.equal(applyOwnerEdit(projectGa4(good,row)).status,'NOT_PROVEN');
});
test('invalid schemas, duplicate IDs and oversized input fail closed', () => {
  assert.throws(() => importWorkspace('{}'));
  assert.throws(() => importWorkspace(' '.repeat(1_000_001)));
  assert.throws(() => appendSnapshot([],[row,row],at));
  const b = JSON.parse(exportWorkspace(appendSnapshot([],[row],at)));
  b.snapshots[0].rows[0].token = 'synthetic';
  assert.throws(() => importWorkspace(JSON.stringify(b)));
});
