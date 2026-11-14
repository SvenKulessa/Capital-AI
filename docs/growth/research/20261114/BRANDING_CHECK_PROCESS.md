# Branding-Check-Prozess
**Status:** PROPOSED  
**Gültig für:** Videos, Social-Media-Entwürfe, Learning-Hub-Grafiken, Content Engine Outputs  
**Governance:** AGENTS.md / SOLO_MAINTAINER_FLOW@2  
**Datum:** 14.11.2026

## Zweck

Der Branding-Check stellt sicher, dass vor jeder Veröffentlichung ausschließlich CAPITAL-AI-konformes Branding verwendet wird. Externe Tool-Logos (insbesondere das Gemini Notebook Logo) werden entfernt. Der Prozess ist verpflichtend und unterliegt dem Human-Gate.

## Checkliste vor Veröffentlichung

### 1. Logo- und Markenprüfung
- [ ] Gemini Notebook Logo (oder vergleichbare externe Tool-Logos) vollständig entfernt
- [ ] CAPITAL-AI-Branding eingesetzt (Navy #0A1628, Gold #C9A227, Cyan #00D4FF)
- [ ] Keine irreführenden Partnerschafts- oder Tool-Hinweise
- [ ] Siegel, Globe oder freigegebene Markenelemente korrekt platziert
- [ ] Keine Überlagerung oder Verzerrung von Markenelementen

### 2. Visuelle Konsistenz
- [ ] Farbschema eingehalten
- [ ] Kontrast ausreichend (Barrierefreiheit)
- [ ] Typografie und Abstände konsistent
- [ ] Keine fremden Wasserzeichen oder Overlays

### 3. Inhaltliche Korrektheit
- [ ] Produktstand korrekt dargestellt (implementiert / Entwurf / blockiert)
- [ ] Synthetische Daten als didaktisch gekennzeichnet
- [ ] Keine übertriebenen Leistungsversprechen

### 4. Lizenz- und Quellenprüfung
- [ ] Alle Bilder und Videos gemäß CONTENT_ENGINE_IMAGE_LICENSE_POLICY.md lizenziert
- [ ] Statuskennzeichnung vorhanden (SUBSCRIPTION_GENERATED / FIRST_PARTY / LICENSE_REVIEW_REQUIRED)
- [ ] EZB-bezogene Inhalte mit Disclaimer und LICENSE_REVIEW_REQUIRED

### 5. Technische Freigabe
- [ ] Untertitel oder Alt-Texte vorhanden (wo anwendbar)
- [ ] Deterministische Elemente (resvg) bevorzugt und dokumentiert
- [ ] Voice-over sachlich und ohne Claims

## Ablauf

1. **Draft erstellen** → Status: `DRAFT`
2. **Branding-Check durchführen** → Status: `BRANDING_CHECK_PENDING`
3. **Checkliste abarbeiten** → bei Abweichungen korrigieren
4. **Human-Review** → explizite Freigabe durch Maintainer
5. **Statuswechsel** → `READY_FOR_APPROVAL` oder `BLOCKED`
6. **Dokumentation** → SHA und Evidence festhalten

## Verantwortlichkeiten

- Content-Ersteller: Erste Prüfung und Korrektur
- Maintainer: Finale Freigabe (SOLO_MAINTAINER_FLOW@2)
- Kein automatisches Publishing ohne abgeschlossenen Check

## Verknüpfung

Diese Richtlinie ergänzt:
- VIDEO_PUBLISHING_POLICY.md
- CONTENT_ENGINE_IMAGE_LICENSE_POLICY.md

Alle Learning-Module und Social-Entwürfe in diesem Package unterliegen dem Branding-Check.

Diese Richtlinie ersetzt keine rechtliche Beratung und ändert keine bestehenden Governance-Dateien.
