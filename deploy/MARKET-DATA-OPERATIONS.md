# Redis und NATS für Market Facts

Die Anwendung benötigt `REDIS_URL`, `NATS_URL`, `NATS_APP_USER` und `NATS_APP_PASSWORD`. `NATS_APP_PASSWORD` bleibt ausschließlich im Secret Store. Der produktive Broker verwendet eine Subject-beschränkte Runtime-Identität für `capital.facts.quote.*` und `capital.scores.crypto.*`; der alte `NATS_TOKEN` ist nur noch ein lokaler Migrationsfallback des Clients. TLS ist verpflichtend, sobald der Transport die bestätigte private Netzwerkgrenze verlässt. NATS betreibt JetStream mit Dateispeicher und persistentem Volume; Browser erhalten niemals direkten Redis-/NATS-Zugriff.

## Lokal

1. Unterschiedliche zufällige Secrets für `REDIS_PASSWORD` und `NATS_APP_PASSWORD` setzen; `NATS_APP_USER=capital-ai-market-runtime` verwenden.
2. `docker compose -f deploy/compose.market.yml up -d` ausführen.
3. Backend-Umgebung gemäß `deploy/market.env.example` setzen und `node server/index.mjs` starten.
4. `npm run test:market:integration` mit denselben Backend-Verbindungsdaten ausführen.

Der Integrationstest schreibt echte Test-Facts in die angegebenen Dienste. Nur isolierte Testinstanzen verwenden. Es werden keine produktiven Streams gelöscht oder gepurgt. Die Test-Payloads sind explizit als Test-Harness markiert und keine echten Provider-Beobachtungen.

## Render

Bestehenden Webservice und dessen Repo-Zuordnung zuerst prüfen. Redis/Key Value und NATS Private Service müssen im selben bestätigten Workspace und derselben Region liegen. Kein automatisches Anlegen kostenpflichtiger Dienste in diesem PR. `render.yaml` erhält nur manuell zu versorgende Verbindungsvariablen. NATS benötigt persistenten Speicher; einzelne Instanz und `NATS_REPLICAS=1` bieten keine Hochverfügbarkeit. Ein produktiver Cluster benötigt drei geeignete NATS-Instanzen mit Dateispeicher und `NATS_REPLICAS=3`.

## Fehler und Grenzen

- Nicht konfigurierte Dienste, unvollständige scoped NATS-Credentials, fehlende JetStream-Bestätigung, abgelaufene Quotes und ungültige Evidence werden fail-closed als `unavailable` geliefert.
- Cache-TTL basiert auf dem Beobachtungszeitpunkt, maximal 30 Sekunden. Cache-Werte werden gegen den Event-Speicher geprüft.
- Der Stream verweigert Delete/Purge und verdrängt bei der 1-GB-Grenze keine alten Events. Bei vollem Speicher stoppt die Aufnahme; Kapazitätsalarm und Archivierung sind Betriebsaufgaben.
- Keine WORM-, BaFin-, Backup- oder 45-ms-Zertifizierung. Produktive Asset-Werte bleiben gesperrt, solange keine Quelle mit `OPEN_SOURCE_OPEN_DATA_ADMITTED` und Capability `marketQuotes` zugelassen ist; Scoring bleibt zusätzlich bis `scoringPriceInput` und vollständigen Analyse-Inputs gesperrt.
- `/healthz` ist Liveness; `/api/market/status` zeigt Infrastrukturverbindungen. Eine laufende HTTP-App ist kein Nachweis verfügbarer Marktdaten.
- Feed-/Provider-Ausfälle dürfen durch eigene Überwachung alarmiert werden. Browser-Benachrichtigungen sind keine dauerhaft laufenden Alert-Worker.
