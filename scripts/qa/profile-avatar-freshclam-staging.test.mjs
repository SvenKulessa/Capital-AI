import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const filename=fileURLToPath(new URL('./profile-avatar-freshclam-staging.sh',import.meta.url));
const source=readFileSync(filename,'utf8');
test('staging proof script parses and is not active without isolation',()=>{
 assert.equal(spawnSync('sh',['-n',filename]).status,0);
 const r=spawnSync('sh',[filename],{env:{PATH:process.env.PATH},encoding:'utf8',timeout:4000});
 assert.equal(r.status,77);
 assert.match(r.stdout,/"status":"BLOCKED"/);
 assert.match(r.stdout,/ISOLATION_NOT_ATTESTED/);
});
test('staging proof rejects any service key before external requests',()=>{
 const r=spawnSync('sh',[filename],{env:{PATH:process.env.PATH,CAPITAL_AI_ISOLATED_STAGING:'true',SUPABASE_SECRET_KEY:'synthetic'},encoding:'utf8',timeout:4000});
 assert.equal(r.status,78);
 assert.match(r.stdout,/REFUSED_PRODUCTION_OR_SECRET_CONTEXT/);
});
test('official provenance and negative fail-closed controls must remain intact',()=>{
 for(const s of ['ScriptedUpdates no','Verification OK','48*3600000','CLAMD_SOCKET_PERMISSIONS','CVD_SIGNATURE_NOT_VERIFIED','SIGNATURE_OLDER_THAN_48H','CLAMD_SOCKET_TIMEOUT','scanClamavLocal','PROFILE_AVATAR_UPLOAD_ENABLED','CAPITAL_AI_AVATAR_OFFICIAL_FRESHCLAM_STAGING@1'])
 assert.ok(source.includes(s),s);
});
