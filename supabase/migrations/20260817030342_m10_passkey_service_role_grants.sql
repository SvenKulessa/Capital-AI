begin;

revoke all on table public.m10_registration_challenges from service_role;
grant select, insert, update on table public.m10_registration_challenges to service_role;

revoke all on table public.m10_owner_credentials from service_role;
grant select, insert, update on table public.m10_owner_credentials to service_role;

commit;
