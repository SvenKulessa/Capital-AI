# CAPITAL-AI — GA4 ohne privaten Service-Account-Key

**Stand:** 2026-10-10. **Status:** REPO_IMPLEMENTED / LIVE_GOOGLE_ACCESS_NOT_PROVEN.
**Domains:** GROWTH / PLATFORM / TRUST.
**Baseline:** main@29d51c6bd6d309ddb51680127177f467bf84f596.

## Entscheidung und Sicherheitsgrenze

Der vorhandene `.github/workflows/google-readback.yml` erhält einen **unabhängig wählbaren GA4-Lauf** (Standard: `ga4`), der via GitHub OIDC -> Google Workload Identity Federation -> kurzlebige Google Access Tokens ausschließlich `analytics.readonly` und `webmasters.readonly` anfragt. Er prüft die feste konfigurierte GA4-Property, den GA4-Realtime-Endpunkt und den Sieben-Tage-Bericht. Der optionale GSC-Lauf ist davon getrennt und blockiert **nicht** den GA4-Test. Keine privaten Google Service-Account-Schlüssel/JSON-Dateien, keine Drittanbieter-API, keine Reports/Accounts in GitHub-Logs, keine geplanten automatischen Läufe, keine Datenänderungen.

Der `googleanalytics/google-analytics-mcp`-Adapter im Render-Webservice verwendet **weiterhin** `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON`. Dieser PR aktiviert ihn **nicht** ohne passende Render-Laufzeitidentität und berührt Render-Secrets oder Production nicht. Deshalb bedeutet ein erfolgreicher GitHub-Readback **nicht**, dass `GET /api/profile/google-analytics-readback` auf Render funktioniert oder GA4-Daten im Browser erfasst werden. Die bekannte Render Managed OIDC-Dokumentation nennt aktuell AWS, Anthropic und OpenAI, **nicht Google**; Managed OIDC benötigt einen Pro Workspace oder höher. Kein Render-Planupgrade und kein ungedecktes Token-Brokering werden vorgenommen. Für Render wäre ein separater nachweisbar unterstützter Workload-Identity-Pfad oder ein expliziter, geschützter Benutzer-OAuth-Flow notwendig; die beiden ersetzen nicht die OIDC-Identität von GitHub.

Die GA4-Property Viewer-Mitgliedschaft ist innerhalb **Google Analytics**, nicht innerhalb des Cloud-Projekt-IAM festzulegen. GA4-Daten- und Admin-APIs müssen im Projekt aktiviert sein.

## Einmaliges Setup: GitHub-Repository-Variablen

Repository: `SvenKulessa/Capital-AI`; `Settings > Secrets and variables > Actions > Variables`.

| Name | Wert |
| --- | --- |
| `GCP_WORKLOAD_IDENTITY_PROVIDER` | `projects/542877602707/locations/global/workloadIdentityPools/capital-ai-github-read/providers/capital-ai-dispatch` |
| `GCP_GOOGLE_READER_SERVICE_ACCOUNT` | `capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com` |
| `GA4_PROPERTY_ID` | Ziffernfolge unter Google Analytics **Verwaltung > Property-Details** (nicht die `G-...` Measurement ID) |

Die ersten zwei Werte sind deklarierte Ziel-Ressourcen; ihre Existenz muss durch gcloud bestätigt werden, nicht lediglich durch Dokumentation. Der Reader-Service-Account benötigt `roles/iam.workloadIdentityUser` für die exakt eingeschränkte GitHub-Identität und GA4-Property-Viewer-Rechte. Für GitHub OIDC muss der Google-Provider eine enge CEL-Attribute-Condition für `SvenKulessa/Capital-AI`, `refs/heads/main`, `workflow_dispatch` und den vorgesehenen Workflow besitzen.

**Keine Keys erstellen, keine Tokens über Chat/Issue/PR senden.**

## Schneller Owner-Bootstrap ohne Google-Schlüssel

