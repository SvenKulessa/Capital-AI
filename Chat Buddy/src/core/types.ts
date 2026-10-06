export const LANGS = ["de", "en", "fr", "es", "it"] as const;
export type Lang = (typeof LANGS)[number];

export type Intent =
  | "greet"
  | "explain"
  | "compare"
  | "risk"
  | "research"
  | "scenario"
  | "market"
  | "smalltalk";

export type ChatTurn = { role: "user" | "assistant"; content: string };

export type GraphHit = {
  id: string;
  label: string;
  snippet: string;
  score: number;
  hop: number;
  relation?: string;
};

export type ResearchBrief = {
  question: string;
  hypotheses: string[];
  hits: GraphHit[];
  method: string;
  confidence: number;
  caveat: string;
};

export type TraceKind = "hear" | "classify" | "retrieve" | "reason" | "speak";

export type TraceStep = {
  id: string;
  kind: TraceKind;
  title: string;
  detail: string;
};

export type Trace = {
  id: string;
  question: string;
  steps: TraceStep[];
  cursor: number;
  answer: string;
};
