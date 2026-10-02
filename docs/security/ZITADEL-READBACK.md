# ZITADEL Policy/OIDC/Passkey Readback

Der Workflow `.github/workflows/zitadel-readback.yml` ist ein read-only Trust-Gate. Er liest keine Benutzerlisten und veröffentlicht keine Credentials.

## Nachweis

- OIDC Discovery: kanonischer Issuer und PKCE S256.
- Login Policy über ZITADEL Settings API v2: Registrierung, lokale Anmeldung, MFA, Passwort-Reset und `passkeysType`.
- OIDC Application: Redirect-URIs bleiben auf den freigegebenen CAPITAL-AI Origins.
- Service-Account-Authentifizierung wird getrennt vom Policy-/App-Readback nachgewiesen.
- Fehlende Credentials, IDs, Rechte oder unerwartete Origins führen zu `BLOCKED`.

## Konfiguration

Bevor der manuelle Workflow produktiv ausgeführt wird, müssen die **bereits tatsächlich eingerichteten** ZITADEL-Identitäten auf die folgenden GitHub-Namen abgebildet werden:

- Secret `ZITADEL_SERVICE_PAT` **oder** `ZITADEL_SERVICE_CLIENT_ID` + `ZITADEL_SERVICE_CLIENT_SECRET`
- Variable `ZITADEL_PROJECT_ID`
- Variable `ZITADEL_APP_ID`

Es wird kein Credential aus `OIDC_CLIENT_SECRET` abgeleitet. Der Reader benötigt mindestens die für den Settings-Read dokumentierte Berechtigung `policy.read` sowie Leserechte auf die Zielanwendung. Least Privilege ist gegenüber Owner-/IAM-Vollrechten zu bevorzugen.

Der Workflow wird nicht automatisch auf `push` ausgeführt. Erst nach einem erfolgreichen echten Readback und drei positiven Validierungszyklen darf eine dauerhafte Self-Healing-/Cadence-Regel erwogen werden.
