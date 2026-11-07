# YouTube verification demo upload

Owner request: 2026-11-06. Base main: 3e42cdedc9de16a37b749535a5a60e9fbd3edf4f.

## What changes

The existing Google Cloud Operator keeps `readback` as its default operation. An explicit
`upload-youtube-demo` operation uses channel-owner OAuth to upload approved MP4 bytes
as **unlisted**, verifies the exact owner channel, and records actual provider visibility.
It does not expand the Cloud service account's IAM permissions or submit OAuth review.
A YouTube service-account token cannot replace channel-owner OAuth.

## Prerequisites — not provisioned or verified in this change

- Environment `youtube-verification` with environment secrets `YOUTUBE_OAUTH_CLIENT_ID`,
  `YOUTUBE_OAUTH_CLIENT_SECRET`, `YOUTUBE_OAUTH_REFRESH_TOKEN`, from the verified channel
  owner's explicit OAuth grant for this app and youtube.readonly + youtube.upload.
  Do not paste secrets in chat, commits, workflow inputs, logs or artifacts. Do not export
  Supabase service-role credentials or the production vault encryption key to Actions.
- An approved same-repository Actions artifact named `youtube-verification-media`, containing
  only `demo.mp4.enc` at its root. Source must be a successful manual main workflow in the same
  repository. Staging is not wired yet. The local sealing command below prepares the ciphertext.
  Provision `YOUTUBE_DEMO_MEDIA_KEY` as an independent 256-bit random key (64 lowercase hex
  characters) in the protected environment and the authorized local sealing process. A repository
  reader can download Actions artifacts, so plaintext media must stay outside artifacts and git.
- The exact MP4 SHA-256 is supplied with its artifact ID at dispatch. The uploader checks bytes
  after authenticated decryption and before persisting an upload claim or making an OAuth request.
  The upload decrypts in memory. No arbitrary remote download URL is accepted.

    node scripts/platform/youtube-verification-media.mjs /private/path/demo.mp4 /private/path/demo.mp4.enc

The command takes `DEMO_SHA256` and `YOUTUBE_DEMO_MEDIA_KEY` from the environment.

These prerequisites block production upload and opening an implementation PR under AGENTS.md.
No production upload, OAuth secret export, IAM write or review submission has occurred.

## Duplicate protection and recovery

One repository-wide operator concurrency group serializes runs. Prior claims for the same digest
are checked before creating a claim artifact; rerun attempts are rejected. A claim artifact is
persisted before YouTube insert. An uncertain insert is never retried automatically. The receipt
is checkpointed immediately after the video ID is returned, before readback. Preserve claim and
receipt artifacts (90 days); after expiry/deletion this is **not indefinite duplicate protection**.
An owner must reconcile an uncertain outcome in YouTube Studio before any deliberate new dispatch.
No workflow deletes claims or removes a duplicate protection block automatically.

The current private-test endpoint intentionally requires `private`. An owner's later switch to
`unlisted` produces `private_readback_mismatch`; do not weaken or silently relabel that endpoint.

## Demo and verification limits

The approved Drive demo begins with the 2026-11-07 English Google consent screen and the
authenticated app return showing both YouTube scopes. Earlier upload and Studio recordings are
labelled as separate sessions. The owner confirmed this file as the prototype input.
SHA-256: `c9cef2b66e7a80ed37b124fd3d21b29c4ae3a2bfd9b627b0acc6c910e6a2831f`.

Submission remains distinct from upload: enter the accessible new demo URL and current privacy
URL into Google's verification process / reply to the existing verification request as directed.
A successful upload does not restart review by itself.

Sources checked 2026-11-06:
- https://support.google.com/cloud/answer/13804565?hl=en
- https://support.google.com/cloud/answer/13461325?hl=en
- https://developers.google.com/youtube/data/guides/authentication

## Validation

39 source-only Google maintenance, existing operator, uploader and preflight tests PASS.
YAML parsing and git diff whitespace checks PASS. No live credentialed upload test.
New tests are wired into the existing Google Maintenance PR workflow, not a new required gate.
