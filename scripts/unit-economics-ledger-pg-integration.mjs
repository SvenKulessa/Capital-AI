// Isolated PostgreSQL 17.11 only; no Supabase/project DB, providers or paid calls.
// Uses the pinned CI PostgreSQL service and its bundled pg_dump/pg_restore tools.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawn } from 'node:child_process';

const ALICE='11111111-1111-4111-8111-111111111111';
const BOB='22222222-2222-4222-8222-222222222222';
const SID=n=>'00000000-0000-4000-8000-'+String(n).padStart(12,'0');
const RUN=n=>'00000000-0000-4000-8001-'+String(n).padStart(12,'0');
const HASH='a'.repeat(64),OTHER_HASH='b'.repeat(64);
const dbName=process.env.PGDATABASE||'';
const container=process.env.PG_LEDGER_CONTAINER_ID||'';
if(!/^ue_ledger_ci$/.test(dbName)||!process.env.PGHOST||
   !process.env.PGPASSWORD||!process.env.PGUSER||!container.match(/^[0-9a-f]{12,64}$/))
  throw Error('ISOLATED_PG17_CI_SERVICE_REQUIRED');

function command(program,args,input=null,extraEnv={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(program,args,{env:{...process.env,...extraEnv},stdio:['pipe','pipe','pipe']});
    let out='',err='';
    child.stdout.setEncoding('utf8').on('data',v=>{out+=v});
    child.stderr.setEncoding('utf8').on('data',v=>{err+=v});
    child.on('error',reject);
    child.on('close',code=>code===0?resolve(out.trim()):reject(Error(
      program+' code '+code+': '+err.slice(0,750))));
    child.stdin.on('error',()=>{});
    child.stdin.end(input||'');
  });
}
const sql=(stmt,db=dbName)=>command('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-d',db,'-c',stmt]);
const quoted=x=>"'"+x.replaceAll("'","''")+"'";
function call({tenant=ALICE,id=SID(1),key='snapshot-key-000001',req=HASH,
  source=HASH,run=RUN(1),inference=70,tools=30,flags=''}={}) {
  const lines=JSON.stringify([{
    runId:run,status:'SUCCEEDED',inferenceMinor:inference,toolsMinor:tools,evidenceHash:HASH,
  }]);
  return 'select capital_ai_ue.record_snapshot('+
    quoted(id)+'::uuid,'+quoted(tenant)+'::uuid,'+quoted(key)+','+
    quoted(req)+','+quoted(source)+",'saas-pro-monthly',"+
    "'2026-11-01T00:00:00Z'::timestamptz,'2026-12-01T00:00:00Z'::timestamptz,"+
    "9500,350,"+inference+','+tools+",1,0,"+quoted(lines)+"::jsonb) ->> 'state';";
}
const asService=s=>'set role service_role; '+s;
const reverse=({tenant=ALICE,id=SID(1),key='reversal-key-00001',reason=OTHER_HASH}={})=>
  "select capital_ai_ue.reverse_snapshot('"+tenant+"'::uuid,'"+id+"'::uuid,'"+
  key+"','"+reason+"') ->> 'state';";
const count=(table,tenant=ALICE,db=dbName)=>sql('select count(*) from capital_ai_ue.'+table+
  " where tenant_id='"+tenant+"'::uuid;",db);
