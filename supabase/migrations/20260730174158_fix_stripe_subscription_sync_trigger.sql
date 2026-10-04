
CREATE OR REPLACE FUNCTION public.sync_stripe_subscription_to_public()
RETURNS TRIGGER AS $$
DECLARE
  v_email text;
  v_user_id uuid;
  v_price_id text;
  v_tier text;
  v_period_end bigint;
BEGIN
  SELECT email INTO v_email FROM stripe.customers WHERE id = NEW.customer;
  IF v_email IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_user_id FROM auth.users WHERE email = v_email;
  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Tarif primaer aus metadata.plan_id (von unserer eigenen Checkout-Session gesetzt),
  -- sonst Fallback ueber die bekannte Price-ID. KEIN Default auf 'Pro' mehr - eine
  -- unbekannte Price-ID fuehrt zu NULL (Abbruch), nicht zu einer geratenen Tier-Zuweisung.
  v_tier := NEW.metadata->>'plan_id';

  IF v_tier IS NULL THEN
    v_price_id := NEW.items->'data'->0->'price'->>'id';
    v_tier := CASE v_price_id
      WHEN 'price_1TnEUEPKr4joNbEctWTgogW6' THEN 'Starter'   -- Starter Monthly
      WHEN 'price_1TpDDNPKr4joNbEcGm7ngSmp' THEN 'Starter'   -- Starter Yearly
      WHEN 'price_1TpDOhPKr4joNbEc50cS0PKr' THEN 'Pro'       -- Pro Monthly
      WHEN 'price_1TpDVYPKr4joNbEck8SdA1sK' THEN 'Pro'       -- Pro Yearly
      WHEN 'price_1Tl6GnPKr4joNbEckzqM3SoC' THEN 'Enterprise' -- Enterprise (Monthly)
      WHEN 'price_1TpDZ1PKr4joNbEckxXITdTc' THEN 'Enterprise' -- Enterprise Yearly
      ELSE NULL
    END;
  END IF;

  IF v_tier IS NULL THEN
    RETURN NEW; -- unbekannte Price-ID (z.B. Founder/PDF-Export) - keine Abo-Tier-Zuordnung, kein Raten
  END IF;

  IF NEW.status NOT IN ('active', 'trialing') THEN
    v_tier := 'Free';
  END IF;

  -- current_period_end liegt bei neueren Stripe-API-Versionen auf Item-Ebene,
  -- nicht mehr zuverlaessig auf der Subscription selbst - beides versuchen.
  v_period_end := COALESCE(
    (NEW.current_period_end),
    ((NEW.items->'data'->0->>'current_period_end')::bigint)
  );

  INSERT INTO public.subscriptions (
      user_id, stripe_subscription_id, status, current_period_end, tier, updated_at, email
  )
  VALUES (
      v_user_id,
      NEW.id,
      NEW.status,
      CASE WHEN v_period_end IS NOT NULL THEN to_timestamp(v_period_end) ELSE NULL END,
      v_tier,
      now(),
      v_email
  )
  ON CONFLICT (user_id) DO UPDATE SET
      stripe_subscription_id = EXCLUDED.stripe_subscription_id,
      status = EXCLUDED.status,
      current_period_end = EXCLUDED.current_period_end,
      tier = EXCLUDED.tier,
      updated_at = EXCLUDED.updated_at,
      email = EXCLUDED.email;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, stripe, auth;
