# Krypto-Marktsignale

Der Workflow ist für XRP, SOL und POL im Vier-Stunden-Rhythmus ab 00:10 UTC ausgelegt. Pro Zeitfenster entsteht höchstens ein Entwurf. Der Owner kann den konkreten Inhalt unter **Control Center → News** für die Startseite freigeben, ablehnen oder zurücknehmen.

## Daten und Methodik

- Offizielle stabile Releases aus XRPLF/rippled, anza-xyz/agave und 0xPolygon/bor werden über die [GitHub Releases API](https://docs.github.com/en/rest/releases/releases#list-releases) gelesen. Veröffentlichungsdatum, Link und der Inhalt des begrenzten Auszugs gehen in die Quellenevidenz ein. Die öffentliche Ansicht zeigt Links und Datum.
- Der vorhandene Adapter ist für CoinGecko Pro OHLC ausgelegt und unter der MARKET-Quellenrichtlinie gesperrt. Die Auswertung verlangt 25 lückenlose, abgeschlossene Stundenkerzen in EUR. Die neueste darf beim Abruf höchstens zwei Stunden alt sein.
- [Ollama (MIT)](https://github.com/ollama/ollama/blob/main/LICENSE) klassifiziert Releases mit [Qwen2.5-1.5B-Instruct (Apache-2.0)](https://huggingface.co/Qwen/Qwen2.5-1.5B-Instruct). Das Modell gibt ausschließlich klassifizierte Labels zurück. Die Richtung des Kursausbruchs und alle Preisniveaus werden rechnerisch ermittelt.
- Ein Kauf- oder Short-Setup erfordert den Ausbruch aus der Spanne der vorigen 24 Stunden, mindestens 0,5 Prozent Abstand zum mittleren Schlusskurs in Ausbruchsrichtung und passendes Nachrichtensentiment. Bei zu hoher Handelsspanne oder fehlender Bestätigung bleibt das Ergebnis „Beobachten“. Einstieg ist der letzte Schlusskurs, Invalidation liegt eine mittlere Stundenhandelsspanne entfernt und das Szenarioziel zwei. Der Score setzt sich aus bis zu 45 Punkten für den Ausbruch, 35 für Momentum und 20 für passendes Sentiment zusammen. Der Score ist keine Erfolgswahrscheinlichkeit. Die Strategie hat hier keinen nachgewiesenen historischen Renditenachweis.

## Betrieb und Aktivierung

Der Lauf ist standardmäßig deaktiviert. Die bestehenden Content-Engine- und CADS-Verträge prüfen die Form des Entwurfs. Das Social Package bindet die Website-Freigabe an den Hash des Inhalts. Ein neues Zeitfenster benötigt seine eigene redaktionelle Freigabe. Externe Social-Provider und Order-Schnittstellen werden nicht aufgerufen.

Die [MARKET-Quellenrichtlinie](../../server/open-source-market-policy.mjs) sperrt CoinGecko. Der Workflow prüft beim Start, ob die Kursquelle für Krypto-Scoring und Laufzeitnutzung zugelassen ist. Ein gesetztes Feature-Flag, ein Schlüssel und HTTPS-Nachweisreferenzen allein lassen die Endpunkte inaktiv und lösen keinen Abruf aus.

Für eine Aktivierung braucht der Workflow einen zugelassenen Krypto-OHLC-Adapter, belegte Rechte für die vorgesehene Nutzung und die KI-Verarbeitung der Release-Auszüge, einen autorisierten Inferenzendpunkt sowie ein geprüftes persistentes Volume unter `/var/data`.

Bei einem fehlgeschlagenen Abruf bleiben betroffene Assets aus dem Entwurf. Ohne gültigen oder rechtzeitig freigegebenen Entwurf zeigt die Startseite keinen Beitrag. Für die Rücknahme laufender Veröffentlichungen steht im Control Center die Rücknahme bereit. Das Feature-Flag kann den gesamten Workflow deaktivieren.


## P0 Rechte- und Frische-Readback · 22.11.2026

**Aktuelle Authority:** Das [maschinenlesbare MARKET-Recherchemanifest](../../docs/market-data/evidence/crypto-eur-ohlc-rights-assessment-20261122.json) ist **keine** Source-Admission, kein Vertrag, keine Freigabe und kein Nachweis eines Live-Datenabrufs. Lizenzinhaber/Vertragspartner des CAPITAL-AI-Accounts, Tarif, konkrete Feed-/Instrument-Scope, Vertrags-/AGB-Bytes-Digest, Retention/Replay und operative Kosten sind `NOT_PROVEN`; im Manifest steht dafür `null`. Anbieterbezeichnungen sind nur potenzielle Datengeber, **nicht** nachgewiesene Vertragsgegenparteien.

| Potenzielle Quelle / öffentliche Primärquelle | Kommerzielle Derived Scores | Display | Retention / Replay | Drittvertrieb | Decision |
| --- | --- | --- | --- | --- | --- |
| [Binance Vision](https://github.com/binance/binance-public-data/blob/master/TERMS_AND_CONDITIONS.md), Standard-Archivbedingungen | Nichtkommerzieller Standard – **BLOCKED** | **BLOCKED** für kommerziellen Scope | **NOT_PROVEN** | **BLOCKED** | **BLOCKED** |
| [Coinbase Market Data Terms](https://www.coinbase.com/legal/market_data), Stand 07.08.2026 | Ohne schriftliche Sonderrechte **BLOCKED** für Kundennutzung | Abgeleitete Fremdanzeige **BLOCKED** | **NOT_PROVEN** | **BLOCKED** | **BLOCKED** |
| [Kraken OHLCVT](https://support.kraken.com/articles/360047124832-downloadable-historical-ohlcvt-open-high-low-close-volume-trades-data) | **NOT_PROVEN** | **NOT_PROVEN** | **NOT_PROVEN** | **NOT_PROVEN** | **BLOCKED**: Quartalsarchiv nicht frisch genug |
| [Coin Metrics Community](https://github.com/coinmetrics/data/blob/master/LICENSE) | CC BY-NC 4.0 – **BLOCKED** | Kommerziell **BLOCKED** | **NOT_PROVEN** | **BLOCKED** | **BLOCKED** |
| [CoinGecko Lizenzen](https://support.coingecko.com/articles/1043089972-what-are-the-differences-between-commercial-and-custom-licenses), Stand 19.10.2026 | Entgeltlicher Standardtarif kann Berechnungen erlauben; **kein** accountbezogener Vertrag nachgewiesen | Mit Attribution je bezahltem Lizenzumfang grundsätzlich möglich, konkreter Scope **NOT_PROVEN** | **NOT_PROVEN** | Sonderlizenz erforderlich; ohne sie **BLOCKED** | **BLOCKED** durch MARKET-Policy |
| [Twelve Data Terms](https://twelvedata.com/terms) / [geschäftliche Nutzung](https://support.twelvedata.com/en/articles/5332349-commercial-and-personal-usage) | Tarif-/Feed-abhängig, **NOT_PROVEN** | Business/Exchange-abhängig, **NOT_PROVEN** | Vertragsfristen **NOT_PROVEN** | Separat zu vereinbaren, **BLOCKED** | **BLOCKED** |
| [Massive Market Data Terms](https://massive.com/legal/market-data-terms-of-service) / [Redistribution](https://massive.com/knowledge-base/article/how-can-i-redistribute-massives-market-data) | **NOT_PROVEN** | **NOT_PROVEN** | **NOT_PROVEN** | Business-Vereinbarung nötig, **NOT_PROVEN** | **BLOCKED** |

Ein öffentliches Terms-Dokument beweist keine individuelle Lizenz. Insbesondere sind **Derived Scoring, externe Anzeige, Cache/Retention, unveränderlicher Replay und Resale** für den konkreten Datenbestand einzeln zu prüfen. Kostenloser Zugang oder ein ansprechbarer REST-Endpunkt sind keine Datenrechte. Keine Kostenaktivierung, kein API-Schlüssel, keine Secrets und keine Veröffentlichung durch diesen Readback.

**Datenkriterium pro Asset:** XRP/EUR, SOL/EUR und POL/EUR benötigen jeweils **25 fortlaufende, abgeschlossene 1h-OHLC-Kerzen**. Beim Abruf muss die jüngste akzeptierte Kerze höchstens zwei Stunden alt sein. Der Parser behandelt stündliche Zeitstempel **konservativ als Intervallstart** und schließt das laufende Stundenintervall aus. Ob die konkrete Provider-API Intervalle am Start oder am Ende labelt, benötigt zusätzliche Datenquellen-/Schema-Evidence: auch erfolgreiche synthetische Tests beweisen diese Semantik nicht. Es wurden **keine** realen EUR-Kerzen abgerufen, damit sind Count, Zeitreihen-Kontinuität, tatsächliche Instrumente, Feed-Frische und Handelsvenue für alle drei Assets `NOT_PROVEN`. Kein Fallback auf USDT/USD oder synthetische Umrechnung.

**Reproduzierbarer technischer Test:** `node --test server/social-media/crypto-signal-workflow.test.mjs`; zusätzlich der bestehende GitHub-Docker-Security-/Domain-Governance-Pfad. Negative Fixtures: unvollständige aktuelle Kerze, weniger als 25 Kerzen, Zeitlücke, veraltete Reihe und manipulierte Inferenz. Das Ergebnis eines Tests wird erst nach tatsächlichem CI-Readback als `VERIFIED` ausgegeben.

**Besitzer-/Vertrags-Nachweis, falls später angefordert:** Vertragspartner und Rechtsinhaber, signiertes Plan-/Zusatzlizenz-Dokument, Dataset/Symbole/Venues/Region, kommerzielles Research-Scoring und Website-Display inklusive Attribution, Retention/Replay/Backups, Korrekturen/Widerruf/Vertragsende sowie ggf. reseller-/sublicense-/Redistribution-Rechte. Vertrags-/Credentialinhalte nur in autorisierten privaten Speichern; im Repository ausschließlich freigegebene und minimierte Digest-/Referenz-Metadaten.
