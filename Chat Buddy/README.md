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
- Modelle: lokales Gehirn, DeepSeek, Gemini Flash, Mistral Large (eigene Schlüssel, nicht im Repo)
- Lizenz: Eigentümersitz `CAI-JAJA-OWNER-0001`, Preisliste, keine Übertragung der Prägung

## Einbindung

```ts
import { answerLocally, stepBack, visibleAnswer } from "./src/index";

const local = answerLocally("Was macht der EZB-Zins mit Aktien?", "de", false, 2);
const rewound = stepBack(local.trace);
visibleAnswer(rewound, "Ja ja, ich spule die Spur zurück.");
```

Live-Aufrufe an DeepSeek, Gemini Flash und Mistral laufen serverseitig mit dem Schlüssel des Sitzes. Schlüssel nicht committen.

Keine Anlageberatung. Keine Live-Kurse.
