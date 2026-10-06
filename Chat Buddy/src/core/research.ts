import type { GraphHit, Lang, ResearchBrief } from "./types";

const METHOD: Record<Lang, string> = {
  de: "Lokaler Graph plus lineares NLU-Netz. Ein Live-Modell darf den Befund nur umformulieren, nicht erfinden.",
  en: "Local graph plus a linear NLU net. A live model may rephrase the finding, not invent it.",
  fr: "Graphe local plus réseau NLU linéaire. Un modèle live peut reformuler, pas inventer.",
  es: "Grafo local más red NLU lineal. Un modelo en vivo puede reformular, no inventar.",
  it: "Grafo locale più rete NLU lineare. Un modello live può riformulare, non inventare.",
};

const CAVEAT: Record<Lang, string> = {
  de: "Keine Live-Kurse, keine Anlageberatung, keine Vollständigkeit.",
  en: "No live prices, no investment advice, no claim of completeness.",
  fr: "Pas de cours live, pas de conseil, pas d'exhaustivité.",
  es: "Sin precios en vivo, sin asesoramiento, sin completitud.",
  it: "Niente prezzi live, niente consulenza, niente completezza.",
};

export function buildResearch(
  question: string,
  hits: GraphHit[],
  confidence: number,
  lang: Lang,
): ResearchBrief {
  const top = hits[0];
  const second = hits[1];
  const hypotheses = top
    ? [
        hypothesis(lang, top.label, second?.label),
        second ? neighbor(lang, top.label, second.label) : check(lang),
      ]
    : [empty(lang), check(lang)];
  return {
    question,
    hypotheses,
    hits: hits.slice(0, 4),
    method: METHOD[lang],
    confidence,
    caveat: CAVEAT[lang],
  };
}

function hypothesis(lang: Lang, top: string, second?: string): string {
  if (lang === "de") return `Der Kern sitzt bei ${top}${second ? `, daneben ${second}` : ""}.`;
  if (lang === "en") return `The core sits with ${top}${second ? `, beside ${second}` : ""}.`;
  if (lang === "fr") return `Le cœur est ${top}${second ? `, à côté ${second}` : ""}.`;
  if (lang === "es") return `El núcleo está en ${top}${second ? `, junto a ${second}` : ""}.`;
  return `Il nucleo sta in ${top}${second ? `, accanto a ${second}` : ""}.`;
}

function neighbor(lang: Lang, top: string, second: string): string {
  if (lang === "de") return `${top} ohne ${second} zu lesen, bleibt halb.`;
  if (lang === "en") return `Reading ${top} without ${second} stays half a picture.`;
  if (lang === "fr") return `Lire ${top} sans ${second} reste à moitié.`;
  if (lang === "es") return `Leer ${top} sin ${second} se queda a medias.`;
  return `Leggere ${top} senza ${second} resta a metà.`;
}

function check(lang: Lang): string {
  if (lang === "de") return "Gegenprüfen: passt der Zeithorizont zur Risikotragfähigkeit?";
  if (lang === "en") return "Check: does the time horizon fit risk capacity?";
  if (lang === "fr") return "Vérifier : l'horizon tient-il dans la capacité de risque ?";
  if (lang === "es") return "Comprobar: ¿el horizonte cabe en la capacidad de riesgo?";
  return "Controlla: l'orizzonte sta nella capacità di rischio?";
}

function empty(lang: Lang): string {
  if (lang === "de") return "Im Graph fehlt ein direkter Treffer. Ich bleibe bei den Nachbarbegriffen.";
  if (lang === "en") return "No direct graph hit. Staying with neighboring ideas.";
  if (lang === "fr") return "Pas de nœud direct. Je reste sur les voisins.";
  if (lang === "es") return "No hay nodo directo. Sigo con los vecinos.";
  return "Nessun nodo diretto. Resto sui vicini.";
}

export function formatResearch(brief: ResearchBrief, lang: Lang): string {
  const heads = {
    de: ["Hypothese", "Befund", "Unsicherheit"],
    en: ["Hypothesis", "Finding", "Uncertainty"],
    fr: ["Hypothèse", "Constat", "Incertitude"],
    es: ["Hipótesis", "Hallazgo", "Incertidumbre"],
    it: ["Ipotesi", "Reperto", "Incertezza"],
  }[lang];
  const finding =
    brief.hits.length === 0
      ? brief.hypotheses[0]
      : brief.hits
          .slice(0, 3)
          .map((hit) => `${hit.label}: ${hit.snippet}`)
          .join(" ");
  return `${heads[0]}: ${brief.hypotheses.join(" ")}\n${heads[1]}: ${finding}\n${heads[2]}: ${brief.caveat}`;
}
