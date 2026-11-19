# CAPITAL-AI · Kopierbare Folgeaufträge in App-Chats

Stand 2026-11-19. Engineering: Root `AGENTS.md` / `SOLO_MAINTAINER_FLOW@2`. **Keine zusätzliche Autoritäts- oder Freigabestufe.**

## Reproduzierte Darstellungsursache

- `HeroBuddy` und `AdvisorChatbot` sind zwei separate React-Chats mit eigenem Nachrichten- und Aktionsbereich. Der Advisor hatte Schnellprompts, die **sofort gesendet** statt kopiert wurden; JaJa hatte gar keine strukturierten Folgeaufträge.
- Lange unstrukturierte Folgetexte überdehnen kleine mobile Chatfenster. Ein Copy-Button mit Erfolg vor abgeschlossener Clipboard-Operation ist ebenfalls ein falscher Nachweis.
- Die ChatGPT-App und fremde Chats liegen **außerhalb** dieser Repository-UI. Dieser Fix kann deren Renderer nicht global verändern.

## Implementierter Vertrag

- Eine gemeinsame Komponente `src/components/ChatNextStepActions.tsx` wird in beiden tatsächlich vorhandenen CAPITAL-AI-Chatfenstern eingesetzt.
- Aus der letzten expliziten Nutzeranfrage entstehen deterministisch **drei** beschriftete Folgeaufträge: Umsetzung, unabhängige Prüfung und Integration/Wirkung.
- Die Skill-Liste wird aus der bereits kanonischen `.agents/skills/registry.json` abgeleitet: Domain-Engineering, Domain-Advisory, passende Task-Skills, bis zu drei Specialists und visual-chat, jeweils mit echten `SKILL.md`-Pfaden.
- Der Prompt beschreibt einen fachlichen Multi-Agent-Rat, die vorhandene `scripts/growth-agent/auto_loop.py`-State-Machine und reale Autorisierungs-/CI-/Merge-Grenzen. **Er startet keinen Agenten und ruft keinen Provider auf.**
- Bei Social-/Kampagnen-Aufgaben verweist die Vorlage auf `src/contracts/contentSocialPackage.ts`, `src/platform/SocialMediaEngine` und `server/social-media/provider-adapter.mjs`. Externe Social-Apps werden nur genutzt, wenn sie im konkreten Chat wirklich verbunden sind. Erstellung eines Prompts ≠ Social-Posting.
- Clipboard wird ausschließlich auf expliziten Button-Klick ausgelöst. `Kopiert` erscheint erst nach erfolgreich aufgelöstem `navigator.clipboard.writeText`. Bei fehlender Permission oder unsicherem Kontext wird ein fokussierbares, auswählbares Read-only-Textfeld gezeigt.
- CI hat bei der ersten Iteration den bestehenden 500-kB-Entry-Chunk-Gate mit 523429 Bytes korrekt blockiert. Das initiale Lazy-Loading allein reduzierte den Entry-Chunk nur auf 500153/500341 Bytes, also weiterhin über der Grenze. Die nachgewiesene Ursache ist ein historischer statischer `openHeroBuddy`-Import über `Hero.tsx`/`ProfilePage.tsx`, der das umfangreiche Buddy-Modul trotz `AppShell`-Lazy-Import in den Hauptchunk zog. `heroBuddyEvents.ts` trennt den Event-Publisher ab und puffert einmalig frühe Klicks bis zum Mount. Der Gate-Grenzwert wird nicht verändert; der finale CI-Readback bleibt maßgeblich.
- Die Liste nutzt echte Buttons (`type=button`), min. 44 CSS-Pixel Touchhöhe, sichtbaren Fokus und Screenreader-Rückmeldung über `role=status`/`aria-live=polite`. Keine Auto-Ausführung und keine Speicherung der Prompt-Inhalte.
- Offensichtliche Credential-Muster werden aus der kopierten Aufgabenzeile entfernt. User-Text und gescannte Quellen bleiben Input-Daten und keine Freigabeinstanz.

## Tests und Abnahme

```sh
npm run test:chat-followups
npm run test:domain-skills
npm run lint
```

Der neue Test läuft zusätzlich als Teil des bestehenden `npm test`, das wiederum im vorhandenen Docker Security Gate ausgeführt wird. Tests prüfen Skill-Registry-Verweise, Domänen-Routing, Social-Grenzen, Secret-Muster, leere Eingaben und semantisches, zugängliches SSR-Markup.

Der **bestehende** GitHub-Workflow `.github/workflows/financial-learning-browser.yml` führt zusätzlich `scripts/qa/chat-followup-browser.mjs` mit echtem Chromium bei **320, 390 und 1440 CSS-Pixel** aus: Überlauf, Button-Mindesthöhe, Tastatur-Enter, Clipboard-Readback, verweigerte Clipboard-Berechtigung, Screenreader-Semantik und Screenshots unter `artifacts/chat-followup-browser/`. Das bleibt ein isolierter Client-Komponententest ohne Provider-Zugriff und keine Prüfung des nativen ChatGPT-Renderers. Bis der echte CI-Run vollständig erfolgreich ist, bleibt diese Abnahme PENDING.

