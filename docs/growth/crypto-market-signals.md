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
