CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    INSERT INTO public.profiles (id, full_name, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
        'free'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.subscriptions (user_id, stripe_subscription_id, status, tier)
    VALUES (
        NEW.id,
        NULL,
        'free',
        'Free'
    )
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$function$;