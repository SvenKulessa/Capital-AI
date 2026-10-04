
UPDATE public.subscriptions
SET tier = 'Pro',
    status = 'active',
    stripe_subscription_id = 'sub_1TytDTPKr4joNbEcaKDSQxhI',
    email = 'sven.kulessa@capital-ai.online',
    updated_at = now()
WHERE user_id = 'aabff9dc-9815-4644-a007-b623ea4b67b9';
