# CAPITAL-AI GROWTH — erster X OAuth2 Meilensteinpost

Stand: 2026-10-14. Domain: GROWTH. Autorität: `AGENTS.md` (`SOLO_MAINTAINER_FLOW@1`).
Ausdrücklich beauftragter erster Post auf `@CapitalAIOnline`; der Merge allein veröffentlicht nichts.

## Neuer Meilensteinbeitrag: Content Adapter + Social Media Engine

**Status:** DRAFT · REVIEW_REQUIRED; ein X-Provider-Readback für diesen Beitrag liegt noch nicht vor.
Der bisherige OAuth2-Text war zu technikzentriert, ohne die Content-/Social-Pipeline
und die Analyse-Blueprints zu erklären. Neuer X-Post (272 JavaScript-Zeichen,
keine automatische Veröffentlichung):

> 🚀 Weniger Content-Rauschen, mehr Kontext: CAPITAL-AI verbindet Content Adapter + Social Media Engine. Quellen & Rechte prüfen → Posts/Shorts entwerfen → Freigabe → Nachweis. Start: Daten- und Screener-Blueprints. 🧪 Pilot; keine Anlageberatung. https://capital-ai.online/

**Claim-Grenzen:** Der Content Adapter normalisiert ausdrücklich ausgewählte
X-URL-Contexts und GitHub-PR-Kontexte; die Social Media Engine stellt
Format-/Publisher-Bausteine und den kontrollierten einmaligen X-OAuth2-Transport.
Nicht nachgewiesen sind eine vollständig automatisierte Cross-Channel-Pipeline,
globale Content-Lizenzrechte, KPI-/Reach-/ROI-Steigerungen oder produktive
Marktdaten- und Screener-Modelle. Die Daten-/Screener-Blueprints sind als
Konzept/Lernvorschau kommuniziert. Keine Anlageberatung, keine Signale,
keine Rendite- oder Leistungsgarantien. Der neue Text hat einen neuen SHA-256-
Content-Key; der vorherige Entwurf war nicht publiziert.

**20-Sekunden-Short als eigenständiges Pilotasset:** lokal erstelltes vertikales
9:16-MP4, exakt 20 s, deutsche synthetische Sprecherstimme, animierte
Originalgrafik und selbst erzeugte Musik. Dieser Chat liefert die Datei
separat; sie wurde weder ins Repo noch auf X/YouTube hochgeladen.
Storyboard: 0–4 s Kontext statt Rauschen · 4–8 s Quellen-/Rechte-/Claims-Adapter ·
8–12 s Social Media Engine mit Post-/Short-/Lernentwürfen ·
12–16 s Freigabe/Publisher/Evidence · 16–20 s CAPITAL-AI CTA + Disclaimer.
Status vor externer Distribution: DRAFT / REVIEW_REQUIRED, Audioqualität
und Zugänglichkeitsuntertitel redaktionell prüfen.

## Umsetzung

- Die öffentliche **read-only Vorschau** `https://capital-ai.online/api/social-media/x/milestone`
  erklärt Quelle, Content Adapter und Social Media Engine und verweist bei
  fehlender Owner-Sitzung auf `/login`. Die ursprüngliche GET-Sperre vor
  dem HTML-Render war die Ursache des nicht nutzbaren Direktlinks.
  Status und Veröffentlichung bleiben owner-authentifiziert.
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
6. 👋⚙️ Laut Owner: 20 USD X Free Credits, **noch keine Zahlungsmethode**
   hinterlegt; optionale zusätzliche 50 USD bei aktiviertem Autopay werden
   **nicht** verwendet. Aktuelles Guthaben und Ausgabenlimit im X Developer
   Portal prüfen; keine Zahlungsmethode oder Autopay-Funktion automatisch
   aktivieren. Die X Developer Console ist über die vorhandenen Connectoren
   nicht auszulesen. Ein SHA-Claim ist kein monetäres Ausgabenlimit.
7. 👋⚙️ Im CAPITAL-AI-Browser als Owner anmelden und nach kostenfreiem
   DB-Status-Readback genau einmal „Einmalig auf X veröffentlichen“ wählen. Rückgabe-Post-ID und
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
