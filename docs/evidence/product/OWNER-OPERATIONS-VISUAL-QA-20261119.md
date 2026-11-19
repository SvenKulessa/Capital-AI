# CAPITAL-AI Owner Operations: visuelle QA 2026-11-19

Stand: PR-Scope / `NOT_PROVEN` bis tatsächliche Browser-Artefakte geprüft sind. Dokumentation, keine neue Engineering-Richtlinie.

## Referenz und tatsächlicher Scope
- Vom Owner freigegebenes Bild: `capital_ai_owner_operations_dashboard.png`, 941 × 1672 Pixel. Das Bild ist eine gestaltete Referenz, **kein Screenshot des aktuellen Produktions-Codes**. Die Beispiel-KPI-Zahlen dürfen nicht zu Live-Werten werden.
- Produktiver Pfad: `/profile/render-dashboard` (zusätzlich Owner-Reiter unter `/profile/dashboard`).
- Quelle: `src/components/OwnerOperationsVisualOverview.tsx`, `ownerOperationsVisual.css`, `OwnerAgentOperationsPanel.tsx`, `ownerOperationsModel.ts`.
- Daten: ausschließlich bestehender serverseitiger `/api/profile/evidence-dashboard-readback` mit Owner-/Session-Prüfung, keine neuen Provider- oder Publisher-Rechte.
- Goldenes Panel, Crown, Owner-Badge, vier KPI-Karten, PR-Liniendiagramm, Evidence-Donut, dreiteilige Balkengrafik, sechs Rollen-Karten und Read-only-Hinweis als visuelle Struktur des Referenzbildes.
- Der Referenzentwurf zeigt vier KPI-Karten und 2×2 Diagramme bei 941 Bildpixeln. Die CSS-Umsetzung adaptiert bei schmalen CSS-Viewports auf **2×2 KPI-Karten und eine Diagrammspalte**, damit die Inhalte bedien- und lesbar bleiben. Das ist keine behauptete pixelidentische Kopie bei 320/390 CSS-Pixeln.

## Tatsächlich nachgewiesene Abweichung und Fix
Bei direkter URL-Navigation renderte `RenderOwnerDashboardPage.tsx` zuvor den Owner-Operations-Panel-Rahmen ungeachtet von `account.iamRole`. Der API-Readback war serverseitig geschützt, die sichtbare Owner-only-Grenze aber inkonsistent zum privaten Dashboard-Reiter.

Minimaler Fix: Auf der direkten Route nur bei `account.available === true`, `account.iamRole === 'owner'` und `mfaRequired !== true` den privaten Bereich rendern; anderenfalls nur neutrale Nichtverfügbarkeit. Die serverseitige Owner-Sperre bleibt unverändert.

## Reproduzierbarer Browser-Test (isolierter Build)
- `.github/workflows/owner-operations-visual-qa.yml`: automatischer PR-Test mit pinned Actions, Node 26.10.0, `npm ci`, bestehenden Owner-Modelltests, `npm run build` und echtem Chromium.
- `scripts/qa/owner-operations-visual-browser.mjs`: startet nur den lokalen Vite-Preview-Server, fängt API-Requests mit kontrollierten Fixtures ab und erstellt Screenshots bei 320, 390 und 1440 CSS-Pixeln, zusätzlich 320 bei 200 % Textgröße sowie den Fehlerstatus bei 390.
- Prüft DOM-/Kartenumfang, Geometrie, horizontalen Overflow, 44px-Refresh-Ziel, native Evidence-Reiter-Touchaktion, Nicht-Owner-Route, fehlende Provider-KPIs und `NOT_PROVEN`-Fail-closed-Darstellung.
- Ausgabe: GitHub Actions Artifact `owner-operations-visual-qa-<SHA>` mit `audit.json` und PNG-Screenshots. Keine Secrets, realen Owner-Daten oder Providerantworten im Artefakt. Die Testfixtures sind **synthetisch**, obwohl sie zur Contract-Simulation das produktive Schema `syntheticDataUsed:false` nachbilden.

## Kontrast-Sampling der aktuellen CSS-Tokens
Kontrast der ausgewählten, rechnerisch getesteten Vordergrund-/Hintergrund-Paare (keine vollständige pixelbasierte WCAG-Zertifizierung):
| Text / Untergrund | Kontrast |
|---|---:|
| `#a9b7d1` / `#101931` | 8,61:1 |
| `#f8fafc` / `#0b1428` | 17,53:1 |
| `#fcd34d` / `#0b1428` | 12,72:1 |
| `#f5edd7` / `#483715` | 9,81:1 |
| `#ffe18a` / `#684b0b` | 6,30:1 |

Vollständige Konformität von Gradients, Icons, Fokus und überlagerten Flächen bleibt ohne Browser-/Accessibility-Nachweis `NOT_PROVEN`.

## Freigabe-Evidence
- Source-Fix: Implementiert auf Feature-Branch.
- Browser-Screenshots und tatsächliche 320/390/1440-Messwerte: `NOT_PROVEN` bis CI-Run abgeschlossen und Dateien inspiziert sind.
- Authentifizierte Produktions-Owner-Sitzung und Live-Providerprojektionen: `NOT_PROVEN`; der CI-Browser nutzt ausschließlich Fixtures.
- Docker Security Gate und Domain Governance: weiter verbindliche bestehende Required Checks. Keine neue Required-Check-Konfiguration.
- Keine Social-Publishing-Änderung, keine neue Dependency, kein Secret, kein kostenpflichtiger Dienst.
- Rollback: nur den Scope-Squash zurücknehmen; keine Migration, Runtime- oder Publisher-Konfiguration.


## Main-synchronisierte Übernahme · 2026-11-19

- Diese QA-Dateien und die Owner-Route-Grenze wurden aus dem bestehenden PR #809 auf die aktuelle Main-Basis `12c70f09459f4cb01ff367da7281e8af91f48123` transponiert, da der alte Branch 15 Commits zurücklag. Die Chromium-Evidence Run 44485621234 stammt vom alten Head und darf nicht als Prüfung des neuen Heads ausgewiesen werden.
- Zusätzlich enthält der neue Main bereits den Avatar-Fallback, den als angemeldet gekennzeichneten Owner-Bereich und den sicheren GitHub-Ausweichlink aus PR #828. Keine Duplikat-Implementierung.
- Der frühere BuildKit-HTTP2-Fehler wurde auf Main in #823 separat korrigiert; die neue Docker-Security-CI muss den neuen Head erneut prüfen.
- Die tatsächliche Render-/GitHub-/GA4-Providerberechtigung ist nicht durch synthetische Chromium-Fixtures belegt. Fehlende Readbacks bleiben `NOT_PROVEN`.
