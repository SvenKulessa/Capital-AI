# YouTube verification demo upload through Workload Identity Federation

The Google Cloud Operator retains `readback` as its default manual operation.
The separate `upload-youtube-demo` job reads one approved demo object generation
with GitHub OIDC and uploads the verified MP4 to the owner channel as unlisted.
The YouTube call uses channel-owner OAuth rather than the Cloud access token.

## Bootstrap the dispatch

1. In project `aifinancial-500208`, provision the dedicated service account
   `capital-ai-youtube-demo@aifinancial-500208.iam.gserviceaccount.com`. Reuse the
   existing pool and provider `capital-ai-github-admin`. Verify that the provider
   requires repository ID `1293009324`, branch `main`, event `workflow_dispatch`
   and the exact `.github/workflows/google-cloud-admin.yml` workflow ref.
2. Bind `roles/iam.workloadIdentityUser` on the dedicated service account to the
   exact GitHub OIDC subject for environment `youtube-verification`. With the
   default GitHub subject format and the current `google.subject=assertion.sub`
   mapping, the member is:
   `principal://iam.googleapis.com/projects/542877602707/locations/global/workloadIdentityPools/capital-ai-github-admin/subject/repo:SvenKulessa/Capital-AI:environment:youtube-verification`.
   Verify the actual subject configuration before applying the binding. Restrict
   the environment to `main`. A negative test must deny the non-environment
   readback job and unrelated repository or workflow identities.
3. Use a private Cloud Storage bucket with uniform bucket-level access and public
   access prevention. Grant the dedicated account only `storage.objects.get`
   through a conditional bucket binding limited to
   `projects/_/buckets/<bucket>/objects/youtube-verification/demo.mp4.enc`.
   The trusted staging principal writes this object separately. The operator's
   Cloud token has the short-lived `devstorage.read_only` scope.
4. Set environment variables `YOUTUBE_DEMO_BUCKET` and `YOUTUBE_DEMO_SHA256` in
   the GitHub environment `youtube-verification`. Store environment secrets
   `YOUTUBE_OAUTH_CLIENT_ID`, `YOUTUBE_OAUTH_CLIENT_SECRET`,
   `YOUTUBE_OAUTH_REFRESH_TOKEN` and `YOUTUBE_DEMO_MEDIA_KEY` there. The OAuth
   grant must be for the intended channel with `youtube.readonly` and
   `youtube.upload`. The media key is independent random 256-bit key material
   encoded as 64 lowercase hex characters. Use the same key only in the trusted
   local sealing process and this protected environment. Keep a private copy for
   opening the encrypted receipt.
5. Seal the approved MP4 locally, then stage the ciphertext at the fixed private
   object path and record its Cloud Storage generation. The sealing command
   reads `DEMO_SHA256` and `YOUTUBE_DEMO_MEDIA_KEY` from its environment.

       node scripts/platform/youtube-verification-media.mjs /private/path/demo.mp4 /private/path/demo.mp4.enc

6. After the workflow is on `main`, choose **Run workflow** and
   `operation=upload-youtube-demo`. Supply `media_object_generation` and
   `media_sha256`. The approved digest must match the dispatch input. The job
   requests exactly that generation, authenticates and decrypts the envelope,
   checks the plaintext SHA-256, and verifies the expected owner channel before
   any insert.

The prepared code requires the actual IAM bindings, private bucket and object,
and GitHub environment values. Verify those separately. No media bytes or
plaintext receipt should be staged in GitHub artifacts or committed to Git.

## Receipt, duplicate handling and review

One repository-wide operator concurrency group serializes runs. A prior claim
for the same digest stops the job and reruns are rejected. The claim is persisted
before the YouTube insert. An ambiguous insert requires reconciliation in
YouTube Studio before any deliberate retry. Claim and receipt retention is 90
days. The job records actual provider visibility and processing status.

The receipt is encrypted. Download and open it locally using the retained key
in `YOUTUBE_DEMO_MEDIA_KEY`. The encrypted receipt contains the video URL and
channel readback; public workflow logs report only status.

    node scripts/platform/youtube-verification-media.mjs --open-receipt /private/path/youtube-upload-receipt.enc

Once YouTube finishes processing, check playback of the returned unlisted URL
and enter it with the privacy URL in the Google OAuth verification process.

## Prototype input and evidence

The owner-confirmed Drive demo shows the English consent and the connected
channel with both scopes on 2026-11-07. Earlier upload and Studio footage is
labelled as separate sessions. Approved plaintext SHA-256:
`c9cef2b66e7a80ed37b124fd3d21b29c4ae3a2bfd9b627b0acc6c910e6a2831f`.

References: [GitHub OIDC claims](https://docs.github.com/en/actions/reference/security/oidc),
[Google WIF](https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines),
[Cloud Storage object read](https://cloud.google.com/storage/docs/json_api/v1/objects/get),
[YouTube upload](https://developers.google.com/youtube/v3/docs/videos/insert).
