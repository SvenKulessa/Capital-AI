# CAPITAL-AI GROWTH — erster X OAuth2 Meilensteinpost

Stand: 2026-10-14. Domain: GROWTH. Autorität: `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`).
Ausdrücklich beauftragter erster Post auf `@CapitalAIOnline`; der Merge allein veröffentlicht nichts.

## Gebrandeter Beitrag (einmalig, 277 Zeichen)

> 🚀 CAPITAL-AI Meilenstein: X-URL-Context ist in der Content Engine implementiert. Öffentliche Posts liefern Recherchekontext; OAuth2-Publishing bleibt separat.
>
> Unsere Vision: transparente Datenpipelines, nachvollziehbare Scores und Finanzbildung.
>
> https://capital-ai.online/

Quellnachweise: `2946a1368504faa51d93dfd444d815939d7ff121` / PR #479
(X-URL-Context-Implementierung); `src/contracts/contentEngine.ts`,
`server/social-media/x-url-context.mjs`. Implementierter Source-Kontext ist **nicht** gleich
verifizierte Live-Lesung oder erreichte Reichweite. Keine Trading-/B2B-Performance-Aussage.

## Umsetzung

- Besitzer öffnet nach erfolgreichem Render-Deployment die geschützte Seite
  `https://capital-ai.online/api/social-media/x/milestone`.
- Der Server erfordert authentifizierten, E-Mail-verifizierten Owner IAM
  und auf einem same-origin Browser-POST den expliziten einmaligen Auftrag.
- Bestehender `resolveOwnerXCredentials` bestätigt den X-Account
  `CapitalAIOnline`, erneuert ablaufende Tokens über den bestehenden
  rotating Refresh-Lease und hält jedes OAuth-Secret im Backend.
- `capital-social-x-vault` vergibt einen atomaren Content-Hash-Claim
  in `public.capital_x_milestone_posts` **vor** dem X Provider-POST.
- `createSocialProviderPublishTransport` übernimmt die einzige
  `POST /2/tweets`-Mutation. Seine globalen Provider-Flags bleiben
  deaktiviert; nur die eng begrenzte, IAM-geprüfte Einmalaktion kann
  diesen vorhandenen Transport verwenden.
- Nach Provider-ID werden erst `POSTED`, dann bei
  `GET /2/tweets/{id}` mit korrekter Author-ID `VERIFIED_PUBLISHED`
  gespeichert. Unklare Provider-/Vault-Antworten sperren automatische
  Wiederholung. `GET .../status` liest den DB-Receipt ohne X-API-Kosten.
- Kein Follow-Bot, keine automatischen Replies/DMs, kein zweiter
  Social-Publisher, keine unautorisierte Ausgabe.

## Rollout und Kosten

1. PR inklusive **Docker Security Gate** und **Domain Governance** grün mergen.
2. Migration `20261014032500_x_milestone_post_once.sql` auf dem
   aktiven Supabase-Projekt einmal anwenden.
3. `capital-social-x-vault` aus dem gemergten Stand mit
   `verify_jwt=true` deployen. Keine Secretwerte veröffentlichen.
4. Render-Deployment exakt dem gemergten Main-SHA zuordnen.
5. Nur für den vorhandenen Production-Service
   `SOCIAL_X_MILESTONE_POST_ENABLED=true` setzen; bestehende
   `SOCIAL_X_EDGE_STORE_ENABLED`, `SOCIAL_X_PAID_WRITE_APPROVED`
   und `SOCIAL_X_PAID_READ_APPROVED` müssen ebenfalls explizit aktiv sein.
6. 👋⚙️ Vor dem Button das X Developer Console Guthaben und
   eine maximale **20-USD-Spend-Cap** plus deaktiviertes Auto-Recharge prüfen.
   Die X Developer Console ist über die vorhandenen Connectoren
   **nicht** auszulesen. Ein SHA-Claim ist kein Geld-Cap.
7. 👋⚙️ Als Owner im gleichen Browser exakt einmal
   „Meilenstein einmalig auf X posten“ wählen. Rückgabe-Post-ID und
   `VERIFIED_PUBLISHED` gegen `.../status` nachprüfen.
8. `SOCIAL_X_MILESTONE_POST_ENABLED=false` nach bestätigtem Test,
   ohne die bestehenden X URL Context-/Artikeladapter abzuschalten.

Bei aktuellem X-Pay-per-Use sind mindestens der Schreibaufruf
(Website-Link) und der X-Post-Readback abrechenbar; eine nötige
OAuth-Identitätsprüfung kann weitere Kosten auslösen. Preise, Restguthaben
und tatsächliche Belastung **NOT_PROVEN**, bis X Console gelesen wurde.
Kein kontinuierlicher Publisher, kein Scheduler und keine automatische
Spend-Cap in dieser Änderung. Rollback: Milestone-Flag aus, Code
zurückrollen; ein bereits öffentlicher X-Post wird dadurch nicht gelöscht.

Tests: `node --test server/social-media/x-milestone-post.test.mjs`;
`node --import tsx --test server/social-media/x-edge-vault.test.mjs`;
bestehendes `test:x-oauth`, `test:security` und Docker-Gate.