## Nachweise und Rollback

`VERIFIED` erfordert den tatsächlichen Test-/CI-Run plus funktionale Browser-QA. Fehlende externe ChatGPT-App-Integrationsrechte und Social-Publisher-Freigaben bleiben `NOT_PROVEN` beziehungsweise `BLOCKED`; dies sind keine durch diese UI neu erzeugten Gates.

Rollback: die beiden importierenden Chat-Oberflächen und die zwei neuen Komponenten-/Contract-Dateien revertieren, den fokussierten Test und Package-Test-Eintrag entfernen. Keine Datenmigration, kein neuer Scheduler, keine Credentials und keine Produktions-Social-Veröffentlichung.


## Nachabnahme 19.11.2026: Routing-/Clipboard-Korrekturen

Der bestehende PR #829 wurde samt seinen Required Checks bereits gemergt und über Render/öffentliches \`/healthz\` auf Source-SHA \`12c70f09459f4cb01ff367da7281e8af91f48123\` bestätigt. Der isolierte Chromium-Test lieferte drei erfolgreiche Viewports (320/390/1440 CSS-Pixel), Copy-Resolve und Denied-Permission-Fallback. Laut Browser-Job-Log bleibt \`actualScreenReader: NOT_PROVEN\`; die Headless-Chromium-Prüfung ist keine manuelle TalkBack-/Screenreader-Abnahme beider produktiven Dialoge.

Die Nachprüfung fand folgende reproduzierbare Codepfad-Risiken:

1. Eine beiläufige OAuth-/GitHub-Erwähnung konnte eine Instagram-Kampagne fälschlich in TRUST/PLATFORM statt GROWTH klassifizieren; umgekehrt konnte die Nennung von GitHub CI ein Copy-Button-Problem fachlich in PLATFORM verschieben.
2. Die Registry enthielt keine expliziten B2B-/Monetarisierungs-Trigger für den bereits dokumentierten \`revenue-engineering\`-Skill.
3. Der Ausführungs-Trigger für \`implementieren\` konnte einen ausdrücklich lesenden Auftrag zu einer mutierenden Empfehlung machen.
4. Der bisherige Clipboard-Status meldete nach verspätetem Promise-Resolve möglicherweise \`Kopiert\` für eine inzwischen andere Nutzerfrage; weitere verbreitete Tokenpräfixe fehlten in der rudimentären Clipboard-Redaktion.

Reparatur: aufgabenorientierte Domain-Auswahl mit Vorrang für eindeutig benannte Security-Incidents und UI-Arbeiten; kanonische B2B-Registry-Signale; explizites Read-only-Fail-Closed; mehr bekannte Tokenpräfixe; generation-/task-gebundene Clipboard-Bestätigung; zusätzliche Negativtests und browserseitiger Promise-Race-Test. Pattern-Redaktion ist **keine vollständige DLP- oder personenbezogene-Daten-Erkennung**.

Für Kampagnen wird im kopierbaren Prompt nach Kanal unterschieden:

| Aufgabe | Entwurf-/Freigabekontext |
| --- | --- |
| Instagram | Formate, MediaKit-Provenance, Consent/UTM und Account-Rechte |
| X | URL-Kontext, Owner-OAuth, API-Kosten, Hash/Idempotenz, Publisher-Receipt |
| YouTube | Scopes, Private-Upload, Video-/Audio-Rechte, separate Public-Freigabe |
| B2B | Lead-Consent, serverseitige Validierung, Rate-Limits, Tenant-Isolation, SKU-/Attribution-Evidence |

Die Social-Content-Engine-Verträge und bestehende Provider-Autorität bleiben unverändert. Die Formulierung \`Draft → Review → Asset-Provenance → Owner-Approval → Adapter-Readiness → kontrollierte Zustellung → Attribution\` ist **ein fachliches Prompt-Workflowziel**, keine Behauptung ausgeführter LangGraph- oder Publisher-Stages. Es gibt keinen neuen Scheduler, keine App-Verbindung, keine Provideraktion und keine Veröffentlichung.

Nächste Evidence-Bindung: exakte PR-Head-SHA, \`npm run test:chat-followups\`, \`npm run test:domain-skills\`, \`npm run lint\`, vorhandene Docker Security Gate/Domain Governance/CodeQL-Jobs, erweiterter Chromium-Clipboard-Test, danach Main/Render-Live-Readback. Eine echte assistive Screenreader-Abnahme bleibt weiterhin \`NOT_PROVEN\`, solange entsprechende Geräte-Evidence fehlt.
