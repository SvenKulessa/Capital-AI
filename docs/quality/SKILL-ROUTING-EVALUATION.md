# CAPITAL AI – Skill-Routing-Evaluation

**Stand:** 2026-10-11 · Autorität: `AGENTS.md` / `SOLO_MAINTAINER_FLOW@1`.

## Ausführung
```sh
npm run test:domain-skills
node scripts/skill-routing-evaluation.mjs
```

**Datengrundlage:** 41 bestehende manuell gelabelte Baseline-Aufgaben plus 35 neue
synthetische Challenge-Aufgaben: 20 anders formulierte Einzel-Skill-Aufgaben
(zwei je Enterprise-Skill), 7 fachübergreifende Fälle und 8 Negativkontrollen.
Alle fünf Domains dürfen jeden der zehn Fach-Skills auswählen. Der neue
Test wiederholt alle 35 Challenges für jede aufrufende Domain.

**Metriken:** Der JSON-Evaluator gibt `exactSet.accuracy`, Micro-Precision,
Micro-Recall, Micro-F1, Abstentionszahl, per-Skill- und per-Domain-Kennzahlen
sowie `failures` (erwartet, ausgewählt, fehlend, unerwartet) aus.
Damit werden Scheintreffer und übersehene Skills sichtbar. Eine Auswahl ist
nur dann exakt korrekt, wenn die gesamte Skill-Menge übereinstimmt.
Die Evaluation läuft in der **bestehenden** Node-Regression innerhalb des
`Docker Security Gate`; es entsteht weder ein separater Workflow noch
ein weiterer Required Check oder eine administrative Freigabeschicht.

**Grenzen:** Fixierte, synthetische und manuell gelabelte Aufgaben sind keine
unabhängige Messung der Trefferquote auf produktiven Chat-Anfragen. Der Router
arbeitet mit lexikalischen Signalen und versteht Negation, Kontext,
Mehrdeutigkeit und neue Umschreibungen nicht zuverlässig. Die Evaluation
belegt **nicht**, dass ChatGPT/Copilot in einer konkreten Laufzeit die
gewählten `SKILL.md`-Dateien tatsächlich liest. Dafür wären separate
Runtime-Beobachtungen mit Datenschutzvorkehrungen nötig.
`REVIEW_REQUIRED` bedeutet nur nicht eindeutige fachliche Zuordnung
und keine zusätzliche Owner-/Merge-Freigabe.

**Security, Kosten und Rechte:** Kein LLM-/Provider-Aufruf, keine Credentials,
keine personenbezogenen Daten, keine neue Dependency, keine Rechteerhöhung.
Ein bestandener Routing-Test ist weder eine Security- noch eine Lizenz-
oder Production-Freigabe. Rücknahme durch Revert von Registry, Corpus,
Evaluator, Dokumentation und Testergänzung.
