import React from 'react';
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { NotesConflictPanel } from './NotesConflictPanel';
import { validRevision, readNotes, saveNotes, NotesClientError } from './privateNotesOcc';

const alice = '11111111-1111-4111-8111-111111111111';
const initial = { userId:alice, notes:'Initial', revision:'3' };

function withMockFetch(handler: typeof fetch, run: () => Promise<void>) {
  const previous = globalThis.fetch;
  globalThis.fetch = handler;
  return run().finally(() => { globalThis.fetch = previous; });
}

test('notes revision values are exact strings, not unsafe JS numbers', () => {
  assert.equal(validRevision('0'),true);
  assert.equal(validRevision('9007199254740993'),true);
  for (const bad of ['01','-1','1.0',1,'9223372036854775808',null]) {
    assert.equal(validRevision(bad),false);
  }
});

test('notes OCC client sends expectedRevision and returns confirmed revision', async () => {
  const calls: { url: string; init?: RequestInit }[] = [];
  await withMockFetch(async (url,init) => {
    calls.push({url:String(url),init});
    if (String(url).endsWith('/api/auth/session')) return Response.json({
      authenticated:true,mfaRequired:false,user:{id:alice},
    });
    if (init?.method === 'PUT') return Response.json({userId:alice,notes:'Edit',revision:'4'});
    return Response.json(initial);
  }, async () => {
    assert.deepEqual(await readNotes(alice),initial);
    const result=await saveNotes(initial,'Edit');
    assert.equal(result.kind,'saved');
    if (result.kind==='saved') assert.equal(result.snapshot.revision,'4');
  });
  const put=calls.find(call=>call.init?.method==='PUT');
  assert.ok(put);
  const request=JSON.parse(String(put.init?.body));
  assert.deepEqual(request,{expectedUserId:alice,expectedRevision:'3',notes:'Edit'});
  assert.equal(put.init?.credentials,'same-origin');
});

test('409 preserves submitted draft and exposes only same-user server snapshot', async () => {
  await withMockFetch(async (url,init) => {
    if (String(url).endsWith('/api/auth/session')) return Response.json({
      authenticated:true,mfaRequired:false,user:{id:alice},
    });
    if (init?.method === 'PUT') {
      return Response.json({error:'notes_revision_conflict',userId:alice,
        currentNotes:'Concurrent Edit',currentRevision:'4'},{status:409});
    }
    throw new Error('unexpected request');
  }, async () => {
    const result=await saveNotes(initial,'Local Draft');
    assert.equal(result.kind,'conflict');
    if (result.kind==='conflict') assert.deepEqual(result.conflict,{
      localDraft:'Local Draft',baseRevision:'3',
      serverNotes:'Concurrent Edit',serverRevision:'4',
    });
  });
});

test('409 session_changed fails closed; no confidential conflict data returned', async () => {
  await withMockFetch(async (url,init) => {
    if (String(url).endsWith('/api/auth/session')) return Response.json({
      authenticated:true,mfaRequired:false,user:{id:alice},
    });
    if (init?.method === 'PUT') return Response.json({error:'session_changed'},{status:409});
    throw new Error('unexpected request');
  }, async () => {
    await assert.rejects(saveNotes(initial,'Draft'),
      (error:unknown) => error instanceof NotesClientError && error.code==='SESSION_CHANGED');
  });
});

test('uncertain network result never retries a PUT automatically', async () => {
  let writes=0;
  await withMockFetch(async (url,init) => {
    if (String(url).endsWith('/api/auth/session')) return Response.json({
      authenticated:true,mfaRequired:false,user:{id:alice},
    });
    if (init?.method==='PUT') { writes++; throw new Error('network lost'); }
    throw new Error('unexpected request');
  }, async () => {
    await assert.rejects(saveNotes(initial,'Draft'),
      (error:unknown) => error instanceof NotesClientError && error.code==='NOTES_UNAVAILABLE');
  });
  assert.equal(writes,1);
});

test('accessible conflict UI exposes both versions and explicit resolution controls', () => {
  const html=renderToStaticMarkup(<NotesConflictPanel
    conflict={{localDraft:'Local Draft',baseRevision:'3',
      serverNotes:'Server Draft',serverRevision:'4'}}
    onUseServer={()=>{}} onMerge={()=>{}} />);
  assert.match(html,/Notizkonflikt erkannt/);
  assert.match(html,/role="alert"/);
  assert.match(html,/Dein Entwurf/);
  assert.match(html,/Aktuelle Serverfassung/);
  assert.match(html,/Local Draft/);
  assert.match(html,/Server Draft/);
  assert.match(html,/htmlFor|for="notes-occ-merge"/);
  assert.match(html,/Zusammenführung speichern/);
  assert.match(html,/Serverfassung übernehmen/);
  assert.match(html,/min-h-11/);
});
