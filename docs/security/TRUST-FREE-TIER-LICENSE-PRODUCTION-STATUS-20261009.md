# TRUST: Free-Tier-Auth, Lizenzgrenzen und Runtime — überprüfter Status

**Read-only-Snapshot:** 2026-10-09 (Europe/Berlin)  
**Repository-/Prüfbasis:** `SvenKulessa/Capital-AI@fb9fbc41232f1815fc6682d275e1511e9d3ce434`  
**Autorität:** Nur `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`. Dieser Bericht ist **nicht autorisierende Evidence**, kein neues Required Check, keine Freigabe, kein Upgradeauftrag und kein automatischer Produktions-Trigger.

## Entscheidungsmatrix

| Scope | Beobachtung | Entscheidung |
| --- | --- | --- |
| Supabase-Plan / Leaked Password Protection | Organisation meldet `free`; offizielles Supabase-Handbuch ordnet Leaked Password Protection Pro+ zu; Advisor warnt weiterhin | `KNOWN_FREE_TIER_LIMITATION`; kein Upgrade, kein kostenpflichtiger Ersatz, keine vorgetäuschte Aktivierung |
| Auth-Registrierung/TOTP | Bereits bestehende bestätigte User und mindestens ein verifizierter/herausgeforderter TOTP-Faktor aggregiert nachweisbar | `PARTIAL`; echte neue Registrierung, Mail-Redirect, Enrollment, AAL2 und sign-in/out je Tenant noch `NOT_PROVEN` |
| Private BYOK-Tenant-Grenze | `private.user_analysis_bindings` und `private.user_provider_connections`: RLS aktiv, weder anon noch authenticated haben direkten Tabellen-SELECT; Service-Role benötigt serverseitige Session-Prüfung | `VERIFIED` für SQL-Privilegien; Zwei-Nutzer-HTTP-/Bridge-E2E weiterhin `NOT_PROVEN` |
| Private Scoring-Ausführung | `private.user_analysis_bindings.execution_enabled = false` als Live-CHECK; keine produktiven Nutzerbindungen im geprüften Snapshot | `BLOCKED` für Nutzer-BYOK-Scoring |
| Reviewer PR #247, Debian | historisch weiterhin 44 HIGH-OS-CVEs, kein Fix-Suppressionsansatz | Debian-Variante `BLOCKED` |
| Reviewer PR #247, Alpine | separater Alpine-3.24.2-Kandidat: lock/import/offline-smoke/Trivy/SBOM erfolgreich, 0 CVEs/Secrets; aktueller PR-Head `c35088dc925cb7c93818022ee22f68f09851a3db` mit erfolgreichen hosted Workflows | `VERIFIED_CANDIDATE_ONLY`; OAuth, Modellaufrufe, Qualitätsbenchmark, Token-/Kostenbeleg `NOT_PROVEN`, PR offen |
| Stripe Preisbindung | Migration `20261009104641_enforce_subscription_price_authority` in DB registriert; isolierte PL/pgSQL-Evidence dokumentiert 67 Assertions | `VERIFIED` für Migrationsstand und isolierte Assertions |
| Stripe 6 Sandbox-Käufe | Vorhandene Inbox-Ereignisse sind ausschließlich ältere `livemode=true`-Receipts, **keine** aktuellen sechs Sandbox-Ketten | `NOT_PROVEN`; Checkout→Event→Inbox→Entitlement→RPC pro Tarif, concurrent/retry offen |
| Webservice/Deploy | Render `Capital-AI` ist Git-backed (`main`, `checksPass`); Live-Deploy für Source `fb9fbc4...` durch Render gemeldet | `DEPLOY_VERIFIED` im providerseitigen Commit-/Build-/Deploy-Scope |
| HTTP-Laufzeitidentität | Kein direkter authentischer aktueller `/healthz`-Response im geprüften Readback; externe Abrufe in dieser Prüfumgebung scheiterten | `NOT_PROVEN`; nicht aus „live“ oder einem alten Log-SHA ableiten |
| Image-basierter GHCR-Handoff | Bestehender Git-Docker-Service, kein neuer veröffentlichter/attestierter Current-Main-GHCR-Digest zur Umstellung; optionaler Produktions-Handoff nicht durchlaufen | `NOT_PROVEN`; nur schließen, **falls** ein Image-backed-Cutover tatsächlich vorgesehen ist |

