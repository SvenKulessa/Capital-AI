# PR #522 – Reparatur und technische Evidence

**Basis:** `main` = `68467751155d4a0ee0a9a2d8a971babdfaf19287`  
**Voriger Head:** `fb6f84d2cb1e63c3c1427f9f6d99fad3e2c482d4`  
**Domain:** PRODUCT / **CODE_PRESENT:** vorbereitet / **TEST_PASS:** NOT_PROVEN / **PRODUCTION_READY:** NO

## Änderungen

1. Vollständiges `LearningPortalPage.tsx` aus `main` wiederhergestellt. Bestehende serverseitige Quant-Quiz-Consume-Logik, Entitlements, Glossar, Simulator und SEO erhalten. Neuer Tab `quizzes` referenziert den vorhandenen Quant-Skill-Check und ein zusätzliches didaktisches Portfolio-Quiz.
2. `HeroBuddy.tsx` vollständig auf Basis von `main` wiederhergestellt, darunter `openHeroBuddy`, Avatar-, Drag-, Chat- und Einstellfunktionen. Zusätzlicher Notizdialog und Übernahme einzelner Chatnachrichten.
3. `BuddyStickyNotes.tsx` auf bestehende authentifizierte `/api/profile/notes`-API mit serverseitiger Identitätsbindung und `expectedUserId` umgestellt; keine globale Browserablage.
4. Neues `PortfolioRiskQuiz.tsx` mit 15 synthetischen Fragen, barrierearmen Radio-Gruppen, Auswertung und nicht-offiziellem Lernabzeichen. Navigation in `HubCatalog.tsx` und `shared/hub-routes.mjs`.
5. `shared/seo-source-provenance.mjs` mit geändertem Portal-Fingerprint und zwei betroffenen Quell-Digests.
6. Regressionstests in `learningPolicy.test.tsx`.

## Prüfbefehle

```bash
node --import tsx --test src/features/learning/learningPolicy.test.tsx
node --import tsx --test scripts/navigation.test.mjs
node --test scripts/seo-source-provenance-drift.test.mjs
npm run build
gh pr checks 522 --repo SvenKulessa/Capital-AI
```

Erst bei vollständig bestandenen erforderlichen Tests und erforderlichen GitHub-Rulesets ist der Merge zulässig. Nach einem Merge ist das Deployment separat zu prüfen. Es werden keine kostenpflichtigen Provider, NATS/Rust-Bridges oder externen Marketing-Publishingdienste aktiviert.
