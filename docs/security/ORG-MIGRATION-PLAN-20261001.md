# Migrationsplan: SvenKulessa/Capital-AI → capital-ai-online/Capital-AI

Stand: 01.10.2026, `main@2150643dae8190fb2f8cd496072a7cc2baa89cfe` (PR #73). Status: vorbereitet, **kein Transfer und keine Konfigurationsänderung ausgeführt**. Primary Domain PLATFORM; TRUST für App-Rechte, Secret-Verwendung, Policies und Identitäts-/Handoff-Verträge.

## Zugriff zuerst klären

Der aktuelle Render-Connector authentifiziert erfolgreich für AICapital/Capital-AI. Er besitzt keine lesende Env-Var-Aktion und keinen frei verwendbaren HTTP-Adapter. Der verbundene API-Key ist nicht als Shell-Credential verfügbar. Der bereits vorhandene Workflow `render-cli-readonly.yml` nutzt `secrets.RENDER_API_KEY_TEST` innerhalb Actions und liest Render-Env-Variablen vertraulich. Sein OIDC-Diagnoseskript prüft nur Loginclient-Konfiguration; noch kein authentifizierter ZITADEL-Service-Account-Reader.

Ein Transfer ist **keine technische Voraussetzung** für diesen Workflow. Eine eigene App kann auch am persönlichen Repo installiert werden, wenn das konkrete App-/Connector-Modell dies unterstützt. Ob die vorhandene Organisations-App dafür geeignet ist, ist noch nicht verifiziert. Die Dateien `finance/scripts/operations/githubManagementSettingsScopeAdapter.mjs` und `githubWorkManagementGatewayAdapter.mjs` sind mögliche wiederverwendbare Implementierungsvorbilder, keine Bestätigung eines in dieser Sitzung aufrufbaren Live-Adapters.

GitHub Secrets-APIs liefern Secret-Metadaten, keine gespeicherten Werte. Auch eine GitHub App kann sie nicht entschlüsseln. Der Adapter soll einen fest definierten Check auf einem vertrauenswürdigen Ref im Actions-/Laufzeitkontext starten und nur einen redigierten Bericht zurückgeben. Er darf keine Secretwerte, PATs, privaten Schlüssel, Client-Secrets oder Benutzerlisten als Toolantwort/Artefakt veröffentlichen.

Der ZITADEL-Reader muss zunächst vorhandene Secret-Namen und den Credential-Typ im erlaubten Kontext feststellen. Keine angenommenen `ZITADEL_*`-Namen hinzufügen und OIDC_CLIENT_SECRET nicht als Service-Account-Credential behandeln. PAT, private-key JWT oder client credentials gemäß tatsächlichem Account verwenden; Authentifizierung und API-Leseberechtigung getrennt melden. ZITADEL-SMTP ist separat von App-SMTP zu prüfen.

## Änderungsmatrix

| Bereich | Ausgangspunkt | Ziel / konkrete Änderung | Abnahme |
|---|---|---|---|
| Git-Remote / GitHub-API | `SvenKulessa/Capital-AI` | `capital-ai-online/Capital-AI`; lokale Remotes, API-URLs und App-Allowlist aktualisieren | Repo-ID bleibt korreliert; neuer Owner und public bestätigt |
| Workflow-Guards | `build-security.yml`, `render-cli-readonly.yml`, `ionos-domain-inventory.yml`: harter Repositoryvergleich | Nach Transfer nur exakt neues Repo zulassen; Vorbereitung vorab mit explizitem Umschaltplan, kein beliebiger Owner | Publish/Readback auf neuem Main möglich, fremdes Repo abgewiesen |
| GHCR-Publish | `IMAGE_REPOSITORY`, Regex und subject-name auf `ghcr.io/svenkulessa/capital-ai` | Neues Paket `ghcr.io/capital-ai-online/capital-ai`; Packages-Schreibrechte und Repo-Verknüpfung separat prüfen | Digest-/Manifest-/Attestation-Verifikation für neues Paket |
| Render-Bootstrap | `deploy/render-image-profile.json`, `prepare-render-image.test.mjs` | Expliziten neuen Image-Namespace in Profil/Validator/Tests übernehmen | Mutable Tags und fremde Namespaces weiter abgewiesen |
| Attestations | build-security.yml: `--repo`, `--signer-workflow`, GitHub-API-Pfade | Neue Repo-/Signeridentität; OCI Source-Labels und Attestation-Subjects prüfen | Neuer Kandidat tatsächlich im neuen Repo signiert, gleicher Source/Digest |
| Runtime-Identität | `write-runtime-identity.mjs`, `server/index.mjs`, `server/security.test.mjs` | Builder `capital-ai-online/Capital-AI/.github/workflows/build-security.yml` konsistent erzeugen/prüfen | `bound=true` mit neuem Builder und exaktem Kandidaten-SHA |
| Production-Handoff | `verify-production-handoff.mjs`, `production-handoff.test.mjs`: Image-, Builder- und Evidence-URL-Verträge | Neue Identität für neue Kandidaten; alte Nachweise bleiben historische Generation | Falscher Namespace/Builder/Source/Manifest und alte Analyseergebnisse blockieren weiterhin |
| Main-/Analyse-/Ruleset-Reader | Harte `repos/SvenKulessa/Capital-AI/...`-Pfade | Neue Endpunkte, effektive Repo-/Org-/Enterprise-Regeln inklusive Check-App-Herkunft lesen | Strict Checks, lineare Historie, CodeQL/Quality und kein unerlaubter Bypass |
| NATS | `deploy/render-nats.yaml` und Render-Service-Repo | Repo-Verknüpfung auf neues Repo, gleicher Zielservice und Disk | Kein pauschaler Broker-Deploy beim Transfer; bestehende Streams bleiben erhalten |
| App-/Adapter | Organisationsinstallation und ausgewählte Repositories ungeprüft | App dem neuen Repo ausdrücklich zuordnen; Webhook-/Installation-ID und genaue Endpunkte prüfen | Begrenzte Leserechte; Dispatch optional getrennt freigeben; kein Secret-Export |
| Secrets / Variablen / Environments | Repo-Secrets sowie Org-Zugriffslisten | Namen, Ebene, Zugriff und Environment-Regeln inventarisieren; Org-Secrets für dieses Repo ausdrücklich erlauben | Geheimnisse werden nur im vorgesehenen Job injiziert; keine Abschwächung von Reviews/SSO |
| Render-Credentials | Workspace AICapital, Registrycredential `ghcr-capital-ai` | Zugriff auf neues GHCR-Paket bestätigen, Credential nur bei Bedarf ersetzen | Kein 401/403 beim Pull des neuen exakten Digests |
| Roadmap / aktuelle Dokumentation | Snapshot repository und aktuelle Links | Repositoryfeld und neue aktive Referenzen aktualisieren | Quellenlinks zum passenden neuen Snapshot; historische Evidence unverändert |
| App-Routen / Domain / OIDC | `/api/auth/callback`, `/api/privacy/export`, `/healthz`, App-Origin und ZITADEL-Issuer | Repository-Transfer allein erfordert keine Änderung dieser HTTP-Pfade oder des Issuers | Bei separatem Domain-Cutover Callback-/Logout-/Origin- und TLS-Konfiguration prüfen |

Diese Matrix ist anhand des aktuellen Codes erstellt. Vor Umsetzung Repo-weites `rg` erneut ausführen, auch für neu hinzugekommene Dateien. Keine globale Textersetzung in archivierten Kandidaten, Attestations, Lizenz-SHAs oder Run-/Deploy-Nachweisen: Sie belegen die tatsächlich damalige Identität.

## Reihenfolge und Rückweg

1. **Inventar und Zugriffe:** Zielorganisation/Enterprise-Typ, public-Unterstützung, Namensfreiheit, Transferberechtigung und Org-Policies bestätigen. App und Adapter inventarisieren; Secret-Metadaten/Variablen-/Environment-Zuordnung ohne Werte sichern. Alten GHCR-Digest, aktive Deploy-ID, Source und Registry-Zugriff dokumentieren. Freigegebenen alten Digest als Runtime-Rückweg erhalten.
2. **Vorbereitung:** Begrenzten Migrations-PR für die oben genannten Guards/Signer/Runtime-/Handoff-Verträge erstellen und Tests mit neuer sowie fremder/alter Identität prüfen. Geplante bestehende Reihenfolge ist weiterhin Digest-, Domain-/Auth-/Mail-/Altdatenabnahme, Finance-Ablösung, danach Organisationswechsel. Ein früherer Repo-Transfer wäre ein gesondert beschlossener Planwechsel; er schaltet keine Domain um.
3. **Transferfenster:** Ausstehende Release-/Publish-Aufträge pausieren und exakten Main festhalten; Repo unverändert public übertragen; tatsächlichen Owner und Repo-ID neu lesen. Vorbereiteten Code auf verifiziertem neuen Owner aktivieren. Org-App installieren/Repo-Zugriff erteilen, geerbte Regeln und Actions-Allowlist prüfen. Kein blinder CI-Rerun oder automatischer Deploy durch den Transfer.
4. **Neue Artefaktgeneration:** Nach Vertrags-/Lizenz-/Security-Abnahme neuen Kandidaten einmal unter neuem Namespace bauen/publishen. Source, Builder, OCI-Index, Plattform-Manifest, SBOM und Provenance neu verifizieren. Erst danach Render auf genau diesen freigegebenen Digest setzen. Das alte GHCR-Paket wird nicht automatisch als umgezogen angenommen; GitHub weist auf registryspezifisches Transferverhalten hin.
5. **Abnahme:** App-/Adapter-Readbacks, Required Checks, Runtime-Source/Builder/Digest, Login/Logout/Export und nötigen Mailfluss prüfen. Org-Secrets-Zugriff mit festen Jobs verifizieren; fehlende Abdeckung offen lassen. Nach drei unabhängigen positiven Zyklen erst begrenzte wiederkehrende Diagnose-/Driftregeln automatisieren.

Rollback vor neuem Deploy: alte Render-Digestreferenz bleibt unverändert erreichbar. Rollback nach Deployment nur auf einen weiterhin zugänglichen und aktuell freigegebenen Digest; Quellidentität bleibt als historische Generation sichtbar. Repository-Rücktransfer ist eine eigene Administration mit Berechtigungs-/Namensprüfung und darf nicht als automatischer Rückweg vorausgesetzt werden. Alten Repo-Slug nicht neu belegen, damit GitHub-Weiterleitungen erhalten bleiben. DNS und MX/SPF/DKIM/DMARC/MTA-STS werden durch den Repository-Transfer nicht verändert.

## Exit-Nachweise

Abnahmebericht mit Zeit, Owner/Repo-ID, exact Main, Workflow-/App-/Installation-ID, Permissions-Scope, Check-App-IDs, Signer, Index-/Plattform-/Config-Digest, Render-Service/Deploy und Runtime-Identität. Für ZITADEL nur bereinigte Credential-/Policy-/Callback-/SMTP-Prüfergebnisse. Fehlende APIs oder 403 sind kein PASS.

Primärquellen:
- https://docs.github.com/en/repositories/creating-and-managing-repositories/transferring-a-repository
- https://docs.github.com/en/rest/actions/secrets
- https://docs.github.com/en/packages/learn-github-packages/configuring-a-packages-access-control-and-visibility
- https://zitadel.com/docs/guides/integrate/service-accounts/authenticate-service-accounts
