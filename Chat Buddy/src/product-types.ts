import type { Lang } from "./core/types";

export type ProviderId = "local" | "deepseek" | "gemini" | "mistral";

export type VoicePresetId = "jaja" | "desk" | "briefing" | "custom";

export type VoiceProfile = {
  preset: VoicePresetId;
  pitch: number;
  rate: number;
  voiceURI: string;
  lang: Lang;
};
