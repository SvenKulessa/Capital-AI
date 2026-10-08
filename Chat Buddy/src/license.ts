import type { ProviderId } from "./product-types";

/** Proprietary imprint. Not a third-party or franchise license. */
export const IMPRINT = {
  product: "JaJa Universe Buddy",
  module: "Chat Buddy",
  version: "0.1.0",
  owner: "Capital-AI",
  site: "https://capital-ai.online",
  markTransferable: false,
  sublicensable: false,
  thirdPartyImprint: "forbidden",
} as const;

export const LEGAL_NOTICE = [
  "JaJa Universe Buddy ist eine eigene Prägung von Capital-AI.",
  "Name, Figur, JaJa-Stimme und diese Modulmarke sind nicht übertragbar und nicht an Dritte lizenzierbar.",
  "Keine White-Label-Nutzung, kein Weiterverkauf der Figur, keine Fremdprägung.",
  "Sitze und Guthaben gelten nur innerhalb von Capital-AI-Produkten.",
  "DeepSeek, Gemini und Mistral bleiben unter den Bedingungen ihrer Anbieter.",
  "JaJa erklärt Zusammenhänge. Das ist keine Anlageberatung und keine Aufforderung zum Kauf oder Verkauf.",
].join(" ");

export type Sku = "owner" | "seat-desk" | "seat-universe";

export type PriceRow = {
  sku: Exclude<Sku, "owner">;
  name: string;
  eur: number;
  interval: "month" | "once";
  credits: number;
};

export const PRICE_BOOK: readonly PriceRow[] = [
  { sku: "seat-desk", name: "Desk-Sitz", eur: 19, interval: "month", credits: 80 },
  { sku: "seat-universe", name: "Universe-Sitz", eur: 49, interval: "month", credits: 400 },
];

export type Seat = {
  id: string;
  sku: Sku;
  owner: "Capital-AI";
  imprintLocked: true;
  credits: number;
  issuedAt: string;
};

export type LedgerLine = {
  id: string;
  at: string;
  sku: Sku | "use";
  note: string;
  credits: number;
  eur: number;
};

export function ownerSeat(): Seat {
  return {
    id: "CAI-JAJA-OWNER-0001",
    sku: "owner",
    owner: "Capital-AI",
    imprintLocked: true,
    credits: 40,
    issuedAt: "2026-10-06",
  };
}

export function refuseTransfer(): { ok: false; reason: string } {
  return {
    ok: false,
    reason: "Abgelehnt. Die Prägung ist Eigentum von Capital-AI und nicht an fremde Lizenzen vergebbar.",
  };
}

export function charge(seat: Seat, cost: number): { seat: Seat; ok: boolean } {
  if (cost <= 0) return { seat, ok: true };
  if (seat.credits < cost) return { seat, ok: false };
  return { seat: { ...seat, credits: seat.credits - cost }, ok: true };
}

export function credit(seat: Seat, amount: number): Seat {
  return { ...seat, credits: seat.credits + amount };
}

/** Local brain is included. Live models and remote Graph-RAG draw the seat. */
export function creditCost(input: {
  provider: ProviderId;
  research: boolean;
  remoteGraph: boolean;
}): number {
  const live = input.provider === "local" ? 0 : 2;
  const graph = input.remoteGraph ? 1 : 0;
  return live + graph;
}
