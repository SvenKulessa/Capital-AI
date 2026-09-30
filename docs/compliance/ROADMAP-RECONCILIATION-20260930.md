# Roadmap-Abgleich mit dem Repository — 30.09.2026

Basis: SvenKulessa/Capital-AI@090b00bb432e329daf62129d10d2c5ca041662b6.

Die bestehende Roadmap enthielt unbelegte Fortschrittswerte (20–100 %), abgeschlossene Phasen ohne zugeordneten Abschlussnachweis und Cloud-Run-/Organisationsannahmen. Der Control-Center-Reiter zeigte zudem keine Arbeitspakete aus roadmapData.ts.

## Ergebnis

- 17 abgegrenzte aktuelle Pakete: 9 VERIFIED für den beschriebenen Repo- bzw. Deployment-Snapshotumfang; 6 OFFEN; 2 GEHALTEN.
- Alle 34 bisherigen Zielpakete bleiben mit ihren IDs und Abhängigkeiten erhalten. UNGEKLÄRT bedeutet fehlende Zuordnung eines vollständigen Abschlussnachweises in diesem Abgleich, keine Behauptung fehlender Implementierung.
- Keine geschätzten Prozentwerte für ungeprüfte Pakete und Phasen. Ziele werden ausdrücklich als geplantes Zielbild angezeigt.
- Roadmap-Karten im vorhandenen Reiter mit Projektowner-/Nachweisstatus-/Suchfilter und verlinkten Quellen; keine neue Roadmap-API.
- Readback: Render dep-daugip893c1s73e5rgug auf 090b00bb432e329daf62129d10d2c5ca041662b6. Das ist der Stand vor diesem Roadmap-PR.
- Erfolgreicher Dockerlauf 36715472658 auf 46ee077dea184a5defa84ef028fb93e3ac73fad5 bleibt ein älterer Quellnachweis.
- Domain-, NATS- und anonyme API-HTTP-Beobachtungen aus dem vorherigen Abgleich um 15:33 Uhr Berlin sind historisch gekennzeichnet. Sie werden nicht als neue Proben ausgegeben.
- Aktuelle Quelle belegt Datenschutz-API, deaktivierte Analytics, ZITADEL-Sessiongrenzen, Navigation, Branding und Datenzulassungsgrenzen. Produktive Abnahme und rechtliche Gesamtfreigabe werden daraus nicht abgeleitet.
- Offene PRs #38 (Social/SEO) und #39 (Architekturbericht) wurden auf Überschneidung geprüft; keine der hier geänderten Dateien enthalten.

## Vier Validierungsschritte

1. Main, Baum, offene PRs, Actions und Render-Deployment frisch lesen.
2. Paketquellen, IDs, Owner, Status, Abhängigkeiten und unbekannte Prozentwerte mit JavaScript prüfen.
3. Komponentenanschluss und Filterlogik prüfen. Der bestehende Control-Center-Reiter bleibt erhalten.
4. Remote-Diff, Main-Basis und PR-Mergefähigkeit lesen. TypeScript, Build und Browserprüfung sind NOT_RUN: Die bereitgestellte Ausführungsumgebung meldet einen Handshakefehler; kein ausführbarer Terminalzugang ist verfügbar. Keine CI oder Deploys ausgelöst.

Vor Human-Merge: TypeScript und Produktionsbuild auf diesem PR-Head prüfen. Nach Merge/deploy den Snapshot gegen neuen Main/Render und tatsächliche Domain-/Login-/Export-/NATS-Zustände aktualisieren.
