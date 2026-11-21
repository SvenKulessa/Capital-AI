# Learning Hub Universe · Originalgrafiken und Lizenz-/Provenienz-Prüfsatz

Stand: 2026-11-21 · Status: DRAFT (keine produktive Bildrechts- oder Browserfreigabe)

## Scope

- Codequelle: `src/features/learning/LearningUniverseTabScene.tsx`
- Stilquelle: `src/features/learning/learningUniverseTabScene.css`
- Integration: `src/features/learning/LearningPortalPage.tsx`; Stylesheet in `src/main.tsx`
- Test: `src/features/learning/learningUniverseTabScene.test.tsx`
- Unverändert: Startseiten-Globus, Authentifizierung, Entitlements, Quiz-Zähler, Simulatorberechnung, Zahlungs-/Publishing-Schnittstellen.

## Herkunft und Rechtekette

1. Zehn SVG-Motive wurden für dieses CAPITAL-AI-Änderungspaket direkt als Vektorpfade im Quellcode neu ausgearbeitet: offenes Buch, Karteikarten, Datenknoten, Chart, Videofenster, Wissenskompass, Checkliste, redaktionelle Seite, Briefumschlag, Portfolio-Risikorad. Kein Fremdbild, Stock-Anbieter, externer Asset-Host, fremdes Markenlogo oder externes Bild-API im Laufzeitpfad.
2. Sieben Akzentfarben stammen unverändert aus `shared/hub-branding.mjs` (kanonische CAPITAL-AI-Universe-Palette). SVG und CSS sind lokale, editierbare Projektquellen; bestehende Lucide-UI-Icons bleiben gemäß den bereits bestehenden Projekt-Abhängigkeiten und Notices geregelt.
3. Neu entworfene Grafiken werden im Rahmen dieses Benutzerauftrags für CAPITAL-AI bereitgestellt. Dieser technische Provenienz-Prüfsatz ist **keine anwaltliche Bestätigung exklusiver urheberrechtlicher Schutzfähigkeit** und ersetzt weder eine Lizenzinventur der gesamten Website noch Rechtsprüfung vor Drittlizenzierung.
4. Die separat generierte visuelle Konzepttafel (sieben Motive) ist ein *KI-generierter Entwurf* und **nicht** als produktiver Fremd- oder Drittanbieter-Asset in dieses Repository eingebracht. Eine exklusive Lizenz bzw. Herkunftsbehauptung wird dafür nicht aufgestellt. Bei späterer PNG-/Video-Einbindung ist deren Provenienz separat zu erfassen.
5. Alle neuen Vektorillustrationen sind rein dekorativ und erhalten beschreibende Alternativtexte auf der Frame-Ebene; SVG wird vor Screenreadern verborgen. Finanzinhalte, Zugangsrechte, Kennzahlen, Pricing und Analytics werden nicht aus Illustrationen abgeleitet.

## Reproduzierbare Git-Evidence

- `src/features/learning/LearningUniverseTabScene.tsx` · Git blob SHA-1 `e87276f8cd937ceaa3891f2702c2731d6f6ccd2d` · 8154 Zeichen
- `src/features/learning/learningUniverseTabScene.css` · Git blob SHA-1 `27fcc5b1675603e65327bcdea2b191a615a9823b` · 4519 Zeichen
- `src/features/learning/learningUniverseTabScene.test.tsx` · Git blob SHA-1 `57484c4298d61b6ea7d0da155234c5621dd0cfbf` · 3321 Zeichen

SHA-1 kennzeichnet Git-Objekte, **nicht** eine unabhängige SHA-256-Lizenzattestation.

## Qualitäts- und Rechtegates

| Prüfung | Soll | Status |
| --- | --- | --- |
| Externe Bild-/Stock-/Tracking-Abhängigkeit | keine | durch Quellcode/Negativtests prüfbar |
| Zehn unterscheidbare Motive / zehn Unterseiten | 1:1 | durch SSR/Model-Tests prüfbar |
| Sieben kanonische Farben | ausschließlich Palette | durch Tests prüfbar |
| Responsive 320/390/768/1440 CSS-px | keine horizontale Überläufe, sichtbarer Fokus | Browser-Evidence offen |
| Tastatur, Screenreader, Reduced Motion | bedienbar, dekorativ verborgen | Browser-Evidence offen |
| Bestehende CI / Docker Security Gate / Domain Governance | unverändert erforderlich | nach PR nachweisen |
| Kommerzielle Exklusivlizenz, Rechteübertragung an Dritte | separates juristisches Thema | NOT_PROVEN |
| Produktive Auslieferung / Render-BuildIdentity | SHA-gebundener Readback | NOT_PROVEN |

Rollback: Revert des Feature-PR; kein Schema, Feature-Flag, OAuth-Provider, Backend-Endpoint oder kostenpflichtiger Dienst wird geändert.
