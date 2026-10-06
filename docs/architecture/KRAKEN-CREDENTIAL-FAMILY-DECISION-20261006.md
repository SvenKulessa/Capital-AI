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
