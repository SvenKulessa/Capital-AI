import { copy } from "./i18n";
import { graphContext, retrieve, scenarioLines } from "./core/graph";
import { classify } from "./core/nlu";
import { createTrace } from "./core/reversible";
import type { GraphHit, Lang, Trace, TraceStep } from "./core/types";

const STEP: Record<Lang, Record<TraceStep["kind"], string>> = {
  de: { hear: "Hören", classify: "NLU", retrieve: "Graph", reason: "Denken", speak: "Sagen" },
  en: { hear: "Hear", classify: "NLU", retrieve: "Graph", reason: "Think", speak: "Speak" },
  fr: { hear: "Entendre", classify: "NLU", retrieve: "Graphe", reason: "Penser", speak: "Dire" },
  es: { hear: "Oír", classify: "NLU", retrieve: "Grafo", reason: "Pensar", speak: "Decir" },
  it: { hear: "Sentire", classify: "NLU", retrieve: "Grafo", reason: "Pensare", speak: "Dire" },
};

const ADVICE: Record<Lang, string> = {
  de: "Das ist ein Blick, keine Anlageberatung.",
  en: "This is a look, not investment advice.",
  fr: "C'est un regard, pas un conseil en investissement.",
  es: "Es una mirada, no asesoramiento.",
  it: "È uno sguardo, non una consulenza.",
};

export type LocalAnswer = {
  answer: string;
  trace: Trace;
  hits: GraphHit[];
  intent: string;
  confidence: number;
  context: string;
};

export function answerLocally(question: string, lang: Lang, research: boolean, hops = 2): LocalAnswer {
  const text = question.trim();
  const judged = classify(text);
  const hits = retrieve(text, hops, lang, judged.intent);
  // Legacy boolean argument retained until the Chat Buddy host drops it.
  void research;
  const answer = compose(lang, judged.intent, hits);
  const labels = STEP[lang];
  const steps: TraceStep[] = [
    { id: "hear", kind: "hear", title: labels.hear, detail: text },
    {
      id: "classify",
      kind: "classify",
      title: labels.classify,
      detail: `${judged.intent} · ${Math.round(judged.confidence * 100)}%`,
    },
    {
      id: "retrieve",
      kind: "retrieve",
      title: labels.retrieve,
      detail: hits.length ? hits.map((hit) => hit.label).join(", ") : "—",
    },
    {
      id: "reason",
      kind: "reason",
      title: labels.reason,
      detail: reasonLine(lang, judged.intent),
    },
    { id: "speak", kind: "speak", title: labels.speak, detail: answer },
  ];
  return {
    answer,
    trace: createTrace(text, steps, answer),
    hits,
    intent: judged.intent,
    confidence: judged.confidence,
    context: graphContext(hits),
  };
}

function reasonLine(lang: Lang, intent: string): string {
  if (lang === "de") return `Lokales Gehirn, Absicht ${intent}, Graph-Nachbarn, umkehrbare Spur.`;
  if (lang === "en") return `Local brain, intent ${intent}, graph neighbors, reversible trace.`;
  if (lang === "fr") return `Cerveau local, intention ${intent}, voisins du graphe, trace réversible.`;
  if (lang === "es") return `Cerebro local, intención ${intent}, vecinos del grafo, traza reversible.`;
  return `Cervello locale, intento ${intent}, vicini del grafo, traccia reversibile.`;
}

function compose(
  lang: Lang,
  intent: string,
  hits: GraphHit[],
): string {
  const ui = copy(lang);
  let body: string;
  if (intent === "greet" || intent === "smalltalk") {
    body = ui.greeting;
  } else if (intent === "compare" && hits.length >= 2) {
    body = compare(lang, hits[0], hits[1]);
  } else if (intent === "scenario") {
    const lines = scenarioLines(hits, lang);
    body = lines.length ? open(lang) + lines.join(" ") : explain(lang, hits);
  } else if (hits.length === 0) {
    body = missing(lang);
  } else {
    body = explain(lang, hits);
  }
  if (!body.includes(ADVICE[lang])) body = `${body} ${ADVICE[lang]}`;
  if (intent === "greet") return body;
  return body;
}

