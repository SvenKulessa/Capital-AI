# GitHub OIDC Google Readback — CAPITAL-AI (2026-10-10)

**Status:** DRAFT / LIVE_PROVIDER_READ_NOT_PROVEN
**Domains:** GROWTH, PLATFORM, TRUST

## Authorized scope

The exact workflow `.github/workflows/google-readback.yml` is deliberately **manual-only**, trusted on `SvenKulessa/Capital-AI` `main`, and keyless. It obtains 15-minute access tokens through the pinned `google-github-actions/auth` action, with **only** Google Analytics and Search Console readonly scopes. It does not install new credentials, grant organization/project IAM roles, configure OAuth clients, publish YouTube videos or bypass Google's verification. GitHub Actions must be allowed to issue OIDC ID tokens, and Google Cloud Workload Identity Federation must have an exact repository/ref/event/workflow condition.

This provides **a GitHub workflow identity, not a ChatGPT identity**. The current ChatGPT GitHub connector can read repository/workflow evidence but does not automatically acquire Google credentials or direct Cloud IAM administration.

## Setup from the previously supplied Cloud Shell bootstrap

In a trusted Cloud Shell terminal with project `aifinancial-500208` selected, run `bash capital-ai-google-bootstrap.sh setup-remote`. At the prompt **type only** `OIDC aifinancial-500208`, then press Enter. Do not paste a second shell command while the prompt shows `>`.

A successful run prints these two non-secret GitHub repository variables:

- `GCP_WORKLOAD_IDENTITY_PROVIDER` — full `projects/542877602707/locations/global/workloadIdentityPools/capital-ai-github-read/providers/capital-ai-dispatch` resource name
- `GCP_GOOGLE_READER_SERVICE_ACCOUNT` — `capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com`

The third GitHub Actions repository variable is `GA4_PROPERTY_ID` — the **numerical property number**, never the `G-...` Measurement ID. This workflow intentionally fails before token exchange when variables are missing.

**Idempotence/security evidence:** The bootstrap refuses to modify a pre-existing provider with a different issuer/condition. Pool and identity creation, matching provider configuration and service-account policy must be inspected after running it. No Cloud admin role is required for the runtime workflow itself.

The exact, independently managed **GA4 property Viewer** and **Search Console `sc-domain:capital-ai.online` user** permissions must separately be assigned to that same reader service account. Service Account Cloud IAM project roles are not substitutes for GA4/GSC property permissions.

## Operator-only checks, read-only

```bash
gcloud config set project aifinancial-500208
gcloud iam workload-identity-pools describe capital-ai-github-read --location=global --format='value(state)'
gcloud iam workload-identity-pools providers describe capital-ai-dispatch \
  --location=global --workload-identity-pool=capital-ai-github-read \
  --format='json(name,disabled,attributeCondition,attributeMapping,oidc.issuerUri)'
gcloud iam service-accounts describe capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com \
  --format='value(email,disabled)'
gcloud services list --enabled --format='value(config.name)' | grep -E '^(analyticsadmin|analyticsdata|searchconsole|iamcredentials|sts)\\.googleapis\\.com$' || true
```

If the operator is missing `analyticsdata.googleapis.com`, enabling it is a **separate, consciously approved** operation requiring `serviceusage.services.enable`. Never concatenate multiple `gcloud services enable` commands into one service identifier.

## Abnahme

1. Both required checks, `Docker Security Gate` and `Domain Governance`, pass for the actual PR head. No merge without the current `AGENTS.md` chat authorization.
2. External Cloud OIDC identity is established **only** after Cloud Shell readback confirms the pool, provider, condition and SA.
3. GitHub repository variables are set by an authorized owner through GitHub Settings. No credential material in repository or chat.
4. A human with authorized GitHub Actions access runs **Actions → Google Readback (readonly) → Run workflow** on `main`.
5. The job must show HTTP 200 for `GSC sites.list`, `GSC sitemaps.list`, GA4 `properties.get` and `runRealtimeReport`. An empty realtime report may be valid; it does not prove browser measurement.
6. YouTube scopes `youtube.readonly` / `youtube.upload` require **user-based OAuth**, not service accounts or GitHub OIDC. Verify and publish Branding first; then submit Data Access verification with an actual consent/function demonstration.

## Threat boundaries / rollback

No `schedule`, `pull_request`, `repository_dispatch`, or `push` trigger. No `actions/checkout` nor unpinned package installation. Only one pinned third-party auth action. No service account JSON keys or token echo. Revoke by removing provider's `roles/iam.workloadIdentityUser` binding or disabling its OIDC provider, remove the workflow via PR, and delete the three repository variables. A read-only workflow has no paid service or deploy side effects; API calls are still quota-limited.

**Official sources:**
- https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- https://github.com/google-github-actions/auth
- https://developers.google.com/youtube/v3/guides/authentication
- https://developers.google.com/identity/verification/authentication-verification
