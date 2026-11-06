# X-API Pay-Per-Use: Expansion-Risiko und P0-Maßnahmen (06.11.2026)

**Status:** REVIEW_REQUIRED (Kosten), VERIFIED (Repository-Query-Inventar) · **Primary domain:** GROWTH, mit TRUST/PLATFORM/PRODUCT · **Authority:** AGENTS.md / SOLO_MAINTAINER_FLOW@1.

## Anlass und Scope

Laut der vom Owner weitergegebenen X Developer Accounts-Mitteilung werden ab **22.11.2026** auch durch Expansions gelieferte Post-, User-, Media-, Poll- und Place-Objekte im Pay-Per-Use-Modell berechnet. Es gibt **keinen** Console-Verbrauchsnachweis in der E-Mail. Die offizielle X-Preisliste zeigt derzeit Post Read USD 0,005 / Objekt, User Read USD 0,010 / Objekt; die tatsächlichen und künftigen Konditionen in der Developer Console bleiben maßgeblich.

- Referenz: https://docs.x.com/x-api/getting-started/pricing
- Referenz: https://docs.x.com/x-api/posts/get-post-by-id
- X Developer Console: https://console.x.com/
- Codebaseline: main vom 05.11.2026, SHA `bea9223d1d661259d147d2cd22dc09004e62351f`. Der Run dieses PRs ist separat zu prüfen.

## Inventar

| Priorität | Abfrage | Felder / Expansions | Beurteilung |
| --- | --- | --- | --- |
| **P0** | `server/social-media/x-url-context.mjs` · GET /2/tweets/:id | `tweet.fields=author_id,created_at,possibly_sensitive,note_tweet`, `expansions=author_id`, `user.fields=username,protected` | **Ein expandierter User**, der auf URL-Handle, Autor-ID und `protected` geprüft wird; vor dem Stichtag das einzige nachgewiesene explizite `expansions`. |
| P1 | `server/social-media/x-oauth-exchange.mjs` · GET /2/users/me | Keine | Owner-ID bei OAuth-Verbindung, User Read. |
| P1 | `server/social-media/owner-token-refresh.mjs` · GET /2/users/me | Keine | Identitätsprüfung bei Token-Erneuerung, User Read. |
| P1 | `server/social-media/provider-external-readback.mjs` · GET /2/tweets/:id | `tweet.fields=author_id` | Post Read; getrennte Freigabe-Flags. |
| P2 | `server/social-media/x-milestone-post.mjs` · GET /2/tweets/:id | `tweet.fields=author_id` | Einmaliger Post-Readback nach explizitem Publish. |
| P2 | `server/social-media/x-article-test.mjs` · GET /2/tweets/:id | `tweet.fields=author_id,article` | Einmaliger Article-Readback; keine Expansion. |
| P2 | `server/social-media/provider-publish.mjs` · POST /2/tweets | Keine | Schreibkosten, nicht expansionsbedingt. |

Keine expliziten `media.fields`, `poll.fields` oder `place.fields` in der geprüften Default-Branch-Code-Suche gefunden. Negativbefund umfasst keine externen Apps, andere Branches oder X-Console-Konfigurationen.

## P0-Befund und Entscheidung

`expansions=author_id` ist **nicht unnötig**: `normalizeXPostContext` gleicht User-ID, URL-Username und den Schutzstatus ab. Ein Entfernen ohne gleichwertige und datenschutzrechtlich vertretbare Identitätsprüfung wäre ein Sicherheits- und Integritätsregress. Die unveränderte Minimalabfrage wird im Code nun als konkreter Parametervertrag geführt und im Test auf exakt eine User-Expansion geprüft. **Das ist Regression-Protection, keine behauptete Kostensenkung.**

Illustration ohne Deduplizierung: Einzelner Post Read + ein unterschiedlicher User Read nach Stichtag = USD 0,005 + 0,010 = **USD 0,015**. Beispiel 100 unterschiedliche Autoren und Posts = USD 1,50; X-UTC-Deduplizierung, Owned-Read-Preise, Konditionen und Echtverbrauch können abweichen. Keine Schätzung als Ist-Rechnung ausgeben.

## Console-Readback: P0 durch Owner offen

👋⚙️ Im vorhandenen X Developer Account für die mit CAPITAL-AI verbundene App read-only abgleichen und mit Datum dokumentieren:

1. Tatsächlich abgerechnete **Post Reads und User Reads** im Zeitraum der letzten 7 und 30 Tage; wenn möglich pro Endpoint / Expansion sowie 22.–29.11. separat.
2. Verfügbares Guthaben, Kontingent-/Ausgabenlimit und Auto-Recharge-Status. Keine Kreditkarten-, Auto-Recharge-, Tarif- oder Cap-Änderung ohne gesonderte Autorisierung.
3. Aktive Apps/Projekte mit denselben Credentials oder weiteren X-Workloads; Inventar ergänzt nur nach echtem Nachweis.
4. Realer Usage-Diff der URL-Context-Reads vs. direkte OAuth-/Readback-Reads; keine Multiplikation von vermeintlichen Requestcounts mit Userobjekten ohne Messung.

**Nicht nachgewiesen:** X Console Zugang, Guthaben, Zahlungsmethode, Spend Cap, X API-Aufrufmengen, reale User-Read-Verteilung, verbindliche Kostenfreigabe, Runtime-Flagwerte. Render-Deployment-SHA allein beweist keine dieser Angaben.

## Test und Auslieferung

- Regression: `node --test server/social-media/x-url-context.test.mjs`.
- SEO / Artikel: `node --test scripts/seo-metadata.test.mjs scripts/seo-content-manifest.test.mjs scripts/seo-source-provenance-drift.test.mjs server/seo-indexing-policy.test.mjs`.
- Freigegebene CI: `Docker Security Gate` und `Domain Governance` am **PR-Head-SHA**; Ergebnis erst nach Run als VERIFIED kennzeichnen.
- Veröffentlichung der redaktionellen Website-Seite erfolgt nur über regulären Merge und nachgewiesenen Live-Readback. Kein X-Posting, keine kostenpflichtige API-Abfrage in diesem Arbeitsauftrag.
- Rücknahme: regulärer Revert; keine Umschaltung der OAuth-/Read-/Publish-Freigaben.

## Fachliche Folgeschritte

P0 Console-Readback (Owner) vor 22.11. → P1 minimale API-Abfragen und deduplizierte Owner-Interaktionen nur bei belegter Nachfrage sicher optimieren → P2 künftigen Social-Publisher und ROI-/Consent-Messung anhand realer Evidence erweitern. Keine neue globale Governance-Sperre.
