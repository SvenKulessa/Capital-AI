# CAPITAL-AI AI-/Design-Asset-Provenienz und Brand-Symbol-Policy

**Status:** REVIEWED TECHNICAL EVIDENCE — LEGAL/BRAND GUIDELINES PER SYMBOL REMAIN AUTHORITATIVE  
**Datum:** 2026-09-30  
**Repository:** SvenKulessa/Capital-AI  
**Baseline:** main@4fbd1373b07092ed8ef550f60e9cf60f1f3f526d

## 1. Ziel

Die bestehende CAPITAL-AI-Website wird nicht aufgrund ihrer KI-gestützten Entstehung
visuell reduziert. Design, Hero, Asset-Symbole und Branding bleiben erhalten, solange
ihre konkrete Verwendung einer nachvollziehbaren Herkunfts- und Rechtekette
zugeordnet werden kann.

`AI_GENERATED` oder `AI_ASSISTED` ist dabei ein Provenienzmerkmal und **keine
Lizenzfreigabe**.

## 2. Owner-Erklärung zur Entstehung

Der Repository-Owner hat am 30.09.2026 bestätigt:

- Das aktuelle Website-Design ist über ungefähr sechs Monate iterativ mit
  ChatGPT, Claude, Grok und Google AI Studio entstanden.
- Der Hero-/Globus-Mockup stammt aus der im Finance-Repository entwickelten
  CAPITAL-AI Social-Media-Engine bzw. deren Toolchain.
- Google AI Studio hat das Mockup als Design-/Implementierungsgrundlage für die
  aktuelle Website verwendet.
- Asset-Symbole wurden im selben owner-gesteuerten Entwicklungsprozess mit
  ChatGPT, Claude, Grok und Google AI Studio integriert.
- Die Social-Media-Engine und ihre Architektur-/Provenienzpfade sind im
  Finance-Repository historisch nachvollziehbar.

Diese Erklärung belegt den Projekt-/Entstehungskontext. Für Drittmarken ersetzt sie
nicht die jeweils geltenden Brand Guidelines oder Markenrechte.

## 3. Finance-Referenzen

Die bestehende Finance-Architektur dokumentiert eine SocialMediaEngine mit
Provenienz-/Compliance-Schicht sowie provider-neutralen ImageGenerationProvider-,
ImageEditProvider-, AssetValidator- und AssetRegistryService-Verträgen.

Relevante historische Referenzen:

- `capital-ai-online/Finance@dcef421fe6e350a3a2ade61d0299aad9ecca213c`
- `docs/architecture/AUTONOMOUS_CONTENT_ENGINE_ARCHITECTURE.md`
- `docs/social-media/CAPITAL-AI-SOCIAL/ROADMAP.md`

Die Finance-Dokumentation behandelt generierte Chat-/Media-Assets ausdrücklich erst
nach Materialisierung, Hash-/Provenienzprüfung und Validierung als Repository-Evidence.

## 4. Hero / Globus / Website-Design

Das bestehende Design bleibt Bestandteil des Produkts. Für die finale Asset-Evidence
werden folgende Felder gebunden:

- Repository-Pfad,
- SHA-256 des ausgelieferten Assets,
- Owner-directed / AI-assisted / AI-generated,
- Entstehungskette Finance Social-Media-Engine -> Mockup -> Google AI Studio ->
  Capital-AI-Implementierung,
- bekannte Provider/Modelle, soweit aus History belegbar,
- Erstellungs-/Integrationszeitraum,
- zugehörige Provider-/Tool-Nutzungsbedingungen,
- Human-/Owner-Review.

Fehlende historische Detailmetadaten werden als `UNKNOWN_HISTORICAL_DETAIL`
gekennzeichnet und nicht erfunden.

## 5. Asset-Symbole / Logos

Asset-Symbole werden nicht pauschal entfernt.

Für jedes unterscheidbare Symbol gilt eine der folgenden Quellenklassen:

1. **OFFICIAL_BRAND_ASSET** — offizielles Asset des Rechteinhabers mit passender
   Brand Guideline.
2. **LICENSED_ICON_SOURCE** — versionierte Icon-Quelle mit dokumentierter
   Copyright-/Asset-Lizenz und Brand-Guideline-Prüfung.
3. **OWNER_AI_RENDERED_IDENTIFICATION** — owner-gesteuerte KI-Zeichnung, die nur
   zur Identifizierung des bezeichneten Assets eingesetzt wird und separat auf
   Marken-/Verwechslungsrisiko geprüft wird.
4. **GENERIC_TICKER_BADGE** — neutraler Fallback aus Ticker/Text ohne fremde
   Logo-Geometrie.

Für eine Produktionsfreigabe muss ein Symbol mindestens Quelle, Version/Hash,
Nutzungszweck und Trademark-/Guideline-Status im Register besitzen.

## 6. Empfohlene lizenzierte Icon-Quelle

Simple Icons kann als bevorzugte Quelle für viele Unternehmens-/Projektmarken
verwendet werden. Das Projekt steht unter CC0, weist jedoch ausdrücklich darauf hin,
dass einzelne Icons eigene Lizenzinformationen besitzen können und Markenrechte
sowie Brand Guidelines separat zu beachten sind.

Daher wird Simple Icons **nicht** als pauschale Markenfreigabe behandelt. Pro
verwendetem Icon werden Version, Slug, Source/Guidelines und gegebenenfalls die
individuelle Lizenz im Asset-Register festgehalten.

Für Symbole ohne passenden belastbaren Nachweis wird der bestehende visuelle Platz
durch einen designgleichen generischen Ticker-Badge ersetzt, nicht durch eine leere
Fläche.

## 7. Darstellungsregeln

Brand-Symbole werden ausschließlich zur Identifizierung des jeweiligen Assets,
Unternehmens oder Netzwerks angezeigt. Die UI darf keine Unterstützung,
Partnerschaft, Zertifizierung oder Zugehörigkeit durch den Markeninhaber suggerieren.

Eine zentrale Disclaimer-Zeile soll lauten:

> Marken, Logos und Produktnamen gehören ihren jeweiligen Rechteinhabern und werden
> ausschließlich zur Identifizierung der dargestellten Assets bzw. Dienste verwendet.
> Es besteht keine implizite Partnerschaft oder Empfehlung.

## 8. Release-Gate

Die visuelle Website bleibt vollständig erhalten. Das Release-Gate unterscheidet:

- `PROVENANCE_COMPLETE`
- `COPYRIGHT_SOURCE_COMPLETE`
- `TRADEMARK_GUIDELINE_REVIEWED`
- `PROVIDER_TERMS_REVIEWED`
- `HASH_BOUND_TO_RELEASE`

Erst die Kombination der für das konkrete Asset einschlägigen Nachweise schließt
dessen Lizenz-/Rechteprüfung. Eine reine Kennzeichnung als `AI_GENERATED` reicht
nicht aus; sie bleibt Teil des Provenienzdatensatzes.
