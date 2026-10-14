# Google Cloud Operator: keyless GitHub federation and read-only audit

Domain: PLATFORM / TRUST. Scope: independent manual Google Cloud API readback, **not** unrestricted Cloud Console administration.

## Bound identity

- Project ID: aifinancial-500208 (number 542877602707)
- GitHub repository: SvenKulessa/Capital-AI (ID 1293009324)
- Isolated WIF pool: capital-ai-github-admin
- WIF provider: capital-ai-github-admin
- Service account: capital-ai-cloud-operator@aifinancial-500208.iam.gserviceaccount.com
- Workflow: .github/workflows/google-cloud-admin.yml, manually dispatched from main only
- Expected provider condition: assertion.repository_id == '1293009324' && assertion.ref == 'refs/heads/main' && assertion.event_name == 'workflow_dispatch' && assertion.workflow_ref == 'SvenKulessa/Capital-AI/.github/workflows/google-cloud-admin.yml@refs/heads/main'
- Required provider mappings: google.subject=assertion.sub; attribute.repository_id=assertion.repository_id; attribute.ref=assertion.ref; attribute.workflow_ref=assertion.workflow_ref
- Owner attested the new pool/provider configuration, the role Service Usage Viewer on the operator service account, and the WIF service-account impersonation binding. These IAM facts still require a successful **real GitHub Actions token exchange and API readback**. Screenshots and code alone do not prove runtime permissions.

The provider is dedicated to this identity and should NOT be reused by arbitrary Google workflows. No service-account JSON keys, persistent bearer tokens, OAuth refresh tokens or additional GCP project are needed.

## Workflow, behavior and evidence

1. On GitHub Actions choose "Google Cloud Operator (keyless read-only)" and use Run workflow on **main**.
2. The workflow checks local negative tests and GitHub repository ID.
3. The pinned Google auth action exchanges the short-lived GitHub OIDC token for a **900-second**, read-only-scope Google access token through the isolated pool and service account.
4. The script fetches the enabled-service catalog via GET only:
   https://serviceusage.googleapis.com/v1/projects/542877602707/services?filter=state%3AENABLED&pageSize=200
5. No raw token, individual API inventory, response body, user data or privileged IAM binding is logged. A bounded summary reports project, enabled-service count, and whether Service Usage, IAM, IAM Credentials and Google Drive APIs are enabled. Pagination and project/state mismatches fail closed.
6. Run acceptance: 'CLOUD_OPERATOR_SERVICE_USAGE_READ_PASS' plus all workflow steps green. Verify the workflow run URL and exact main SHA separately. A passing mock test means CODE/TEST PASS, not live WIF access.

## Live verification: first dispatch and follow-up

- GitHub Actions manual dispatch run [38651871102](https://github.com/SvenKulessa/Capital-AI/actions/runs/38651871102) at `main@2a79f77509edd2229501cf3d2544270cb9096d1b` confirmed the real **GitHub OIDC -> isolated WIF provider -> Cloud Operator service account token exchange**: `Federate GitHub OIDC to isolated GCP Cloud Operator` completed successfully. This is not yet a successful API readback.
- The final readback failed with `CLOUD_OPERATOR_PAGINATION_INVALID` even though the HTTP response was accepted. Root cause: the local parser rejected `nextPageToken == ''` when the current `pageToken` was also empty. This is the normal one-page terminal response; the check unintentionally classified it as a repeated page token.
- Remediation: permit the empty terminal token; continue to reject non-empty tokens repeated in the current or any previous page. New unit regressions cover a one-page explicit empty token and an omitted terminal token. No changes to IAM permissions, OIDC trust conditions, Google API scopes, or write operations.
- **Acceptance still pending:** after the code fix is merged, manually dispatch this read-only workflow again from `main`; only `CLOUD_OPERATOR_SERVICE_USAGE_READ_PASS` and a green complete run prove authenticated Service Usage API readback.

## Failures and remediation

- Auth action fails: check dedicated provider's issuer, mapped OIDC claims, exact condition and the WIF "Workload Identity User" binding on the **operator service account**, without broadening to the entire pool. Never turn off the condition as a workaround.
- HTTP 403: confirm 'Service Usage Viewer' on the operator and that Service Usage API is enabled on the selected Google project. No granting Owner, Editor or wide administrator roles.
- HTTP 401: investigate the token exchange and its read-only OAuth scope; do not log a token.
- Google Cloud APIs may be readable using Service Usage Viewer even though **enabling/disabling APIs remains forbidden** by IAM and this workflow.
- Google Drive uploads, OAuth consent-screen management, billing, IAM changes and project creation are NOT activated by this workflow. They require separate reviewed endpoints, narrow roles, explicit Owner decisions, and evidence. GitHub OIDC cannot automatically act as a human administrator in Google OAuth.

## Reproduce and roll back

Local non-network test:

    node --test scripts/platform/google-cloud-admin-readback.test.mjs

Rollback: revert the workflow, script, tests, and their inclusion in the Google maintenance test workflow. Removing the service account's Workload Identity User binding also immediately blocks future impersonation without altering the existing 'capital-ai-github-read' provider. No production server, database or Render deployment is required for the Google API audit.

Google reference: https://docs.cloud.google.com/service-usage/docs/reference/rest/v1/services/list
GitHub authentication action: https://github.com/google-github-actions/auth
