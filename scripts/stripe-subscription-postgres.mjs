// Isolated PostgreSQL trigger verification; no network or production connection.
// Set STRIPE_ISOLATED_PG_MODULE to an installed @electric-sql/pglite module path.
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { BILLING_CATALOG } from '../server/billing-catalog.mjs';
const modulePath = process.env.STRIPE_ISOLATED_PG_MODULE;
if (!modulePath) throw new Error('STRIPE_ISOLATED_PG_MODULE_REQUIRED');
const { PGlite } = await import(pathToFileURL(modulePath).href);
const db = new PGlite();
const oldSql = await readFile(new URL('../supabase/migrations/20261006072600_sync_stripe_subscription_catalog_v2.sql', import.meta.url), 'utf8');
const newSql = await readFile(new URL('../supabase/migrations/20261009104641_enforce_subscription_price_authority.sql', import.meta.url), 'utf8');
let assertions = 0;
try {
  await db.exec(`create role anon; create role authenticated; create role service_role;
    create schema auth; create schema stripe;
    create table auth.users(id uuid primary key,email text);
    create table stripe.subscriptions(id text primary key, metadata jsonb, items jsonb, status text, livemode boolean,current_period_end bigint);
    create table public.subscriptions(user_id uuid primary key,stripe_subscription_id text,status text,current_period_end timestamptz,tier text,updated_at timestamptz,email text);`);
  await db.exec(oldSql);
  await db.exec(`create trigger stripe_subscription_sync_trigger after insert or update on stripe.subscriptions
    for each row execute function public.sync_stripe_subscription_to_public();`);
  const uid = '00000000-0000-4000-8000-000000000001';
  await db.query('insert into auth.users values($1,$2)', [uid,'fixture@example.test']);
  async function deliver({ id='sub_fixture',price,plan='PRO',status='active',live=true,items } = {}) {
    const metadata = { user_id: uid, ...(plan === null ? {} : { plan_id: plan }) };
    await db.query(`insert into stripe.subscriptions values ($1,$2,$3,$4,$5,2000000000)
      on conflict(id) do update set metadata=excluded.metadata,items=excluded.items,status=excluded.status,livemode=excluded.livemode`,
    [id,JSON.stringify(metadata),JSON.stringify(items ?? { data: price ? [{ price: { id: price } }] : [] }),status,live]);
    return (await db.query('select tier from public.subscriptions where user_id=$1',[uid])).rows[0]?.tier;
  }
  assert.equal(await deliver({price:'price_unknown'}),'Pro'); assertions++;
  await db.exec(newSql);
  for (const input of [
    {price:'price_unknown'}, {}, {price:BILLING_CATALOG.tiers.pro.monthlyPriceId,live:false},
    {price:BILLING_CATALOG.tiers.pro.monthlyPriceId,live:null},
    {price:BILLING_CATALOG.tiers.pro.monthlyPriceId,plan:'STARTER'},
    {price:BILLING_CATALOG.tiers.pro.monthlyPriceId,plan:'ADMIN'},
    {price:BILLING_CATALOG.tiers.pro.monthlyPriceId,status:'canceled'},
    {price:BILLING_CATALOG.tiers.pro.monthlyPriceId,status:null},
    {items:{data:[{price:{id:BILLING_CATALOG.tiers.pro.monthlyPriceId}},{price:{id:'price_unknown'}}]}},
    {items:{data:{}}}, {items:{}},
  ]) { assert.equal(await deliver(input),'Free'); assertions++; }
  for (const [tier, prices] of Object.entries(BILLING_CATALOG.tiers)) {
    for (const price of [prices.monthlyPriceId,prices.annualPriceId]) {
      const expected = tier[0].toUpperCase()+tier.slice(1);
      for (const plan of [null,tier.toUpperCase()]) {
        assert.equal(await deliver({price,plan}),expected); assertions++;
        // Exact delivery retry and repeated projection update: one entitlement row.
        assert.equal(await deliver({price,plan}),expected); assertions++;
        assert.equal((await db.query('select count(*)::int count from public.subscriptions where user_id=$1',[uid])).rows[0].count,1); assertions++;
      }
      assert.equal(await deliver({price,plan:tier,status:'canceled'}),'Free'); assertions++;
      assert.equal(await deliver({price,plan:tier,status:'canceled'}),'Free'); assertions++;
      assert.equal(await deliver({price,plan:tier,status:'active'}),expected); assertions++;
    }
  }
  assert.equal((await db.query("select has_function_privilege('anon','public.sync_stripe_subscription_to_public()','EXECUTE') allowed")).rows[0].allowed,false); assertions++;
  console.log(JSON.stringify({schema:'CAPITAL_AI_STRIPE_ISOLATED_TRIGGER_EVIDENCE@1',postgres:(await db.query('select version()')).rows[0].version,
    baselineUnknownPrice:'PAID_REPRODUCED',newUnknownPrice:'DENIED',variants:6,assertions,
    duplicateProjection:'ONE_ROW',cancellationRetry:'FREE',productionEvidence:'NOT_PROVEN',providerWebhookRetry:'NOT_PROVEN'},null,2));
} finally { await db.close(); }
