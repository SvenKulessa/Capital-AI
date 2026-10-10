import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const modulePath=process.env.CAPITAL_AI_PGLITE_MODULE;
if(!modulePath)throw new Error('CAPITAL_AI_PGLITE_MODULE required; isolated PostgreSQL only');
const {PGlite}=await import(modulePath);const db=new PGlite();
try {
 await db.exec(`create schema private;create schema cron;
 create role anon;create role authenticated;create role service_role;
 create table cron.job(jobid bigint primary key,jobname text);
 create table cron.job_run_details(runid bigint primary key,jobid bigint,status text,end_time timestamptz);
 insert into cron.job values(1,'stripe-sync-worker'),(2,'privacy-operational-retention-daily'),(3,'capital-ai-cron-history-retention');
 insert into cron.job_run_details values
 (1,1,'succeeded',now()-interval '8 days'),(2,1,'failed',now()-interval '31 days'),
 (3,1,'failed',now()-interval '8 days'),(4,1,'succeeded',now()-interval '1 day'),
 (5,1,'running',null),(6,2,'succeeded',now()-interval '100 days'),
 (7,1,'running',now()-interval '100 days'),(8,1,'succeeded',null),
 (9,3,'succeeded',now()-interval '8 days');`);
 const sql=readFileSync(new URL('./supabase-cron-history-retention.sql',import.meta.url),'utf8');
 // Scheduling is a pg_cron provider operation; validate the actual pruning function in isolated PostgreSQL.
 const definition=sql.slice(sql.indexOf('create or replace function'),sql.indexOf('-- cron.schedule'));
 await db.exec(definition);
 const prune=async n=>(await db.query('select private.prune_stripe_cron_history($1) as n',[n])).rows[0].n;
 assert.equal(await prune(1),1);assert.equal(await prune(5000),2);assert.equal(await prune(5000),0);
 assert.deepEqual((await db.query('select runid from cron.job_run_details order by runid')).rows.map(r=>Number(r.runid)),[3,4,5,6,7,8]);
 for(const n of [0,-1,5001,null])await assert.rejects(()=>prune(n),/INVALID_RETENTION_BATCH/);
 for(const role of ['anon','authenticated','service_role']) {
  const r=await db.query("select has_function_privilege($1,'private.prune_stripe_cron_history(integer)','EXECUTE') as allowed",[role]);
  assert.equal(r.rows[0].allowed,false);
 }
 assert.ok(!/truncate|vacuum full/i.test(sql.split('-- Let autovacuum')[0]));
 console.log('CRON_RETENTION_POSTGRES_PASS: bounded, idempotent, retains errors/recent/running/other jobs; restricted execution');
} finally {await db.close();}
