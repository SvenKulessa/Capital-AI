"""Prepare the one approved demo in an authorized administrator's Cloud Shell."""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile


def require(condition, code):
    if not condition:
        raise ValueError(code)


def command(*args, output=False):
    completed = subprocess.run(args, check=False, capture_output=True, text=True)
    require(completed.returncode == 0, "BOOTSTRAP_COMMAND_FAILED")
    return json.loads(completed.stdout) if output else None


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("media", type=Path)
    parser.add_argument("--apply", action="store_true", help="Bind the prepared identity and stage encrypted media")
    args = parser.parse_args()
    root = Path(__file__).resolve().parent
    project = os.environ.get("YOUTUBE_DEMO_PROJECT_ID", "")
    provider = os.environ.get("YOUTUBE_DEMO_WIF_PROVIDER", "")
    account = os.environ.get("YOUTUBE_DEMO_SERVICE_ACCOUNT", "")
    bucket = os.environ.get("YOUTUBE_DEMO_BUCKET", "")
    role = os.environ.get("YOUTUBE_DEMO_STORAGE_ROLE", "")
    digest = os.environ.get("YOUTUBE_DEMO_SHA256", "")
    env = {**os.environ, "DEMO_SHA256": digest}

    with tempfile.TemporaryDirectory(prefix="capital-ai-private-demo-") as temporary:
        ciphertext = Path(temporary) / "demo.mp4.enc"
        sealed = subprocess.run(
            ["node", str(root / "youtube-verification-media.mjs"), str(args.media), str(ciphertext)],
            env=env, capture_output=True, check=False,
        )
        require(sealed.returncode == 0, "BOOTSTRAP_MEDIA_INVALID")
        if not args.apply:
            print("BOOTSTRAP_MEDIA_CHECK_PASS")
            return

        require(re.fullmatch(r"[a-z][a-z0-9-]{4,28}[a-z0-9]", project), "BOOTSTRAP_PROJECT_INVALID")
        match = re.fullmatch(r"projects/(\d+)/locations/global/workloadIdentityPools/([a-z0-9-]+)/providers/([a-z0-9-]+)", provider)
        require(match, "BOOTSTRAP_PROVIDER_INVALID")
        number, pool, provider_id = match.groups()
        require(account == f"capital-ai-youtube-demo@{project}.iam.gserviceaccount.com", "BOOTSTRAP_ACCOUNT_INVALID")
        require(re.fullmatch(r"[a-z0-9][a-z0-9-]{1,61}[a-z0-9]", bucket), "BOOTSTRAP_BUCKET_INVALID")
        require(re.fullmatch(rf"projects/{re.escape(project)}/roles/[A-Za-z0-9_.]+", role), "BOOTSTRAP_ROLE_INVALID")

        project_info = command("gcloud", "projects", "describe", project, "--format=json", output=True)
        require(str(project_info.get("projectNumber")) == number, "BOOTSTRAP_PROJECT_MISMATCH")
        identity_provider = command(
            "gcloud", "iam", "workload-identity-pools", "providers", "describe", provider_id,
            "--project=" + project, "--location=global", "--workload-identity-pool=" + pool,
            "--format=json", output=True,
        )
        expected = "assertion.repository_id == '1293009324' && assertion.ref == 'refs/heads/main' && assertion.event_name == 'workflow_dispatch' && assertion.workflow_ref == 'SvenKulessa/Capital-AI/.github/workflows/google-cloud-admin.yml@refs/heads/main'"
        require(" ".join(identity_provider.get("attributeCondition", "").split()) == expected, "BOOTSTRAP_PROVIDER_CONDITION_MISMATCH")
        require(identity_provider.get("attributeMapping", {}).get("google.subject") == "assertion.sub", "BOOTSTRAP_SUBJECT_MAPPING_MISMATCH")
        require(identity_provider.get("oidc", {}).get("issuerUri") == "https://token.actions.githubusercontent.com", "BOOTSTRAP_ISSUER_MISMATCH")
        command("gcloud", "iam", "service-accounts", "describe", account, "--project=" + project)
        role_info = command("gcloud", "iam", "roles", "describe", role.rsplit("/", 1)[1], "--project=" + project, "--format=json", output=True)
        require(role_info.get("includedPermissions") == ["storage.objects.get"], "BOOTSTRAP_ROLE_TOO_BROAD")

        bucket_uri = "gs://" + bucket
        bucket_info = command("gcloud", "storage", "buckets", "describe", bucket_uri, "--raw", "--format=json", output=True)
        config = bucket_info.get("iamConfiguration", {})
        require(str(bucket_info.get("projectNumber")) == number, "BOOTSTRAP_BUCKET_PROJECT_MISMATCH")
        require(config.get("uniformBucketLevelAccess", {}).get("enabled") is True and config.get("publicAccessPrevention") == "enforced", "BOOTSTRAP_BUCKET_NOT_PRIVATE")

        object_name = "youtube-verification/demo.mp4.enc"
        object_uri = bucket_uri + "/" + object_name
        # A partial setup can reuse an existing object only after verifying its bytes.
        try:
            object_info = command("gcloud", "storage", "objects", "describe", object_uri, "--raw", "--format=json", output=True)
        except ValueError:
            command("gcloud", "storage", "cp", str(ciphertext), object_uri, "--if-generation-match=0")
            object_info = command("gcloud", "storage", "objects", "describe", object_uri, "--raw", "--format=json", output=True)
        generation = str(object_info.get("generation", ""))
        require(re.fullmatch(r"[1-9][0-9]{0,19}", generation), "BOOTSTRAP_GENERATION_INVALID")
        verification = Path(temporary) / "verification-media"
        verification.mkdir(mode=0o700)
        command("gcloud", "storage", "cp", object_uri + "#" + generation, str(verification / "demo.mp4.enc"))
        verified = subprocess.run(
            ["node", str(root / "youtube-verification-upload.mjs"), "--validate-media"],
            cwd=temporary, env=env, capture_output=True, check=False,
        )
        require(verified.returncode == 0, "BOOTSTRAP_OBJECT_BYTES_MISMATCH")
        resource = f"projects/_/buckets/{bucket}/objects/{object_name}"
        command("gcloud", "storage", "buckets", "add-iam-policy-binding", bucket_uri,
                "--member=serviceAccount:" + account, "--role=" + role,
                f"--condition=title=YouTubeVerificationDemoRead,expression=resource.name=='{resource}'")
        subject = f"principal://iam.googleapis.com/projects/{number}/locations/global/workloadIdentityPools/{pool}/subject/repo:SvenKulessa/Capital-AI:environment:youtube-verification"
        command("gcloud", "iam", "service-accounts", "add-iam-policy-binding", account,
                "--project=" + project, "--member=" + subject, "--role=roles/iam.workloadIdentityUser")
        print("BOOTSTRAP_STAGED_AND_BOUND")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, OSError) as error:
        code = str(error)
        print(code if re.fullmatch(r"BOOTSTRAP_[A-Z_]+", code) else "BOOTSTRAP_STOPPED")
        raise SystemExit(1)