**Herkunft/Prüfmethoden:** Read-only GitHub PR-/Workflow-Readbacks, Render `list_services/list_deploys/list_events/list_logs`, Supabase `get_organization/get_advisors/list_migrations/execute_sql` (nur `SELECT`), offizielle Supabase/Massive-Handbücher. Der Chat, in dem die Live-Readbacks stattfanden, enthält die Detailnachweise. **Keine persönlichen Datensätze, E-Mail-Adressen, Secret-Werte, Nutzer-IDs oder Zahlungs-Events wurden in diese öffentlich lesbare Datei übernommen.**

## Free Tier: konkrete, kostenlose bzw. kostenarme Kompensation

Die Einschränkung **nicht** mit Fake-Status „FIXED“ behandeln. Maßnahmen ausschließlich auf vorhandene Fähigkeiten und nachweisbare Wirkung beziehen:

1. Supabase Auth: konfigurierte Mindestpasswortlänge/Komplexität, Sign-up-/Login-/Reset-/Verification-Ratenlimits **read-only** ermitteln; was nicht zurückgelesen ist, bleibt `NOT_PROVEN`.
2. Vorhandenes E-Mail-Confirm, TOTP (AAL2), HttpOnly Secure Cookies, PKCE/CSRF und Lockout-/Limiter-Pfade testen; keine erzwungene MFA-Aktivierung ohne UX-E2E.
3. Bei tatsächlich belegtem Bot-/Bruteforce-Problem Cloudflare Turnstile/hCaptcha als separate, auch auf Freikontingenten verfügbare Option prüfen (CAPTCHA-Integrationskosten/Limits/Datenschutz separat); keine sofortige Aktivierung.
4. Keine Zusatzkosten, keine Free→Pro-Migration, kein neuer Dienst, keine Auth-Konfigurationsmutation auf Basis dieses Snapshots.

**Primärquellen:**  
- https://supabase.com/docs/guides/auth/password-security (Leaked Password Protection: Pro+)  
- https://supabase.com/docs/guides/auth/rate-limits  
- https://supabase.com/docs/guides/auth/auth-captcha

## Lizenz-Delta — kein automatisches Upgrade auf APPROVED

Die kanonische ältere `docs/security/evidence/license-rights-review.json` bleibt absichtlich unverändert:

- `status: REVIEW_OPEN`
- `deployEligible: false`
- `applicationSourceSha: ed594ef93f66ee8f13f67d75dde56f46a95b1cd6`
- `reviewDate: 2026-09-30`

Ihre alten Binär- und Rechtebelege sind **nicht** auf `fb9fbc4...` zu übertragen. Das neue Datum in diesem Statusbericht ist lediglich ein **Snapshot-Zeitpunkt**, **keine** neue Bild-/Font-/Modell-/OSS-/OS-Redistribution-Freigabe. Ein Digest für das aktuelle, Git-backed-Render-Image wird nicht erfunden.

### Rechtekatalog für tatsächlich vermarktbare Bausteine

