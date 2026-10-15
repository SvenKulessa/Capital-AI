# PR #522 – Integration anstelle früherer Platzhalter

Die vorherige Dokumentation behauptete fälschlich, dass Quizzes und Buddy bereits vollständig integriert seien. Der reparierte Code stellt zuerst Portal und Buddy aus `main` wieder her und integriert dann die Ergänzungen.

- `LearningPortalPage.tsx`: vollständige Originalstruktur erhalten, zusätzlicher Quizzes-Tab mit Deep-Link.
- `HeroBuddy.tsx`: `openHeroBuddy` und vollständige Interaktionslogik erhalten, Notizen ergänzt.
- `PortfolioRiskQuiz.tsx`: 15 synthetische Lernfragen mit eigener Auswertung.
- Quant-Skill-Check: keine Umgehung der vorhandenen serverseitigen Tagesfrage und Learning-Entitlements.
- JaJa-Notizen: Nutzung des bestehenden privaten, serverseitig gebundenen Dashboard-Notizvertrags.
- `shared/seo-source-provenance.mjs`: Quellnachweise im selben Commit angepasst.

**Status:** technische CI und Production-Readbacks müssen für den reparierten PR-Head gesondert geprüft werden. Kein ungeprüfter Merge oder Marketing-Publish.
