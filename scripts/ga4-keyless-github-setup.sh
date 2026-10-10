#!/usr/bin/env bash
# CAPITAL_AI_KEYLESS_GA4_SETUP@1
# No Google service-account JSON keys; project-level IAM not modified.
# audit (default): read-only; configure: explicitly writes three non-secret GitHub repository variables.
set -Eeuo pipefail
set +x

PROJECT="aifinancial-500208"
REPO="SvenKulessa/Capital-AI"
POOL="capital-ai-github-read"
PROVIDER="capital-ai-dispatch"
SA="capital-ai-google-audit@${PROJECT}.iam.gserviceaccount.com"
MODE="${1:-audit}"

if [[ "$MODE" != "audit" && "$MODE" != "configure" ]]; then
  echo "Usage: bash scripts/ga4-keyless-github-setup.sh [audit|configure]" >&2
  exit 2
fi

for command_name in gcloud grep; do
  command -v "$command_name" >/dev/null || { echo "Missing tool: $command_name" >&2; exit 1; }
done

ACTIVE_PROJECT="$(gcloud config get-value project 2>/dev/null)"
if [[ "$ACTIVE_PROJECT" != "$PROJECT" ]]; then
  echo "Set project first: gcloud config set project $PROJECT" >&2
  exit 1
fi

EXPECTED_RESOURCE="projects/542877602707/locations/global/workloadIdentityPools/$POOL/providers/$PROVIDER"
RESOURCE="$(gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" --project="$PROJECT" --format='value(name)')"
[[ "$RESOURCE" == "$EXPECTED_RESOURCE" ]] || { echo "Unexpected OIDC provider or project number" >&2; exit 1; }

ISSUER="$(gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" --project="$PROJECT" --format='value(oidc.issuerUri)')"
CONDITION="$(gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" --project="$PROJECT" --format='value(attributeCondition)')"
DISABLED="$(gcloud iam workload-identity-pools providers describe "$PROVIDER" --location=global --workload-identity-pool="$POOL" --project="$PROJECT" --format='value(disabled)')"

[[ "$ISSUER" == "https://token.actions.githubusercontent.com" ]] || { echo "Unexpected OIDC issuer" >&2; exit 1; }
[[ "$DISABLED" != True && "$DISABLED" != true ]] || { echo "OIDC provider disabled" >&2; exit 1; }
[[ "$CONDITION" == *"SvenKulessa/Capital-AI"* && "$CONDITION" == *"refs/heads/main"* ]] || {
  echo "OIDC provider condition must restrict exact repository AND refs/heads/main" >&2
  exit 1
}

FOUND_SA="$(gcloud iam service-accounts describe "$SA" --project="$PROJECT" --format='value(email)')"
[[ "$FOUND_SA" == "$SA" ]] || { echo "Expected GA4 reader service account not found" >&2; exit 1; }

echo "Verified provider issuer, repository/main restriction, and reader identity."
echo "Review the exact provider attribute condition and service-account roles before first live execution."

ENABLED="$(gcloud services list --enabled --project="$PROJECT" --format='value(config.name)')"
for API in analyticsadmin analyticsdata iamcredentials sts; do
  if ! grep -Fxq "$API.googleapis.com" <<< "$ENABLED"; then
    echo "Missing Google API: $API.googleapis.com" >&2
    echo "Operator-only fix (requires serviceusage.services.enable): gcloud services enable $API.googleapis.com --project=$PROJECT" >&2
    exit 1
  fi
done
echo "Required GA4 and identity APIs enabled."

if [[ "$MODE" == "audit" ]]; then
  echo "AUDIT_ONLY: no Google/GitHub settings changed."
  exit 0
fi

command -v gh >/dev/null || { echo "GitHub CLI (gh) is not installed; use GitHub Settings > Actions > Variables instead." >&2; exit 1; }
gh auth status >/dev/null

if [[ -z "${GA4_PROPERTY_ID:-}" ]]; then
  read -rp "Numerische GA4-Property-ID (NICHT die G-Measurement-ID): " GA4_PROPERTY_ID
fi
[[ "$GA4_PROPERTY_ID" =~ ^[1-9][0-9]{0,19}$ ]] || { echo "Invalid GA4 property number" >&2; exit 1; }

echo "Will configure three non-secret Actions variables in $REPO. No Google key created."
read -rp "Confirm by typing: GA4 OIDC $PROJECT : " CONFIRM
[[ "$CONFIRM" == "GA4 OIDC $PROJECT" ]] || { echo "Cancelled" >&2; exit 1; }

gh variable set GCP_WORKLOAD_IDENTITY_PROVIDER -R "$REPO" --body "$RESOURCE"
gh variable set GCP_GOOGLE_READER_SERVICE_ACCOUNT -R "$REPO" --body "$SA"
gh variable set GA4_PROPERTY_ID -R "$REPO" --body "$GA4_PROPERTY_ID"
echo "GITHUB_VARIABLES_CONFIGURED: run Google Readback (readonly) from main, target=ga4."
