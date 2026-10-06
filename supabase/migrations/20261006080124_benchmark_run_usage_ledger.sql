create table if not exists public.benchmark_runs (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  tier text not null check (tier in ('starter','pro','enterprise')),
  profile_id text not null check (profile_id = 'CAPITAL_AI_EVENT_BACKBONE@1'),
  repository text not null check (repository ~ '^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$'),
  commit_sha text not null check (commit_sha ~ '^[0-9a-fA-F]{40}$'),
  status text not null default 'QUEUED' check (status in ('QUEUED','RUNNING','SUCCEEDED','FAILED','CANCELLED')),
  evidence_id text,
  created_at timestamptz not null default pg_catalog.clock_timestamp(),
  started_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  production_eligible boolean not null default false check (production_eligible = false),
  decision_eligible boolean not null default false check (decision_eligible = false)
);

create index if not exists benchmark_runs_user_created_idx
  on public.benchmark_runs (user_id, created_at desc);

create table if not exists public.benchmark_usage_ledger (
  run_id uuid primary key references public.benchmark_runs(id) on delete cascade,
  measurement_status text not null default 'PENDING' check (measurement_status in ('PENDING','MEASURED')),
  wall_time_ms numeric check (wall_time_ms is null or wall_time_ms >= 0),
  cpu_time_ms numeric check (cpu_time_ms is null or cpu_time_ms >= 0),
  peak_memory_mib numeric check (peak_memory_mib is null or peak_memory_mib >= 0),
  disk_bytes_written bigint check (disk_bytes_written is null or disk_bytes_written >= 0),
  network_bytes bigint check (network_bytes is null or network_bytes >= 0),
  compute_eur numeric(18,8) check (compute_eur is null or compute_eur >= 0),
  storage_eur numeric(18,8) check (storage_eur is null or storage_eur >= 0),
  network_eur numeric(18,8) check (network_eur is null or network_eur >= 0),
  total_eur numeric(18,8) check (total_eur is null or total_eur >= 0),
  pricing_evidence_refs jsonb not null default '[]'::jsonb
    check (pg_catalog.jsonb_typeof(pricing_evidence_refs) = 'array'),
  credits_calibrated boolean not null default false,
  units_charged numeric check (units_charged is null or units_charged >= 0),
  recorded_at timestamptz,
  updated_at timestamptz not null default pg_catalog.clock_timestamp(),
  production_eligible boolean not null default false check (production_eligible = false),
  decision_eligible boolean not null default false check (decision_eligible = false)
);

alter table public.benchmark_runs enable row level security;
alter table public.benchmark_usage_ledger enable row level security;

drop policy if exists benchmark_runs_explicit_deny on public.benchmark_runs;
create policy benchmark_runs_explicit_deny
  on public.benchmark_runs for all to anon, authenticated
  using (false) with check (false);

drop policy if exists benchmark_usage_ledger_explicit_deny on public.benchmark_usage_ledger;
create policy benchmark_usage_ledger_explicit_deny
  on public.benchmark_usage_ledger for all to anon, authenticated
  using (false) with check (false);

revoke all on table public.benchmark_runs from public, anon, authenticated, service_role;
revoke all on table public.benchmark_usage_ledger from public, anon, authenticated, service_role;

