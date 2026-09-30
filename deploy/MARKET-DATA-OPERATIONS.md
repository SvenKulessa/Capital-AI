# Redis und NATS für Market Facts

Die Anwendung benötigt `REDIS_URL`, `NATS_URL` und bei Token-Authentifizierung `NATS_TOKEN`. Secrets nur im Secret Store konfigurieren. TLS-URLs verwenden, wenn der Transport außerhalb eines geschützten privaten Netzes liegt. NATS muss JetStream mit Dateispeicher und persistentem Volume betreiben. Der Browser hat keinen Zugriff auf Redis oder NATS.

## Lokal

1. Unterschiedliche zufällige Secrets für `REDIS_PASSWORD` und `NATS_TOKEN` setzen.
2. `docker compose -f deploy/compose.market.yml up -d` ausführen.
3. Backend-Umgebung gemäß `deploy/market.env.example` setzen und `node server/index.mjs` starten.
4. `npm run test:market:integration` mit denselben Backend-Verbindungsdaten ausführen.

Der Integrationstest schreibt echte Test-Facts in die angegebenen Dienste. Nur isolierte Testinstanzen verwenden. Es werden keine produktiven Streams gelöscht oder gepurgt. Die Test-Payloads sind explizit als Test-Harness markiert und keine echten Provider-Beobachtungen.

## Render

Bestehenden Webservice und dessen Repo-Zuordnung zuerst prüfen. Redis/Key Value und NATS Private Service müssen im selben bestätigten Workspace und derselben Region liegen. Kein automatisches Anlegen kostenpflichtiger Dienste in diesem PR. `render.yaml` erhält nur manuell zu versorgende Verbindungsvariablen. NATS benötigt persistenten Speicher; einzelne Instanz und `NATS_REPLICAS=1` bieten keine Hochverfügbarkeit. Ein produktiver Cluster benötigt drei geeignete NATS-Instanzen mit Dateispeicher und `NATS_REPLICAS=3`.

## Fehler und Grenzen

- Nicht konfigurierte Dienste, fehlende JetStream-Bestätigung, abgelaufene Quotes und ungültige Evidence werden als `unavailable` geliefert.
- Cache-TTL basiert auf dem Beobachtungszeitpunkt, maximal 30 Sekunden. Cache-Werte werden gegen den Event-Speicher geprüft.
- Der Stream verweigert Delete/Purge und verdrängt bei der 1-GB-Grenze keine alten Events. Bei vollem Speicher stoppt die Aufnahme; Kapazitätsalarm und Archivierung sind Betriebsaufgaben.
- Keine WORM-, BaFin-, Lizenz-, Backup- oder 45-ms-Zertifizierung. Provider-Nutzungsrechte bleiben `unverified`; Rankings und Alerts bleiben gesperrt.
- `/healthz` ist Liveness; `/api/market/status` zeigt Infrastrukturverbindungen. Eine laufende HTTP-App ist kein Nachweis verfügbarer Marktdaten.
- Feed-/Provider-Ausfälle dürfen durch eigene Überwachung alarmiert werden. Browser-Benachrichtigungen sind keine dauerhaft laufenden Alert-Worker.
