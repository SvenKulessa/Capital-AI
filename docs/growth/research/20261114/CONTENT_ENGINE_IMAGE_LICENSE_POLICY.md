# Content Engine – Richtlinie für Bildlizenzierung
**Status:** PROPOSED  
**Gültig für:** ContentEngine, SocialMediaEngine, MediaProjectV2, resvg-Pipeline  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Grundsatz

Alle von der Content Engine oder verbundenen Pipelines erzeugten oder eingebundenen Bilder müssen vor Verwendung mit einer klaren Lizenz versehen und dokumentiert werden. Unlizenzierte oder unklare Bildquellen dürfen nicht in Learning-Hub-Inhalte, Social-Media-Entwürfe oder öffentliche Ausgaben übernommen werden.

## Anforderungen

1. **Lizenzdokumentation**  
   Jedes Bild erhält eine eindeutige Lizenzangabe (z. B. first-party, MPL-2.0 für resvg-Outputs, Abonnement-generiert, oder explizit freigegebene Drittquelle).

2. **Quellenkennzeichnung**  
   Herkunft und Erstellungsdatum müssen nachvollziehbar sein. Bei generierten Bildern ist der Generator (z. B. Grok Imagine) und der Status (didaktisch / Entwurf) anzugeben.

3. **Keine ungeprüfte kommerzielle Wiederverwendung**  
   Drittinhalte (insbesondere offizielle Quellen wie EZB) bleiben LICENSE_REVIEW_REQUIRED, bis eine explizite Freigabe vorliegt.

4. **Deterministische Pipeline bevorzugt**  
   Wo möglich, resvg-basierte, reproduzierbare Grafiken verwenden. Diese sind first-party und unterliegen den im Repository dokumentierten Bedingungen.

5. **Human-Gate**  
   Vor jeder öffentlichen oder produktiven Verwendung ist eine redaktionelle und lizenzrechtliche Freigabe erforderlich. Kein automatisches Publishing.

## Statuskennzeichnungen

- `FIRST_PARTY` – intern erzeugt oder resvg-Output  
- `SUBSCRIPTION_GENERATED` – über Abonnementfunktionen erzeugt (z. B. Grok Imagine)  
- `LICENSE_REVIEW_REQUIRED` – Drittquelle mit offenen Rechten  
- `BLOCKED` – keine Verwendung bis Freigabe

## Umsetzung in bestehenden Modulen

Die Learning-Module und Social-Entwürfe in diesem Package verwenden ausschließlich `SUBSCRIPTION_GENERATED` oder first-party Diagramme. Keine fremden Medien wurden übernommen.

Diese Richtlinie ersetzt keine rechtliche Beratung und ändert keine bestehenden Governance-Dateien.
