-- CAPITAL-AI paid Quant/Pro content store.
-- Content is runtime data in private schema; repository stores no paid term payload.
create table if not exists private.vocabulary_quant_pro_content (
  id text primary key,
  payload jsonb not null,
  content_version text not null,
  updated_at timestamptz not null default now(),
  check (jsonb_typeof(payload) = 'object')
);

revoke all on private.vocabulary_quant_pro_content from public, anon, authenticated;
grant select, insert, update, delete on private.vocabulary_quant_pro_content to service_role;

create or replace function public.capital_ai_get_quant_pro_vocabulary(_user_id uuid)
returns jsonb
language sql
security definer
set search_path = pg_catalog
stable
as $$
  select case
    when exists (
      select 1
      from private.vocabulary_access a
      where a.user_id = _user_id
        and a.entitled_at is not null
    )
    then coalesce(
      (
        select jsonb_agg(c.payload order by c.id)
        from private.vocabulary_quant_pro_content c
      ),
      '[]'::jsonb
    )
    else null
  end
$$;

revoke all on function public.capital_ai_get_quant_pro_vocabulary(uuid)
  from public, anon, authenticated;
grant execute on function public.capital_ai_get_quant_pro_vocabulary(uuid)
  to service_role;
