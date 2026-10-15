# Korrelations-Labor – Evidence 2026-10-15

**Status:** VERIFIED

**PR:** https://github.com/SvenKulessa/Capital-AI/pull/506 (merged)

**Commit:** a52a4d28e3a0b78d627f66f3d3707a4967e78f96

**Komponente:** `src/features/learning/FinancialLearningSimulator.tsx`

**Beschreibung:**
- Side-by-Side-Vergleich der modellierten Portfoliovolatilität (Basis-Korrelationen vs. LEARNING_CASES.risingCorrelations) bei aktuellen Gewichten.
- Visuelle Anzeige der Basis-Korrelationsmatrix.
- Didaktische Erklärung, rein synthetische Daten, keine Prognosen oder Anlageberatung.
- Reuse von `portfolioMath.ts` und bestehenden LEARNING_CASES.
- Mobile-first, Accessibility, Free/Pro-Grenzen unverändert.
- Zusätzliche Tests in `financialSimulator.test.ts`.

**Nächster Schritt:** Roadmap-Override in `roadmapCurrentMainState.ts` für Learning-Portal (AP-FE-02) aktualisieren und weitere Lerninhalte (Artikel, Medien) anbinden.

**Keine Runtime-/Production-Claim:** Live-Wirkung nach Deployment separat verifizieren.
