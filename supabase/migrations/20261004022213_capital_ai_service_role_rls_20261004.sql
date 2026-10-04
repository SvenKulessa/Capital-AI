-- Explicit server-only policies. Browser roles remain denied.

create policy service_role_full_access
on public.social_media_accounts
for all
to service_role
using (true)
with check (true);

create policy service_role_full_access
on public.social_media_oauth_states
for all
to service_role
using (true)
with check (true);

create policy service_role_full_access
on public.social_media_publish_log
for all
to service_role
using (true)
with check (true);

create policy service_role_full_access
on public.social_media_content_approvals
for all
to service_role
using (true)
with check (true);
