-- CAPITAL-AI Benchmark monetization: align Stripe subscription sync with the
-- authoritative Starter / Pro / Enterprise billing catalog.
-- Applied to Supabase production as migration 20261006072600.
--
-- Fail-closed rules:
-- - metadata.plan_id remains primary when valid.
-- - current Stripe Price IDs are the only fallback price authority.
-- - metadata/price conflicts downgrade to Free.
-- - unknown active/trialing subscriptions downgrade to Free.
-- - inactive subscriptions downgrade to Free.
-- - trigger-only SECURITY DEFINER execution remains revoked from API roles.

create or replace function public.sync_stripe_subscription_to_public()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_email text;
  v_user_id uuid;
  v_user_id_text text;
  v_price_id text;
  v_metadata_tier text;
  v_price_tier text;
  v_tier text;
  v_period_end bigint;
begin
  v_user_id_text := btrim(coalesce(NEW.metadata->>'user_id', ''));

  if v_user_id_text = '' then
    return NEW;
  end if;

  begin
    v_user_id := v_user_id_text::uuid;
  exception
    when invalid_text_representation then
      return NEW;
  end;

  select u.email
  into v_email
  from auth.users as u
  where u.id = v_user_id;

  if not found then
    return NEW;
  end if;

  v_metadata_tier := case upper(btrim(coalesce(NEW.metadata->>'plan_id', '')))
    when 'STARTER' then 'Starter'
    when 'PRO' then 'Pro'
    when 'ENTERPRISE' then 'Enterprise'
    else null
  end;

  v_price_id := NEW.items->'data'->0->'price'->>'id';
  v_price_tier := case v_price_id
    when 'price_1UMA4qPKr4joNbEcvJXFWw45' then 'Starter'
    when 'price_1UMA4wPKr4joNbEc1tgkxagi' then 'Starter'
    when 'price_1UMA4yPKr4joNbEckWSj3cJE' then 'Pro'
    when 'price_1UMA50PKr4joNbEcrj0Lm79I' then 'Pro'
    when 'price_1UMA51PKr4joNbEcbtWNCcCc' then 'Enterprise'
    when 'price_1UMA53PKr4joNbEc3E3XyzgG' then 'Enterprise'
    else null
  end;

  if NEW.status not in ('active', 'trialing') then
    v_tier := 'Free';
  elsif v_metadata_tier is not null
    and v_price_tier is not null
    and v_metadata_tier <> v_price_tier then
    v_tier := 'Free';
  elsif v_metadata_tier is not null then
    v_tier := v_metadata_tier;
  elsif v_price_tier is not null then
    v_tier := v_price_tier;
  else
    v_tier := 'Free';
  end if;

  v_period_end := coalesce(
    NEW.current_period_end,
    ((NEW.items->'data'->0->>'current_period_end')::bigint)
  );

  insert into public.subscriptions (
    user_id,
    stripe_subscription_id,
    status,
    current_period_end,
    tier,
    updated_at,
    email
  )
  values (
    v_user_id,
    NEW.id,
    NEW.status,
    case when v_period_end is not null then to_timestamp(v_period_end) else null end,
    v_tier,
    now(),
    v_email
  )
  on conflict (user_id) do update set
    stripe_subscription_id = excluded.stripe_subscription_id,
    status = excluded.status,
    current_period_end = excluded.current_period_end,
    tier = excluded.tier,
    updated_at = excluded.updated_at,
    email = excluded.email;

  return NEW;
end;
$function$;

revoke execute on function public.sync_stripe_subscription_to_public()
from public, anon, authenticated, service_role;
