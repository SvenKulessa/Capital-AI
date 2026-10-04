INSERT INTO public.profiles (id, full_name, role)
SELECT u.id, COALESCE(u.raw_user_meta_data->>'full_name', 'User'), 'free'
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

INSERT INTO public.subscriptions (user_id, stripe_subscription_id, status, tier)
SELECT u.id, NULL, 'free', 'Free'
FROM auth.users u
LEFT JOIN public.subscriptions s ON s.user_id = u.id
WHERE s.user_id IS NULL;