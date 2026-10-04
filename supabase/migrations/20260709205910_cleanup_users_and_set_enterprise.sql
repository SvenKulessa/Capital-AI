-- 1. Kindtabellen zuerst leeren (FK-Constraints)
DELETE FROM public.subscriptions 
WHERE user_id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('s.kulessa1986@gmail.com', 'sven.kulessa@protonmail.com', 'marketing@capital-ai.online')
);

DELETE FROM public.profiles 
WHERE id IN (
  SELECT id FROM auth.users 
  WHERE email IN ('s.kulessa1986@gmail.com', 'sven.kulessa@protonmail.com', 'marketing@capital-ai.online')
);

-- 2. Legacy public.users + zugehörige usage_log
DELETE FROM public.usage_log 
WHERE user_id IN (SELECT id FROM public.users WHERE email = 's.kulessa1986@gmail.com');

DELETE FROM public.users WHERE email = 's.kulessa1986@gmail.com';

-- 3. Auth-User selbst löschen
DELETE FROM auth.users 
WHERE email IN ('s.kulessa1986@gmail.com', 'sven.kulessa@protonmail.com', 'marketing@capital-ai.online');

-- 4. Enterprise-Abo für sven.kulessa@gmail.com korrekt eintragen
UPDATE public.subscriptions
SET 
  tier = 'Enterprise',
  status = 'active',
  stripe_subscription_id = 'sub_1TrLcwPKr4joNbEcEdnz4YBz',
  current_period_end = now() + interval '365 days',
  updated_at = now()
WHERE user_id = 'bcd298ed-3901-4fac-97b9-609a78335862';

UPDATE public.profiles
SET role = 'enterprise', updated_at = now()
WHERE id = 'bcd298ed-3901-4fac-97b9-609a78335862';