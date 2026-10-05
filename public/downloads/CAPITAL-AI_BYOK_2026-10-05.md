# CAPITAL-AI BYOK — Bring Your Own Key

**Stand:** 2026-10-05  
**Scope:** Product-/Security-Dokumentation für den aktuellen Kraken-Prototyp  
**Quellen:** `server/user-provider-vault.mjs`, `docs/security/BYOK-USER-PRIVATE-DATA.md`, Supabase Vault Migration  
**Hinweis:** Dieses Dokument beschreibt den aktuellen Softwarevertrag und ist keine Security-Zertifizierung oder Datenrechte-Freigabe.

## 1. Ziel

BYOK erlaubt einem authentifizierten CAPITAL-AI-Nutzer, eigene Provider-Credentials serverseitig zu hinterlegen. Der aktuelle Prototyp unterstützt Kraken für **private Kontoabfragen**. Die Credentials gehören dem Nutzer und bleiben in einer separaten Secret-Grenze.

BYOK ist ausdrücklich **kein Ersatz für MARKET Source Admission**. Ein gültiger privater API-Key erzeugt keine Rechte zur öffentlichen Anzeige, zur Redistribution, zum Shared Cache, zur JetStream-Publikation oder zur Nutzung öffentlicher Marktdaten im kanonischen Scoring.

## 2. Architektur

```text
Browser / Profil
  │  Supabase Session + same-origin Request
  ▼
CAPITAL-AI BYOK API / BFF
  │  Provider-Allowlist + Formatprüfung
  │  serverseitige Kraken-Signatur
  ├──────────────────────────────► Kraken Private API
  │                                  POST /0/private/Balance
  ▼
Supabase service_role RPC
  ▼
Supabase Vault
  │  verschlüsselter Secret-Payload
  ▼
private.user_provider_connections
     nur Metadaten / Fingerprint / Status
```

Öffentliche Marktdaten bleiben getrennt:

```text
PUBLIC_MARKET_DATA → MARKET Source Admission → Rights/Quality/Evidence → Canonical Market Data

USER_PRIVATE_ACCOUNT_DATA ─X─► kein automatischer Übergang in diesen Pfad
```

## 3. Secret-Lifecycle

### Einrichten

1. Nutzer meldet sich an.
2. Profil sendet `PUT /api/profile/provider-connections/kraken` same-origin.
3. Server prüft Key-/Secret-Format und Provider-Allowlist.
4. Credentials werden über eine `service_role`-geschützte RPC in Supabase Vault gespeichert.
5. Außerhalb des Vault liegen nur Metadaten, interner Secret-Verweis, Scope, Status und ein nicht reversibler Fingerprint.
6. Der Server prüft den Key über `POST /0/private/Balance`.
7. Bei Erfolg wird der Connection-Status `VERIFIED`, andernfalls `INVALID`.

### Lesen

`GET /api/profile/provider-connections/kraken/balance` lädt das Secret serverseitig, signiert den privaten Kraken-Request und gibt ausschließlich eine begrenzte Holdings-Projektion zurück. API-Key und Secret werden nicht an den Browser zurückgegeben.

### Löschen

`DELETE /api/profile/provider-connections/kraken` verlangt Authentifizierung und same-origin und löscht die serverseitige Provider-Verbindung über die Vault-RPC.

## 4. Kryptografische und technische Grenzen

- Kraken Private API: Signatur nach dem implementierten HMAC-SHA512-Verfahren.
- Credential-Fingerprint: HMAC-SHA256 mit separatem serverseitigem Signing Secret und Namespace `capital-ai/byok-fingerprint/v1`.
- Fingerprint-Länge im aktuellen Code: 24 Hex-Zeichen; er dient der Korrelation und ist kein Authentifizierungsgeheimnis.
- Request Body ist begrenzt; Redirects werden abgelehnt; externe Requests haben Timeout.
- Service-Role-/Vault-Credentials bleiben serverseitig.

## 5. Berechtigungsmodell

Der aktuelle Kraken-Prototyp deklariert:

