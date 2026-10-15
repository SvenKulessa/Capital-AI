# Portfolio Risk Quiz – Evidence 2026-10-15

**Status:** CODE_PRESENT

**Komponente:** `src/features/learning/PortfolioRiskQuiz.tsx`

**Features:**
- 15 Fragen zum Portfolio-Risiko, Diversifikation und Korrelation (synthetische Daten, keine Prognosen).
- Grafische Aufgaben-Hinweise (Matrix / Balken, Verweis auf Simulator).
- Bestehen ab 12/15 → Zertifikat-Download als Badge.
- Cover-Image-Referenz.
- Clientseitige Vorbereitung für Profil-Badge (localStorage).

**Integration:** Als zweite Kategorie im bestehenden Quiz-Tab des Learning Hubs (neben Quant Quiz).

**Lizenz:** CAPITAL-AI Learning Certificate – nur Bildungszwecke, keine Finanzberatung.

**Nächster Schritt:** Import in LearningPortalPage.tsx und Kategorie-Umschalter, Asset für Cover und Zertifikat in public/learning/editorial/ ablegen, Profil-Anzeige finalisieren.
