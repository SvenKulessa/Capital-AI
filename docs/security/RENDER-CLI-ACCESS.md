# Render: lesende Zugriffs- und NATS-Diagnose

Der manuelle Workflow **Render CLI read-only verification** verwendet ausschließlich
`secrets.RENDER_API_KEY_TEST` als `RENDER_API_KEY`. Ein Repository-Secret lässt sich
nicht in die ChatGPT-Ausführungsumgebung zurücklesen. Der Name des Secrets begrenzt
nicht die providerseitigen Berechtigungen des Schlüssels.

## Ausführung

Nach Merge: Actions → Render CLI read-only verification → Run workflow → Branch
`main`. Der neue Parameter `mode` bietet:

- `nats` (Standard): Render-Zugriff, Capital-AI-Live-Deployment sowie NATS-Status
  und bereinigte Log-Auswertung; keine OIDC-Env-Abfrage.
- `oidc`: bisheriger Render-/OIDC-Nachweis; fehlende Credential-/Login-Evidence
  führt weiterhin zu einem roten Ergebnis.
- `both`: beide Diagnosen; die unabhängige OIDC-Grenze bleibt fail-closed.

Der Workflow ist nur für `SvenKulessa/Capital-AI` auf `main` ausführbar,
hat `contents: read`, einen Drei-Minuten-Timeout und keinen automatischen Trigger.
Render CLI 2.28.0 wird vor Verwendung des Secrets anhand des bestehenden
SHA-256-Pins verifiziert. Checkout-Credentials werden nicht persistiert.

## NATS-Diagnose

Die API-Ziele sind fest allowlisted:
Workspace `tea-d90o4rj7uimc739i86ug`, NATS
`srv-dauhcoojo6nc738eedjg` und Capital-AI `srv-dau1rp893c1s73cdhm1g`.
Vor Log-Abfragen werden ID, Owner, Name, Servicetyp und Region Frankfurt aus
den Service-Antworten geprüft.

Die Diagnose verwendet ausschließlich GET für Service-, Deployment- und
Log-Abfragen. Ausgewertet werden die letzten 15 Minuten:

- NATS-Auth-Fehler und deren Anteil mit IPv6-Loopback-Adresse;
- erfolgreiche CADS-Events `quote.publish_ack` und `quote.replay`;
- erster/letzter beobachteter Zeitpunkt, NATS-Live-Deploy, Suspendierungsstatus,
  gelisteter Client-Port 4222 und persistenter Mount `/var/data`.

Je Log-Kategorie werden maximal drei Seiten mit je 100 Einträgen gelesen,
mit Deduplication und validierten Zeitfenster-/Resource-Grenzen.
`completeWindow=false` kennzeichnet eine begrenzte Stichprobe.
Das API-Zeitbudget beträgt 75 Sekunden, einzelne Requests höchstens zehn
Sekunden und Antworten höchstens 2 MiB. API-/Schema-/Allowlist-Fehler bleiben
BLOCKED; HTTP-Fehler veröffentlichen nur den Statuscode.

Veröffentlicht werden ausschließlich feste Statusfelder, Zähler, validierte
Zeitpunkte und der Source-SHA im Job Summary. Rohmeldungen, Labels, API-Antworten,
Tokens und ENV-Werte werden weder veröffentlicht noch als Artefakt hochgeladen.
Der NATS-Modus hält API-Antworten nur im Speicher. Die bestehenden temporären
CLI-/OIDC-Dateien werden über `always()` entfernt.

Kein Secret wird rotiert, kein Service geändert, kein Deploy ausgelöst und
keine E-Mail gesendet. Ein Diagnoseergebnis ersetzt keine Production-Freigabe.

## Grenzen

Log-Events sind Beobachtungsevidence, kein unabhängiger vollständiger
Pipeline-Benchmark. Leere Logs beweisen keine erfolgreiche Authentifizierung.
Die Diagnose identifiziert keinen lokalen Prozess und untersucht keine
NATS-CONNECT-Pakete. Daher bleibt `processIdentity=UNVERIFIED`.
Die volle Pipeline-Latenz, 100 Assets je Klasse, GHCR-Digest-Identität und
Production-Handoff werden nicht freigegeben.

Der API-/CLI-Zugriff wurde durch den Owner-Lauf #6 vom 2026-10-03 auf
`d0334ac1426680ed82fe67c987a6ea49c8b6f83d` nachgewiesen. Dieser historische
Lauf enthielt noch keine NATS-Diagnose; er scheiterte ausschließlich im
separaten OIDC-Verifikationsschritt.

Referenzen:
- https://github.com/SvenKulessa/Capital-AI/actions/runs/37148252612
- https://api-docs.render.com/reference/list-logs
- https://render.com/docs/cli
- https://github.com/render-oss/cli/releases/tag/v2.28.0
