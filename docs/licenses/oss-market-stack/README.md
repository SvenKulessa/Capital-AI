# Open-Source Market Stack — License & Provenance Register

Stand: 2026-10-02  
Status: additive Evidence; keine automatische Daten- oder Production-Freigabe.

| Komponente | Code-Lizenz | Integration | Datenrechtsgrenze |
|---|---|---|---|
| CCXT | MIT | Adapter-ready | Rechte der jeweils angebundenen Exchange separat |
| Hummingbot / Gateway | Apache-2.0 bzw. MIT je Subprojekt | Adapter-ready | Venue-/DEX-Bedingungen separat |
| Cryptofeed | permissive BSD-style Upstream-Lizenz mit Attribution/Namensregel | Adapter-ready | Exchange-Feed-Rechte separat |
| OpenBB V5 | Apache-2.0 | Adapter-ready | Rechte jedes OpenBB-Providers separat |
| DefiLlama API SDK | MIT | Adapter-ready | API-/Datennutzungsbedingungen separat |
| yfinance | Apache-2.0 | Research-only | Yahoo-Nutzungsbedingungen separat; keine kommerzielle Freigabe behauptet |
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
