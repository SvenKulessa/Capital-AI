// Isolated PostgreSQL verification. Install PGlite outside the repository and set
// CAPITAL_AI_PGLITE_MODULE to its absolute dist/index.js path. No production DB.
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
if(!process.env.CAPITAL_AI_PGLITE_MODULE) throw new Error('CAPITAL_AI_PGLITE_MODULE is required');
const {PGlite}=await import(process.env.CAPITAL_AI_PGLITE_MODULE);
const db=new PGlite();let assertions=0;
const check=(actual,expected)=>{assert.deepEqual(actual,expected);assertions++;};
const query=async(sql,params=[])=> (await db.query(sql,params)).rows;
await db.exec(`create schema auth; create schema private;
create role anon;create role authenticated;create role service_role bypassrls;
create table auth.users(id uuid primary key);
create table public.profiles(id uuid primary key,iam_role text);
create table public.subscriptions(user_id uuid primary key,tier text,status text,current_period_end timestamptz);`);
for(const path of ['supabase/migrations/20261004073046_vocabulary_access_server_gates.sql','supabase/migrations/20261004074704_vocabulary_quant_pro_private_content.sql','supabase/migrations/20261009181208_learning_portal_access.sql']) await db.exec(readFileSync(path,'utf8'));
const ids=Array.from({length:8},(_,i)=>`00000000-0000-4000-8000-${String(i+1).padStart(12,'0')}`);
for(const id of ids) await query('insert into auth.users(id) values($1)',[id]);
for(const index of [1,4]) await query('select public.capital_ai_grant_vocabulary_entitlement($1,$2)',[ids[index],`cs_fixture_paid_${index}`]);
for(const [index,tier] of [[2,'Starter'],[3,'Pro'],[4,'Pro']]) await query("insert into public.subscriptions values($1,$2,'active',now()+interval '1 day')",[ids[index],tier]);
await query("insert into public.profiles values($1,'owner')",[ids[5]]);
const state=async(index)=>(await query('select public.capital_ai_get_vocabulary_access($1) as value',[ids[index]]))[0].value;
for(const [index,learning,atlas,chart] of [[0,false,false,false],[1,true,false,false],[2,false,false,false],[3,false,false,false],[4,true,true,true],[5,true,true,true]]) {
 const access=await state(index);check(access.quantProEntitled,learning);check(access.atlasEntitled,atlas);check(access.chartQuizEntitled,chart);
}
const consume=async(index)=>(await query('select public.capital_ai_consume_vocabulary_quiz($1) as value',[ids[index]]))[0].value;
check((await consume(0)).consumed,true);check((await consume(0)).consumed,false);
await query("update private.vocabulary_access set quiz_consumed_at=now()-interval '1 day' where user_id=$1",[ids[0]]);
check((await state(0)).quizUsed,false);check((await consume(0)).consumed,true);
await query("update public.subscriptions set current_period_end=now()-interval '1 hour' where user_id=$1",[ids[2]]);check((await state(2)).atlasEntitled,false);
for(let i=0;i<10;i++) await query("insert into private.vocabulary_quant_pro_content values($1,$2::jsonb,'fixture',now())",[`term-${i}`,JSON.stringify({id:`term-${i}`,term:`Fixture ${i}`,level:'Quant / Pro'})]);
const terms=async(id)=>(await query('select public.capital_ai_get_quant_pro_vocabulary($1) as value',[id]))[0].value;
check((await terms(null)).length,7);check((await terms(ids[0])).length,7);check((await terms(ids[1])).length,10);check((await terms(ids[5])).length,10);
const favorite=async(index,term,action)=>(await query('select public.capital_ai_learning_favorites($1,$2,$3) as value',[ids[index],term,action]))[0].value;
check(await favorite(0,'orderbuch','POST'),['orderbuch']);check(await favorite(0,'orderbuch','POST'),['orderbuch']);check(await favorite(7,null,'GET'),[]);check(await favorite(0,'orderbuch','DELETE'),[]);
const trial=async(index,action,session=null,end=null)=>(await query('select public.capital_ai_enterprise_trial($1,$2,$3,$4::timestamptz) as value',[ids[index],action,session,end]))[0].value;
check((await trial(6,'reserve')).reserved,true);check((await trial(6,'reserve')).reserved,false);await trial(6,'attach','cs_trial_fixture');
check((await state(6)).quantProEntitled,false);check((await trial(6,'activate','cs_wrong_fixture',new Date(Date.now()+2*86400000).toISOString())).activated,false);
check((await trial(6,'activate','cs_trial_fixture',new Date(Date.now()+2*86400000).toISOString())).activated,true);
check((await state(6)).quantProEntitled,true);check((await state(6)).atlasEntitled,true);check((await state(6)).chartQuizEntitled,true);
await query("update private.enterprise_learning_trials set ends_at=now()-interval '1 second' where user_id=$1",[ids[6]]);
check((await state(6)).quantProEntitled,false);check((await trial(6,'reserve')).reserved,false);
await query('select public.capital_ai_grant_vocabulary_entitlement($1,$2)',[ids[6],'cs_separate_paid_fixture']);check((await state(6)).quantProEntitled,true);
check((await trial(4,'reserve')).reserved,false);
for(const signature of ['capital_ai_get_vocabulary_access(uuid)','capital_ai_get_quant_pro_vocabulary(uuid)','capital_ai_consume_vocabulary_quiz(uuid)','capital_ai_learning_favorites(uuid,text,text)','capital_ai_enterprise_trial(uuid,text,text,timestamptz)']) {
 for(const role of ['anon','authenticated']) check((await query('select has_function_privilege($1,$2,\'execute\') as value',[role,signature]))[0].value,false);
 check((await query('select has_function_privilege(\'service_role\',$1,\'execute\') as value',[signature]))[0].value,true);
}
await db.close();console.log(`LEARNING_POSTGRES_PASS: ${assertions} isolated assertions`);
