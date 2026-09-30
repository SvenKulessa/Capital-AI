# Render CLI access verification

The workflow **Render CLI read-only verification** uses the Actions secret
`RENDER_API_KEY_TEST` as the CLI's `RENDER_API_KEY`. The name does not restrict
the key's permissions; this workflow restricts which commands are executed.

After merge, open Actions, select this workflow, choose **Run workflow** on
**main**. It installs Render CLI 2.28.0 with the official SHA-256 checksum,
selects workspace AICapital (`tea-d90o4rj7uimc739i86ug`), and reads deployments
only for Capital-AI (`srv-dau1rp893c1s73cdhm1g`). A live deployment must exist.

The workflow runs manually, has a three-minute timeout, checks repository and
main branch, requests no GitHub token permissions, and does not check out or
execute repository code with the secret. It neither triggers a deploy nor
changes Render services. Raw API responses, errors, credentials and environment
variables are not published as logs or artifacts. Temporary files are removed.

The CLI download step has no access to the Render secret. The authentication
step uses only the verified binary. The successful GitHub job summary confirms
access; until that job runs, CLI authentication remains unverified.

Render MCP in this ChatGPT conversation is already connected separately. The
Actions secret cannot be read back or transferred to the local CLI.

References:
- https://render.com/docs/cli
- https://github.com/render-oss/cli/releases/tag/v2.28.0
