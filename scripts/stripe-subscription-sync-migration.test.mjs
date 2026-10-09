import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { BILLING_CATALOG } from '../server/billing-catalog.mjs';

const sql = readFileSync(
  new URL('../supabase/migrations/20261009104641_enforce_subscription_price_authority.sql', import.meta.url),
  'utf8',
);

const labelFor = tier => tier === 'starter' ? 'Starter' : tier === 'pro' ? 'Pro' : 'Enterprise';

test('Stripe subscription sync migration contains every authoritative current Price ID', () => {
  for (const [tier, item] of Object.entries(BILLING_CATALOG.tiers)) {
    const label = labelFor(tier);
    assert.equal(sql.includes("when '" + item.monthlyPriceId + "' then '" + label + "'"), true);
    assert.equal(sql.includes("when '" + item.annualPriceId + "' then '" + label + "'"), true);
  }
});

test('legacy Stripe Price IDs are no longer accepted by subscription sync', () => {
  for (const legacy of [
    'price_1TnEUEPKr4joNbEctWTgogW6',
    'price_1TpDDNPKr4joNbEcGm7ngSmp',
    'price_1TpDOhPKr4joNbEc50cS0PKr',
    'price_1TpDVYPKr4joNbEck8SdA1sK',
    'price_1Tl6GnPKr4joNbEckzqM3SoC',
    'price_1TpDZ1PKr4joNbEckxXITdTc',
  ]) assert.equal(sql.includes(legacy), false);
});

test('database tier resolution requires a known single live price', () => {
  assert.match(sql, /NEW.livemode is distinct from true/);
  assert.match(sql, /jsonb_array_length\(NEW.items->'data'\) <> 1/);
  assert.match(sql, /v_price_tier is null/);
  assert.match(sql, /v_tier := v_price_tier/);
  assert.doesNotMatch(sql, /v_tier := v_metadata_tier/);
});

test('trigger-only security boundary stays explicit', () => {
  assert.match(sql, /security definer/);
  assert.match(sql, /set search_path = pg_catalog/);
  assert.match(sql, /revoke execute on function public\.sync_stripe_subscription_to_public\(\)[\s\S]*from public, anon, authenticated, service_role/);
});
