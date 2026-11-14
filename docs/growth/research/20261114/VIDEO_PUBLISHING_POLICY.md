# Content Engine – redaktionelle Orientierung für Video-Entwürfe
**Status:** PROPOSED  
**Gültig für:** SocialMediaEngine, MediaProjectV2, ContentSocialPackage, Learning Hub Videos  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Grundsatz

Dieses Dokument ist ein Entwurf zur redaktionellen Qualitätssicherung und kein zusätzlicher verpflichtender Gate- oder Review-Prozess. Rechtlich erforderliche Nutzungsrechte und bereits geltende Publishing-Sperren aus AGENTS.md bleiben maßgeblich. Dieses Paket aktiviert kein automatisches Publishing. Videos sollen den tatsächlichen Produktstand korrekt wiedergeben (implementiert / Entwurf / blockiert).

## Vorgaben vor Veröffentlichung

1. **Logo- und Branding-Prüfung**  
   - Das Gemini Notebook Logo (oder vergleichbare externe Tool-Logos) muss vor jeder Veröffentlichung entfernt werden.  
   - Ersetzt wird es durch das CAPITAL-AI-Branding (Navy/Gold/Cyan, ggf. Siegel oder Globe).  
   - Keine irreführenden Partnerschafts- oder Tool-Hinweise.

2. **Lizenz- und Quellenprüfung**  
   - Alle visuellen und auditiven Elemente müssen lizenziert sein (siehe CONTENT_ENGINE_IMAGE_LICENSE_POLICY.md).  
   - Generierte Inhalte: Status SUBSCRIPTION_GENERATED oder FIRST_PARTY.  
   - Drittquellen (z. B. EZB): LICENSE_REVIEW_REQUIRED bis zur Freigabe.

3. **Inhaltliche Korrektheit**  
   - Synthetische Daten klar als didaktisch kennzeichnen.  
   - Keine Leistungsversprechen oder Produktionsbehauptungen ohne Evidence.  
   - Produktstand korrekt darstellen (z. B. Learning Simulator vorhanden, Publishing blockiert).

4. **Technische Qualität**  
   - Barrierefreiheit: Untertitel, ausreichender Kontrast, Alt-Texte wo möglich.  
   - Deterministische Elemente (resvg) bevorzugt für wiederholbare Grafiken.  
   - Voice-over sachlich und ohne übertriebene Claims.

5. **Rechte und Evidence**  
   - Nur tatsächlich erforderliche Rechte-, Kosten- und Publishing-Entscheidungen folgen AGENTS.md.  
   - Quelle und gegebenenfalls SHA/Evidence nachvollziehbar dokumentieren; daraus entsteht kein neuer Required Check.

## Statuskennzeichnungen für Videos

- `DRAFT` – intern, nicht veröffentlicht  
- `LICENSE_REVIEW_REQUIRED` – offene Rechte  
- `BRANDING_CHECK_PENDING` – Logo-Entfernung oder Branding noch offen  
- `READY_FOR_APPROVAL` – alle technischen und inhaltlichen Checks bestanden  
- `BLOCKED` – keine Veröffentlichung

## Umsetzung in bestehenden Entwürfen

Die Storyboards und Kurzvideo-Konzepte in SOCIAL_MEDIA_ENTWUERFE_20261114.md können diese redaktionelle Orientierung nutzen. Drittanbieterlogos dürfen nicht irreführend eingesetzt werden; ihre Verwendung oder Entfernung richtet sich nach tatsächlichen Marken- und Nutzungsrechten.

Diese Hinweise ersetzen keine rechtliche Beratung, ändern keine bestehenden Governance-Dateien und schaffen keine neuen PR- oder Publishing-Freigaben.
