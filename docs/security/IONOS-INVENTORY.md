# IONOS migration inventory

Run **IONOS Domain Inventory** from Actions on main after merging this change.
The existing `IONOS_API_KEY` repository secret is consumed only by the inventory
step. No dependency installation, Docker build or deployment runs here. The job
has a three-minute timeout and no write permission for GitHub.

## Four validation stages

1. **Inventory:** two fixed IONOS Hosting DNS GET requests, exact zone selection,
   no redirects, no DNS mutations. The artifact saves A/AAAA/CNAME rollback values
   only for capital-ai.online, www.capital-ai.online and mta-sts.capital-ai.online.
   Other records are represented by a count and digest; their contents and names
   are omitted. Artifacts contain public DNS values and record IDs, never the key.
2. **Deployment:** probe the new service's health and exact plain-text MTA-STS
   policy. An HTML login page with status 200 fails the policy gate. The inventory
   succeeds independently of deployment gates so rollback evidence is retained.
   Source commit, container digest and OIDC login require separate verification.
3. **Binding and plan:** inspect Render custom-domain associations, save existing
   bindings and obtain target-service DNS instructions. Connector custom-domain
   operations are unavailable. No IP is inferred from public DNS. Prepare a
   per-record change plan only after live inventory and authentication validation.
4. **Cutover and readback:** transfer the three exact bindings and web records,
   preserving mail/security records and existing MTA-STS testing policy. Validate
   DNS, TLS, canonical redirect, login and MTA-STS. On failed readback, use captured
   record values and old bindings for a deliberate rollback. This workflow performs
   neither cutover nor rollback and never claims production readiness.

Conflicting IONOS managed services require inspection before writes because DNS
changes can deactivate service-owned records. Full-zone PUT/PATCH is excluded.

References:
- https://developer.hosting.ionos.com/docs/dns
- https://developer.hosting.ionos.com/docs/getstarted
- https://render.com/docs/custom-domains

Observed before this change: PR #25 merged at e89d3274a761c5c060ae39ca7b749135c6587e15;
Render's active deploy reported 8c8139f96e8eaf638c4f5739aab3915571920223.
These observations are a snapshot, not future deployment evidence.
