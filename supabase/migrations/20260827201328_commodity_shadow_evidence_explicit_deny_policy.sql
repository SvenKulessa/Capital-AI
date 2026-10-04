create policy commodity_shadow_evidence_explicit_client_deny
on public.commodity_shadow_evidence
for all
to anon, authenticated
using (false)
with check (false);

comment on policy commodity_shadow_evidence_explicit_client_deny on public.commodity_shadow_evidence is
  'Explicit fail-closed Data API policy. Commodity P3-A shadow evidence is server-only; browser roles have no grants and no row visibility/mutation authority.';