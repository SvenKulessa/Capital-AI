# BYOK / USER_PRIVATE_ACCOUNT_DATA Boundary

Stand: 2026-10-06  
Owner: PRODUCT, mit MARKET-/TRUST-Grenzen

## Zweck

CAPITAL-AI erlaubt einem authentifizierten Nutzer, eigene Provider-Credentials
serverseitig zu hinterlegen. Der aktuelle Prototyp unterstützt nutzereigene Kraken-Credentials für private Kontoabfragen sowie explizit opt-in-fähige Trading-Capabilities. Spot und Futures/Perps bleiben getrennte Credential-Familien; eine erkannte Trading-Capability aktiviert noch keine Live-Orderausführung.

Dieser Pfad ist **kein Ersatz für MARKET Source Admission** und belegt keine
allgemeinen kommerziellen Anzeige-, Redistribution- oder Marktdatenrechte.

## Kanonischer Scope

```text
Supabase auth.users
        │
        ▼
USER_PRIVATE_ACCOUNT_DATA
        │
        ├── user-owned credential
        ├── server-only Supabase Vault
        ├── no browser secret readback
        ├── no shared cache
        ├── no JetStream publication
        ├── no public display
        └── no redistribution
```

Der öffentliche Datenpfad bleibt davon getrennt:

```text
PUBLIC_MARKET_DATA
        │
        ▼
MARKET Source Admission
        │
        ├── software rights
        ├── data rights
        ├── display rights
        ├── derived-data rights
        └── redistribution rights
```

Ein positives BYOK-Gate darf niemals ein negatives oder unbekanntes
MARKET-Rechte-Gate überschreiben.

## Secret-Grenze

Die Browser-Anwendung sendet API-Key und API-Secret nur über eine
same-origin, authentifizierte Serverroute. Der Server schreibt die
Credential-Nutzlast über eine ausschließlich für `service_role`
freigegebene RPC in Supabase Vault.

Persistiert werden außerhalb des Vault nur Metadaten:

- User-ID
- Provider
- Vault-Secret-ID und interner Name
- nicht reversibler Credential-Fingerprint
- Scope
- Status / letzte Verifikation
- deklarierte Berechtigungsgrenzen

`anon` und `authenticated` besitzen weder Schema-/Tabellenrechte auf
`private.user_provider_connections` noch Execute-Rechte auf die
Secret-RPCs.

## Kraken-Prototyp

Der produktnahe Spot-Prototyp trennt Credential-Verifikation und Portfoliozugriff:

```text
POST /0/private/GetApiKeyInfo   # Credential-/Permission-Readback
POST /0/private/Balance         # nur wenn query-funds tatsächlich erlaubt ist
```

Die Signatur wird serverseitig nach dem Kraken-HMAC-SHA512-Verfahren erzeugt.
Ein Spot-Key kann deshalb auch ohne `query-funds` als gültiges REST-Credential
verifiziert werden. `create-ws-token` wird als separate Capability desselben
Spot-Keys ausgewiesen. Spot-Rechte `modify-trades` / `close-trades` dürfen nach explizitem Nutzer-Opt-in
als Order-Capability gespeichert werden. Funding-, Transfer- und Withdrawal-Rechte
bleiben hart abgewiesen.

Der verschlüsselte Kraken-Vault-Payload verwendet Version 2 mit getrennten
`spot`- und `futures`-Credential-Familien. Futures/Perps werden über den
separaten Kraken-Futures-Authentifizierungsvertrag verifiziert. `general=FULL_ACCESS`
darf nur nach explizitem Trading-Opt-in gespeichert werden; `transfer` muss
`NO_ACCESS` bleiben.

Für beide Trading-Familien gilt in diesem Slice:

```json
{
  "orderTypes": ["market", "limit"],
  "executionEnabled": false,
  "withdrawals": false
}
```

Damit kann der spätere MarketScreener die vorhandene Capability auswerten, ohne
bereits heute eine Live-Orderroute freizuschalten.

Die Metadaten deklarieren zusätzlich:

```json
{
  "dataScope": "USER_PRIVATE_ACCOUNT_DATA",
  "redistributionAllowed": false,
  "publicDisplayAllowed": false,
  "sharedCacheAllowed": false,
  "jetStreamPublicationAllowed": false
}
```

## Enterprise Scorer

Der private Kraken-Kontext ist eine **personalisierte Portfolio-Context
Projection**. Er ändert nicht stillschweigend den kanonischen Asset-Score und
wird nicht als Marktpreis- oder Marktsignalquelle gewertet.

Damit bleiben zwei Ergebnisse unterscheidbar:

1. providerneutraler, evidenzgebundener Asset-Score;
2. nutzereigener Portfolio-Kontext (z. B. vorhandener Bestand).

Diese Trennung verhindert, dass der Besitz eines Assets als Marktqualität,
Momentum oder Fundamentalqualität fehlinterpretiert wird.

## Buffett Value Check

Kraken-Account-Bestände liefern keine ausreichenden Inputs für den Buffett
Value Check. Insbesondere fehlen Unternehmens-Fundamentaldaten wie ROE, FCF,
ROIC, Verschuldungs- und DCF-Inputs.

Daher gilt:

```text
Kraken USER_PRIVATE_ACCOUNT_DATA -> Buffett Fundamentals = NOT_APPLICABLE
```

Ein späterer Fundamentals-BYOK-Provider muss dieselbe Credential-Grenze
verwenden, benötigt aber zusätzlich eine eigene fachliche Datenvertrags- und
MARKET-/TRUST-Prüfung.

## Nachweisgrenzen

Ein erfolgreicher Kraken-Verbindungstest beweist:

- ein authentifizierter CAPITAL-AI Nutzer besitzt Zugriff auf die verwendeten
  Credentials;
- der Server kann damit einen privaten Account-Endpunkt aufrufen;
- der zurückgegebene Kontext wird dem authentifizierten Nutzer zugeordnet.

Er beweist **nicht**:

- kommerzielle Rechte an öffentlichen Kraken-Marktdaten;
- Weiterverkaufs- oder Redistributionsrechte;
- Rechte, fremde Rohdaten öffentlich an andere Nutzer auszuspielen;
- Buffett-/Fundamentaldaten-Eignung.

## Production Gate

Vor Production-Handoff müssen mindestens erfüllt sein:

- Supabase Auth realer Login erfolgreich;
- Redirect auf `/profile` erfolgreich;
- BYOK negative auth / same-origin tests erfolgreich;
- Vault ACLs weiterhin server-only;
- Kraken-Key mit ausschließlich benötigten Lese-/Orderrechten; Funding/Transfer/Withdrawal bleibt verboten;
- keine Secret-Werte in Browserantworten, Logs oder Evidenz;
- risikobasierte technische Gates und belastbare Evidence gemäß aktueller Root-Governance;
- MARKET-Rechte-Gates bleiben unabhängig und fail-closed.
