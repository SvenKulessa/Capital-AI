# Kraken Credential Families – Owner-Entscheidung 2026-10-06

Status: OWNER_DECIDED_IMPLEMENTED_FAIL_CLOSED
Domain: PRODUCT + MARKET + TRUST

## Entscheidung

Der bestehende serverseitige Kraken-Vault-Slot bleibt ein Eintrag pro `(user_id, provider='kraken')`,
enthält aber einen versionierten verschlüsselten Payload mit zwei strikt getrennten Credential-Familien:

- `spot` — Kraken Spot REST / privater WebSocket-Token / optionale Orderrechte
- `futures` — Kraken Futures/Perpetuals mit eigenem Authentifizierungsvertrag

Damit wird keine Futures-Credential als Spot-Key interpretiert und für PR #203 ist keine destruktive
Datenbankmigration erforderlich.

## Zulässige Schreibrechte

Spot:
- `modify-trades` darf nach explizitem Nutzer-Opt-in als Create/Modify-Order-Capability gespeichert werden.
- `close-trades` darf nach explizitem Nutzer-Opt-in als Cancel/Close-Order-Capability gespeichert werden.

Futures/Perps:
- `general=FULL_ACCESS` darf nach explizitem Nutzer-Opt-in als Trading-Capability gespeichert werden.
- `general=READ_ONLY` bleibt als nicht schreibende Futures-Capability zulässig.

Hart verboten:
- Spot Funding-/Withdrawal-/Withdrawal-Address-Rechte.
- Futures `transfer != NO_ACCESS`.
- automatische Rechteeskalation aus einem Read-only-Key.

## Execution-Grenze

Der Vault speichert ausschließlich Credential- und Capability-Evidence. PR #203 aktiviert **keine** Live-Orderausführung:

- `orderTypes = ["market", "limit"]` kann als Capability erscheinen;
- `executionEnabled = false` bleibt zwingend;
- keine Market-/Limit-Order wird durch das Speichern oder Prüfen eines Keys erzeugt;
- spätere MarketScreener-Execution benötigt separate Order-Preview-, Bestätigungs-, Risk-, Idempotency-, Rate-Limit- und Audit-Gates.

Funding und Withdrawals gehören ausdrücklich nicht zum geplanten MarketScreener-Tradingpfad.

## Daten-/Rechte-Grenze

USER_PRIVATE_ACCOUNT_DATA und nutzereigene Trading-Credentials ersetzen keine MARKET Source Admission,
keine Redistribution-Rechte und keine Production-Freigabe.


## Spot Order Dry-Run – MARKET Slice

Der erste Orderpfad bleibt ausdrücklich **nicht ausführend**. Er implementiert:

1. `POST /api/market/trading/kraken/spot/preview`
   - nur `market` und `limit`
   - nur Buy/Sell ohne Leverage, Funding, Conditional Orders oder Withdrawals
   - Quote-Währungen zunächst USD, EUR, USDT oder USDC
   - explizites `riskQuoteAmount` und serverseitiges Maximal-Limit
   - Limit-Notional wird deterministisch gegen das Risk-Limit geprüft
2. kurzlebiger, serverseitig HMAC-gebundener Confirmation Token
3. `POST /api/market/trading/kraken/spot/confirm`
   - gleiche User-Session und same-origin
   - gleicher Order-Digest und gleiche Idempotency-ID
   - Credential-/Permission-Readback aus dem privaten Kraken Vault
4. Kraken `AddOrder` ausschließlich mit `validate=true`
   - Kraken validiert die Order
   - die Order wird nicht an die Matching Engine übergeben
   - `cl_ord_id` wird deterministisch aus User + Idempotency-Key abgeleitet
   - `deadline` begrenzt verspätete Requests
5. sanitisiertes Audit Event ohne Credential- oder Tokenmaterial

### Noch bewusst nicht Production-ready

- Idempotency ist im Dry-Run zunächst pro Runtime-Prozess gebunden.
- Audit wird in den bestehenden separaten Runtime-Audit-Stream geschrieben.
- Persistente Idempotency und append-only DB-Audit sind für **Live-Submit zwingende Blocker**.
- Für Market Orders ist ohne frischen unabhängigen Preis-Snapshot kein belastbares Ausführungsnotional vorhanden; deshalb bleibt Live-Ausführung blockiert.
- Futures/Perpetuals `sendorder` wird in diesem Slice nicht aufgerufen.

Status:
`SPOT_VALIDATE_ONLY_READY / LIVE_EXECUTION_BLOCKED / FUTURES_EXECUTION_BLOCKED`
