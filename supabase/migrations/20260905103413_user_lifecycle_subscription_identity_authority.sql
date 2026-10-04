CREATE OR REPLACE FUNCTION public.sync_stripe_subscription_to_public()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'stripe', 'auth'
AS $function$
DECLARE
  v_email text;
  v_user_id uuid;
  v_user_id_text text;
  v_price_id text;
  v_tier text;
  v_period_end bigint;
BEGIN
  v_user_id_text := btrim(COALESCE(NEW.metadata->>'user_id', ''));

  IF v_user_id_text = '' THEN
    RETURN NEW;
  END IF;

  BEGIN
    v_user_id := v_user_id_text::uuid;
  EXCEPTION
    WHEN invalid_text_representation THEN
      RETURN NEW;
  END;

  SELECT email INTO v_email
  FROM auth.users
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_tier := CASE upper(btrim(COALESCE(NEW.metadata->>'plan_id', '')))
    WHEN 'STARTER' THEN 'Starter'
    WHEN 'PRO' THEN 'Pro'
    WHEN 'ENTERPRISE' THEN 'Enterprise'
    ELSE NULL
  END;

  IF v_tier IS NULL THEN
    v_price_id := NEW.items->'data'->0->'price'->>'id';
    v_tier := CASE v_price_id
      WHEN 'price_1TnEUEPKr4joNbEctWTgogW6' THEN 'Starter'
      WHEN 'price_1TpDDNPKr4joNbEcGm7ngSmp' THEN 'Starter'
      WHEN 'price_1TpDOhPKr4joNbEc50cS0PKr' THEN 'Pro'
      WHEN 'price_1TpDVYPKr4joNbEck8SdA1sK' THEN 'Pro'
      WHEN 'price_1Tl6GnPKr4joNbEckzqM3SoC' THEN 'Enterprise'
      WHEN 'price_1TpDZ1PKr4joNbEckxXITdTc' THEN 'Enterprise'
      ELSE NULL
    END;
  END IF;

  IF v_tier IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status NOT IN ('active', 'trialing') THEN
    v_tier := 'Free';
  END IF;

  v_period_end := COALESCE(
    NEW.current_period_end,
    ((NEW.items->'data'->0->>'current_period_end')::bigint)
  );

  INSERT INTO public.subscriptions (
    user_id,
    stripe_subscription_id,
    status,
    current_period_end,
    tier,
    updated_at,
    email
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
$function$;