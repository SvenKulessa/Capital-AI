# Binance Spot: WebSocket-Laufzeit und Kursdarstellung

Stand: 2026-10-09. Basis-main: `3a763958ecb6730930ffba66bfa5491c0c19f93a`.

## Umsetzung und Grenzen

`server/market.mjs` bindet den bestehenden Binance-Spot-Adapter für konfigurierte,
kanonisch gemappte Instrumente an `startStreams()` an. Der bestehende
`evaluateSpotIngestion()` prüft vor **jeder** Verbindung Runtime-Flags,
Quellenrechte, Instrument und Quotes-Konfiguration. Binance bleibt in der
unveränderten Quellenpolicy gesperrt. Keine Production-Aktivierung erfolgt
durch diese Implementierung oder einen erfolgreichen Test.

Der Supervisor prüft Sitzungen alle fünf Sekunden, verbindet nach Abbruch mit
5/10/20/40/60 Sekunden plus bis zu einer Sekunde Jitter neu und beendet sich bei
einer verweigerten Sitzung. Ein akzeptierter, replay-verifizierter Kurs setzt
den Backoff zurück; eine offene Verbindung allein genügt nicht. Die bestehende
Sitzungsrotation nach 30 Minuten wird dadurch fortgesetzt. Ein Watchdog beendet
Sitzungen ohne akzeptierten Kurs nach 30 Sekunden. Subscription-Acknowledgements
werden nicht als Fehler gezählt; `serverShutdown` beendet die Sitzung. Maximal
ein Kurs pro Sekunde wird zur bestehenden Persistenz weitergereicht; weitere
Frames werden ohne Queue verworfen. Das ist ein gesampelter Kursfeed, **keine
vollständige Trade-Historie** und keine geeignete Datenbasis für Trade-Count-,
Tick-Volume- oder Orderbuch-Features.

Unter Market Intelligence → **Krypto-Kursverlauf** zeigt die UI `BTCUSDT` in
`USDT`, sobald die bestehende öffentliche Kursprojektion einen berechtigten,
frischen, replay-verifizierten Wert liefert. Nur diese Projektion wird verwendet;
private Vault-Snapshots werden weder gelesen noch veröffentlicht. Keine direkten
Binance-Verbindungen aus dem Browser, keine Secrets und keine zusätzlichen
Abhängigkeiten. Die bestehende Pollingfrequenz wird nicht erhöht.

Der Sitzungsverlauf hält höchstens 120 Beobachtungen aus 30 Minuten im Speicher.
Die X-Achse beruht auf echten Beobachtungszeiten; Lücken über 90 Sekunden werden
nicht verbunden. Minimum, Maximum, Zeitraum, Einheit und Quellenbeleg werden
textuell mitgeführt. Veraltete Kurse und Kurven verschwinden nach 30 Sekunden.
Die Veränderung ist `100 * (letzter / erster - 1)` im **dargestellten Zeitraum**,
keine 24h-Änderung. Ein einzelner Kurs erzeugt weder Kurve noch Score. Keine
Rendite-, Qualitäts-, Partnerschafts- oder vollständige Live-Coverage-Zusage.

## Kommerzielle Rechte: NOT_PROVEN / öffentliche Aktivierung BLOCKED

Die offizielle Spot-Dokumentation verweist auf die Binance-Produktbedingungen:

