# Content Engine – redaktionelle Hinweise zur Bildlizenzierung
**Status:** PROPOSED  
**Gültig für:** ContentEngine, SocialMediaEngine, MediaProjectV2, resvg-Pipeline  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Grundsatz

Vor externer oder kommerzieller Verwendung müssen die jeweils einschlägigen Rechte an Bildern und eingebetteten Elementen geklärt sein. Für interne Entwürfe genügen eindeutige Quellen- und Prüfstatuskennzeichnungen; unklare Rechte erlauben keine öffentliche Nutzung. Diese Hinweise ergänzen keine verpflichtenden PR-Gates über AGENTS.md hinaus.

## Anforderungen

1. **Lizenzdokumentation**  
   Jedes zur Veröffentlichung vorgesehene Bild erhält eine nachvollziehbare Rechte- und Quellenangabe (z. B. eigene Gestaltung, abonnementgeneriert mit geprüften Nutzungsbedingungen oder lizenzierte Drittquelle). **Die Softwarelizenz des Renderers resvg bestimmt nicht automatisch die Lizenz des erzeugten Bildes.**

2. **Quellenkennzeichnung**  
   Herkunft und Erstellungsdatum müssen nachvollziehbar sein. Bei generierten Bildern ist der Generator (z. B. Grok Imagine) und der Status (didaktisch / Entwurf) anzugeben.

3. **Keine ungeprüfte kommerzielle Wiederverwendung**  
   Drittinhalte (insbesondere offizielle Quellen wie EZB) bleiben LICENSE_REVIEW_REQUIRED, bis eine explizite Freigabe vorliegt.

4. **Deterministische Pipeline bevorzugt**  
   Wo sinnvoll, reproduzierbare SVG-/resvg-Grafiken verwenden. First-party-Status gilt nur, wenn auch die enthaltenen Eingabebilder, Schrift- und Gestaltungselemente entsprechend berechtigt sind.

5. **Rechte- und Publishing-Grenzen**  
   Tatsächlich erforderliche Rechtefreigaben und konkrete Publishing-Befugnisse richten sich ausschließlich nach AGENTS.md und den jeweiligen Lizenzbedingungen. Dieses Dokument schafft weder einen allgemeinen Human-Gate noch einen zusätzlichen Required Check; kein automatisches Publishing durch dieses Paket.

## Statuskennzeichnungen

- `FIRST_PARTY` – intern erzeugt oder resvg-Output  
- `SUBSCRIPTION_GENERATED` – über Abonnementfunktionen erzeugt (z. B. Grok Imagine)  
- `LICENSE_REVIEW_REQUIRED` – Drittquelle mit offenen Rechten  
- `BLOCKED` – keine Verwendung bis Freigabe

## Umsetzung in bestehenden Modulen

Das Package enthält redaktionelle Modultexte und Medienkonzepte; eine pauschale Lizenzfreigabe für später zu erzeugende Bilder lässt sich daraus nicht ableiten. `SUBSCRIPTION_GENERATED` belegt nur die Herkunft, nicht automatisch kommerzielle Nutzungsrechte.

Diese Hinweise ersetzen keine rechtliche Beratung, ändern keine bestehenden Governance-Dateien und schaffen keine zusätzlichen Freigaben.
