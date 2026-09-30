# OpenSSL package-resolution fix — 2026-09-30

The Render build failed in runtime step 9/9: exact OpenSSL pins requested
3.5.8-r0, while that step's package index offered 3.5.7-r0. The build stage had
already completed, so independent package resolution in two stages can diverge.
The logs do not establish whether this came from a cache, mirror or repository
configuration. It is not evidence of an attack.

## Change

A digest-pinned `crypto-base` installs libcrypto3 and libssl3 once. Both build and
runtime inherit the resulting layer. The package constraints retain the existing
security floor of 3.5.8-r0 while allowing newer stable-branch patches. No extra
mirror, edge repository, branch replacement or unsigned package is introduced.
An index offering only 3.5.7 continues to fail closed. Resolved package versions
are printed in the build log. Exact byte-for-byte rebuild reproducibility is not
claimed: the immutable published image digest remains the release identity.

## Four validation steps

1. Check the Dockerfile: one OpenSSL installation; both stages inherit it;
   original Node digest, unprivileged UID, read-only application files, removed
   package managers and MTA-STS endpoint remain present. Local structural check passed.
2. Run the existing manual Docker Build Sicherheit workflow on merged main.
   Require successful HIGH/CRITICAL vulnerability, secret and configuration gates.
   The minimum version alone is not evidence of a vulnerability-free image.
3. Perform the authorized manual Render deploy. Inspect resolved package versions,
   successful runtime startup and the exact deployed source. Build and runtime now
   share the OpenSSL layer. If resolution still fails, inspect the base image's
   /etc/apk/repositories and mirror/index freshness; do not lower the floor.
4. Rerun IONOS Domain Inventory: require health and exact plain-text MTA-STS
   probes to pass before domain binding and DNS cutover. Preserve captured rollback
   records and validate login/TLS before directing production traffic.

## Verification limits

Docker is unavailable in the current execution workspace. No container build,
CVE scan or production success is claimed by the local structural check.
The previous domain inventory reported health=PASS and MTA-STS=HTTP 404.

Sources checked on 2026-09-30:
- https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/libcrypto3
- https://pkgs.alpinelinux.org/package/v3.23/main/x86_64/libssl3
The live official package page showed 3.5.9-r0, while search snippets still showed
3.5.8-r0. This supports accepting newer patches rather than assuming exact patch
availability in a changing index; it does not establish Render's exact Alpine branch.