- [Spot Product Terms pointer](https://github.com/binance/binance-spot-api-docs/blob/master/PROD-TERMS-OF-USE.md)
- [Binance Terms](https://www.binance.com/en/terms)
- [Über diese Terms-Seite abgerufenes Global-Terms-PDF, 17.07.2026](https://bin.bnbstatic.com/static/cms/cg08ou2ak0tn7mcplvfg/file/bf4879710c904b991848972ec4818ba2cf9e4ce314c09adae84fa2750d3477f7.pdf)
- [Offizielles WebSocket-Protokoll](https://github.com/binance/binance-spot-api-docs/blob/master/web-socket-streams.md)

Das abgerufene Global-Terms-PDF begrenzt in Abschnitt 27 die Binance-IP-Lizenz
auf persönliche nichtkommerzielle oder interne geschäftliche Nutzung. Das ist
**kein Beleg einer kommerziellen Redistribitions-/Display-Lizenz**. Welche
Binance-Entität, regionale Bedingungen und ergänzenden Datenverträge für CAPITAL
AI anwendbar sind, ist noch ungeklärt. Es wird keine pauschale rechtliche Aussage
über jeden Binance-Datenpfad abgeleitet. Bedingungen der Vision-Archivdatasets
werden nicht ungeprüft auf Spot-WebSocket-Daten übertragen.

| Zweck | Nachweis |
| --- | --- |
| Spot-WebSocket-Protokoll und Trade-Zeit `T` | VERIFIED, offizielle Dokumentation |
| Öffentliche kommerzielle Kursanzeige | NOT_PROVEN |
| Abgeleitete Scores, Rankings und Kunden-Analytics | NOT_PROVEN |
| NATS-Verteilung, Valkey-Cache, Replay, Aufbewahrung | NOT_PROVEN |
| Gebiets-/Kunden-/Endnutzerumfang | NOT_PROVEN |
| Providerpreis, SLA, verbleibendes Kontingent | NOT_PROVEN |
| Öffentliche Binance-Runtime auf main | BLOCKED, bestehende Policy |

## Nächste überprüfbare Schritte

1. Schriftlichen, zur Binance-Entität und Spot-Datenquelle passenden Rechtebeleg
   für Web-Display, Ableitungen, Speicherung und Verteilung beschaffen; Kosten,
   Laufzeit, Region und Widerruf festhalten. Vertragsabschluss bleibt Owner-Aktion.
2. Vorhandenen `commercialLicensedDataLane.ts`-Vertrag gegen die tatsächlichen
   Rechte prüfen. Die Runtime nutzt derzeit ausschließlich die Open-Data-Policy;
   eine kommerzielle Lizenz darf nicht als Open-Data-Lizenz umetikettiert werden.
   Ein separater, konkret lizenzierter Runtime-Pfad erfordert den realen Beleg.
3. Nach erlaubter Anbindung einen realen Socket→NATS→Replay→Valkey→UI-Roundtrip
   sowie Idle-, Reconnect-, Retention- und Lastnachweis durchführen. Node native
   WebSocket-Ping/Pong und das reale Providerverhalten sind noch nicht live belegt.
4. Für Scoring vollständige OHLCV-/Liquiditäts-/Feature-Daten mit jeweiligen
   Rechten und Modellversion ergänzen; ein gesampelter letzter Trade genügt nicht.
5. Bestehende Scoring-Contracts und `safeScorePresentation` verwenden. Die neue
   Unterseite weist den Score bis dahin ausdrücklich als nicht verfügbar aus.

Empfehlung: bestehende Pipeline mit belegtem Binance-Vertrag erweitern.
Alternative: eine explizit für Web-Display und Derived Analytics lizenzierte
Kryptoquelle verwenden. Beide Optionen benötigen belegte Konditionen; BYOK ist
keine Ersatzlizenz. Betriebsfolgekosten entstehen insbesondere durch dauerhafte
WebSocket-Verarbeitung, NATS-Evidence-Speicher und Netzwerkverkehr. In diesem PR
werden weder Tarife abgeschlossen noch kostenpflichtige Ressourcen aktiviert.

## Validierung

`npm run test:binance` prüft verweigerte Verbindungen ohne I/O, Lifecycle-Reconnect,
Backoff, Widerruf, Shutdown-Cleanup, Provider-Protokolle und private Isolation
sowie UI-Vertrag, Kursfrische, Zeitachsen, Verlaufslimits und leere Scoreausgabe.
Zusätzlich `npm run test:market`, `npm run test:analysis-ui`, `npm run lint`,
`npm test` und Build prüfen. Fixtures sind Testdaten und kein Live-Marktnachweis.