create or replace function public.capital_ai_create_benchmark_run(
  _run_id uuid, _user_id uuid, _tier text, _profile_id text, _repository text, _commit_sha text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  v_created_at timestamptz;
begin
  if _run_id is null or _user_id is null
     or _tier not in ('starter','pro','enterprise')
     or _profile_id <> 'CAPITAL_AI_EVENT_BACKBONE@1'
     or _repository !~ '^[A-Za-z0-9_.-]{1,100}/[A-Za-z0-9_.-]{1,100}$'
     or _commit_sha !~ '^[0-9a-fA-F]{40}$' then
    raise exception 'INVALID_BENCHMARK_RUN';
  end if;

  insert into public.benchmark_runs (
    id, user_id, tier, profile_id, repository, commit_sha, status
  ) values (
    _run_id, _user_id, _tier, _profile_id, _repository, pg_catalog.lower(_commit_sha), 'QUEUED'
  )
  returning created_at into v_created_at;

  insert into public.benchmark_usage_ledger (run_id) values (_run_id);

  return pg_catalog.jsonb_build_object(
    'id', _run_id, 'userId', _user_id, 'tier', _tier,
    'profileId', _profile_id, 'repository', _repository,
    'commitSha', pg_catalog.lower(_commit_sha), 'status', 'QUEUED',
    'createdAt', v_created_at, 'completedAt', null, 'evidenceId', null,
    'usage', pg_catalog.jsonb_build_object(
      'schemaVersion','CAPITAL_AI_BENCHMARK_USAGE@1',
      'measurementStatus','PENDING',
      'resources', pg_catalog.jsonb_build_object(
        'wallTimeMs',null,'cpuTimeMs',null,'peakMemoryMiB',null,
        'diskBytesWritten',null,'networkBytes',null
      ),
      'cost', pg_catalog.jsonb_build_object(
        'currency','EUR','computeEur',null,'storageEur',null,'networkEur',null,
        'totalEur',null,'pricingEvidenceRefs','[]'::jsonb
      ),
      'credits', pg_catalog.jsonb_build_object('calibrated',false,'unitsCharged',null)
    )
  );
end;
$function$;

create or replace function public.capital_ai_get_benchmark_run(_user_id uuid, _run_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $function$
  select pg_catalog.jsonb_build_object(
    'id', r.id, 'userId', r.user_id, 'tier', r.tier,
    'profileId', r.profile_id, 'repository', r.repository, 'commitSha', r.commit_sha,
    'status', r.status, 'createdAt', r.created_at, 'completedAt', r.completed_at,
    'evidenceId', r.evidence_id,
    'usage', pg_catalog.jsonb_build_object(
      'schemaVersion','CAPITAL_AI_BENCHMARK_USAGE@1',
      'measurementStatus', u.measurement_status,
      'resources', pg_catalog.jsonb_build_object(
        'wallTimeMs',u.wall_time_ms,'cpuTimeMs',u.cpu_time_ms,
        'peakMemoryMiB',u.peak_memory_mib,'diskBytesWritten',u.disk_bytes_written,
        'networkBytes',u.network_bytes
      ),
      'cost', pg_catalog.jsonb_build_object(
        'currency','EUR','computeEur',u.compute_eur,'storageEur',u.storage_eur,
        'networkEur',u.network_eur,'totalEur',u.total_eur,
        'pricingEvidenceRefs',u.pricing_evidence_refs
      ),
      'credits', pg_catalog.jsonb_build_object(
        'calibrated',u.credits_calibrated,'unitsCharged',u.units_charged
      )
    ),
    'productionEligible', false, 'decisionEligible', false
  )
  from public.benchmark_runs r
  join public.benchmark_usage_ledger u on u.run_id = r.id
  where r.user_id = _user_id and r.id = _run_id;
$function$;

create or replace function public.capital_ai_list_benchmark_runs(_user_id uuid, _limit integer default 20)
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $function$
  select coalesce(pg_catalog.jsonb_agg(row_data order by created_at desc),'[]'::jsonb)
  from (
    select r.created_at,
      pg_catalog.jsonb_build_object(
        'id', r.id, 'userId', r.user_id, 'tier', r.tier,
        'profileId', r.profile_id, 'repository', r.repository, 'commitSha', r.commit_sha,
        'status', r.status, 'createdAt', r.created_at, 'completedAt', r.completed_at,
        'evidenceId', r.evidence_id,
        'usage', pg_catalog.jsonb_build_object(
          'schemaVersion','CAPITAL_AI_BENCHMARK_USAGE@1',
          'measurementStatus', u.measurement_status,
          'resources', pg_catalog.jsonb_build_object(
            'wallTimeMs',u.wall_time_ms,'cpuTimeMs',u.cpu_time_ms,
            'peakMemoryMiB',u.peak_memory_mib,'diskBytesWritten',u.disk_bytes_written,
            'networkBytes',u.network_bytes
          ),
          'cost', pg_catalog.jsonb_build_object(
            'currency','EUR','computeEur',u.compute_eur,'storageEur',u.storage_eur,
            'networkEur',u.network_eur,'totalEur',u.total_eur,
            'pricingEvidenceRefs',u.pricing_evidence_refs
          ),
          'credits', pg_catalog.jsonb_build_object(
            'calibrated',u.credits_calibrated,'unitsCharged',u.units_charged
          )
        ),
        'productionEligible', false, 'decisionEligible', false
      ) as row_data
    from public.benchmark_runs r
    join public.benchmark_usage_ledger u on u.run_id = r.id
    where r.user_id = _user_id
    order by r.created_at desc
    limit greatest(1, least(coalesce(_limit,20),50))
  ) q;
$function$;

create or replace function public.capital_ai_record_benchmark_usage(
  _run_id uuid, _status text, _wall_time_ms numeric, _cpu_time_ms numeric,
  _peak_memory_mib numeric, _disk_bytes_written bigint, _network_bytes bigint,
  _compute_eur numeric default null, _storage_eur numeric default null,
  _network_eur numeric default null, _total_eur numeric default null,
  _pricing_evidence_refs jsonb default '[]'::jsonb,
  _credits_calibrated boolean default false, _units_charged numeric default null,
  _evidence_id text default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
begin
  if _status not in ('SUCCEEDED','FAILED')
     or _wall_time_ms is null or _wall_time_ms < 0
     or _cpu_time_ms is null or _cpu_time_ms < 0
     or _peak_memory_mib is null or _peak_memory_mib < 0
     or _disk_bytes_written is null or _disk_bytes_written < 0
     or _network_bytes is null or _network_bytes < 0
     or (_compute_eur is not null and _compute_eur < 0)
     or (_storage_eur is not null and _storage_eur < 0)
     or (_network_eur is not null and _network_eur < 0)
     or (_total_eur is not null and _total_eur < 0)
     or pg_catalog.jsonb_typeof(coalesce(_pricing_evidence_refs,'[]'::jsonb)) <> 'array'
     or (_units_charged is not null and _units_charged < 0)
     or (_credits_calibrated = false and _units_charged is not null) then
    raise exception 'INVALID_BENCHMARK_USAGE';
  end if;

  update public.benchmark_usage_ledger
     set measurement_status='MEASURED', wall_time_ms=_wall_time_ms,
         cpu_time_ms=_cpu_time_ms, peak_memory_mib=_peak_memory_mib,
         disk_bytes_written=_disk_bytes_written, network_bytes=_network_bytes,
         compute_eur=_compute_eur, storage_eur=_storage_eur, network_eur=_network_eur,
         total_eur=_total_eur, pricing_evidence_refs=coalesce(_pricing_evidence_refs,'[]'::jsonb),
         credits_calibrated=_credits_calibrated, units_charged=_units_charged,
         recorded_at=pg_catalog.clock_timestamp(), updated_at=pg_catalog.clock_timestamp()
   where run_id=_run_id;

  if not found then raise exception 'BENCHMARK_RUN_NOT_FOUND'; end if;

  update public.benchmark_runs
     set status=_status,
         evidence_id=nullif(pg_catalog.btrim(coalesce(_evidence_id,'')), ''),
         completed_at=pg_catalog.clock_timestamp(),
         updated_at=pg_catalog.clock_timestamp()
   where id=_run_id;

  return pg_catalog.jsonb_build_object(
    'runId',_run_id,'measurementStatus','MEASURED','status',_status,
    'creditsCalibrated',_credits_calibrated,'unitsCharged',_units_charged,
    'productionEligible',false,'decisionEligible',false
  );
end;
$function$;

revoke execute on function public.capital_ai_create_benchmark_run(uuid,uuid,text,text,text,text)
  from public, anon, authenticated;
revoke execute on function public.capital_ai_get_benchmark_run(uuid,uuid)
  from public, anon, authenticated;
revoke execute on function public.capital_ai_list_benchmark_runs(uuid,integer)
  from public, anon, authenticated;
revoke execute on function public.capital_ai_record_benchmark_usage(uuid,text,numeric,numeric,numeric,bigint,bigint,numeric,numeric,numeric,numeric,jsonb,boolean,numeric,text)
  from public, anon, authenticated;

grant execute on function public.capital_ai_create_benchmark_run(uuid,uuid,text,text,text,text) to service_role;
grant execute on function public.capital_ai_get_benchmark_run(uuid,uuid) to service_role;
grant execute on function public.capital_ai_list_benchmark_runs(uuid,integer) to service_role;
grant execute on function public.capital_ai_record_benchmark_usage(uuid,text,numeric,numeric,numeric,bigint,bigint,numeric,numeric,numeric,numeric,jsonb,boolean,numeric,text) to service_role;
