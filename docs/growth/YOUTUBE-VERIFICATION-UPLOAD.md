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
  `demo.mp4` at its root. Source must be a successful manual main workflow in the same repository.
  Media staging is not yet wired: the delivered MP4 is currently available to the owner as a file,
  not as an Actions artifact. Do not publish raw recordings in a public git branch or release.
- The exact MP4 SHA-256 is supplied with its artifact ID at dispatch. The uploader checks bytes
  before any OAuth request. No arbitrary remote download URL is accepted.

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

The edited demo combines the historical 2026-10-13 consent/upload evidence with three new
2026-11-06 recordings. Dates, independent sessions, distinct historical video IDs, and the later
owner-reported unlisted state are labelled explicitly. The historical OAuth consent screen is
German. Google's current demo instructions request English consent UI; English overlay captions
are **not** a replacement for that UI. The assembled video is a review draft pending that gap.
No new November upload is asserted by a GET status check.

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
