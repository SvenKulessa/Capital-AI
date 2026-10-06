import type { Intent } from "./types";

const INTENTS: Intent[] = [
  "greet",
  "explain",
  "compare",
  "risk",
  "research",
  "scenario",
  "market",
  "smalltalk",
];

const SEEDS: Record<Intent, string[]> = {
  greet: ["hallo ja ja", "hi hello", "bonjour salut", "hola buenas", "ciao pronto", "guten tag"],
  explain: [
    "was ist erkläre explain why bedeutet dcf wacc kgv",
    "qu est ce que expliquer",
    "qué es explica",
    "che cos è spiega",
  ],
  compare: ["vergleich oder vs compare besser unterschied versus differencia confronta"],
  risk: ["risiko risk drawdown volatilität volatilite riesgo rischio verlust loss"],
  research: ["recherche research quellen brief untersuche deep dive investiga ricerca"],
  scenario: ["wenn szenario falls rises falls steigt sinkt if scenario scénario escenario"],
  market: ["markt bitcoin gold aktie etf ezb zins inflation bce taux mercado mercato"],
  smalltalk: ["wie geht wer bist danke thanks qui es tu quien eres chi sei stimme voice"],
};

const WIDTH = 48;

function bucket(token: string): number {
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash) % WIDTH;
}

function features(text: string): number[] {
  const vector = Array.from({ length: WIDTH }, () => 0);
  const source = ` ${text.toLowerCase()} `;
  for (let i = 0; i < source.length - 2; i += 1) {
    vector[bucket(source.slice(i, i + 3))] += 1;
  }
  const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0)) || 1;
  return vector.map((value) => value / norm);
}

function prototype(phrases: string[]): number[] {
  const sum = Array.from({ length: WIDTH }, () => 0);
  for (const phrase of phrases) {
    const vector = features(phrase);
    for (let i = 0; i < WIDTH; i += 1) sum[i] += vector[i];
  }
  const norm = Math.sqrt(sum.reduce((total, value) => total + value * value, 0)) || 1;
  return sum.map((value) => value / norm);
}

const WEIGHTS: Record<Intent, number[]> = {
  greet: prototype(SEEDS.greet),
  explain: prototype(SEEDS.explain),
  compare: prototype(SEEDS.compare),
  risk: prototype(SEEDS.risk),
  research: prototype(SEEDS.research),
  scenario: prototype(SEEDS.scenario),
  market: prototype(SEEDS.market),
  smalltalk: prototype(SEEDS.smalltalk),
};

function dot(left: number[], right: number[]): number {
  let total = 0;
  for (let i = 0; i < left.length; i += 1) total += left[i] * right[i];
  return total;
}

function softmax(scores: number[]): number[] {
  const max = Math.max(...scores);
  const exps = scores.map((score) => Math.exp(score - max));
  const total = exps.reduce((sum, value) => sum + value, 0);
  return exps.map((value) => value / total);
}

export type Classification = {
  intent: Intent;
  confidence: number;
  scores: Record<Intent, number>;
};

/** Tiny linear net: hashed character trigrams against intent prototypes. */
export function classify(text: string): Classification {
  const vector = features(text);
  const raw = INTENTS.map((intent) => dot(vector, WEIGHTS[intent]));
  const probs = softmax(raw.map((score) => score * 8));
  let best: Intent = "explain";
  let confidence = 0;
  const scores = {} as Record<Intent, number>;
  INTENTS.forEach((intent, index) => {
    scores[intent] = Number(probs[index].toFixed(3));
    if (probs[index] > confidence) {
      confidence = probs[index];
      best = intent;
    }
  });
  return { intent: best, confidence: Number(confidence.toFixed(3)), scores };
}
