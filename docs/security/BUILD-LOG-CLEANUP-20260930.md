# Render build log corrections (2026-09-30)

The successful Render deployment echoed inline test JavaScript containing
`console.error` and classified that command as an error. The command is now
a file-backed runner. It still fails the build on suite failures or exceptions
and reports failures from all three validation suites.

The redundant `apk info -v` lookup after `apk add --no-cache` caused warnings
about absent cached indexes. Remove that lookup; the install already prints
resolved versions. Keep the OpenSSL >=3.5.8-r0 security floor and shared base.

Vite 8/Rolldown splits application and vendor modules with size targets rather
than raising the warning threshold. The final local build's largest JS asset
is 326.20 kB; no oversized-chunk warning remains. This partitions eager code
for caching and parallel downloads; it does not make routes load lazily.

Add the new runner and existing MTA-STS files to the Docker context allowlist.

## Validation

- `npm ci --ignore-scripts --no-audit --no-fund`
- `npm run lint` and `npm test`
- Analysis foundation: all 20 assertions pass when run directly with tsx.
- Docker context: 2 tests; MTA-STS: 4; license evidence: 8; frontend security: 2.
- `npm run build` and browser-boundary validation: PASS, 26 JS/HTML files.
- `git diff --check`

Local license fixtures require TMPDIR under the writable workspace. No full
Docker image build or browser smoke test of the new chunks has run here.
Merge and Render deployment remain manual.

## Remaining upstream warning

`node-domexception@1.0.0` is pulled through @google/genai@2.24.0 ->
google-auth-library@10.9.1 -> gaxios@7.3.1 -> node-fetch@3.3.2 -> fetch-blob@3.2.0.
The latest available Google SDK is already installed. The warning remains;
no warning suppression or incompatible dependency override is introduced.

## Authentication observation

After the user's environment-variable deployment, the new onrender login button
is enabled. No app warning/error entries appeared in the queried runtime logs
since 09:50 UTC. Browser policy blocked following the login button, so an
end-to-end sign-in and token exchange have not been verified. No ZITADEL
administrative settings or DNS records were changed by this patch.
