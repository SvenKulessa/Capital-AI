# Prüfung und Einrichtung des neuen Capital-AI-Services

## Beobachteter Stand am 29.09.2026

- Render-Plugin authentifiziert; Workspace AICapital: tea-d90o4rj7uimc739i86ug.
- Produktiver Finance-Service: srv-d91o1o9o3t8c73edi55g, Docker aus capital-ai-online/Finance, Frankfurt, eine Starter-Instanz, Auto-Deploy aus, /healthz. Keine Änderung durch diesen Slice.
- SvenKulessa/Capital-AI: PR #2 gemergt, Main 2bbb2e76797522f0a5c123b724dbac78b1be6fd6. Der manuelle Docker-Sicherheitsworkflow ist vorhanden; noch kein beobachteter Actions-Lauf oder freigegebenes GHCR-Image.
- Kein Capital-AI-Service beobachtet. Das installierte Render-MCP kann keine image-backed Services erstellen. OAuth erlaubt Toolaufrufe, stellt aber keinen exportierbaren API-Schlüssel bereit. RENDER_API_KEY ist in der Arbeitsumgebung nicht konfiguriert.

## Bewertung des vorgeschlagenen Konzepts

Build once, promote the same digest ist passend. Ein Git-Commit-Tag ist nur eine lesbare Referenz; Deploys verwenden den SHA-256-Manifest-Digest. BuildKit-Provenance, SBOM und GitHub Artifact Attestation sind unterschiedliche Nachweise. Eine SBOM oder eine erfolgreiche Signaturprüfung belegt allein weder CVE-Freiheit noch SLSA L2/L3. Keine SLSA-Level-Behauptung ohne Prüfung der Builder-Anforderungen.

Der neue Server benötigt derzeit nur Node-Built-ins; prod-deps-, GA4-MCP- und Worker-Stufen werden nicht aus dem alten Finance-Repository übernommen. Worker bleiben spätere Ausbauschritte. npm ci und der Frontend-Build dürfen keine Marktdaten abfragen. Binance/Kraken bleiben bevorzugte WebSocket-Ingestion; Twelve Data/Polygon passen als instrument-/währungsgebundene Fallbacks. USD und USDT bleiben getrennt. Polygon wird nicht pauschal vor die Börsenfeeds gestellt.

Der vorhandene build-security-Workflow exportiert und prüft lokale Docker-Images. Er veröffentlicht noch kein GHCR-Release und erzeugt noch keine kryptografisch verifizierte GitHub Artifact Attestation. Er wird nicht als bereits fertige Release-Pipeline bezeichnet.

## Fünf obligatorische Release-Gates

1. Source: exakter vertrauenswürdiger Main-Commit, TypeScript, Offline-Tests, Deploy-Konfiguration und Scope-Prüfung.
2. Supply chain: Secrets, alle Build-/Runtime-Abhängigkeiten und Lizenz-/Redistribution-Prüfung; keine Findings oder nicht entschiedenen blockierenden Lizenzen.
3. Build und CVEs: linux/amd64 einmal bauen. Das resultierende Artefakt einschließlich Buildwerkzeugen scannen. HIGH/CRITICAL und Scannerfehler blockieren; keine ignore-unfixed-Ausnahme.
4. Evidence und Veröffentlichung: dasselbe Artefakt mit SBOM und Build-Provenance nach GHCR übernehmen. Falls die Attestierung die Registry benötigt, zuerst als nicht deploybare Kandidatenreferenz pushen. Den tatsächlichen Manifest-Digest ermitteln, remote erneut prüfen und GitHub-Attestation gegen Repository, erwarteten Release-Workflow und Quellcommit verifizieren. Erst dann Release-Manifest mit Digest, Commit, Prüflauf und Nachweisen ausgeben. Kein Rebuild bei Promotion.
5. Runtime: neuen Service mit dem freigegebenen Digest anlegen; Provider-Secrets nur zur Laufzeit. Render-Service/Deploy-ID und API-seitig gemeldetes Image mit dem Manifest vergleichen; /healthz und Smoke-Test prüfen. Ein frei gesetzter Umgebungswert oder ein HTTP-200 allein beweist keinen tatsächlich laufenden Image-Digest. Rollback auf einen weiterhin vorhandenen, zuvor geprüften Digest.

Wiederherstellung nach Fehlern nutzt denselben Prozess: konkreten Fehler korrigieren, neuen Kandidaten erzeugen, fünf Gates erneut ausführen. Keine unabhängige Self-Healing- oder Deploy-Authority.

## Konkrete neue Service-Einstellungen

Die maschinenlesbaren Werte stehen in deploy/render-image-profile.json. Starter entspricht dem bereits gemergten neuen render.yaml; eine neue Instanz verursacht zusätzliche Hostingkosten. Eine Instanz, Frankfurt, Port 10000, Healthcheck /healthz, Vorschauen aus, zunächst nur onrender.com. Keine bestehende Produktionsdomain umhängen und keine Secrets/Environment-Groups von Finance kopieren. Private GHCR-Images benötigen ein separates Registry-Pull-Credential mit read:packages. Keine Veröffentlichung oder Änderung der Package-Sichtbarkeit impliziert.

Nach erfolgreicher Release-Freigabe:

```sh
node scripts/prepare-render-image.mjs "$VERIFIED_IMAGE_REF" > render-image.yaml
```

Der Generator akzeptiert nur ghcr.io/svenkulessa/capital-ai@sha256:<64 lowercase hex>. Er prüft Syntax/Registry, nicht die Sicherheitsnachweise. Die generierte Blueprint-Datei anschließend mit Render CLI/API validieren und ausschließlich im Workspace AICapital anwenden. Bei privatem Image zunächst ein Registry-Credential in Render hinterlegen und image.creds gemäß Render-Schema ergänzen. Keine Zugangsdaten in Git speichern.

Für prebuilt Images ersetzt runtime:image die Git-/Docker-Build-Einstellungen. Render baut dann nicht neu. autoDeployTrigger gilt laut Render nur für Git-backed Services; ein neuer Registry-Tag startet keinen Image-Deploy. Der generierte Blueprint enthält daher keinen scheinbaren Auto-Deploy-Schutz. Deploys werden nur nach Freigabe explizit ausgelöst.

Das vorhandene render.yaml bleibt als Git-backed Bootstrap-Konfiguration bestehen. Für den endgültigen Service nur den generierten Image-Blueprint anwenden; keinen zweiten gleichnamigen Service über den Bootstrap erstellen. Vor Anlage vorhandene Services erneut lesen, um Duplikate zu verhindern.

## Aktuelle Fortsetzungsgrenze

Vor Serviceanlage fehlen ein tatsächlich gebautes/geprüftes/attestiertes GHCR-Image und dessen Digest. Danach benötigt die Anlage entweder den Render-REST-API-Zugriff mit sicher bereitgestelltem Schlüssel oder die ausdrücklich freigegebene Dashboard-Bedienung. Der Schlüssel, den der Render-Connector intern verwendet, kann hier nicht ausgelesen oder in eine Shell exportiert werden.

## Autoritative Quellen

- https://render.com/docs/deploying-an-image
- https://render.com/docs/blueprint-spec
- https://render.com/docs/mcp-server
- https://docs.github.com/en/actions/how-tos/secure-your-work/use-artifact-attestations/use-artifact-attestations
- https://cli.github.com/manual/gh_attestation_verify
