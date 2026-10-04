ALTER TABLE public.subscriptions ALTER COLUMN stripe_subscription_id DROP NOT NULL;
ALTER TABLE public.subscriptions ALTER COLUMN status SET DEFAULT 'free';