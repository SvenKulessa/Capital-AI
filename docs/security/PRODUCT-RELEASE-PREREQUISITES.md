# Produktvoraussetzungen für GHCR-Production-Freigabe

Owner-Anweisung vom 2026-10-04. Geltung: CAPITAL-AI Webservice und NATS; alle fünf Domains dürfen die Nachweise bearbeiten. Diese Datei konkretisiert den technischen Production-Handoff und ersetzt keine unabhängige Prüfung, Lizenzfreigabe oder Owner-Autorisierung.

## Bestehende Authority und Identität

- `.github/workflows/build-security.yml`: Docker Security Gate, Build-once/Promote-many, GHCR-Archivtransport, Registry-Readback, SBOM und Attestations.
- `scripts/container-evidence-identity.mjs`: typisierte Fingerprints.
- `scripts/verify-production-handoff.mjs`: exakter Main, Lizenz, Ruleset, Registry-, Provider- und Runtime-Korrelation.
- `scripts/verify-product-release-prerequisites.mjs`: zusätzlicher fail-closed Produktnachweis.

Der Produktprüfer ist im Web-Production-Handoff verpflichtend. Fehlendes Bundle führt zu `PRODUCT_RELEASE_PREREQUISITES` und verhindert `deployEligible:true`. Sicherheits-/Prüfbuilds und nicht deploybare Kandidaten dürfen die zur Abnahme benötigte Evidence erzeugen. Ein Produktnachweis ist keine Berechtigung für einen ungeprüften Candidate-Testdeploy. Vor diesem gelten weiterhin Source-, Docker-, Digest- und Lizenz-Gates.

## Verbindliche Voraussetzungen

| ID | Nachweis vor finaler Production-Freigabe |
|---|---|
| registration | Website-Registrierung im Frontend und Backend; Session, Refresh und Logout real verifiziert. |
| documentation | Vollständiges Dokumentationsinventar; Frontend-Hub mit Social-Media-Engine erstellt; Lizenz-/Attributionsevidence für alle Inhalte und Assets. |
| monetization | Preise im Frontend/Backend konsistent; vollständiges Produktinventar; produktiver Checkout, Webhook und Freischaltung für jedes monetarisierbare Produkt. |
| enterprise_byok | BYOK-Modell für private Anleger in Enterprise integriert; Konzeptreview, produktive E2E-Abnahme und Schlüsselisolation. |
| infrastructure_assets | NATS Auth → publish → ack → replay; Valkey-Recovery; Supabase Auth/RLS; Webservice-Health; Repo-/Runtime-Identität; zugelassenes vollständiges Instrumentmanifest, Datenrechte und alle darin vorgesehenen Assets auf der Website live und scoreable. Fehlende oder nicht zugelassene Assets bleiben BLOCKED; keine Demo-/Challenger-Daten als produktive Scores ausgeben. Bestehende Asset-Coverage-Gates gelten zusätzlich. |
| components_implementation | Genau 50 reale Komponenten mit eindeutigen IDs, Prompts, Inhalten, Implementierungen und erfolgreichen Tests. |
| frontend_backend_parity | Desktop-/Mobile-Layout, Routen/API-Verträge, Produkte und Entitlements im Frontend und Backend stimmen überein. |
| components_results | Dieselben 50 Komponenten liefern jeweils ein nichtleeres, source-/imagegebundenes produktives Ergebnis. |
| mobile_play | APK mit bestehendem Release-Key signiert; Signatur, Paket/Version und tatsächlicher Google-Play-Releasezustand aus der Console korreliert. Ein Upload allein ersetzt keine Store-Freigabe. |
| seo_leads | Definiertes Messfenster, SEO-Metriken, Lead-Attribution und tatsächlich beobachtete Leads; keine Prognosen oder Demo-Conversions. |
| google_management | Google-Console-API eingerichtet; Property-Verifizierung, tatsächliche Branding-/App-Verifizierung und dokumentierter Datenbankbezug. „Google verifiziert die Datenbank“ darf ohne einen konkreten dafür geeigneten Google-Nachweis nicht behauptet werden. Unklarer Verifizierungsscope bleibt BLOCKED. |

## Evidence-Bundle

Ein extern erzeugtes und geprüftes Bundle enthält `manifest.json` und ausschließlich bereinigte Evidence-Dateien. PASS-Evidence wird nicht mit Platzhalterwerten in Git eingetragen: Ein nachträglicher Commit würde den zu belegenden Main-SHA ändern.

Manifestfelder: `schema: CAPITAL_AI_PRODUCT_RELEASE_PREREQUISITES@1`, `sourceSha`, `imageRef`, `component: web|nats`, `requirements` mit genau den elf IDs und je einer `evidence: {path, sha256}`, sowie `componentCatalog: {path, sha256}`.

Jeder referenzierte Anforderungsreport enthält `requirementId`, `status: PASS`, `environment: production`, `observedAt`, denselben `sourceSha`, `imageRef` und `component`, sowie alle im Prüfer definierten Einzelchecks als `PASS`. Reports dürfen bei Abnahme höchstens 24 Stunden alt und nicht aus der Zukunft sein. Die beiden Komponentenreports enthalten zusätzlich denselben Satz von 50 `componentIds`.

