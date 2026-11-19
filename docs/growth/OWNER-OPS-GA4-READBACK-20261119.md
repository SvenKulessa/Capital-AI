# CAPITAL-AI Owner Operations · GA4 Evidenz und Darstellung (2026-11-19)

Domain: GROWTH / PRODUCT / TRUST. Autorität: Root AGENTS.md (SOLO_MAINTAINER_FLOW@2).
Status: Code auf Feature-Branch; vollständige CI-, Owner-Session- und Render-Runtime-Abnahme erst nach tatsächlichem Nachweis.

## Beobachteter Fehler
Die vom Owner bereitgestellte mobile Bildschirmaufnahme des privaten Dashboards (19.11.2026, ca. 11:47 MEZ) zeigt in Analytics: `NOT_PROVEN · Keine bestätigte Property`. Das ist kein Beweis für "0 Events"; Graphen und KPIs dürfen weder historische Werte übernehmen noch Demo-Daten erzeugen.

Ein unabhängiger, bereits autorisierter Supermetrics-GA4-Connector konnte im Chat die Property "Capital-AI prod" (numerische ID `548187678`) lesen. Dieser Connector gehört **nicht** zur Render-Prozessauthentisierung. Seine Werte dürfen ohne gesondert gesicherten Backend-Datenpfad nicht in die öffentliche App oder das Repo kopiert oder als Render-Live-Kennzahlen ausgegeben werden.

## Bestehender und erweiterter Providervertrag
- Render: `server/google-analytics-mcp.mjs`, offiziell begrenzte, nur lesende GA4-MCP-Tools, private Credentials im Container und serverseitige Owner-Verifikation.
- `server/google-analytics-readback.mjs`: Profileigenschaften müssen exakt zum konfigurierten Property-Identifier passen. Die Ereigniszählung umfasst genau sieben **Kalendertage inklusive heute** (GA4-Bereich: `6daysAgo..today`), nicht acht Tage.
- Nichtnumerische, unvollständige oder nicht sichere Eventzähler führen zum Status `NOT_PROVEN`, niemals zu automatisch eingefügter Null. Eine echte, übermittelte `"0"` bleibt gültig.
- `server/evidence-dashboard-readback.mjs`: separates aggregiertes `realtimeStatus` und `realtimeEvents`, mit identischer Event-Allowlist wie Sieben-Tage-Werte. Realtime und Sieben-Tage-Werte werden **niemals addiert**.
- `src/components/OwnerOperationsVisualOverview.tsx`: GA4-Analysekarte innerhalb des privaten goldenen Operations Centers, mit tatsächlich gebundenen Events, fehlenden Werten `– / NOT_PROVEN`, Quellumfang und visualisierten Ereignissen.
- `src/components/OwnerAgentOperationsPanel.tsx`: GA4-Analytics-Tab zeigt Eventkennzahlen inklusive Echtzeit-Scope. Der GitHub-Agenten-Filter bleibt für Analytics ausgeblendet.
- Kein Umsatz/MRR aus GA4-`purchase` abgeleitet, kein automatisches Publishing oder Datenbank-Write.

## Exakte Abnahme
1. Tests am Feature-Head: `node --test server/google-analytics-readback.test.mjs server/evidence-dashboard-readback.test.mjs` und `node --import tsx --test src/components/ownerOperationsModel.test.ts src/components/ownerOperationsVisualModel.test.ts`; anschließend bestehende `npm run test:owner-operations`, `npm run lint`, `npm run build`.
2. Bestehende GitHub Required Checks: Docker Security Gate und Domain Governance. Ohne Ergebnisse keine Merge-Erklärung.
3. Nach regulärem Main-Deployment Owner-Sitzung mit MFA/verified Email/IAM=owner prüfen; Nicht-Owner und anonym müssen vor jeglichem Provider-Read 404 erhalten. No-store, GET-only, kein Tenant-Leak.
4. Nur in sicherem Render-Konfigurationskanal **Boolean-Existenz** und Berechtigungen prüfen, Werte niemals exportieren: `GOOGLE_ANALYTICS_PROPERTY_NUMBER` (erwartet `548187678`), `GOOGLE_ANALYTICS_CLOUD_PROJECT`, `GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON`. Fehlende Konfiguration oder fehlendes Viewer-Recht wird nicht übergangen; Cloud-/IAM-/Secret-Mutation ist gesondert freizugeben.
5. Erst echte, exakt gebundene GA4-Replies lassen Dashboard-Events als `VERIFIED_PROVIDER_READ` erscheinen. Browser-Screenshots bei 320, 390 und 1440 CSS-px, Tastatur/Touch und dem freigegebenen Referenzbild separat abgleichen.

## Rollback
Den Feature-Squash auf Main zurücknehmen. Keine persistente Daten- oder Provider-Migration; keine Änderung an OAuth-Scopes oder Public-Messung.
