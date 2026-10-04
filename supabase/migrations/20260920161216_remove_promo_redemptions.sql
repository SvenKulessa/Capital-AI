do $$
begin
  if to_regclass('public.promo_redemptions') is null then
    return;
  end if;

  lock table public.promo_redemptions in access exclusive mode;

  if exists (select 1 from public.promo_redemptions limit 1) then
    raise exception using
      errcode = '55000',
      message = 'promo_redemptions retirement blocked: table is not empty';
  end if;

  execute 'drop table public.promo_redemptions';
end
$$;