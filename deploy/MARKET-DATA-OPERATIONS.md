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
- Cache-Werte werden gegen den Event-Speicher geprüft. Realtime-Facts haben maximal 30 Sekunden TTL; ECB-Reference-Facts verwenden separat bis zu acht Tage ab belegtem `publishedAt`. Diese längere Reference-Freshness ist kein Realtime-Claim.
- Der Stream verweigert Delete/Purge und verdrängt bei der 1-GB-Grenze keine alten Events. Bei vollem Speicher stoppt die Aufnahme; Kapazitätsalarm und Archivierung sind Betriebsaufgaben.
- Keine WORM-, BaFin-, Backup- oder 45-ms-Zertifizierung. Produktive Asset-Werte bleiben gesperrt, solange keine Quelle mit `OPEN_SOURCE_OPEN_DATA_ADMITTED` und Capability `marketQuotes` zugelassen ist; Scoring bleibt zusätzlich bis `scoringPriceInput` und vollständigen Analyse-Inputs gesperrt.
- `/healthz` ist Liveness; `/api/market/status` zeigt Infrastrukturverbindungen. Eine laufende HTTP-App ist kein Nachweis verfügbarer Marktdaten.
- Feed-/Provider-Ausfälle dürfen durch eigene Überwachung alarmiert werden. Browser-Benachrichtigungen sind keine dauerhaft laufenden Alert-Worker.


## ECB Euro FX Reference-Rate Adapter

Der native Adapter `server/ecb-reference-rates.mjs` verarbeitet ausschließlich die von der Europäischen Zentralbank veröffentlichte Daily-XML der Euro-Referenzkurse. Er benötigt keine Provider-Credentials und keine zusätzliche Runtime-Library.

Aktivierung ist zweifach fail-closed:

- `MARKET_QUOTES_ENABLED=true`
- `MARKET_ECB_REFERENCE_RATES_ENABLED=true`

Ohne beide Flags findet durch den ECB-Adapter kein Netzwerk-I/O statt. Die Source Admission allein aktiviert keinen Fetch.

### Zeitsemantik

ECB-Werte sind `timeSemantics=reference`, niemals `realtime`.

- `referenceDate`: das von der ECB gelieferte Kalendertag-Feld.
- `observedAt`: `referenceDateT00:00:00.000Z` mit `observedAtPrecision=date`; dieser Timestamp behauptet keine Messung um 00:00 Uhr.
- `publishedAt`: ausschließlich aus dem HTTP-`Last-Modified`-Header der ECB-Ressource. Fehlt ein valider Header, failt der Fetch mit `ECB_PUBLISHED_AT_UNVERIFIED`.
- `receivedAt`: lokaler Empfangszeitpunkt nach vollständigem Lesen der Response.
- `bid`, `ask` und `volume24h`: für Reference Rates zwingend `null`.
- `executionPrice=false`, `decisionEligible=false`.

Der Adapter pollt bei aktivierter Runtime höchstens alle 30 Minuten. Das ist lediglich ein Abrufintervall und kein Realtime- oder Latenz-SLA.

### Evidence und Cache

Jeder akzeptierte ECB-Wert wird wie andere Market Facts zuerst in `CAPITAL_FACTS` publiziert. Erst nach gültigem JetStream-PubAck entsteht eine `evidenceId`; unmittelbar danach wird der Fact über diese ID replayed und byte-/schema-semantisch gegen das persistierte Original geprüft.

Valkey bleibt ein rekonstruierbarer Hot State und keine Evidence-Authority. Für klassische Realtime-Facts gilt weiterhin maximal 30 Sekunden Cache-TTL. Für `reference`-Facts gilt eine semantisch getrennte maximale Freshness von acht Tagen ab belegtem `publishedAt`, um Wochenenden/Feiertage abzudecken. Ein Reference-Fact wird dadurch nicht zu Live-Daten.

### Runtime-Ready und Scoring

`OPEN_SOURCE_OPEN_DATA_ADMITTED` erlaubt den ECB-Reference-Rate-Datenpfad, ist aber kein Production-Ready-Claim. `runtimeReady` darf erst nach realem Runtime-Nachweis für verbundenes `CAPITAL_FACTS`, erfolgreichen ECB-Fetch, 20/20 Mapping, HTTP-Publikationsevidence, PubAck und Replay projiziert werden.

Obwohl die Source `scoringPriceInput=true` besitzt, bleibt `scoreDisplayEnabled=false`. Feature-, Data-Quality-, Scoring-, Ranking-, Alert- und Decision-Evidence sind separate Gates und werden durch diesen Adapter nicht freigeschaltet.
