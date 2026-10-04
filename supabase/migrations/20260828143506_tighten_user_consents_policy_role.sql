drop policy if exists "user_consents_select_own" on public.user_consents;
create policy "user_consents_select_own"
on public.user_consents
for select
to authenticated
using ((select auth.uid()) = user_id);