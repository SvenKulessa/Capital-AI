# YouTube verification demo upload through Workload Identity Federation

The existing operator retains `readback` as its default operation. The separate
`upload-youtube-demo` job reads one approved encrypted object generation using
GitHub OIDC. The upload uses the channel owner's YouTube OAuth grant.

## Prepare the protected environment

1. In the existing Cloud project, prepare a dedicated service account with the
   account ID `capital-ai-youtube-demo` and a project custom role containing
   only `storage.objects.get`. Use a private bucket in that project with uniform
   bucket-level access and public access prevention enforced.
2. Reuse the existing federation provider for the readback workflow. Verify its
   GitHub issuer, subject mapping, repository, branch, event and workflow
   conditions. The bootstrap requires the existing exact condition. Verify the
   repository uses the default environment subject format before applying.
3. Restrict the GitHub environment `youtube-verification` to `main`. Provision
   the following environment secrets. Keep their values out of PRs, workflow
   inputs, logs, screenshots, Git and public issue text.

   | Secret | Value |
   | --- | --- |
   | `YOUTUBE_DEMO_PROJECT_ID` | Existing Cloud project ID |
   | `YOUTUBE_DEMO_WIF_PROVIDER` | Existing full provider resource name |
   | `YOUTUBE_DEMO_SERVICE_ACCOUNT` | Dedicated service account email |
   | `YOUTUBE_DEMO_BUCKET` | Private bucket name |
   | `YOUTUBE_DEMO_OBJECT_GENERATION` | Exact object generation from the staging readback |
   | `YOUTUBE_DEMO_SHA256` | SHA-256 of the approved plaintext MP4 |
   | `YOUTUBE_DEMO_MEDIA_KEY` | Independently generated 256-bit key as 64 lowercase hex characters |
   | `YOUTUBE_EXPECTED_CHANNEL_ID` | Expected owner channel ID |
   | `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET`, `YOUTUBE_OAUTH_REFRESH_TOKEN` | Existing channel-owner grant for YouTube read and upload |

If the dedicated account and project role are missing, create them in the
authenticated Cloud Shell after setting `YOUTUBE_DEMO_PROJECT_ID`.

    gcloud iam service-accounts create capital-ai-youtube-demo --project="$YOUTUBE_DEMO_PROJECT_ID"
    gcloud iam roles create youtubeDemoObjectReader --project="$YOUTUBE_DEMO_PROJECT_ID" --title="YouTube demo object reader" --permissions=storage.objects.get --stage=GA

Set `YOUTUBE_DEMO_STORAGE_ROLE` to
`projects/${YOUTUBE_DEMO_PROJECT_ID}/roles/youtubeDemoObjectReader` when using
this role. Select an existing private bucket that meets the requirements above.

## Stage the confirmed Drive demo

Use an authenticated administrator's Cloud Shell with the approved MP4 in a
private local path. Supply the project, provider, account, bucket, SHA-256 and
media key from the table as protected environment values. Also supply
`YOUTUBE_DEMO_STORAGE_ROLE` as the full name of the object-read custom role.

    python3 scripts/platform/youtube-verification-bootstrap.py /private/path/demo.mp4
    python3 scripts/platform/youtube-verification-bootstrap.py /private/path/demo.mp4 --apply

The first command checks the approved bytes and encrypts them locally. The
second validates the live project, provider, role and bucket, then stages the
ciphertext. It uses a create-only generation precondition. On a partial setup,
it reuses an existing object only when that generation decrypts to the approved
bytes. It adds a conditional read binding for the one object and binds
`roles/iam.workloadIdentityUser` on the dedicated account to the exact environment
subject. Read the generation after successful staging and save it as
`YOUTUBE_DEMO_OBJECT_GENERATION` in the protected GitHub environment.

    gcloud storage objects describe "gs://${YOUTUBE_DEMO_BUCKET}/youtube-verification/demo.mp4.enc" --raw --format='value(generation)'

## Dispatch and verify

Once the reviewed workflow is on `main`, select **Run workflow** and
`operation=upload-youtube-demo`. The job fetches the configured generation,
verifies the plaintext SHA-256 and confirms the expected YouTube channel.
Test that the readback job and unrelated workflows cannot impersonate this
identity before the first production insert.

The workflow serializes runs and persists a claim for this single prototype
before making the insert. The public claim omits media and channel identifiers.
An ambiguous insert requires reconciliation in YouTube Studio before a deliberate
retry. Claim and receipt retention is 90 days. The receipt is encrypted and
contains the actual video link, visibility and processing status.

    node scripts/platform/youtube-verification-media.mjs --open-receipt /private/path/youtube-upload-receipt.enc

Open the receipt locally with the retained media key. After processing, verify
playback of the returned unlisted link and enter it in the Google OAuth
verification process.

References: [GitHub OIDC](https://docs.github.com/en/actions/reference/security/oidc),
[Google WIF](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines),
[Cloud Storage object read](https://cloud.google.com/storage/docs/json_api/v1/objects/get),
[YouTube upload](https://developers.google.com/youtube/v3/docs/videos/insert).
