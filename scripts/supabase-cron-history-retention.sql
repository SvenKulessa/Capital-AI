-- REVIEW ONLY: apply to production only after explicit Owner approval.
-- Prunes operational history, not Stripe objects, payments, receipts or IAM audit.
begin;
create or replace function private.prune_stripe_cron_history(_batch_size integer default 5000)
returns integer language plpgsql security invoker set search_path = '' as $$
declare _deleted integer;
begin
  if _batch_size is null or _batch_size < 1 or _batch_size > 5000 then
    raise exception 'INVALID_RETENTION_BATCH';
  end if;
  with candidates as (
    select r.runid from cron.job_run_details r
    where r.jobid in (
      select j.jobid from cron.job j
      where j.jobname in ('stripe-sync-worker','capital-ai-cron-history-retention')
    )
      and r.end_time is not null
      and ((r.status='succeeded' and r.end_time < now()-interval '7 days')
        or (r.status='failed' and r.end_time < now()-interval '30 days'))
    order by r.runid limit _batch_size for update skip locked
  )
  delete from cron.job_run_details r using candidates c where r.runid=c.runid;
  get diagnostics _deleted = row_count;
  return _deleted;
end;
$$;
revoke all on function private.prune_stripe_cron_history(integer) from public, anon, authenticated, service_role;
grant execute on function private.prune_stripe_cron_history(integer) to postgres;
-- cron.schedule updates this named job idempotently; stripe-sync-worker remains untouched.
select cron.schedule('capital-ai-cron-history-retention','47 3 * * *',
  'select private.prune_stripe_cron_history(5000)');
commit;
-- Optional initial approved batch: select private.prune_stripe_cron_history(5000);
-- Let autovacuum reclaim reusable space. No TRUNCATE, VACUUM FULL or table rewrite.
-- Stop future pruning with cron.unschedule('capital-ai-cron-history-retention').
-- Deleted history cannot be restored without a backup.
