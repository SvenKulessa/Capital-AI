# CAPITAL-AI Social Media Engine — Produkt-/Lizenzgrenze

**Dokumenttyp:** Engineering License Boundary  
**Stand:** 2026-10-05  
**Owner:** Sven Kulessa / CAPITAL-AI  
**Work Package:** `CAPITAL-AI-FINANCE-SOCIAL-MARKET-MIGRATION-01`

## 1. Zweck

Dieses Dokument definiert die technische Lizenz- und Distributionsgrenze für die nach
`SvenKulessa/Capital-AI` migrierte und dort weiterentwickelte Social Media Engine.

CAPITAL-AI-eigener Quellcode, Dokumentation, Contracts, UI, Adapter und Produktlogik
bleiben unter der für CAPITAL-AI festgelegten proprietären Produktlizenz bzw. dem
jeweiligen Kundenvertrag. Dieses Dokument erteilt **keine** zusätzlichen Rechte an
Drittanbieter-Code, Modellen, Gewichten, Daten, Fonts, Medien, Marken oder APIs.

## 2. Drittanbieter bleiben separat

Jede Drittanbieterkomponente muss mit exakter Version/Revision, Artefaktidentität,
Lizenztext, NOTICE-/Attributionspflichten und zulässigem Nutzungsmodus im
maschinenlesbaren Tool-Admission-Inventar erfasst werden.

Ein Repository-Lizenzlabel ist kein ausreichender Nachweis für:

- Modellgewichte oder Checkpoints;
- Trainings-/Testdaten;
- Fonts, Musik, Stockmaterial oder Referenzmedien;
- Provider-/API-Nutzungsbedingungen;
- Rechte an generierten Outputs;
- Markt-/Finanzdaten und deren Anzeige, Speicherung oder Redistribution.

## 3. Produktfähige Modi

### COMMERCIAL_PRODUCT_BUNDLE

Die Komponente darf nur dann an Kunden ausgeliefert werden, wenn die konkrete
Redistribution und alle damit verbundenen Pflichten nachweislich kompatibel mit dem
CAPITAL-AI-Auslieferungsmodell sind.

### COMMERCIAL_INTERNAL_SERVICE

Die Komponente wird ausschließlich serverseitig/intern ausgeführt und ist nicht Teil
des Kundenartefakts. Der konkrete Lizenztext muss kommerzielle Service-Nutzung erlauben.
Die Trennung reduziert Distribution-Risiken, ersetzt aber keine Lizenzprüfung.

### OWNER_PRIVATE_COMMERCIAL_ALLOWED

Nur der Owner darf die Komponente im privaten Runtime-Profil nutzen. Kommerzielle
Outputs sind nur erlaubt, wenn die konkrete Drittanbieterlizenz diese Nutzung
ausdrücklich erlaubt. Der Modus erteilt selbst keine Rechte.

### OWNER_PRIVATE_NONCOMMERCIAL_ONLY

Der Owner darf die Komponente ausschließlich für nichtkommerzielle private
Experimente/Research verwenden. Resultate dieses Pfads dürfen nicht für:

- bezahlte Kunden;
- Produktmarketing oder Werbung;
- monetarisierte Social-Kanäle, soweit dies eine kommerzielle Nutzung darstellt;
- verkaufte Templates/Assets;
- kommerzielle Trainings-, Demo- oder Sales-Unterlagen

verwendet werden.

**Owner-private Ausführung hebt eine Non-Commercial-Klausel nicht auf.**

### RESEARCH_ONLY / BLOCKED_UNKNOWN

Keine produktive Generierung, keine Kundenauslieferung und keine kommerzielle
Content-Nutzung. UNKNOWN bleibt fail-closed.

## 4. Technische Isolation

```text
CAPITAL-AI Customer/Product Runtime
├─ commercially admitted bundled components
└─ admitted server-side service adapters

CAPITAL-AI Owner Private Runtime
├─ owner-private commercial-allowed tools
├─ owner-private noncommercial-only tools
└─ research-only tools

BLOCKED / UNKNOWN
└─ no execution
```

Owner-private Binaries, Gewichte und Modelle dürfen nicht durch Build, Container,
Download, SDK, Webbundle, Mobile-Bundle oder Export versehentlich in Kundenartefakte
gelangen.

## 5. Generierungs-Gate

Vor jedem lizenzsensitiven Generierungslauf muss mindestens feststehen:

1. konkrete Tool-/Modell-/Gewichtsidentität;
2. Artifact-Hash/Revision;
3. Runtime-Modus und aufrufende Rolle;
4. beabsichtigte Nutzung (privat, Research, Marketing, Kunde, Produkt);
5. kommerzielle oder nichtkommerzielle Absicht;
6. Rechte an allen Inputs;
7. Rechte an Markt-/Finanzdaten und Claims;
8. Output-Nutzungsrechte und erforderliche Kennzeichnungen;
9. erforderliche Attribution/NOTICE;
10. Provenienz des erzeugten Assets.

Fehlt ein Pflichtnachweis, wird die Generierung verweigert.

## 6. Social-Media-Engine als Kundenprodukt

Der verkaufte Funktionsumfang darf nur lizenzierte/admitted Capabilities ausweisen.
Eine Capability-Matrix unterscheidet mindestens:

- bundled;
- server-side service;
- BYOK/externer Provider;
- owner-private;
- research-only;
- unavailable.

Owner-private und Research-only Funktionen sind kein Bestandteil einer
Kundenlizenz und dürfen in Kunden-UI/API nicht als verfügbare Produktfunktion
beworben werden.

## 7. MARKET-/Finanzcontent

Für Charts, Scores und Marktclaims gelten zusätzlich die MARKET-Rechte- und
Freshness-Gates. Eine Social-Lizenzfreigabe ersetzt keine Datenlizenz. Research-,
Demo-, stale-, partial- oder nicht admitted Daten dürfen nicht als Live-/Realtime-/
produktiver Score-Claim ausgegeben werden.

## 8. Third-Party Notices

Vor einem kommerziellen Release muss aus dem Admission-Inventar ein
Third-Party-Notice-Bundle erzeugt werden, das nur tatsächlich im jeweiligen
Auslieferungsprofil verwendete Komponenten enthält.

## 9. Rechtliche Einordnung

Diese Datei ist eine technische Engineering-Grenze für fail-closed Packaging und
Runtime-Entscheidungen. Sie ersetzt keine individuelle Rechtsberatung und darf
unklare Drittanbieterrechte nicht in eine Freigabe umdeuten.
