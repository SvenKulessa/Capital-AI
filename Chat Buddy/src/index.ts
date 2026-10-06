/**
 * Chat Buddy — JaJa Universe Buddy v0.1.0
 * Modular finance companion for Capital-AI.
 * The imprint is proprietary and not licensable to third parties.
 */
export { IMPRINT, LEGAL_NOTICE, PRICE_BOOK, ownerSeat, refuseTransfer, charge, credit, creditCost } from "./license";
export type { Seat, LedgerLine, Sku, PriceRow } from "./license";
export { LANGUAGE_OPTIONS, copy, bcp47, modelLanguage } from "./i18n";
export { classify } from "./nlu";
export type { Classification } from "./nlu";
export { retrieve, scenarioLines, graphContext, mergeHits } from "./graph";
export type { GraphRagAdapter } from "./graph";
export { buildResearch, formatResearch } from "./research";
export { createTrace, stepBack, stepForward, visibleAnswer, ReversibleEngine } from "./reversible";
export { VOICE_PRESETS, presetProfile, shapeUtterance, canSpeak, loadVoices, speakText, stopSpeaking } from "./voice";
export { answerLocally, systemPrompt } from "./brain";
export type { LocalAnswer } from "./brain";
export { PROVIDERS, providerMeta } from "./providers";
export type { Lang, Intent, ProviderId, GraphHit, ResearchBrief, Trace, TraceStep, VoiceProfile, ChatTurn } from "./types";
