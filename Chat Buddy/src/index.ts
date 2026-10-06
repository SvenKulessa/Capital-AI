/**
 * Chat Buddy — JaJa Universe Buddy v0.1.0
 * Modular finance companion for Capital-AI.
 * The imprint is proprietary and not licensable to third parties.
 */
export { IMPRINT, LEGAL_NOTICE, PRICE_BOOK, ownerSeat, refuseTransfer, charge, credit, creditCost } from "./license";
export type { Seat, LedgerLine, Sku, PriceRow } from "./license";
export { LANGUAGE_OPTIONS, copy, bcp47, modelLanguage } from "./i18n";
export { classify } from "./core/nlu";
export type { Classification } from "./core/nlu";
export { retrieve, scenarioLines, graphContext, mergeHits } from "./core/graph";
export type { GraphRagAdapter } from "./core/graph";
export { buildResearch, formatResearch } from "./core/research";
export { createTrace, stepBack, stepForward, visibleAnswer, ReversibleEngine } from "./core/reversible";
export { VOICE_PRESETS, presetProfile, shapeUtterance, canSpeak, loadVoices, speakText, stopSpeaking } from "./voice";
export { answerLocally, systemPrompt } from "./brain";
export type { LocalAnswer } from "./brain";
export { PROVIDERS, providerMeta } from "./providers";
export type { Lang, Intent, ProviderId, GraphHit, ResearchBrief, Trace, TraceStep, VoiceProfile, ChatTurn } from "./core/types";
