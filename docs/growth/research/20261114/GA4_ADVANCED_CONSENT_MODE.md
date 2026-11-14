# GA4 Advanced Consent Mode – Spezifikation
**Status:** PROPOSED  
**Arbeitspaket:** CA-GROWTH-PUBLIC-CONTENT-SEO-SECURITY  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Unterschied Basic vs. Advanced

| Aspekt | Basic (aktuell) | Advanced (vorgeschlagen) |
|--------|-----------------|---------------------------|
| Tag-Ladezeitpunkt | Erst nach Opt-in | Sofort mit denied-Defaults |
| Modeling | Nein | Ja (geschätzte Conversions) |
| Cookies vor Opt-in | Keine | Keine (denied) |
| Daten vor Opt-in | Keine | Cookielose Pings möglich |

## Vorgeschlagene Implementierung

```javascript
// Tag früh laden
w.dataLayer = w.dataLayer || [];
w.gtag = function(){ w.dataLayer.push(arguments); };
w.gtag('consent', 'default', {
  analytics_storage: 'denied',
  ad_storage: 'denied',
  ad_user_data: 'denied',
  ad_personalization: 'denied',
  wait_for_update: 500
});
w.gtag('js', new Date());
// Script laden (auch bei denied)
// ...

// Nach Opt-in
w.gtag('consent', 'update', {
  analytics_storage: 'granted'
  // Ads bleiben denied
});
```

## Auswirkungen

- Ermöglicht Google Consent Mode Modeling für nicht eingewilligte Nutzer.
- Erhöht die Datenmenge, die vor explizitem Opt-in an Google gesendet werden kann (cookielose Pings).
- Erfordert aktualisierte Datenschutz- und Consent-Texte.
- Widerspricht dem aktuellen fail-closed Ansatz (Tag nur nach Opt-in).

## Empfehlung

**Nicht aktivieren**, solange keine explizite rechtliche und produktseitige Freigabe vorliegt. Der aktuelle Basic-Mode ist restriktiver und entspricht dem bestehenden Consent-Modell.

Falls Advanced Mode gewünscht ist:
1. Rechtliche Prüfung (DSGVO, ePrivacy).
2. Aktualisierung der Consent-Texte.
3. Explizite Maintainer-Freigabe.
4. Implementierung und Test im Branch.
5. Evidence und Rollback-Plan.

**Status:** Spezifikation erstellt. Implementierung bleibt **PROPOSED** und ist ohne weitere Freigabe nicht aktiviert.