function open(lang: Lang): string {
  if (lang === "de") return "Ja ja, Szenario ohne Kursversprechen. ";
  if (lang === "en") return "Ja ja, a scenario with no price promise. ";
  if (lang === "fr") return "Ja ja, un scénario sans promesse de cours. ";
  if (lang === "es") return "Ja ja, un escenario sin promesa de precio. ";
  return "Ja ja, uno scenario senza promessa di prezzo. ";
}

function explain(lang: Lang, hits: GraphHit[]): string {
  const lead = hits[0];
  const rest = hits.slice(1, 3);
  const link = scenarioLines(hits, lang)[0];
  const bridge = link ? ` ${link}` : "";
  if (lang === "de") {
    const more = rest.length ? ` Daneben: ${rest.map((hit) => hit.label).join(", ")}.` : "";
    return `Ja ja! ${lead.label}: ${lead.snippet}${more}${bridge}`;
  }
  if (lang === "en") {
    const more = rest.length ? ` Beside that: ${rest.map((hit) => hit.label).join(", ")}.` : "";
    return `Ja ja! ${lead.label}: ${lead.snippet}${more}${bridge}`;
  }
  if (lang === "fr") {
    const more = rest.length ? ` À côté : ${rest.map((hit) => hit.label).join(", ")}.` : "";
    return `Ja ja ! ${lead.label} : ${lead.snippet}${more}${bridge}`;
  }
  if (lang === "es") {
    const more = rest.length ? ` Al lado: ${rest.map((hit) => hit.label).join(", ")}.` : "";
    return `¡Ja ja! ${lead.label}: ${lead.snippet}${more}${bridge}`;
  }
  const more = rest.length ? ` Accanto: ${rest.map((hit) => hit.label).join(", ")}.` : "";
  return `Ja ja! ${lead.label}: ${lead.snippet}${more}${bridge}`;
}

function compare(lang: Lang, left: GraphHit, right: GraphHit): string {
  if (lang === "de") return `Ja ja! ${left.label} und ${right.label} nebeneinander. ${left.snippet} ${right.snippet}`;
  if (lang === "en") return `Ja ja! ${left.label} beside ${right.label}. ${left.snippet} ${right.snippet}`;
  if (lang === "fr") return `Ja ja ! ${left.label} et ${right.label}. ${left.snippet} ${right.snippet}`;
  if (lang === "es") return `¡Ja ja! ${left.label} y ${right.label}. ${left.snippet} ${right.snippet}`;
  return `Ja ja! ${left.label} e ${right.label}. ${left.snippet} ${right.snippet}`;
}

function missing(lang: Lang): string {
  if (lang === "de") return "Ja ja, dazu habe ich keinen Knoten. Frag nach EZB-Zins, DCF, Drawdown oder Gold.";
  if (lang === "en") return "Ja ja, I have no node for that. Ask about the ECB rate, DCF, drawdown or gold.";
  if (lang === "fr") return "Ja ja, pas de nœud pour ça. Demande le taux BCE, le DCF, le drawdown ou l'or.";
  if (lang === "es") return "Ja ja, no tengo nodo para eso. Pregunta por el tipo BCE, el DCF, el drawdown o el oro.";
  return "Ja ja, non ho un nodo per questo. Chiedi del tasso BCE, del DCF, del drawdown o dell'oro.";
}

export function systemPrompt(lang: Lang, context: string): string {
  const name = {
    de: "Deutsch",
    en: "English",
    fr: "French",
    es: "Spanish",
    it: "Italian",
  }[lang];
  return [
    "You are JaJa, the Universe Buddy of Capital-AI (capital-ai.online).",
    "You are an original mascot owned by Capital-AI. You are not a film character.",
    "Never claim a movie franchise, never imitate a famous alien dialect, never use franchise names.",
    "Speak in short warm sentences. Often start with 'Ja ja!'. Be precise about finance.",
    `Reply only in ${name}.`,
    "You explain. You never tell the user to buy or sell. No live prices.",
    "Use the graph context when it fits. If it is thin, say what you do not know.",
    "Respond concisely and ground explanations in available data.",
    "End with one short line that this is not investment advice.",
    "Graph context:",
    context,
  ].join("\n");
}
