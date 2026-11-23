# Legal Data Hunter für Growth Intelligence

Stand 21.11.2026 · Status BLOCKED_ORDER_FORM_REQUIRED

| Einsatz | Beobachtete Grundlage |
|---|---|
| Direkte Recherche in dieser Arbeit | Legal Data Hunter hat die Artikel 28 und 44 der DSGVO aufgelöst. Die Anbieterbedingungen wurden separat per Firecrawl gelesen. |
| Eingebettete Recherche für Kunden | Die [API- und MCP-Bedingungen](https://legaldatahunter.com/api-mcp-terms) vom 11.08.2026 setzen dafür eine ausdrückliche Freigabe im Order Form voraus. Ein passendes Order Form für Capital‑AI lag bei der Prüfung nicht vor. |
| Kundenausgabe oder RAG-Speicherung | Das Order Form und die Rechte der jeweiligen Datenquelle bestimmen den zulässigen Umfang. Volltext, Downloads, dauerhafte Speicherung, Indizes und Embeddings erfordern nach den [API- und MCP-Bedingungen](https://legaldatahunter.com/api-mcp-terms) eine ausdrückliche Autorisierung. |
| Verarbeitung von Kundendaten | Bei Auftragsverarbeitung sind die Anforderungen aus [Art. 28 DSGVO](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) zu prüfen. Bei Drittlandübermittlungen gelten die Voraussetzungen aus [Art. 44 DSGVO](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32016R0679) und dem folgenden Kapitel. |

Firecrawl hat die öffentliche API-/MCP-Bedingungsseite im Crawl mit HTTP 200 erfasst. Der Anbieter weist dafür den Dokument-Hash 65b1c5b5a23bdc8daa4f67479f1cc7ad8474d5196d415acfa83b03801d876c0b aus. Der Hash dokumentiert die geprüfte Fassung und keine Kundenfreigabe. [API- und MCP-Bedingungen](https://legaldatahunter.com/api-mcp-terms)

Die Growth Intelligence Engine führt Legal Data Hunter im bestehenden Offline-Draft-Manifest als blockierten Kandidaten. Der zugrunde liegende Analytics-Snapshot bleibt bytegenau erhalten. Ohne ein passendes Order Form werden weder Kundendaten an den Anbieter übertragen noch Quellen in Kundenoutputs übernommen. Nach Vertragsnachweis muss feststehen, welche Endpunkte, Datenfelder, Weitergaben, Speicherfristen und Kosten erlaubt sind. Der erste Ausführungsschritt ist dann ein mandantengebundener Read-only-Sandbox-Test mit Widerruf und überprüfbarer Datenherkunft.

Für LoomaScale erlauben die öffentlichen Bedingungen die Nutzung des Connectors für verbundene Werbekonten. Sie untersagen die Weitergabe des Dienstzugangs an Dritte und den eigenständigen Weiterverkauf der AI-Outputs. Daraus ergibt sich für eine kundenseitige Einbettung in Growth Intelligence keine belegte Freigabe. [LoomaScale-Nutzungsbedingungen](https://loomascale.com/terms)
