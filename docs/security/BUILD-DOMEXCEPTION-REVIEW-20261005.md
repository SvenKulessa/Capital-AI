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
