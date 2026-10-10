-- Metadata/statistics only; no hosted Logs scans and no row payloads/secrets.
select jsonb_build_object(
  'database_bytes',pg_database_size(current_database()),
  'warning_400MB',pg_database_size(current_database()) >= 400000000,
  'largest_tables',(select jsonb_agg(t) from (
    select schemaname,relname,pg_total_relation_size(relid) as total_bytes,n_live_tup,n_dead_tup
    from pg_stat_user_tables order by pg_total_relation_size(relid) desc limit 10
  ) t),
  'stripe_cron',(select jsonb_build_object(
    'daily_runs',count(*) filter(where r.start_time > now()-interval '24 hours'),
    'daily_failures',count(*) filter(where r.start_time > now()-interval '24 hours' and r.status='failed'),
    'eligible_successes',count(*) filter(where r.status='succeeded' and r.end_time < now()-interval '7 days'),
    'eligible_failures',count(*) filter(where r.status='failed' and r.end_time < now()-interval '30 days')
  ) from cron.job_run_details r join cron.job j using(jobid) where j.jobname='stripe-sync-worker')
) as diagnostic;
