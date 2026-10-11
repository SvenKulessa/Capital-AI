# CAPITAL-AI — Skill-Routing-Evaluation

**Stand:** 11.10.2026 · **Scope:** zehn gemeinsam verfügbare Enterprise-Skills aus `.agents/skills/registry.json` · **Autorität:** ausschließlich `AGENTS.md`, `SOLO_MAINTAINER_FLOW@1`.

## Ziel

Eine reproduzierbare, nicht kostenwirksame Evaluation beantwortet, ob der **bestehende deterministische Routing-Algorithmus** bei typischen synthetischen Aufgaben die erwarteten Enterprise-Skills zuordnet. Die vorhandenen 41 kuratierten Fälle decken zehn Spezialisten, fünf Domains, Mehrfachzuordnungen und bewusst erwartete Abstention ab. Die zusätzliche Evaluation bildet zu jedem dieser Fälle eine Konfusionsauswertung und testet die Zuordnung unabhängig vom aufrufenden Domain-Chat.

## Nachprüfbare Ausführung

```bash
npm run skill:routing:evaluate
npm run test:domain-skills
```

`skill:routing:evaluate` gibt JSON im Contract `CAPITAL_AI_SKILL_EVALUATION_REPORT@1` aus und liefert bei Abweichungen Exit-Code 1. Die vorhandene `scripts/skill-routing.test.mjs` prüft Baseline, Metriken, Domainunabhängigkeit sowie absichtlich injizierte Fehlklassifikationen, die zuverlässig als FAIL erkannt werden müssen. Die bestehenden Repository-Tests bleiben unter demselben `test:domain-skills`-Aufruf erhalten; keine zusätzliche Workflow-Datei, kein Required Check und kein Preflight.

## Bedeutung der Metriken

- **Exact-Match:** erwartete Fach-Skill-Menge entspricht genau der vorgeschlagenen Menge (41 unabhängige Testaufgaben).
- **Precision:** korrekt zugeordnete Fach-Skills / alle zugeordneten Fach-Skills; **Recall:** korrekt zugeordnete / alle erwarteten Fach-Skills; **F1:** harmonischer Mittelwert.
- **Abstention:** kein Spezial-Skill erwartet; das korrekte Ergebnis ist die leere Menge (`REVIEW_REQUIRED` im Router). Keine pauschale Ablehnung der normalen Domain-Bearbeitung.
- **Domain Sweep:** dieselbe Aufgabe wird jeweils aus PRODUCT, MARKET, PLATFORM, TRUST und GROWTH klassifiziert (41 × 5 = 205 Vergleiche), ohne dass Domainpräferenzen die Fähigkeit zur Zusammenarbeit einschränken.
- **Mismatch-Evidence:** Fall-ID, aufrufende Domain, erwartete, tatsächliche, fehlende und überschüssige Spezial-Skills. Regressionstests manipulieren absichtlich einzelne Antworten und Domainergebnisse, um eine fehlerhafte Evaluation auszuschließen.

## Harte Aussagegrenzen

Die Beispiele teilen sich das festgelegte Fachvokabular des regelbasierten Routers. **Hohe Testwerte sind daher keine unabhängige Generalisierungs-, semantische Klassifikations- oder LLM-Evidence.** Synonyme ohne Signalschlüsselwort, Negationen, gemischte Absichten, Zitatschachtelung und mehrdeutige Nutzerabsichten können weiterhin falsch klassifiziert werden. Das Offline-Skript nutzt ausschließlich synthetische Aufgaben und Repository-Dateien: kein Providerzugang, keine API-Tokens, keine personenbezogenen Kundendaten und keine Tokenkosten. Die Nutzung der Repository-Skills durch eine tatsächlich verbundene ChatGPT-Runtime sowie die Qualität ihrer Auswahl bleiben **NOT_PROVEN**, bis ein eigenständiger, autorisierter End-to-End-Agent-Test real durchgeführt wird.

## Architektur- und Governance-Grenze

Das Ergebnis ist Diagnose- und Regressionsevidence, keine zusätzliche Zulassungs-, Sicherheits-, Lizenz-, Kosten- oder Production-Freigabe. Bei Mismatch Lexikon, Beispiele oder Auswahlprozess gezielt korrigieren, ohne weitere administrativen Gate-Schichten zu etablieren. Falls externe LLM-basierte Evals später erwünscht sind, zunächst Provider-, Datenschutz- und Tokenkosten einzeln bewerten; keine kostenpflichtige Aktivierung ohne Owner-Zustimmung.
