# CAPITAL AI — einmaliger X Article Test und On-Demand-Refresh

Stand 2026-10-13. Source of truth: `AGENTS.md`, X Articles API:
- https://docs.x.com/x-api/articles/introduction
- https://docs.x.com/x-api/articles/create-draft-article
- https://docs.x.com/x-api/articles/publish-article
- https://docs.x.com/x-api/getting-started/pricing

## Beauftragte Wirkung und Absicherung

Ein im Owner-IAM authentifizierter Nutzer kann nach Login `/api/social-media/x/article-test`
öffnen und exakt **einen** CAPITAL-AI-Lernartikel für `@CapitalAIOnline`
veröffentlichen. Nur ein expliziter gleich-originiger Button-POST initiiert
den X-API-Mutationsaufruf; GET/Status-Lesen veröffentlicht niemals.

Der serverseitige Tokenresolver liest nur mit JWT+HMAC aus
`capital-social-x-vault` einen verschlüsselten Access-Token und entschlüsselt
ihn lokal per AES-256-GCM. Unter fünf Minuten Restlaufzeit wird automatisch
der bestehende X OAuth Refresh mit exklusive DB-Lease, Account-ID-Readback
und atomarer Access-/Refresh-Token-Rotation ausgeführt. Keine Browsersecrets,
keine automatische Rotationswiederholung nach unklarem Ergebnis.

Die Tabelle `capital_x_article_tests` besitzt einen eindeutigen
`(user_id,content_key)`-Schlüssel. Vor dem X-Draft-POST wird die Row atomar
`CLAIMED`. Bei Erfolg folgen `DRAFTED` (Artikel-ID),
`POSTED` (Post-ID), dann `VERIFIED_PUBLISHED` nur nach X-Readback
mit passender X-User-ID und Artikel-ID. Ein unklarer Provider- oder
Vault-Fehler sperrt jede automatische Wiederholung dauerhaft, auch
wenn der Provider schon einen Draft oder Post angelegt haben könnte.
`GET .../status` liest nur den DB-Beleg und verursacht keine X-Ausgaben.
Nur Edge service_role + aktueller Owner-IAM darf diese Tabelle verwalten,
keine Browser-RLS-Policy.

## Kosten und Aktivierung

Der Owner hat eine **Obergrenze von 20 USD für den Test** autorisiert.
**Das tatsächliche Guthaben und das X-Developer-Console-Ausgabenlimit
können über die verbundenen Werkzeuge nicht ausgelesen werden.**
Der Code begrenzt Mutationen auf einen einmaligen Draft- und Publish-Versuch
pro Artikel und Account, erzwingt aber **keinen monetären Plattform-Cap**.
Daher: Eine aktive X Console Spend Cap von höchstens 20 USD und ausreichendes
Guthaben sind vor dem POST zusätzlich zu prüfen. Keine Auto-Recharge.

Fail-closed Render-Flags für genau den Produktionsservice `Capital-AI`:
- `SOCIAL_X_EDGE_STORE_ENABLED=true`
- `SOCIAL_X_OAUTH_CONNECT_ENABLED=true` und `SOCIAL_OAUTH_CALLBACK_ENABLED=true`
- `SOCIAL_X_PAID_READ_APPROVED=true`
- `SOCIAL_X_PAID_WRITE_APPROVED=true`
- `SOCIAL_X_ARTICLE_TEST_ENABLED=true`

Die beiden letzten Flags erlauben kostenrelevante Calls und dürfen nur im
Rahmen des vom Owner zugesagten Credits aktiviert werden. Die globale
Social-Publishing-Flag `SOCIAL_PROVIDER_PUBLISH_ENABLED` ist hierfür
**nicht erforderlich**; andere Kanäle bleiben unabhängig gesperrt.

Rollout nach erfolgreichem Required Check und Merge auf main:
1. Migration `20261013153200_x_article_test_once.sql` auf demselben aktiven Supabase-Projekt anwenden.
2. Edge `capital-social-x-vault` mit `verify_jwt=true` aus gemergtem HEAD aktualisieren.
3. Render Auto-Deploy/Head-SHA prüfen und Server-Runtime nachweisen.
4. X Console Credits/Spend-Cap durch Owner prüfen; Flags gezielt aktivieren.
5. Owner ruft die geschützte Artikeltest-Seite auf und löst genau einen POST aus.
6. Return-Status, X Article ID, Post ID und Author-Readback beweissicher
   dokumentieren. Verifikation ohne doppelte X-Posts.
7. Flag `SOCIAL_X_ARTICLE_TEST_ENABLED=false` nach Test deaktivieren.

Tests:
`node --test server/social-media/owner-token-refresh.test.mjs
server/social-media/x-edge-vault.test.mjs
server/social-media/x-article-test.test.mjs`.
Anwendbare GitHub-Pipeline: Docker Security Gate, Domain Governance.
Rollback: Artikeltest-Flag deaktivieren und gegebenenfalls Code zurückrollen;
bereits veröffentlichte öffentliche Posts werden durch einen Code-Rollback
nicht gelöscht. Keine automatische X-Provider-Löschoperation.

**Abnahme:** `IMPLEMENTED` erst nach grünem Test- und Merge-Nachweis;
`PUBLISHED` ausschließlich nach X-Provider-Readback. Ohne Readback:
`NOT_PROVEN`.
