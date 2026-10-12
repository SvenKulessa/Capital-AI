-- Intermediate revision from live Supabase migration history; replaced immediately by the next migration.
create or replace function public.capital_ai_blueprint_commerce(
  _action text,_user_id uuid default null,_sku text default null,_version text default '1.0.0',
  _session_id text default null,_price_id text default null,_payment_intent_id text default null,
  _customer_id text default null,_licensee_name text default null,_license_version text default '1.0.0',
  _reason text default null
) returns jsonb language plpgsql security invoker set search_path='' as $$
begin
  return '{}'::jsonb;
end;
$$;
revoke all on function public.capital_ai_blueprint_commerce(text,uuid,text,text,text,text,text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.capital_ai_blueprint_commerce(text,uuid,text,text,text,text,text,text,text,text,text) to service_role;
