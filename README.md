# Capital-AI Bootstrap

Quellstand der Oberfläche: `SvenKulessa/FRONTEND@a7611b00f110dee9dc3c4d4214b07ae826971023`.

Diese erste Iteration enthält eine React-Vorschau mit ausdrücklich gekennzeichneten Beispieldaten und eine separate Marktdaten-API. Sie ist **keine** verifizierte Produktionsversion der Finanzanalyse. Andere aus FRONTEND übernommene Ansichten, Provider-Statusanzeigen und Simulationen benötigen vor einer Freigabe eine eigene Daten- und Lizenzprüfung.

## Entwicklung und Prüfung

```sh
npm ci
npm run lint
npm run build
node --test server/market.test.mjs
npm audit --audit-level=high
docker build -t capital-ai:local .
IMAGE=capital-ai:local sh scripts/verify-image.sh
```

Die letzte Prüfung benötigt Docker und Trivy auf der prüfenden Maschine. Trivy bleibt außerhalb des minimalen Laufzeitcontainers und erzeugt ein CycloneDX-SBOM sowie einen HIGH/CRITICAL-Vulnerability-Gate. Das Image ist erst nach erfolgreichem Scan und Digest-Korrelation freigabefähig. In der aktuellen Arbeitsumgebung steht Docker nicht zur Verfügung; ein Image-Scan ist daher offen.

## Render

`render.yaml` definiert einen Docker Webservice `Capital-AI` in Frankfurt mit `/healthz`, deaktiviertem Auto Deploy und deaktivierten Preview-Instanzen. `TWELVE_DATA_API_KEY` und `POLYGON_API_KEY` werden nur als Render-Laufzeitgeheimnisse gesetzt; sie gehören weder ins Repository noch als Docker-Build-Argument. Erst nach einem erfolgreichen Sicherheits-Gate und der erforderlichen Provider-Lizenzprüfung darf ein manueller Production Deploy erfolgen.

Die API `/api/market/quote?symbol=BTCUSDT` verarbeitet Binance Spot WebSocket, `BTCUSD` Kraken WebSocket v2. Twelve Data und Polygon sind REST-Fallbacks für exakt zugeordnete USD-Instrumente (`BTCUSD`, `AAPL`). USDT wird nie stillschweigend in USD umgerechnet. Ohne frische, plausible Quelle liefert die API `503` und keinen Beispielkurs. Weitere Instrumente, Währungen, Tier 2–4, dauerhafte Speicherung und Lizenz-Eligibility sind Folgearbeiten.
