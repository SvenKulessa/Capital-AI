# Render Build Review — node-domexception Deprecation

Stand: 2026-10-05  
Primary Domain: CAPITAL-AI-TRUST / PLATFORM  
Bewertung: `NON_BLOCKING_DEPRECATION / UPSTREAM_DEPENDENCY`

## Beobachtung

Im Render-Build des Capital-AI-Webservice für Commit
`7b40e7ea66a44ace964ccb65844600307a5bcdb2`
wurde beim Projekt-`npm ci` genau die folgende Deprecation-Klasse beobachtet:

`node-domexception@1.0.0` ist deprecated, weil aktuelle Node-Runtimes eine native `DOMException` bereitstellen.

Der Render-Build endete trotzdem erfolgreich; der zugehörige Deploy wechselte anschließend auf `live`.

Die Runtime verwendet das gepinnte Image `node:26.10.0-alpine`.

## Verifizierte Dependency-Kette

Aus `package-lock.json`:

```text
@google/genai 2.26.0
→ google-auth-library 10.9.1
→ gaxios 7.3.1
→ node-fetch 3.3.2
→ formdata-polyfill 4.0.10
→ fetch-blob 3.2.0
→ node-domexception 1.0.0
```

Zusätzlich verwendet `gcp-metadata` denselben `gaxios`-Zweig.

Damit ist `node-domexception` keine direkte CAPITAL-AI-Abhängigkeit.

## Risikobewertung

Der Logeintrag ist eine npm-Deprecation-Warnung, keine geworfene `DOMException`, kein Buildfehler und kein nachgewiesener Runtimefehler.

Aus dieser Warnung allein folgt kein Security-Finding und kein CVE-Nachweis.

Ein erzwungener Override auf inkompatible Major-Versionen wird nicht vorgenommen:

- `node-fetch@3.3.2` erwartet `fetch-blob@^3.1.4`;
- das direkte Überschreiben auf eine andere Major-Version könnte API-/Runtime-Semantik verändern;
- `@google/genai` bindet aktuell den Google-Auth-Zweig transitiv und muss bei einem Update als eigene Dependency-Migration geprüft werden.

## Upstream-Kontext

Das Upstream-Projekt `fetch-blob` hat die Entfernung der deprecated `node-domexception`-Abhängigkeit diskutiert/umgesetzt, gekoppelt an eine höhere Node-Mindestversion. CAPITAL-AI verwendet bereits Node 26, soll den Wechsel aber über einen kompatiblen Upstream-Dependency-Pfad erhalten und nicht über einen lokalen Zwangs-Override.

## Entscheidung

`ACCEPT_TEMPORARILY`

- Build nicht blockieren.
- Warnung nicht unterdrücken.
- Kein `overrides`-Hack.
- Bei der nächsten offiziell kompatiblen `@google/genai`-/`google-auth-library`-Migration Dependency-Tree erneut prüfen.
- Warnung gilt erst als geschlossen, wenn `npm ci` ohne `node-domexception@1.0.0` auskommt und die vollständigen Tests/Scans weiter grün sind.

## Reproduzierbare Prüfung

```text
package-lock:
@google/genai
→ google-auth-library
→ gaxios
→ node-fetch
→ fetch-blob
→ node-domexception

Render:
npm ci
→ Deprecation Warning
→ build succeeded
→ deploy live
```

Keine Production-Mutation wurde durch diese Analyse ausgelöst.

## Aktualisierter Readback — 2026-10-05 14:53 CEST

Render wurde erneut read-only geprüft:

- aktuell `live` ist Deploy `dep-db1n9lugekts73elbke0` mit Commit `c9fc1bb55dcfcdf2b121c879d6d7580fe9388e84`;
- auch dieser erfolgreiche Build loggte am 2026-10-05T09:59:08Z weiterhin `node-domexception@1.0.0` als npm-Deprecation;
- der Build/Deploy war erfolgreich; es liegt weiterhin keine geworfene DOMException und kein Runtime-Crash vor;
- CURRENT_MAIN `9c5fc40318cf538308724c2efb18441185e8cbae` war beim Readback noch nicht der live Render-Commit.

Offizieller Upstream-Readback:

- `@google/genai v2.27.0` wurde am 2026-10-02 als stabile Version veröffentlicht;
- dessen offizielles `package.json` bindet weiterhin `google-auth-library: ^10.3.0`;
- die CAPITAL-AI-Kette kann deshalb auch mit der aktuellen 2.x-Linie weiterhin auf `google-auth-library 10.x → gaxios 7.x → node-fetch 3.x → fetch-blob 3.x → node-domexception 1.0.0` auflösen;
- `google-auth-library 11.x` / `gaxios 8.x` bilden eine neue Major-Linie. Sie werden nicht per Override unter `@google/genai` erzwungen.

Die Entscheidung bleibt daher `ACCEPT_TEMPORARILY`. Ein 2.26→2.27-Update allein ist **kein** belastbarer Fix für diese Warnung.

Referenzen:

- https://github.com/googleapis/js-genai/releases/tag/v2.27.0
- https://github.com/googleapis/js-genai/blob/main/package.json
- https://github.com/googleapis/google-cloud-node-core/issues/925

