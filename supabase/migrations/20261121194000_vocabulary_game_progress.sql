create table public.capital_ai_vocabulary_game_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  revision uuid not null default gen_random_uuid(),
  state jsonb not null check (jsonb_typeof(state) = 'object' and pg_column_size(state) <= 262144)
);

alter table public.capital_ai_vocabulary_game_progress enable row level security;
revoke all on public.capital_ai_vocabulary_game_progress from public, anon, authenticated, service_role;

create function public.capital_ai_vocabulary_game(
  _user_id uuid, _expected uuid default null, _state jsonb default null
) returns jsonb
language plpgsql security definer set search_path = ''
as $$
begin
  if _state is null then
    return coalesce(
      (select jsonb_build_object('revision', revision, 'state', state)
         from public.capital_ai_vocabulary_game_progress where user_id = _user_id),
      '{"revision":null,"state":null}'::jsonb
    );
  end if;
  if _expected is null then
    insert into public.capital_ai_vocabulary_game_progress (user_id, state)
      values (_user_id, _state) on conflict (user_id) do nothing;
  else
    update public.capital_ai_vocabulary_game_progress
       set state = _state, revision = gen_random_uuid()
     where user_id = _user_id and revision = _expected;
  end if;
  return to_jsonb(found);
end;
$$;
revoke all on function public.capital_ai_vocabulary_game(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.capital_ai_vocabulary_game(uuid, uuid, jsonb) to service_role;