const denied=async(stmt,state='42501')=>{
  let error;
  try{await sql(stmt)}catch(e){error=e}
  assert.ok(error, 'expected SQL denial');
  assert.match(error.message,new RegExp(state==='42501'?'permission denied|code 1':state));
};
const migration=readFileSync(new URL('../supabase/migration-candidates/20261120045100_unit_economics_isolated_ledger.sql',import.meta.url),'utf8');
const report={
  schemaVersion:'CAPITAL_AI_UNIT_ECONOMICS_ISOLATED_RESTORE@1',
  postgres:'17.11',providerCalls:0,productionMutations:0,
  assertions:[],backupKind:'pg_dump_custom',recoveredDatabase:'ue_ledger_restore_ci',
  productionEligible:false,
};
const ok=(name)=>report.assertions.push(name);
async function setup(){
  const version=await sql('show server_version;');assert.match(version,/^17\.11/);
  await sql('create role anon nologin; create role authenticated nologin; create role service_role nologin;');
  await sql('create schema auth; create table auth.users(id uuid primary key);');
  await sql("insert into auth.users values('"+ALICE+"'),('"+BOB+"');");
  await command('psql',['-X','-qAt','-v','ON_ERROR_STOP=1'],migration);
}
async function crashBeforeCommit(){
  const statement=asService('begin; '+call({id:SID(30),key:'crash-key-000000001',source:'c'.repeat(64),run:RUN(30)})+
    'select pg_sleep(30); commit;');
  const child=spawn('psql',['-X','-qAt','-v','ON_ERROR_STOP=1','-c',statement],{
    env:{...process.env,PGAPPNAME:'ue_crash_ci'},stdio:['ignore','pipe','pipe'],
  });
  child.stdout.resume();child.stderr.resume();
  let sleeping=false;
  for(let n=0;n<150;n++){
    const v=await sql("select count(*) from pg_stat_activity where application_name='ue_crash_ci'"+
      " and state='active' and query ilike '%pg_sleep(30)%';");
    if(Number(v)===1){sleeping=true;break}
    await new Promise(resolve=>setTimeout(resolve,100));
  }
  assert.equal(sleeping,true,'test must kill an open, uncommitted write transaction');
  child.kill('SIGKILL');
  await new Promise(resolve=>child.once('close',resolve));
  assert.equal(await count('snapshots'),'2','killed connection must roll back uncommitted snapshot');
  const result=await sql(asService(call({id:SID(30),key:'crash-key-000000001',
    source:'c'.repeat(64),run:RUN(30)})));
  assert.equal(result,'created','retry creates exactly one durable row after crash');
  assert.equal(await count('snapshots'),'3');
  ok('crash_before_commit_rollback_and_retry');
}
async function isolatedRestore(){
  // PostgreSQL 17 bundled tools avoid PG16-client/PG17-server incompatibility.
  const inside=(program,...args)=>command('docker',['exec',container,program,...args]);
  const sourceTotal=await sql('select count(*) from capital_ai_ue.snapshots;');
  const sourceRuns=await sql('select count(*) from capital_ai_ue.run_allocations;');
  const sourceReverse=await sql('select count(*) from capital_ai_ue.reversals;');
  const digestSql="select md5(coalesce(string_agg(tenant_id::text||':'||snapshot_id::text||':'||request_sha256||':'||source_snapshot_sha256||':'||net_cash_minor::text||':'||inference_minor::text||':'||tools_minor::text, '|' order by tenant_id,snapshot_id),'')) from capital_ai_ue.snapshots;";
  const before=await sql(digestSql);
  await inside('psql','-U','postgres','-d','postgres','-v','ON_ERROR_STOP=1','-c',
    'create database ue_ledger_restore_ci;');
  await inside('psql','-U','postgres','-d','ue_ledger_restore_ci','-v','ON_ERROR_STOP=1','-c',
    "create schema auth; create table auth.users(id uuid primary key);"+
    "insert into auth.users values('"+ALICE+"'),('"+BOB+"');");
  await inside('pg_dump','-U','postgres','-d',dbName,'-Fc',
    '-n','capital_ai_ue','-f','/tmp/ue-ledger-verified.dump');
  await inside('pg_restore','-U','postgres','-d','ue_ledger_restore_ci',
    '--no-owner','--no-privileges','/tmp/ue-ledger-verified.dump');
  assert.equal(await sql('select count(*) from capital_ai_ue.snapshots;','ue_ledger_restore_ci'),sourceTotal);
  assert.equal(await sql('select count(*) from capital_ai_ue.run_allocations;','ue_ledger_restore_ci'),sourceRuns);
  assert.equal(await sql('select count(*) from capital_ai_ue.reversals;','ue_ledger_restore_ci'),sourceReverse);
  const after=await sql(digestSql,'ue_ledger_restore_ci');
  assert.equal(after,before);
  const restored=await sql(asService(call({tenant:BOB,id:SID(20),key:'bob-key-00000001',
    source:HASH,run:RUN(2)})),'ue_ledger_restore_ci');
  assert.equal(restored,'replayed','restored dedup index and immutable original survive restore');
  assert.equal(await sql(asService(reverse({tenant:BOB,id:SID(20)})),'ue_ledger_restore_ci'),'not_found');
  report.snapshotCount=Number(sourceTotal);report.runCount=Number(sourceRuns);
  report.reversalCount=Number(sourceReverse);report.sourceDigest=before;report.restoreDigest=after;
  report.restoreVerified=true;
  ok('pg17_custom_dump_separate_db_restore_digest_and_replay');
}
async function main(){
  await setup();
  for(const role of ['anon','authenticated']){
    assert.equal(await sql("select has_schema_privilege('"+role+"','capital_ai_ue','USAGE');"),'f');
    assert.equal(await sql("select has_table_privilege('"+role+"','capital_ai_ue.snapshots','SELECT');"),'f');
    assert.equal(await sql("select has_function_privilege('"+role+
      "','capital_ai_ue.record_snapshot(uuid,uuid,text,text,text,text,timestamptz,timestamptz,bigint,bigint,bigint,bigint,integer,integer,jsonb)','EXECUTE');"),'f');
  }
  assert.equal(await sql("select has_table_privilege('service_role','capital_ai_ue.snapshots','INSERT');"),'f');
  assert.equal(await sql("select has_function_privilege('service_role','capital_ai_ue.reverse_snapshot(uuid,uuid,text,text)','EXECUTE');"),'t');
  await denied('set role anon; select * from capital_ai_ue.snapshots;');
  await denied('set role authenticated; select capital_ai_ue.read_snapshot('+
    "'"+ALICE+"'::uuid,'"+SID(1)+"'::uuid);");
  ok('acl_private_schema_rls_and_service_rpc_only');

  assert.equal(await sql(asService(call())),'created');
  assert.equal(await sql(asService(call({id:SID(2)}))),'replayed');
  assert.equal(await sql(asService(call({req:OTHER_HASH}))), 'conflict');
  assert.equal(await sql(asService(call({key:'different-key-000001',id:SID(3)}))),'duplicate_source');
  assert.equal(await count('snapshots'),'1');
  assert.equal(await count('run_allocations'),'1');
  ok('same_tenant_idempotency_and_source_dedup');

  assert.equal(await sql(asService(call({tenant:BOB,id:SID(20),
    key:'bob-key-00000001',run:RUN(2)}))),'created');
  assert.equal(await count('snapshots',BOB),'1');
  assert.equal(await sql(asService("select capital_ai_ue.read_snapshot('"+ALICE+"'::uuid,'"+
    SID(20)+"'::uuid) is null;")),'t');
  assert.equal(await sql(asService(reverse({tenant:BOB,id:SID(1)}))),'not_found');
  assert.equal(await count('reversals',BOB),'0');
  ok('cross_tenant_read_reverse_and_idempotency_key_isolation');

  await assert.rejects(sql(asService(call({id:SID(8),key:'invalid-tenant-key1',
    tenant:'44444444-4444-4444-8444-444444444444',run:RUN(8)}))),/foreign key/);
  assert.equal(await count('snapshots'),'1');
  await assert.rejects(sql(asService(call({id:SID(9),key:'duplicate-run-00001',
    source:OTHER_HASH,run:RUN(1)}))),/duplicate key/);
  assert.equal(await count('snapshots'),'1');
  await assert.rejects(sql(asService(call({id:SID(10),key:'mismatch-cost-00001',
    source:OTHER_HASH,run:RUN(10),inference:9007199254740992}))),/UE_INVALID_CENTS|UE_INVALID_INPUT/);
  await assert.rejects(sql(asService(call({id:SID(11),key:'invalid-cost-00001',
    source:OTHER_HASH,run:RUN(11),inference:-1}))),/UE_INVALID_INPUT|UE_INVALID_RUN|UE_COST_TOTAL_MISMATCH/);
  ok('foreign_key_duplicate_run_cost_bounds_and_transaction_rollback');

  const held="begin; "+asService(call({id:SID(12),key:'rollback-tx-000001',
    source:OTHER_HASH,run:RUN(12)}))+' rollback;';
  await sql(held);
  assert.equal(await count('snapshots'),'1');
  ok('explicit_rollback_no_partial_snapshot');

  const attempts=await Promise.all(Array.from({length:12},(_,i)=>sql(asService(call({
    id:SID(100+i),key:'parallel-key-000001',source:'e'.repeat(64),run:RUN(100),
  })))));
  assert.equal(attempts.filter(s=>s==='created').length,1);
  assert.equal(attempts.filter(s=>s==='replayed').length,11);
  assert.equal(await count('snapshots'),'2');
  ok('concurrent_postgres_sessions_exactly_one_commit');

  await crashBeforeCommit();
  assert.equal(await sql(asService(reverse())),'reversed');
  assert.equal(await sql(asService(reverse())),'replayed');
  assert.equal(await sql(asService(reverse({reason:HASH}))),'conflict');
  assert.equal(await sql(asService(call())),'reversed');
  assert.equal(await sql(asService("select capital_ai_ue.read_snapshot('"+ALICE+"'::uuid,'"+
    SID(1)+"'::uuid) ->> 'state';")),'reversed');
  assert.equal(await count('snapshots'),'3');
  assert.equal(await count('reversals'),'1');
  ok('append_only_reversal_and_idempotent_compensation');
  await isolatedRestore();
  console.log(JSON.stringify(report));
}
main().catch(e=>{console.error('ISOLATED_LEDGER_TEST_FAILURE '+e.message);process.exitCode=1});
