# Open-Source Market Stack — License & Provenance Register

Stand: 2026-10-02  
Status: additive Evidence; keine automatische Daten- oder Production-Freigabe.

| Komponente | Code-Lizenz | Integration | Datenrechtsgrenze |
|---|---|---|---|
| CCXT | MIT | Adapter-ready | Rechte der jeweils angebundenen Exchange separat |
| Hummingbot / Gateway | Apache-2.0 bzw. MIT je Subprojekt | Adapter-ready | Venue-/DEX-Bedingungen separat |
| Cryptofeed, Snapshot 2026-10-03 | AGPL-3.0-or-later mit zusätzlicher Attribution; siehe gepinnte Evidence | Review erforderlich: Network-Copyleft und tatsächliche Integration | Exchange-Feed-Rechte separat |
| OpenBB V5 | Apache-2.0 | Adapter-ready | Rechte jedes OpenBB-Providers separat |
| DefiLlama API SDK | MIT | Adapter-ready | API-/Datennutzungsbedingungen separat |
| yfinance | Apache-2.0 | Research-only | Yahoo-Nutzungsbedingungen separat; keine kommerzielle Freigabe behauptet |
| fdnpy 0.6.0 | MIT-Metadaten; Original-LICENSE im gepinnten Tree nicht gefunden | BLOCKED bis Original-Lizenznachweis, nicht vendored | FinancialData.Net Subscription-/Dataset-Rechte separat; Professional/Enterprise nicht aus SDK-Lizenz ableiten |
| NATS Server / JetStream | Apache-2.0 | bestehend | Software-Infrastruktur |
| Valkey | BSD-3-Clause | bestehend | Software-Infrastruktur |
| DuckDB | MIT | Adapter-ready | Software-Infrastruktur |
| ClickHouse Server | Apache-2.0 | Adapter-ready | Docs/Assets können separat lizenziert sein |
| OpenTelemetry Collector | Apache-2.0 | Adapter-ready | Software-Infrastruktur |
| Prometheus | Apache-2.0 | Adapter-ready | Software-Infrastruktur |
| Qdrant | Apache-2.0 | Adapter-ready | Software-Infrastruktur |
| ORT | Apache-2.0 | bestehende Report-Integration | Compliance-Werkzeug |
| ScanCode Toolkit | Apache-2.0 | bestehende Report-Integration | Compliance-Werkzeug |

## Upstream

Die kanonischen Upstream-URLs stehen maschinenlesbar in `src/data/openSourceStack.ts` und werden im Webdesign unter `/opensource-lizenzen` angezeigt.

## Finance-Parität

Die bestehenden Lizenz-/Provider-Grenzen aus dem Finance-Transfer bleiben Mindeststandard: Providerzugriff, Forschungszweck oder Open-Source-Code dürfen nicht als Display-, Redistribution-, Derived-Data-, Retention- oder Resale-Recht interpretiert werden. Der aktuelle Capital-AI-Rechtevertrag bleibt die Authority.

## Installationsregel

Python-/Service-basierte Komponenten werden bewusst über Sidecar-/REST-Adapter eingebunden, statt ungeprüft in das Node-Runtime-Image aufgenommen zu werden. Eine physische Runtime-Installation benötigt exakte Version/Digest, Original-LICENSE/NOTICE, SBOM/Lockfile und den bestehenden Supply-Chain-Gate. Dadurch bleibt der aktuelle Runtime-Closure unverändert und reproduzierbar.


## FinancialData.Net-spezifische Grenze

`fdnpy` ist nur der Open-Source-SDK-Connector. CAPITAL-AI behandelt `financialdatanet` separat als Datenprovider. Die aktuelle öffentliche Pricing-/Terms-Evidence wird in `docs/security/evidence/license-rights-review.json` referenziert; sie ersetzt keinen Nachweis des tatsächlich gebuchten Plans oder einzelner Feed-/Exchange-Rechte. Universal Query, MCP Server und Excel Add-in sind zusätzliche Provider-Schnittstellen, keine eigenständigen Rechtequellen.

## Original-Lizenzprüfung vom 2026-10-03

`commercial-review-20261003.json` dokumentiert zehn Kandidaten mit Source-SHA und Lizenz-Blob sowie separat vier Datenprovider. Die Prüfung des aktuellen Cryptofeed-Snapshots korrigiert die ältere permissive Beschreibung; sie behauptet keine rückwirkende Änderung älterer Releases. fdnpy besitzt im geprüften Tree keinen eigenständigen LICENSE-/NOTICE-Nachweis. Lizenzmetadaten allein erteilen keine Freigabe.

Alle Kandidaten bleiben kommerziell BLOCKED: transitive Abhängigkeiten, tatsächliche Artefakte/Integrationen und Produkt-/Datenrechte sind offen. GPL/LGPL/AGPL bedeuten kein pauschales kommerzielles Verbot; die jeweiligen Pflichten sind am konkreten Produkt zu prüfen. Veröffentlichte Provider-Angebote sind keine gemessenen Betriebskosten und kein Nachweis einer gebuchten Lizenz. SaaS, Data-API, White-Label und CADS müssen jeweils vom tatsächlichen Vertragsumfang gedeckt sein.
