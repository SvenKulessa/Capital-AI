-- Disposable fixture only. All values are synthetic cost bounds.
insert into public.capital_x_growth_budget(external_account_id,user_id,pilot_started_at,
  quote_observed_at,balance_observed_at,quote_sha256,balance_sha256,approved,auto_recharge_disabled,
  baseline_spent_micro_eur,credit_ceiling_micro_eur,workload_upper_micro_eur)
values
 ('991','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',now()-interval '1 hour',now(),now(),repeat('a',64),repeat('b',64),true,true,19000000,1000000,1000000),
 ('992','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',now()-interval '1 hour',now()-interval '25 hours',now(),repeat('a',64),repeat('b',64),true,true,0,20000000,1000000),
 ('993','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',now()-interval '1 hour',now(),now(),repeat('a',64),repeat('b',64),false,true,0,20000000,1000000),
 ('994','d0bf7f2f-c4d2-4cda-b0a8-0f7bb2723101',now()-interval '1 hour',now(),now(),repeat('a',64),repeat('b',64),true,true,0,999999,1000000);
