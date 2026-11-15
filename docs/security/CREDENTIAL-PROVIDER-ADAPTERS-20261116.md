# CAPITAL-AI TRUST – Provider metadata adapters, read-only

Scope: PR #758, root `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`. This adds an **opt-in offline** boundary for provider *readback metadata*; it does not install a provider client, perform SQL/HTTP calls, use API credentials, rotate keys, refresh OAuth, persist reports, add a scheduler, modify environments, merge or deploy.

## Trust and provenance

`provider_metadata.py` validates **pre-minimized** readbacks from five sources, with fixed scopes and method names and **exact field allowlists**. Inputs that include a token, secret, private key, OAuth response body, endpoint URL, or an unrecognized field are rejected, and errors never echo payloads. Unknown tenant/account, mismatched service identity, duplicated or stale observations and multiple social accounts fail closed. Every accepted source is marked `INPUT_VALIDATED_NOT_ATTESTED`: a JSON document or a checked metadata schema is **not** independent proof that a provider authenticated it. The trusted collector must independently retain provider operation ID, execution authority, UTC time and non-secret evidence outside the input document. Absent that trusted readback, status remains `NOT_PROVEN`; the lifecycle never upgrades `CURRENT` to `VERIFIED` from user-supplied JSON.

The adapters do not change the original 17-entry curated inventory. The existing LangGraph `INVENTORIED → EVALUATED → EVIDENCED` evaluates validated observations, without mutation nodes. The new opt-in CLI accepts `--inventory`, `--readbacks`, optionally `--at`. It emits **stdout only** with bounded fields (provider name, source cardinality, expiry category, provenance label; credential ID and verdict). Provider data and key names are not emitted. No report or checkpoint is persisted by these modules. The existing `scripts/growth-agent/requirements.lock` is reused.

## Explicit metadata mapping for provider collectors

| Provider | Pinned resource | Source method and permitted metadata | Expiry inference |
| --- | --- | --- | --- |
| Supabase | Production project `ryzywoktpmyhwzxmstyu` | `social_expiry_aggregate`: for each `platform in (x,youtube)`, `status`, integer `account_count`, `nearest_expiry`, boolean `owner_bound`; obtained **only** by an aggregate query over `public.social_media_accounts`, never access/refresh-token columns | `token_expires_at` is attributable only with exactly one connected **owner-scoped** record and `owner_bound=true`; metadata is still unauthenticated until external provider operation is evidenced |
| Render | Workspace `tea-d90o4rj7uimc739i86ug`, webservice `srv-dau1rp893c1s73cdhm1g` | `service_registry_metadata`: `service_id`, boolean registry-credential presence and `updatedAt`; no environment variables or registry credentials | Registry update time is **not** expiration; `EXPIRY_NOT_EXPOSED` |
| Stripe | Account `acct_1TbfHJPKr4joNbEc` | `webhook_endpoint_metadata`: webhook ID, live/test boolean, state, created timestamp, from read-only endpoint list | Endpoint creation/status is **not** signing-key expiry; secret keys also remain `NOT_PROVEN` |
| Google | Project `aifinancial-500208`, **Google audit** service account only | `service_account_key_metadata`: disabled flag, `USER_MANAGED` public key metadata `validBeforeTime`, no `privateKeyData` | A key validity period **cannot** be assigned to Render's unbound legacy JSON or an OAuth refresh grant. WIF is keyless; no private JSON is fetched |
| GitHub | `SvenKulessa/Capital-AI` | `actions_secret_metadata`: only name and `updated_at` if the permitted endpoint grants metadata access | `updated_at` is **not** PAT/Actions-secret expiry; no secret values or repository environments fetched |

Known provider identifiers are **scope bindings**, not secrets. If a provider cannot return the required metadata through an authorized connector, it must remain `NOT_PROVEN` rather than resorting to key retrieval or environment-variable reads. `--readbacks` must be prepared by a trusted, consented collector that selects only the above fields *before* the adapter receives them. Do **not** feed raw provider responses (which can include secret-bearing fields) to this CLI.

### Example: sanitized Supabase aggregate

Only the following projection is permitted in the trusted Supabase read-only query:

```sql
SELECT platform, status, COUNT(*) AS account_count,
       MIN(token_expires_at) AS nearest_expiry,
       true AS owner_bound
FROM public.social_media_accounts
WHERE platform IN ('x', 'youtube')
  AND user_id = :authenticated_owner_uuid
GROUP BY platform, status;
```

Convert the SQL result to exact readback keys (`nearest_expiry` canonical UTC `...Z`). Do not query `access_token_encrypted`, `refresh_token_encrypted`, auth table secrets or credential values. The named parameter `:authenticated_owner_uuid` is illustrative and must be bound **outside** this module by a trusted caller with verified owner authorization; never substitute a user-supplied UUID or use this as a bare SQL string in production. If such an owner-bound query is not available, use `owner_bound=false` and do not assign an expiry. Before assigning an expiry to the owner credential the scoped aggregate must contain exactly **one** connected account for that platform; project-wide counts must not be treated as owner proof. The compiler rejects duplicate platforms, wrong scope, missing required fields and unsupported timestamps.

### Readback sample (synthetic only)

```json
{
  "schema": "capital-ai.provider-readback.v1",
  "readbacks": [{
    "provider": "supabase",
    "scope": "project:ryzywoktpmyhwzxmstyu",
    "method": "social_expiry_aggregate",
    "observed_at": "2026-11-16T00:00:00Z",
    "records": [{
      "platform": "youtube", "status": "connected", "account_count": 1, "owner_bound": true,
      "nearest_expiry": "2026-11-07T16:34:20Z"
    }]
  }]
}
```

Example date and values are **fixtures**, not provider evidence from this PR.

To evaluate a prepared, authorized, sanitized readback (manual only):

```bash
python3 scripts/growth-agent/provider_metadata_cli.py \
  --inventory config/credential-lifecycle.inventory.json \
  --readbacks /path/to/pre-minimized-provider-metadata.json
```

No cron and no live-provider connection are added. Existing `google-maintenance-tests.yml` path filter `scripts/growth-agent/**` runs the pinned graph tests when this PR changes the adapters. The existing `Docker Security Gate` and `Domain Governance` remain authoritative required checks. No additional gate is introduced.

## Evidence, rollback and limits

Historical gate for base Head `c12c544905e0f2b6a0335b899a51c9f6419b1c3d`: Docker Security Gate [43767747355](https://github.com/SvenKulessa/Capital-AI/actions/runs/43767747355), `success` and no publishing/handoff; [LangGraph 43767747375](https://github.com/SvenKulessa/Capital-AI/actions/runs/43767747375) `success`; Domain Governance [43767747329](https://github.com/SvenKulessa/Capital-AI/actions/runs/43767747329) `success`. These are **historical**, not tests of the new adapters. Head-specific CI and gate statuses must be reread after the follow-up commit. Source identity of earlier gate is PR head plus GitHub's synthetic test-merge SHA, **not live deployment SHA**.

Local test command:

```bash
python3 -m unittest discover -s scripts/growth-agent -p 'test_provider_metadata.py' -v
```

Rollback: revert only this PR's `provider_metadata.py`, `provider_metadata_cli.py`, `test_provider_metadata.py` and this document. No durable state, provider credential or environment needs restoration. No claim of credential-validity verification until an authenticated, scoped provider readback is independently evidenced.