begin;

-- Cover the provider-managed FK lookup without changing Stripe Sync ownership.
create index if not exists idx_managed_webhooks_account_id
  on stripe._managed_webhooks (account_id);

commit;