| Gegenstand | Referenz/Bestand | Rechte-/Produktkategorie | Lizenz-/IP-Status |
| --- | --- | --- | --- |
| Mathematische Score-Implementierungen | `src/services/scoringEngine.ts`, `src/platform/FinanceScoringResearch/FinanceSourceModelCatalog.ts` | Potenziell eigenständige proprietäre Mathematik | Herkunfts- und Rechtekette der aus Finance übernommenen Bestandteile, Originalmodelle, Autorenbeiträge, Formelherkunft und Kundenlizenz **nicht pauschal bewiesen** |
| Private BYOK-/BYOM-Konfiguration | `server/user-provider-vault.mjs`, `server/user-analysis-bindings.mjs` | Eigenes Plattformprodukt + Nutzerschlüssel | Technischer Pfad vorhanden; externe Daten-/Modell-Hosting-/Nutzungsrechte bleiben getrennt |
| CADS / Benchmark / App-Komponenten | `packages/benchmark-core`, `server/cads-marketplace.mjs`, `docs/licenses/CADS-PRODUCT-LICENSE.md` | Eigenes B2B-Produkt mit OSS-Runtime | Eigene Produktlizenz ersetzt weder OSS-Notices noch Hosted-E2E/Marketplace-Rechte |
| npm-/Alpine-/OCI-Distribution | `Dockerfile`, `docs/security/LICENSE-REVIEW.md`, `docs/security/evidence/license-rights-review.json` | OSS-/Systemsoftwarelizenzen | Lock/NOTICE/Trivy-Evidence ist technisch, Corresponding-Source-/Distribution-Pflichten werden am tatsächlich veröffentlichten Artefakt geprüft |
| Social-Renderer / JaJa / TTS | `CAPITAL-AI-GROWTH/`, `docs/security/AI-DESIGN-ASSET-PROVENANCE.md`, Render/Google Neural2 | Medien-/Marken-/Modell-/Datenrechte | Originalherkunft je Bild/Audio/Video, Anbieter-TOS und kommerzielle Verwertung `REVIEW_REQUIRED`; private Draft-Generierung ist keine allgemeine Publikationslizenz |
| Kraken, Massive, FinancialData.Net, Binance | `docs/architecture/PERSONAL-BYOK-BYOM-MATH-SAAS-20261008.md`, `docs/security/FINANCIALDATANET-INTEGRATION-20261002.md` | **Separate Datenprovider-Vertragsrechte** | Display, Hosted Processing, Derived Scoring, Speicher/Retention, Weitergabe und Resale nach tatsächlichem Tarif und Endpunkt `NOT_PROVEN` |

**Provider-Referenzen:**  
- https://massive.com/legal/market-data-terms-of-service  
- https://www.kraken.com/legal  
- https://supabase.com/docs/guides/database/vault

Die Nutzung eigener Formeln/Algorithmen und ein offenes SDK schaffen **keine** Redistribution-Rechte an Börsenfeeds. Ein personal-only Providerplan wird nicht dadurch zum kommerziellen Multi-Tenant-Service, dass der Nutzer den API-Key selbst eingibt.

## Konkrete nächste Nachweise (keine neuen Pflicht-Gates)

- **PRODUCT/TRUST:** Mit autorisierten Testkonten neue Registrierung, bestätigten Redirect, TOTP-Enrollment/Challenge, AAL2, Logout, zwei unabhängige Nutzer-/Private-Workspace-Flows und Negativzugriffe ausführen. Keine Fremdkonto-Daten auslesen.
- **TRUST/PLATFORM:** PR #247 Alpine-Kandidaten nur nach OAuth-/Modell-/Limit-/Security- und Betriebsnachweis für den vorgesehenen Einsatz freigeben; die Debian-44-HIGH bleiben gesondert.
- **PRODUCT/PLATFORM/TRUST:** Sechs Stripe-Testmode-Ketten korrelieren: Session → Test Event → korrelierter managed inbox receipt → genau eine Entitlement-Projektion → Access RPC → anonymer 401; Retries und Concurrency separat. Keine Live-Käufe oder bezahlten API-Aufrufe ohne ausdrücklich geeignete Testautorisierung.
- **MARKET/TRUST:** BYOK-/private Bridge-E2E und Providerrecht je tatsächlichem Nutzungszweck klären; `execution_enabled=false` nicht umgehen.
- **PLATFORM/TRUST:** Externer `/healthz`-Readback mit aktuell laufendem Commit; falls geplanter GHCR-Cutover: neuen sourcegebundenen OCI-Digest und Lizenz-Evidence separat prüfen. Kein neuer Webservice.
- **👋⚙️ Owner:** Vertrags- und IP-Erklärungen nur anhand tatsächlicher Urheber-/Lizenzunterlagen rechtsverbindlich bestätigen; kein Abnahmeautomatismus.

**Keine Änderungen an Live-Auth, RLS, Stripe, Provider-Keys, CI-Gates, Render-Diensten, Zahlungstarifen oder Lizenzfreigabe-Evidence.**
