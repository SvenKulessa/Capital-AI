-- Behebt den Advisor-Befund "Function Search Path Mutable" fuer die
-- Signup-Trigger-Funktion. SECURITY DEFINER-Funktionen ohne festen
-- search_path sind anfaellig fuer search_path-Hijacking, wenn ein Angreifer
-- ein gleichnamiges Objekt in einem fuer die aufrufende Rolle sichtbaren
-- Schema anlegt. Reine Haertung: Logik/Body unveraendert, nur SET
-- search_path ergaenzt. Laeuft bei jeder Neuregistrierung (auth.users
-- Trigger) - daher bewusst additiv statt neu geschrieben.

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
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
$function$
