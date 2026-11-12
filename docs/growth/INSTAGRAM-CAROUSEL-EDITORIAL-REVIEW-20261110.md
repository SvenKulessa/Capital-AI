# Instagram ETF-Carousel – redaktionelle Prüfung und serverseitiger Adapter

Stand: 2026-11-10. Primary Domain GROWTH, Support TRUST/PLATFORM.
Autorität ausschließlich AGENTS.md / SOLO_MAINTAINER_FLOW@1. Issue-/Review-Status: **REVIEW_ONLY / NO_PUBLISH**.

## Getrennte redaktionelle Entscheidung
- **Alt-Texte: TEXT_REVIEWED.** Drei beschreibende Alternativtexte geben die sichtbaren Inhalte der Karten 1–3 wieder. Es ist weder ein Alt-Text-Publish zur Meta API noch die tatsächliche Darstellung in einer Instagram-App nachgewiesen.
- **Technische Asset-Herkunft: VERIFIED.** Die SVG-Quellen stammen aus Commit \`3c26d10db4675ac95d036943e9c25f3f100d442e\`. Die drei privaten Original-PNGs sind bytegleich mit den hochgeladenen Drive-Rohdateien (1080 × 1350, 4:5). JPEG-Arbeitskopien wurden separat erstellt. Ihre Hash-Werte und redaktionellen Alt-Texte stehen in \`INSTAGRAM-CAROUSEL-EDITORIAL-REVIEW-20261110.json\`.
- **Kommerzielle Nutzungsrechte: REVIEW_REQUIRED, nicht granted.** Keine Fremdbilder oder externen Webfonts im ursprünglichen SVG erkennbar; das ersetzt keinen belastbaren Nachweis zu Urheberschaft, Marke, Gestaltung und kommerzieller Verwendung. Bis zur vertrauenswürdig dokumentierten Owner-Rechtebestätigung bleibt \`rightsVerified=false\`. Es werden keine Approval-Records erzeugt.
- **Text/Claims:** Synthetisches Ask 100,10 € / Bid 99,90 € → Spread 0,20 € je Anteil. Keine realen Kurse, keine Anlageberatung, keine garantierten Erträge oder Kosten. Caption ist weiterhin DRAFT/REVIEW_REQUIRED.

## Server-Adapter – implementiert, nicht aktiviert
\`server/social-media/instagram-carousel.mjs\` nutzt die bestehenden \`verifySocialStoredAsset\`- und \`prepareSocialProviderDelivery\`-Verträge.

1. Zwei bis zehn geordnete **JPEG**-Assets, je ein SHA256, Asset/Content/Source-Identität, eigener ApprovalRef, eigene atomare Reservation, Alt-Text.
2. Unveränderlicher privater Byte-Readback plus \`rightsVerified:true\` aus dem bestehenden trusted Rights-Adapter; zusätzlicher hosted-JPEG-Byte-Readback auf einem **explizit erlaubten** HTTPS-Host mit SHA256-kodiertem \`/<hash>.jpg\`-Pfad. Keine fremden User-URLs, Query-Token, ungedeckten Aussagen oder öffentlichen Drive-Freigaben.
3. Eine zusätzliche **atomare** Carousel-Gruppenreservation (erfasst die geordnete Hash-/Approval-Folge, Konto und User). Der serverseitige \`beginAttempt\`-Callback muss per echtem DB-CAS \`CLAIMED→SUBMITTING\` ausführen; ein erneut verwendeter Anspruch darf nicht als \`SUBMITTING\` zurückgegeben werden.
4. Gesonderte Flag \`SOCIAL_INSTAGRAM_CAROUSEL_ENABLED=true\`, **zusätzlich** zu den vorhandenen globalen und Instagram-Kanal-Schaltern. Standard ohne explizite Provider-Konfiguration: **disabled**. Konto-, Token- und erlaubte Meta-API-Version müssen exakt zur geprüften User-/Account-Identität passen.
5. Meta Graph: pro JPEG ein \`/media\`-Child mit \`image_url\`, \`is_carousel_item=true\`, \`alt_text\`; jeweiliger Status \`FINISHED\`; dann Parent \`media_type=CAROUSEL\`, Child-IDs in der richtigen Reihenfolge, Caption; danach \`media_publish\` nur bei Parent-\`FINISHED\`. Ein Nicht-FINISHED-Zustand oder Netzwerkfehler wird als \`UNKNOWN\` durabel vermerkt, **kein Blind-Retry**. Eine Provider-Quittung beweist noch keinen veröffentlichten Feedpost – unabhängiger Provider-Readback erforderlich.
6. Keine neue HTTP-Route und keine Aktivierung durch das Studio. Der bestehende \`INSTAGRAM=IMPLEMENTED_DISABLED\`-Status, \`approvals=[]\` und \`publicPublishAllowed=false\` bleiben unangetastet.

## Praktische Blocker vor Betrieb
- Vertrauenswürdige kommerzielle Rechte-Evidence für **genau die JPEG-Hashes**; menschliche, hashgebundene Freigabe je Asset.
- Authentifiziertes Instagram Professional-Konto mit real geprüften Publishing-Scopes und dokumentierten Kosten-/Quotenbedingungen.
- Private immutable JPEG-Speicherung, öffentlicher provider-zugänglicher **nichtprivater** Auslieferungshost mit unveränderlichen hashkodierten Dateien und unabhängigem readback.
- Persistente Datenbank-CAS für **atomare Gruppenreservierung** und UNKNOWN-Persistenz; bisherige Legacy-Approval-/Publish-Tabellen reichen dafür nicht nachweislich aus.
- Gezielter Integrationstest inkl. tatsächlicher Meta-Container-/Feed-Readback und Instagram-Alt-Text-/Crop-Check, ohne Upload vor Operator-Freigabe.

## Reproduktion
- Die Regressionen für diesen Adapter hängen am bestehenden \`server/social-media/provider-publish.test.mjs\` und laufen in regulären \`npm test\`-, \`test:security\`-, \`test:social-provider\`- und Docker-Security-Gates, ohne zusätzliche Required Checks.
- Mock-Negativfälle: veränderte private/hosted Bytes, SVG/PNG statt JPEG, fehlende Rechte oder ApprovalRefs, geänderter Content/SHA, falscher User/Konto/Scope, dubiose Host-URL/Token-Query, Ablauf/Replay der Gruppenreservation, gestoppte Parent-/Child-Container und ambiger HTTP-Fehler.
- Rollback: Revert des PRs; kein veröffentlichtes Social-Medium und keine öffentliche Datei müssen entfernt werden, da keine Provider-Anbindung oder Veröffentlichung aktiviert ist.

API-Referenz für den technischen Ablauf: [Meta Instagram Postman Collection](https://www.postman.com/meta/instagram/collection/6yqw8pt/instagram-api).

## Nachtrag – exakte Editorial-Bindung, kein Freigabe-Ersatz

Die technische Vorbereitung verlangt außerdem ein **vertrauenswürdiges, dauerhaftes `loadEditorialReview`-Ergebnis** mit `status=APPROVED`, passender Tenant-/Source-/Content-Identität und einem SHA256-Fingerprint of caption and individually ordered alt text hashes and JPEG hashes. Diese Prüfung autorisiert nichts selbst: Die oben redaktionell geprüften Textentwürfe erzeugen keinen solchen Datensatz. Geänderte Caption, Alt-Texte oder Bildreihenfolge invalidieren den Fingerprint und erzwingen eine neue atomare Gruppenreservierung. Ohne trusted Editor-Review, Rechteverifikation, Account-/Scope-Evidence und bestehenden Approvals bleibt der Adapter fail-closed.

**Build-Evidence:** `instagram-carousel.mjs` und `instagram-carousel.test.mjs` gehören explizit in die bestehende `.dockerignore`-Allowlist und die Build-Stage-COPY-Anweisung. Der Runtime-Stage werden nur die tatsächlich benötigten Servermodule hinzugefügt. Die Negativtests bleiben Teil der bestehenden `provider-publish.test.mjs`-Testverdrahtung, keine neue externe CI-Schicht.

## Meta-OAuth-Pfadabgleich (P0)

Dieser Adapter verwendet ausschließlich den Facebook-Login-Publishing-Pfad über `graph.facebook.com`. Das vorhandene Instagram-Login-Verfahren mit `instagram_business_basic` und `instagram_business_content_publish` benötigt dagegen den anderen Host `graph.instagram.com`; beide dürfen weder beim Capability-Readback noch beim Token-Resolver vermischt werden. Hier sind deshalb ein trusted Capability-Nachweis (`loginMethod=FACEBOOK_LOGIN`, `apiHost=graph.facebook.com`), die vier für den verbundenen Facebook-Login-Pfad erforderlichen Scopes (`pages_show_list`, `instagram_basic`, `instagram_content_publish`, `pages_read_engagement`) und die entsprechende Token-Herkunftsbestätigung nötig. Abweichende Identitäten und Login-Familien werden vor Provider-Calls abgelehnt. Die Berechtigungen werden **nicht** durch den DRAFT-Audit und **nicht** durch künstliche Testdaten als real vorliegend erklärt.

API-Basis: Meta [Instagram API mit Facebook Login](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-894be833-d0b6-4877-859e-c61ae6474d64) und [Instagram Login](https://www.postman.com/meta/instagram/documentation/6yqw8pt/instagram-api?entity=request-23987686-3fe78620-2258-44b6-893f-42d76c7200d7). Die bestehende `IMPLEMENTED_DISABLED`-Sperre bleibt unverändert.


## Eigentümer-Selbsterklärung (12.11.2026) – nur Rechte, kein Publish

Der Owner hat am 12.11.2026 im Chat ausdrücklich erklärt: „Ich bestätige als Eigentümer, dass die drei im CAPITAL-AI-Editorial-Review-Manifest dokumentierten JPEG-Motive im eigenen Projekt erstellt wurden und nach meiner Prüfung alle enthaltenen Komponenten kommerziell genutzt werden dürfen.“ Dieser Wortlaut ist als **Eigentümer-Selbsterklärung** für genau drei JPEG-Datei-Hashes dokumentiert in [instagram-etf-jpeg-owner-rights-20261112.json](evidence/instagram-etf-jpeg-owner-rights-20261112.json).

- **Rechtebehauptung:** `OWNER_ATTESTED` (drei exakt manifestierte JPEG-SHA256). Als Herkunft gilt die ausdrückliche Owner-Erklärung, nicht ein externes Rechtsgutachten oder eine kryptografische Unterschrift.
- **Byte-Identität:** Die SHA256-Werte stammen aus dem vorherigen Editorial-Manifest. Für diesen Attestationsschritt wurden nicht erneut alle JPEG-Bytes heruntergeladen/rehashiert. Der private immutable Byte-Readback bleibt für einen späteren tatsächlichen Provider-Dispatch Pflicht.
- **Keine technische Freigabe:** `rightsVerified=false` bleibt absichtlich bestehen, bis der vertrauenswürdige `loadRightsEvidence`-/Asset-Readback-Pfad die Dateiidentität und die zugehörige Evidence verifiziert. `publicPublishAllowed=false`, `approvals=[]`, `deliveries=[]`, `captionStatus=REVIEW_REQUIRED` und `instagramAdapterState=IMPLEMENTED_DISABLED` gelten unverändert. Kein OAuth, Upload, Scheduling, Meta-API-POST oder Produktivdatenbank-Schreibvorgang wird durch dieses Dokument autorisiert.
- **Widerruf/Änderung:** Bei Abänderung der JPEG-Bytes oder neuer Drittmaterial-Evidence sind Hash-Zuordnung und Rechte-Selbsterklärung erneut zu bewerten. Ein späterer Publishing-Approval muss getrennt und hashgebunden erteilt werden.