```json
{
  "fundsQuery": true,
  "trading": false,
  "withdrawals": false,
  "publicMarketDataAdmission": false,
  "dataScope": "USER_PRIVATE_ACCOUNT_DATA",
  "redistributionAllowed": false,
  "publicDisplayAllowed": false,
  "sharedCacheAllowed": false,
  "jetStreamPublicationAllowed": false
}
```

Trading-, Order-, Deposit- und Withdrawal-Endpunkte sind nicht Bestandteil dieses Adapters.

## 6. Beziehung zum Enterprise Scorer

Private Kraken-Bestände sind eine **personalisierte Portfolio-Context Projection**. Sie verändern den kanonischen Asset-Score nicht und werden nicht als Marktpreis, Momentum, Fundamentalqualität oder Authority-Quelle behandelt.

Damit bleiben zwei Ergebnisse getrennt:

1. providerneutraler, evidenzgebundener Asset-Score;
2. nutzereigener Portfolio-Kontext.

## 7. Beziehung zum Buffett Value Check

Kraken-Bestände liefern keine benötigten Unternehmensfundamentals wie ROE, FCF, ROIC, Verschuldung oder DCF-Inputs.

```text
Kraken USER_PRIVATE_ACCOUNT_DATA → Buffett Fundamentals = NOT_APPLICABLE
```

Ein späterer Fundamentals-BYOK-Provider kann dieselbe Credential-Grenze verwenden, braucht aber einen eigenen fachlichen Datenvertrag und separate Rechte-/Trust-Prüfung.

## 8. Threat Model und Controls

| Risiko | Control |
|---|---|
| unauthentifizierter Zugriff | `auth.verify` fail-closed |
| Cross-Site-Mutation | same-origin Gate für PUT/DELETE |
| Secret-Readback | Vault nur serverseitig; Browser erhält Projektionen |
| Provider-Injection | expliziter Kraken-Routenvertrag statt freier Ziel-URL |
| überbreite Requests | Größenlimit und Formatvalidierung |
| Netzwerk-Hänger | Timeout und `redirect: error` |
| Rechte-Eskalation | USER_PRIVATE_ACCOUNT_DATA bleibt vom Public-Market-Data-Pfad getrennt |
| Trading-/Withdrawal-Missbrauch | Adapter implementiert diese Endpunkte nicht |
| Secret in Evidence/Logs | keine Credential-Werte als Evidence zulassen |

## 9. Observability

Zulässige Betriebsdaten sind Provider, Status, nicht reversibler Fingerprint, letzte Verifikation und begrenzte Fehlercodes. Secrets, vollständige API-Keys, API-Secrets, Service-Role-Keys, Session-Cookies und Recovery-Daten dürfen nicht geloggt werden.

## 10. Technische Production-Gates

Vor Production-Handoff sind mindestens belastbar nachzuweisen:

- realer Supabase-Login und User-Bindung;
- same-origin und negative Auth-Tests;
- Vault ACL/RPC weiterhin ausschließlich serverseitig;
- Kraken-Key mit minimal benötigten Leserechten;
- kein Secret-Leak in Browserantworten, Logs oder Evidence;
- PUT → Verify → GET Balance → DELETE End-to-End;
- Fehlerpfade für invalid key, revoked key, Provider-Ausfall und Vault-Ausfall;
- risikobasierte technische Gates und belastbare Evidence gemäß aktueller Root-Governance;
- MARKET-Rechte-Gates bleiben unabhängig und fail-closed.

## 11. SocialMediaEngine-/Design-Provenienz

Die im Dokumentations-Hub und in der BYOK-Presentation verwendeten Architekturdiagramme werden lokal und deterministisch im 1200×630-Landscape-Profil erzeugt. Sie verwenden ausschließlich CAPITAL-AI UI-/Brand-Tokens und keine externen Bildassets. Der Renderpfad orientiert sich an den im Repository dokumentierten SocialMediaEngine-Profilen; die aktuelle Webanwendung enthält keinen eigenständigen externen Publishing-Authority-Schritt für diese Dokumentationsgrafiken.
