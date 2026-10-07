# Social Campaign 01 — Build your own FinTech Score

Stand: 2026-10-07  
Status: DRAFT / review-ready, nicht veröffentlicht  
Campaign-ID: `capital-ai-score-builder-20261007`

## Ziel

CAPITAL-AI als modularen BYOK Scoring- und Screener-Baukasten positionieren. Die technische Infrastruktur wird erklärt, aber nicht als Hauptprodukt verkauft.

## Kernbotschaft

> Verbinde deine Datenquellen, kombiniere Analysebausteine und entwickle einen eigenen nachvollziehbaren Score — statt nur einen fremden Score zu konsumieren.

## Content Pillars

1. **Scoring First** — Analysequalität, Gewichtung und Reproduzierbarkeit stehen vor Storage-Komplexität.
2. **BYOK / Provider-neutral** — Nutzer können Datenquellen modular anbinden.
3. **Evidence / Replay** — Scores sollen auf Datenherkunft, Zeitstempeln und Replay beruhen.
4. **Scale on demand** — Valkey, NATS/JetStream und Supabase bilden die Startbasis; zusätzliche Storage-Klassen kommen erst mit realer Last.

## Asset 01 — LinkedIn Launch

**Hook**

Was wäre, wenn dein Screener nicht einen fremden Score erklärt — sondern deinen eigenen baut?

**Draft**

CAPITAL-AI entwickelt sich in Richtung eines modularen FinTech-Scoring-Baukastens.

Die Idee: Datenquellen anbinden, Analysewerkzeuge kombinieren, Gewichtungen festlegen und daraus einen eigenen nachvollziehbaren Score für den Screener entwickeln.

Die Startinfrastruktur bleibt bewusst schlank:

- Valkey für schnellen Cache
- NATS + JetStream für Events und Replay
- Supabase für App-, Nutzer- und Konfigurationsdaten
- provider-neutrale Adapter für BYOK-Datenquellen

Der Fokus liegt zuerst auf dem, was für den Nutzer messbar wird: Datenqualität, Analysebausteine, Scoring, Explainability und Screener.

Storage wächst später mit realer Nutzung — nicht vorher.

**CTA:** Architektur und Roadmap auf CAPITAL-AI ansehen.

**Module:** COPY → IMAGE → ATTRIBUTION

---

## Asset 02 — YouTube Short / Reel

**Titel:** Vom API-Key zum eigenen FinTech Score

**Script, ca. 60–75 Sekunden**

Viele Market Screener geben dir einen fertigen Score.

CAPITAL-AI verfolgt einen anderen Ansatz.

Du bindest deine Datenquelle an — perspektivisch per BYOK.  
Die Daten laufen über eine provider-neutrale Bridge, NATS und JetStream.  
Valkey hält die schnellen Datenpfade im Cache.  
Danach kommen die eigentlichen Analysebausteine.

Momentum. Trend. Volatilität. Liquidität. Risiko. Fundamentaldaten.

Diese Module sollen sich zu einem eigenen Score kombinieren lassen.

Zum Beispiel:

Momentum 25 Prozent.  
Trend 20 Prozent.  
Volatilität 15 Prozent.  
Liquidität 15 Prozent.  
Fundamentals 15 Prozent.  
Risk 10 Prozent.

Der wichtige Teil ist nicht nur die Zahl.

CAPITAL-AI soll nachvollziehbar machen, welche Daten und Analysebausteine den Score erzeugt haben — und ihn per Replay reproduzierbar machen.

Das Ziel: Build your own FinTech Score.

**CTA:** Folge der Entwicklung im CAPITAL-AI Learning Portal.

**Module:** COPY → IMAGE → TTS → VIDEO → ATTRIBUTION

---

## Asset 03 — Reddit Engineering Post

**Titel:** Why we are not building a giant market-data warehouse first

A common temptation in FinTech architecture is to design storage for a scale you do not have yet.

CAPITAL-AI takes the opposite route.

The initial stack is deliberately small:

- Valkey for hot cache
- NATS + JetStream for event transport and bounded replay
- Supabase/Postgres for application and user state
- provider adapters for BYOK market data

The product focus is elsewhere: normalization, analysis tools, deterministic scoring, explainability and screening.

If usage grows, storage can grow with it: time-series databases, object storage, warehouses or graph/vector layers can be introduced when measurements justify them.

This keeps infrastructure complexity proportional to actual product demand.

The product question we want to answer first is:

**Can users combine data sources and analysis modules into a score they understand and can reproduce?**

**Module:** COPY → ATTRIBUTION

---

## Asset 04 — LinkedIn Technical Deep Dive

**Hook:** Ein guter Score ist nicht nur eine Zahl.

Ein Score ist nur dann technisch interessant, wenn wir später beantworten können:

- Welche Daten wurden verwendet?
- Von welchem Provider?
- Zu welchem Zeitpunkt?
- Welche Features entstanden daraus?
- Welche Analysebausteine waren beteiligt?
- Welche Gewichtungen wurden verwendet?
- Kann derselbe Zustand reproduziert werden?

Deshalb baut CAPITAL-AI Scoring zusammen mit Evidence und Replay.

Der geplante Score Builder soll nicht nur Gewichtungen konfigurieren, sondern Score-Versionen nachvollziehbar machen.

Das ist die Grundlage dafür, Analysewerkzeuge später modular kombinieren zu können.

**CTA:** Evidence-first Scoring in der CAPITAL-AI Roadmap verfolgen.

**Module:** COPY → IMAGE → ATTRIBUTION

---

## Asset 05 — Website Hero / Campaign Landing Copy

### Build your own FinTech Score

Verbinde deine Datenquellen. Kombiniere Analysewerkzeuge. Entwickle einen eigenen nachvollziehbaren Score.

CAPITAL-AI baut eine provider-neutrale Scoring- und Screener-Plattform, bei der Analysebausteine, Gewichtungen, Evidence und Replay zusammengehören.

**Geplante Bausteine**

- BYOK Provider
- Daten-Normalisierung
- Momentum / Trend / Volatilität / Liquidität / Risiko
- Composite Scores
- Explainability
- Deterministic Replay
- Screener
- später eigener Score-/Tool-Marketplace

**CTA:** Roadmap ansehen

---

## Asset 06 — Podcast Deep Dive

**Arbeitstitel:** Warum Scoring vor Storage-Skalierung kommt

**8–12-Minuten-Struktur**

1. Problem: Infrastruktur kann Produktentwicklung überholen.
2. Startarchitektur: Valkey + NATS/JetStream + Supabase.
3. BYOK und Provider Bridge.
4. Daten-Normalisierung und Instrument Registry.
5. Analysewerkzeuge als Module.
6. Composite Score und Gewichtungen.
7. Evidence, Explainability und Replay.
8. Screener als sichtbares Produkt.
9. Wann zusätzliche Storage-Technologien wirklich sinnvoll werden.
10. Ausblick: Score Builder, Marketplace und Agenten.

**Module:** COPY → TTS → ATTRIBUTION

## Messung

Jedes Asset verwendet dieselbe Campaign-ID und eine eigene Content-ID.

- **GSC:** Search-Impressions, Clicks und Position.
- **Website:** Landingpage-Views und CTA-Klicks.
- **Social:** Impressions, View-Through, Saves, Kommentare und Link-Klicks.
- **Video/Podcast:** Views, Watch Time / Completion und Weiterklick.
- **Attribution:** GSC, Product Analytics und Social bleiben getrennte Quellen und werden erst über Campaign-/Content-ID korreliert.
