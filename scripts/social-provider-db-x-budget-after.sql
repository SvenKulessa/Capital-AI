-- Disposable fixture only; no production budget or provider account.
do $$
begin
  if (select reserved_micro_eur from public.capital_x_growth_budget where external_account_id='991') <> 1000000
     or (select count(*) from public.capital_x_growth_reservations where external_account_id='991') <> 1 then
    raise exception 'X_BUDGET_ACCOUNT_TOTAL_MISMATCH';
  end if;
  if has_function_privilege('anon','public.capital_x_growth_reserve(uuid,text,text)','EXECUTE')
     or has_function_privilege('authenticated','public.capital_x_growth_reserve(uuid,text,text)','EXECUTE')
     or has_table_privilege('authenticated','public.capital_x_growth_reservations','SELECT')
     or has_table_privilege('service_role','public.capital_x_growth_reservations','DELETE')
     or has_column_privilege('service_role','public.capital_x_growth_budget','approved','UPDATE')
     or has_column_privilege('service_role','public.capital_x_growth_budget','reserved_micro_eur','UPDATE')
     or has_table_privilege('service_role','public.capital_x_growth_reservations','INSERT')
     or has_table_privilege('service_role','public.capital_x_growth_reservations','SELECT') then
    raise exception 'X_BUDGET_ACL_UNSAFE';
  end if;
end $$;
set role service_role;
do $$
declare
  owner_id uuid := 'd0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  other_id uuid := 'a1bf7f2f-c4d2-4cda-b0a8-0f7bb2723101';
  account text;
begin
  foreach account in array array['992','993'] loop
    begin
      perform public.capital_x_growth_reserve(owner_id,account,repeat('e',64));
      raise exception 'EXPECTED_DENIAL_MISSING';
    exception when raise_exception then
      if sqlerrm <> 'X_BUDGET_EVIDENCE_REQUIRED' then raise; end if;
    end;
  end loop;
  begin
    perform public.capital_x_growth_reserve(owner_id,'994',repeat('e',64));
    raise exception 'EXPECTED_DENIAL_MISSING';
  exception when raise_exception then
    if sqlerrm <> 'X_BUDGET_EXHAUSTED' then raise; end if;
  end;
  begin
    perform public.capital_x_growth_reserve(other_id,'991',repeat('e',64));
    raise exception 'EXPECTED_DENIAL_MISSING';
  exception when raise_exception then
    if sqlerrm <> 'X_BUDGET_NOT_CONFIGURED' then raise; end if;
  end;
  begin
    perform public.capital_x_growth_reserve(owner_id,'991',null);
    raise exception 'EXPECTED_DENIAL_MISSING';
  exception when raise_exception then
    if sqlerrm <> 'X_BUDGET_INPUT_INVALID' then raise; end if;
  end;
  begin
    update public.capital_x_growth_budget set reserved_micro_eur=0 where external_account_id='991';
    raise exception 'EXPECTED_DENIAL_MISSING';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
do $$
begin
  if (select count(*) from public.capital_x_growth_reservations) <> 1 then
    raise exception 'X_BUDGET_DENIED_REQUEST_LEFT_RESERVATION';
  end if;
end $$;
set role authenticated;
do $$
begin
  begin
    perform public.capital_x_growth_reserve('d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101','991',repeat('f',64));
    raise exception 'EXPECTED_DENIAL_MISSING';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