Der neue Repository-Helper ist standardmäßig lesend und legt niemals Schlüssel an. Er prüft Provider-Issuer, exact repository/main condition, Service Account und eingeschaltete Google-APIs:

```bash
gcloud config set project aifinancial-500208
bash scripts/ga4-keyless-github-setup.sh audit
```

Zum einmaligen Eintragen der drei **nicht geheimen** GitHub Actions Variables: (nur bei installiertem, authentifiziertem `gh` CLI und passenden GitHub-Repository-Adminrechten)

```bash
bash scripts/ga4-keyless-github-setup.sh configure
```

`configure` fragt eine numerische GA4-Property-ID und eine genaue Freigabephrase ab; es ändert nur die drei Repository-Variablen, nie Google-IAM und nie Render-Environment. Falls `gh` in Cloud Shell fehlt, dieselben Werte manuell unter GitHub Repository Settings eintragen. Die Provider-Bindung und GA4-Property-Viewer-Zuweisung müssen weiterhin live durch Google bestätigt werden.

## Read-only Cloud-Shell-Vorprüfung

```bash
gcloud config set project aifinancial-500208
gcloud iam workload-identity-pools describe capital-ai-github-read --location=global --format='value(name,state)'
gcloud iam workload-identity-pools providers describe capital-ai-dispatch --location=global --workload-identity-pool=capital-ai-github-read --format='json(name,disabled,attributeCondition,attributeMapping,oidc.issuerUri)'
gcloud iam service-accounts describe capital-ai-google-audit@aifinancial-500208.iam.gserviceaccount.com --format='value(email,disabled)'
gcloud services list --enabled --format='value(config.name)' | grep -E '^(analyticsadmin|analyticsdata|searchconsole|iamcredentials|sts)\.googleapis\.com$'
```

Die read-only Abfragen validieren **noch keine realen GA4-Viewer-Rechte**.

## Ausführung / Abnahme

1. Nach `main`-Merge des PR und Operator-Setup: GitHub Actions -> **Google Readback (readonly)** -> **Run workflow**; target `ga4`, branch `main`.
2. Required: `GA4 properties.get HTTP: 200`, `GA4 runRealtimeReport HTTP: 200`, `GA4 runReport last seven days HTTP: 200`, `GA4_PROVIDER_READ_VERIFIED`.
3. Kein `G-...`-Mess-ID-Missbrauch. Leere Reports sind kein Problem und kein Nachweis für Pixel-/Browsertracking. Im Browser bleibt Consent-gesteuerte GA4-Erfassung separat deaktiviert, bis qualifiziert freigegeben.
4. Für GSC gesondert `target=gsc`; für kombinierte Diagnose `target=all`.
5. Bei `401`: OIDC Token Exchange/Scopes; `403`: API-Aktivierung und exakte GA4-Viewer-Berechtigung; `404`: Property-Zuordnung prüfen. Niemals Adminrechte auf Verdacht vergeben.

## Kosten, Alternative und Rollback

GitHub Actions und Google-APIs haben planabhängige Gratis-/Nutzungsgrenzen und Providerquoten. Kein zusätzlicher Render-Dienst, kein bezahlter Tarif, keine automatische Veröffentlichung. Alternative mit mehr Produktintegration: Render-GA4-MCP nach Review einer *tatsächlich verfügbaren* runtime workload identity auf externe ADC `external_account` umstellen (kein Service-Account-Key, aber eigener Installations-/Provideraufwand). Rollback per Revert des Workflow-/Dokumentations-PR; bestehende Render-Konfiguration bleibt unberührt.

## Offizielle Referenzen

- https://docs.cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- https://render.com/docs/oidc
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runReport
- https://developers.google.com/analytics/devguides/reporting/data/v1/rest/v1beta/properties/runRealtimeReport
- https://developers.google.com/analytics/devguides/config/admin/v1/rest/v1beta/properties/get
