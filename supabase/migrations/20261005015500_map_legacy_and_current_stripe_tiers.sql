-- CAPITAL-AI Billing convergence:
-- Legacy- und aktuelle Stripe-Price-IDs werden auf dieselben kanonischen Subscription-Tiers projiziert.
-- Diese Migration verändert keine Stripe-Subscriptions, Preise, Abrechnungen oder Prorationen.

begin;

create or replace function public.sync_stripe_subscription_to_public()
returns trigger
language plpgsql
security definer
set search_path to 'public', 'stripe', 'auth'
as $function$
declare
  v_email text;
  v_user_id uuid;
  v_user_id_text text;
  v_price_id text;
  v_tier text;
  v_period_end bigint;
begin
  v_user_id_text := btrim(coalesce(new.metadata->>'user_id', ''));

  if v_user_id_text = '' then
    return new;
  end if;

  begin
    v_user_id := v_user_id_text::uuid;
  exception
    when invalid_text_representation then
      return new;
  end;

  select email into v_email
  from auth.users
  where id = v_user_id;

  if not found then
    return new;
  end if;

  v_tier := case upper(btrim(coalesce(new.metadata->>'plan_id', '')))
    when 'STARTER' then 'Starter'
    when 'PRO' then 'Pro'
    when 'ENTERPRISE' then 'Enterprise'
    else null
  end;

  if v_tier is null then
    v_price_id := new.items->'data'->0->'price'->>'id';
    v_tier := case v_price_id
      -- Starter legacy
      when 'price_1TnEUEPKr4joNbEctWTgogW6' then 'Starter'
      when 'price_1TpDDNPKr4joNbEcGm7ngSmp' then 'Starter'
      -- Starter current catalog
      when 'price_1UMA4qPKr4joNbEcvJXFWw45' then 'Starter'
      when 'price_1UMA4wPKr4joNbEc1tgkxagi' then 'Starter'

      -- Pro legacy
      when 'price_1TpDOhPKr4joNbEc50cS0PKr' then 'Pro'
      when 'price_1TpDVYPKr4joNbEck8SdA1sK' then 'Pro'
      -- Pro current catalog
      when 'price_1UMA4yPKr4joNbEckWSj3cJE' then 'Pro'
      when 'price_1UMA50PKr4joNbEcrj0Lm79I' then 'Pro'

      -- Enterprise legacy
      when 'price_1Tl6GnPKr4joNbEckzqM3SoC' then 'Enterprise'
      when 'price_1TpDZ1PKr4joNbEckxXITdTc' then 'Enterprise'
      -- Enterprise current catalog
      when 'price_1UMA51PKr4joNbEcbtWNCcCc' then 'Enterprise'
      when 'price_1UMA53PKr4joNbEc3E3XyzgG' then 'Enterprise'
      else null
    end;
  end if;

  if v_tier is null then
    return new;
  end if;

  if new.status not in ('active', 'trialing') then
    v_tier := 'Free';
  end if;

  v_period_end := coalesce(
    new.current_period_end,
    ((new.items->'data'->0->>'current_period_end')::bigint)
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
    new.id,
    new.status,
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

  return new;
end;
$function$;

revoke execute on function public.sync_stripe_subscription_to_public() from public, anon, authenticated;

commit;