Der Komponenten-Katalog enthält `sourceSha` und genau 50 eindeutige reale `components`. Jede Zeile enthält `id` und gehashte Dateireferenzen für `prompt`, `content`, `implementation`, `test` und `result`. Das Ergebnis enthält `componentId`, `status`, `environment`, `sourceSha`, `imageRef`, `component` und ein nichtleeres `result`. Nummerierte Platzhalter und ein Zählwert „50“ sind keine Evidence. Die Test-Fixtures sind ausdrücklich synthetisch und dürfen niemals als Live-Evidence veröffentlicht werden.

Dateihashes werden aus den tatsächlichen Bytes neu berechnet. Absolute Pfade, Symlink-Ausbrüche, fehlende/leer gehashte Dateien, Dateien über 2 MiB, falsche Identitäten, doppelte IDs und unvollständige Checks bleiben BLOCKED. Ein Hash beweist Integrität, nicht die fachliche Richtigkeit oder die Echtheit einer Provider-Aussage. Provider-Readbacks, unabhängige Reviews und Owner-Freigaben müssen separat prüfbar bleiben; die automatisierte Strukturprüfung ersetzt sie nicht.

## Fingerprint-Typen

| Typ | Zweck |
|---|---|
| Git SHA | Source-/Testidentität; kein Image-Digest. |
| artifactArchiveDigest | GitHub-Artefaktarchiv; kein OCI-Digest. |
| localImageId / configDigest | Docker-/OCI-Konfiguration. |
| ociIndexDigest | Unveränderlicher GHCR-Index. |
| platformManifestDigest | Tatsächliches Linux-/AMD64-Manifest. |
| runtimeProviderDigest | Provider-Digest, muss dem Plattformmanifest entsprechen. |
| PRODUCT_EVIDENCE_BUNDLE_SHA256 | Manifest und neu berechnete Evidence-Dateihashes; zusätzlicher Fingerprint, niemals Ersatz für Image-/Runtime-Digests. |

Der Produktfingerprint wird im finalen Release-Report gespeichert. Er wird nicht als frei gesetzte Runtime-Env-Variable oder rückwirkend als Image-Label injiziert. Das bereits attestierte Image wird nicht neu gebaut.

## Webservice-Workflow

Bei `verify_production_handoff=true` müssen `product_evidence_artifact_id` und `product_evidence_run_id` auf ein verifiziertes GitHub-Artefakt und dessen Run mit dem gesamten Bundle zeigen. Download und Dateihashprüfung sind mandatory; anschließend wertet der bestehende Handoff alle alten technischen und den neuen Produkt-Gate gemeinsam aus. Build-/Publish-/Deploy-Läufe benötigen weiterhin die dafür vorhandene Owner-Autorisierung.

Der zusätzliche Release-Readiness-Prüfer liest dasselbe Bundle als drittes CLI-Argument nach Eingabe und Ausgabe: `node scripts/verify-release-readiness.mjs readiness.json report.json /geschuetztes-evidence-bundle/manifest.json`. Ohne Bundle bleibt auch `deployAllowed:false`.

## NATS

Der gelesene Main hat einen NATS-Build-/Scanpfad und einen manuellen, Docker-source-basierten Render-Blueprint. Ein attestierter NATS-GHCR-Promotionpfad sowie ein unabhängiger NATS-Registry-/Runtime-Digest-Readback sind dort noch nicht implementiert. Diese Richtlinie behauptet keine bereits erfolgte Umstellung.

Vor NATS-Production-Promotion ist derselbe Produktprüfer mit dem tatsächlichen NATS-GHCR-Digest auszuführen:

```bash
EXPECTED_MAIN_SHA=<exakter-main-sha> \\
EXPECTED_IMAGE_REF=<tatsaechlicher-nats-ghcr-digest> \\
RELEASE_COMPONENT=nats \\
node scripts/verify-product-release-prerequisites.mjs /geschuetztes-evidence-bundle/manifest.json
```

Zusätzlich müssen NATS-Source, Archiv, Config-, Index-, Plattform- und Runtime-Digest sowie SBOM/Attestations separat korreliert werden. Der Webservice-Digest darf niemals als NATS-Fingerprint verwendet werden. Der Produktprüfer allein autorisiert weder NATS-Publishing noch Deployment. Die konkrete NATS-GHCR-Repository-/Runtime-Migration bleibt ein separat zu prüfender Infrastruktur-Schritt; kein neuer Repo-HEAD löst einen Broker-Redeploy aus.

## Status und Rückweg

Die elf Voraussetzungen sind Ziel-/Abnahmebedingungen, keine hier bestätigten produktiven Erfolge. Es wurde weder ein vollständiger Katalog von 50 Komponenten noch ein vollständiges produktives Evidence-Bundle gefunden oder erzeugt. Solange dieses fehlt, bleibt die neue Freigabe BLOCKED. Rollback erfolgt durch Review eines Revert-PR; bestehende technische Gates dürfen dabei nicht abgeschwächt werden.
