# FEDERATED_HEALTHZ@1

PLATFORM/TRUST. Existing Google Cloud Operator workflow, new explicit read-only operation healthz. No new scheduler, IAM grant, Google token, service, API activation, required check or commercial permission. Reuses scripts/trust-runtime-readback.mjs. Public HTTP only; never claims OCI/Sigstore attestation. Run artifacts contain opaque random UUID, SHA, timestamp, status and bounded identity fields only; no chat identifiers or personal data. Retention one day. Run artifacts/logs may be visible to repository readers; do not use them for private chat content.

From a trusted caller (Chat adapter, AcodeX or Google Cloud Shell with existing authenticated gh CLI), after the requested Main SHA is deployed:

    node scripts/platform/federated-healthz.mjs federated EXPECTED_MAIN_SHA

The caller dispatches once, polls the exact UUID-bound workflow, refuses SHA drift/ambiguous runs, and receives one JSON receipt in the original invocation. On transport failure no automatic retry or status promotion. Local alternative (same readback, no GitHub action):

    node scripts/platform/federated-healthz.mjs local EXPECTED_MAIN_SHA

Exit 0 is an HTTP SHA claim match only; exit 2 is not proven. No automatic chat push, AcodeX remote execution or Google Shell provisioning is claimed. The existing trusted process adapter must explicitly invoke this CLI when runtime evidence is requested and return the JSON to its originating session; an offline LangGraph worker must not acquire network authority. No arbitrary callback URL. Existing checkpoint transport can retain the sanitized receipt only under its already authorized task binding. CI/federated execution and originating-chat delivery need real readback; no additional CI budget authorization is implied. Rollback: revert this change, no persistent service or credential to remove.
