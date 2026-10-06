# Metricool MCP Integration — CAPITAL-AI

Stand: 2026-10-06
Primary Domain: GROWTH
Baseline: `main@5f333bcd5e219ae160a611941ba1e9fde01f4c94`

## Entscheidung

CAPITAL-AI registriert Metricool ausschließlich als externen Remote-MCP für Operator-/Control-Plane-Workflows:

```json
{
  "metricool": {
    "type": "http",
    "url": "https://ai.metricool.com/mcp"
  }
}
```

Es wird **kein Metricool-NPM-Paket** und keine Metricool-REST-API in den Web- oder Server-Runtimepfad aufgenommen.

## Kosten- und Tarifgrenze

Aktuelle offizielle Metricool-Dokumentation (geprüft 2026-10-06):

- Metricool MCP ist mit jedem Metricool-Tarif nutzbar, einschließlich Free.
- Der Free-Tarif bleibt tarifbegrenzt; Metricool nennt u. a. 1 Marke, bis zu 20 geplante Inhalte pro Monat und 30 Tage Analytics-Historie.
- LinkedIn und X/Twitter sind im Free-Tarif nicht enthalten.
- Die separate Metricool API ist nur in Advanced und Custom enthalten.
- Daraus folgt für CAPITAL-AI: `MCP_FREE_ADMITTED`, `REST_API_PAID_BLOCKED`.

## Authentifizierung

Der Produktions-MCP-Endpunkt ist:

`https://ai.metricool.com/mcp`

Die Authentifizierung erfolgt per OAuth im MCP-Client. Es werden insbesondere **keine** der folgenden Werte in Git aufgenommen:

- Metricool API-Key
- OAuth Access-/Refresh-Token
- User Token
- Session Cookies
- Social-Network-Credentials

## Architekturgrenze

Die Registrierung in `.mcp.json` ist eine Entwickler-/Operatorintegration. Sie:

- verändert nicht die Capital-AI-Web-Runtime,
- gibt der Website keine Metricool-Credentials,
- erzeugt keine autonome Publisher-Berechtigung,
- ersetzt nicht die Social-Media-Engine,
- stellt keine Publication-Evidence dar.

Die kommende Social Media Engine darf Metricool über eine provider-neutrale Publisher-/Analytics-Abstraktion berücksichtigen. Unter der aktuellen No-Cost-Grenze darf eine automatisierte Backend-Integration jedoch nicht auf die kostenpflichtige Metricool REST API wechseln.

## Zulässiger nächster Ausbau

1. Metricool-Konto im Free-Tarif über OAuth mit einem kompatiblen MCP-Client verbinden.
2. Readback der verfügbaren Marke und Social-Verbindungen durchführen.
3. Planner-/Analytics-Fähigkeiten als Operator-Workflow testen.
4. Provider-ID, Status und Publication-Evidence getrennt von `scheduled` behandeln.
5. Erst nach eigener Entscheidung über einen kostenpflichtigen Tarif darf eine serverseitige REST-API-Integration entworfen werden.

## Status

- Repository-MCP-Konfiguration: `CONFIGURED`
- OAuth-Verbindung: `PENDING_USER_AUTH`
- Metricool Free MCP: `ADMITTED_WITH_PLAN_LIMITS`
- Metricool REST API: `BLOCKED_BY_NO_COST_POLICY`
- Social-Media-Engine Runtime-Binding: `PLANNED_PROVIDER_NEUTRAL`
- Production Publishing Authority: `NOT_GRANTED`
