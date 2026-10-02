# CAPITAL-AI PRODUCT — Sideboard & Lizenznachweise — Handoff 2026-10-01

## Scope

Dieser PRODUCT-Handoff setzt den UI-/UX-, Navigations- und Lizenzscanner-Teil aus
`CAPITAL-AI-PRODUKTION-DESIGN-SCANNER.md` um. Er ist bewusst auf
`capital-ai-product/license-engine-20261001` gestapelt, damit die bestehende
Lizenzierungsengine nicht dupliziert wird.

## Gepinnte Quellen

- Capital-AI Main bei Korrelation: `16b9ced4950317bee3efe6bf8d5154d1551e7cc9`.
- PRODUCT Lizenzengine / PR #75 Basis: `7b6f13121cc80ab8967cbd8b88c445f0e1e86273`.
- FRONTEND Designreferenz: `9c2e2255a0fca5fe113b7ddf56906889f8ef1186`.
- FRONTEND-Quelle für das selektiv übernommene Sideboard:
  `src/components/HubSidebarDrawer.tsx`.
- Die zwei mobilen Screenshots aus dem Owner-Chat sind die visuelle Referenz für
  Hub-Karten und das rechte, aufklappbare Sideboard. Sie werden nicht als
  Lizenz-/Provider-Evidence behandelt.
- PR #79 (`capital-ai-platform/frontend-research-license-handoff-20261001`)
  bleibt der getrennte Handoff für die Research-/Legal-Routen
  `/lizenz`, `/datenprovider-lizenzen`, `/opensource-lizenzen` und
  `/forschung`.

## Änderungen

1. Der alte große Hub-Akkordeonblock im mobilen Hauptmenü wurde durch vier
   kompakte, leuchtende Hub-Karten ersetzt. Ein zweites Sideboard öffnet die
   Unterseiten des gewählten Hubs.
2. FRONTEND-Pfade wurden nicht blind übernommen. Capital-AI behält seine
   Query-basierten Hub-Routen, Back/Forward-Synchronisierung und vorhandenen
   In-App-Aktionen.
3. Das Control Center enthält sieben Module; `Lizenzen & Nachweise` ist unter
   `/control-center?tab=licenses` direkt adressierbar.
4. Der Footer bündelt Lizenznavigation auf diesen Control-Center-Tab.
   Originaltexte und maschinenlesbare Reports bleiben im Tab direkt erreichbar.
5. Scannerbefunde zeigen Paket/Asset/Provider, Version, Hash, SPDX,
   Fundstelle, Nutzungsscope, Pflichten, Scan-/Prüfzeitpunkt und Evidence-Status.
   `VERIFIED`, `OFFEN`, `GEHALTEN` und `UNGEKLÄRT` sind getrennt.
6. Scanner-Importe bleiben lokal im Browser, maximal 2 MiB, fail-closed und
   setzen `ownerApproved=false`, `digestVerified=false` und
   `deployEligible=false`.

## Fünf Validierungen

### 1. SHA-/Design-/Lizenzinventar — PASS (Quellstand)

Capital-AI Main, PR-#75-Basis und FRONTEND wurden über den GitHub-Connector
korreliert. Der neue Sideboard-Code stammt aus dem gepinnten FRONTEND-Commit;
Capital-AI-spezifische Routing- und Sicherheitsgrenzen wurden danach selektiv
wieder eingesetzt.

### 2. Mobile/Desktop gegen Referenz — PARTIAL / RENDER-CHECK OFFEN

Die Struktur der beiden Owner-Screenshots wurde source-seitig umgesetzt:
vier Hub-Karten, Hub-Switcher, rechts einblendendes Sideboard, Kartenliste und
Footer-Aktion. Touch-Ziele wichtiger Controls sind mindestens 44 px.
Ein neuer Browser-Screenshot der gebauten Branch-Version wurde in dieser
Connector-Sitzung nicht erzeugt und wird deshalb nicht als bestanden behauptet.

### 3. Routes, Deep Links, Footer, Tabs, Back/Forward — STATIC PASS / RUN OFFEN

17 Query-basierte Sideboard-Deep-Links sind erhalten, inklusive
`/control-center?tab=licenses`. Der bestehende `useHubTab`-Mechanismus
bleibt für `popstate` und In-App-Navigation zuständig. Regressionstests wurden
auf Sideboard und Footer erweitert; ihre Ausführung bleibt dem regulären Gate
vorbehalten.

### 4. Security-/Lizenzregressionen — PASS (Source Review)

Importierte Scannerreports können keine Owner-/Digest-/Deployment-Freigabe
setzen. Reportgröße und unterstützte Schemas werden begrenzt. Quellen aus
untrusted Reports werden nur als Text bzw. nur bei `https://` als Link
dargestellt. Der Browser startet keine Scanner- oder Shell-Befehle.

### 5. Lokale Checks / Build / Handoff — BLOCKED IN DIESER SITZUNG

Ein lokaler Clone für Build-/Testausführung war wegen fehlender DNS-/Netzwerk-
Auflösung der Ausführungsumgebung nicht möglich. Es wurde kein Workflow manuell
gestartet, kein Publish/Deploy ausgelöst und NATS/Valkey wurden nicht verändert.
Required Checks des Pull Requests sind daher die maßgebliche Ausführungsevidenz.

## Restlücken / Merge-Reihenfolge

- PR #75 liefert die Baseline der Lizenzierungsengine.
- PR #79 liefert die getrennten Research-/Legal-Seiten, auf die der Lizenz-Tab
  verweist. Vor finalem Main-Merge muss die kombinierte Route nach Rebase erneut
  geprüft werden.
- Visuelle Browserabnahme und A11y-Interaktion bleiben offen, bis eine
  renderbare Branch-Vorschau verfügbar ist.
- Keine dauerhafte Self-Healing-Regel wurde verankert. Positive unabhängige
  Validierungen: 1/3 für das Muster „Scannerbefund ist keine Freigabe“ in diesem
  PRODUCT-Handoff; weitere Zyklen müssen unabhängig erfolgen.
