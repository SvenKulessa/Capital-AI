# Chat Buddy — JaJa Universe Buddy v0.1.0

PRODUCT-Modul mit klarer Core/Brand-Grenze. Die JaJa-Prägung gehört Capital-AI und ist **nicht an Dritte lizenzierbar**. Wiederverwendbare Agent-Primitiven liegen getrennt unter `src/core/`; deren Open-Source-Lizenzierung ist bis zu einer expliziten Owner/TRUST-Entscheidung nicht freigegeben.

JaJa ist ein originaler kleiner Finanzheld mit der Erde in der Hand. Keine Filmfigur, keine Franchise-Marke, keine fremde Dialekt-Imitation.

## Was diese Version kann

- Sprache: Deutsch, English, Français, Español, Italiano
- Stimme: Presets JaJa (hoch, locker), Desk, Briefing, plus Tonhöhe, Tempo und Systemstimme
- Neuronales NLU: lineares Netz über Zeichen-Trigramme
- Research-Skill: Hypothese, Befund, Unsicherheit
- Reversible Engine: Spur hören → NLU → Graph → denken → sagen, vor und zurück
- Graph-RAG: lokaler Finanzgraph, plus `GraphRagAdapter` für ein öffentliches https-Endpoint
- Modelle: nur das lokale Gehirn. DeepSeek, Gemini und Mistral werden nicht aufgerufen, weil sie kosten können.
- Lernen: Doku und Code unter `Chat Buddy/`, `docs/` und `README.md`. `GET /api/chat-buddy/learn` gibt Treffer und den Werkzeugstatus zurück, nie Schlüssel.
- Lizenz: Eigentümersitz `CAI-JAJA-OWNER-0001`, Preisliste, keine Übertragung der Prägung

## Einbindung

```ts
import { answerLocally, stepBack, visibleAnswer } from "./src/index";

const local = answerLocally("Was macht der EZB-Zins mit Aktien?", "de", false, 2);
const rewound = stepBack(local.trace);
visibleAnswer(rewound, "Ja ja, ich spule die Spur zurück.");
```

Live-Aufrufe an kostenpflichtige Modelle finden nicht statt. Ein lokales Ollama auf Loopback zählt nur, wenn ein Apache-2.0- oder MIT-Modell geladen ist. Schlüssel nicht committen.

Keine Anlageberatung. Keine Live-Kurse.
