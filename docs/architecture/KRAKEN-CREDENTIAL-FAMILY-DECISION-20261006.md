# Kraken Credential Families – Entscheidungsstand 2026-10-06

Status: OWNER_DECISION_REQUIRED  
Domain: PRODUCT + MARKET + TRUST

## Beobachteter Ist-Zustand

Der bestehende Vault besitzt genau einen eindeutigen Slot pro `(user_id, provider)` und erlaubt aktuell nur `provider='kraken'`.

Dieser Slot ist jetzt fachlich als **Kraken Spot Credential** definiert:

- Spot REST Credential-Verifikation über `GetApiKeyInfo`
- optional `query-funds` für privaten Spot-Portfolio-Readback
- optional `create-ws-token` als Spot-WebSocket-Capability
- keine Trading-/Withdrawal-Berechtigungen
- keine Public-Market-Data-Rechteeskalation

Kraken Futures verwendet einen getrennten Authentifizierungsvertrag und wird nicht in den Spot-Slot hineingedeutet.

## Owner-Entscheidung für die additive Schemaerweiterung

### Option A – Zwei Credential Families (empfohlen)

- `kraken_spot`
  - REST und WebSocket als Capabilities desselben Spot-Credentials
- `kraken_futures`
  - eigener Futures-Key / eigener Authent-Contract

Vorteile:
- entspricht der Provider-Semantik;
- minimale Schemaerweiterung;
- keine künstliche Trennung von Spot REST und Spot WebSocket;
- klare Security-/Permission-Gates.

Nachteil:
- Nutzer mit bewusst getrennten Spot-REST- und Spot-WebSocket-Keys können nicht beide gleichzeitig speichern.

### Option B – Drei feste Slots

- `kraken_spot_rest`
- `kraken_spot_websocket`
- `kraken_futures`

Vorteile:
- entspricht exakt einer Bedienoberfläche mit drei getrennten Keys;
- getrennte Rotation und Least-Privilege-Keys möglich.

Nachteile:
- Spot REST und WebSocket sind technisch dieselbe Kraken-Spot-Key-Familie;
- mehr Vault-, RPC-, UI- und Testaufwand.

### Option C – Generisches Multi-Slot-Modell

Tabelle erhält zusätzlich `credential_family` und `slot_name`, mit mehreren Credentials je Provider.

Vorteile:
- später auch für weitere Provider wiederverwendbar;
- frei erweiterbar.

Nachteile:
- größter Migrations- und Governance-Scope;
- mehr Konflikt-/Auswahlregeln im Produkt.

## Empfehlung

**Option A**, sofern kein zwingender Bedarf besteht, zwei getrennte Spot-Keys parallel zu halten. Falls der Owner ausdrücklich getrennte REST- und WebSocket-Keys verlangt, Option B.

Bis zur Entscheidung bleibt Futures fail-closed und der bestehende Spot-Slot wird nicht destruktiv migriert.
