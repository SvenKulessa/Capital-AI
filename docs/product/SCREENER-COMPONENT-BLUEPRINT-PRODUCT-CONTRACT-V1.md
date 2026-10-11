# CAPITAL AI — Gemeinsamer Leistungsumfang der Screener Component Blueprints

**Vertragsstand:** Konzept v1.0.0 · **Produktklasse:** `TECHNICAL_COMPONENT_BLUEPRINT` · **Geltungsbereich:** `CAP-BP-001` bis `CAP-BP-050` · **Ziel:** Studio Hub > Screener Blueprints.

Diese Produktbeschreibung ist eine **Soll-Spezifikation**. Sie ist weder eine freigegebene Kundenlizenz noch die Behauptung, dass Checkout, Download oder ein vollständiges Bundle heute produktiv verfügbar sind. Das autorisierende Engineering-Regelwerk bleibt `AGENTS.md` mit `SOLO_MAINTAINER_FLOW@1`.

## Vertragsgegenstand

Verkauft werden soll die dokumentierte fachliche Erfahrung und das konzeptionelle Design: Business Purpose, benötigte Datenverträge und Pipeline, Feature- und Indikatorverfahren, vorgeschlagene Formeln, Gewichtungen und Schwellenwerte, Kontroll-/Risiko-Gates, erklärbare Ergebnisse, UI-Interaktionsentwurf, API-Konzept sowie Test-, Evidence-, Replay- und Implementierungsanforderungen. Nichtproduktive Zod-Schemas, DTOs und synthetische Fixtures gehören nur dann zum Lieferumfang, wenn sie im Einzel-Bundle ausdrücklich aufgeführt sind.

Die geplante interaktive Blueprint-Darstellung wird im Studio Hub angeboten, ohne bereits bestehende Architektur-Blueprints, den 50-Komponenten-Explorer oder die öffentliche Screener-Dokumentation als zweite vollständige Bibliothek zu kopieren.

**Nicht verkauft / nicht enthalten:** produktive Datenanbindungen und Provideradapter, Datenanbieter-Zugänge oder Schlüssel, Echtzeit-/verzögerte/historische Marktdaten, Providerlizenzen und Datenweitergaberechte, Backend-Deployment, Runtime-SLA, empirisch validierte Modellgüte, Handelsausführung, Anlageempfehlung oder Renditegarantie. Solche Leistungen bedürfen einer separaten konkret autorisierten Vereinbarung.

## Verbindlicher Kundenhinweis: Blueprint-Leistungsumfang

> Verkauft wird das fachliche und technische Konzept dieser Analyse-Komponente: Datenkonzept, geplante Pipeline, Berechnungs- und Scoringlogik, vorgeschlagene Gewichtungen, Kontrollregeln sowie die interaktive Blueprint-Darstellung. Nicht enthalten sind produktive Datenanbindungen, Provider-Zugänge, Datenlizenzen, Live-Daten, Deployment oder ein Nachweis empirischer Modellgüte. Alle Formeln, Gewichte und Schwellenwerte sind Vorschläge, bis sie unabhängig implementiert, getestet und validiert wurden.

## Einheitliche Evidence-Semantik

| Status | Aussage |
| --- | --- |
| `CONCEPT` / `DESIGNED` | Fachlich spezifiziert; kein Laufzeitnachweis |
| `DOCUMENTED` | Konkrete Dokumentenfundstelle |
| `IMPLEMENTED_UNVERIFIED` | Codefundstelle vorhanden; Verhalten nicht belegt |
| `TESTED` | Nachvollziehbares Testergebnis und Scope vorhanden |
| `RUNTIME_VERIFIED` | Reproduzierbarer Laufzeitnachweis/Telemetrie für genaue Version |
| `NOT_PROVEN` | Nachweis fehlt oder wurde nicht geprüft |
| `BLOCKED` | Konkrete Abhängigkeit verhindert Freigabe |

`PRODUCTION` ist **kein** automatisch aus Tests abgeleiteter Evidence-Status. Deployment, Monitoring, verantwortlicher Betrieb sowie einschlägige technische, Rechte- und Owner-Freigaben müssen separat belegt sein.

Provider nur als Kandidaten bezeichnen, solange kein zulässiger Anschluss belegt ist. Alle synthetischen Beispiele mit `isDemo=true`, Herkunft `SYNTHETIC` und sichtbarem `DEMO`-Label kennzeichnen; kein Mischen von Demo- und Live-Daten. Unbekannte oder fehlende Werte nicht als `0` oder `PASS` interpretieren. Hard Gates lassen sich nicht durch Scoring-Gewichte überstimmen. Confidence ist keine Gewinnwahrscheinlichkeit.

## 14-Modul-Umfang je Komponente

`01_component_identity`, `02_business_purpose`, `03_data_contracts`, `04_data_pipeline`, `05_feature_engineering`, `06_indicators_and_analytical_tools`, `07_scoring_model`, `08_weighting_and_normalization`, `09_confidence_and_quality`, `10_risk_and_gates`, `11_evidence_and_explainability`, `12_ui_integration`, `13_api_contract`, `14_acceptance_criteria`.

Formeln, Gewichte, Schwellen, Modellannahmen und Leistungsziele eines Blueprint-Bundles sind `PROPOSED / NOT_VALIDATED`, außer eine individuelle Fundstelle begründet einen höheren Status.

## Vertrieb, Rechte und UI-Grenzen

Die vorhandene `src/data/blueprintDeliveryPolicy.ts` bleibt für nicht freigegebene private Lieferungen fail-closed (`currentCommerceAdmission=false`). Kein Checkout, Stripe-SKU, Entitlement oder privater Produktdownload wird durch dieses Dokument aktiviert. Vor tatsächlichem Verkauf werden Lizenz-/IP- und Lieferrechte konkret geprüft und die bestehende serverseitige Auth-/Tenant- und Entitlement-Grenze eingehalten. Rechte an Drittsoftware, Modellen und Marktdaten werden nicht mitübertragen.

**Single-source-Architektur:** Sieben bestehende `STUDIO_BLUEPRINTS` bleiben Architektur-Blueprints; `CANONICAL_50_COMPONENTS` bleibt die fachliche Identitätsquelle für Scorer. Die verkaufbaren Component Blueprints referenzieren diese Identitäten, ohne eine zweite Scorer- oder Provider-Registry aufzubauen. Die öffentliche Dokumentationsseite bleibt eine Preview; vollständige kundenbezogene Dokumente nicht öffentlich über statische Assets ausliefern.

**Learning-Abgrenzung:** Der interaktive Chart-Lernatlas gehört ausschließlich in das Learning Portal (Route `/learning/chart-lernatlas`) mit bestehenden Entitlements; auf der Startseite nur Text-Verlinkung, keine Atlas-Lektionen.

## Referenz für den ersten Component Blueprint

`CAP-BP-001` / `market_integrity_gate` / *Market Integrity Gate*: Ein vorgeschaltetes Datenintegritäts-Kontrollkonzept und **kein** Alpha-/Renditescore. Der Registry-Lifecycle ist `blocked`, die Datenprovenienz `unavailable`; komponentenspezifische Implementierung, aktive Provider, Rechtslage, Score-Güte und Production sind `NOT_PROVEN`. Blueprint-Version und Registry-Calculation-Version dürfen nicht verwechselt werden.

**Abnahme dieses Dokument-Scopes:** keine neuen Provider, Datenimporte, Datenbankmigrationen, Auth-Änderungen, Produktionsscore-Ausführung, zusätzlichen CI-Gates oder kostenpflichtigen Dienste.
