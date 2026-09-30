# Echte Datenaufnahme – Architektur vor Implementierung

Audit-Basis: Main `03d964d` (PRs 14 und 15 gemergt). Implementierung abschließend auf Main `d646a1b` mit PRs 16 und 17 integriert. Keine Migration, kein Löschen bestehender Datenbanken und kein automatisches Cloud-Deployment.

## Grenzen

Provider-Adapter → validierte Beobachtung → NATS JetStream (Payload + SHA-256 + Publish-Ack) → Redis mit begrenzter TTL → HTTP-Vertrag → Marktkarte.

Redis ist ein austauschbarer Cache. JetStream ist der Ereignisspeicher; eine bestätigte Speicherung ist keine regulatorische WORM-Zertifizierung. Aufbewahrung, Zugriffsschutz, Backups und Replikation müssen separat betrieben werden. Fehlende Infrastruktur führt zu `unavailable`; Ausfälle oder veraltete Daten werden nicht durch Seed-Daten ersetzt.

Instrumente werden über Symbol, Börse und Quote-Währung unterschieden. BTC/USD wird niemals aus BTC/USDT umgerechnet. Bid, Ask, Volumen, Historie und Scores bleiben null, wenn die Quelle sie nicht liefert. Technische Validierung eines Payloads bestätigt weder eine Prognose noch Nutzungsrechte des Providers.

## Änderungsumfang

- Backend: gemeinsame Laufzeitverträge, Redis/NATS-Clients, versionierte Facts, Evidence-Replay, Status-API, Provider-Datenaufnahme und Shutdown.
- UI: zentraler Echt-Datenstore, bestehende Marktseiten und Karten; produktive Seed-Kurse, Demo-Scorer, erfundene Whale-Flows, Sentiment und Analysen sperren.
- Deployment: Docker-Laufzeitabhängigkeiten, Compose für lokale Dienste, Umgebungsvariablen und Betriebsanleitung.
- Unberührt: Markenfarben, Bilder, Lizenzbelege, Rechtsseiten und bestehende Route-Namen.

## Offene Datenversorgung

Die bisherigen Adapter liefern nur Quotes für BTCUSDT, BTCUSD und gegebenenfalls AAPL mit Zugangsdaten. News, Unternehmenszahlen, Sektorhistorien, L2, Derivate und On-Chain-Daten haben keine produktiv validierte Quelle. Die 50 Komponenten werden dadurch nicht automatisch aktiv. Rankings und Alerts bleiben gesperrt, bis ihre jeweiligen Pflichtdaten, Formeln und Evidence vollständig validiert sind.
