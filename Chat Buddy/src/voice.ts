import { bcp47 } from "./i18n";
import type { Lang } from "./core/types";
import type { VoicePresetId, VoiceProfile } from "./product-types";

export const VOICE_PRESETS: Record<Exclude<VoicePresetId, "custom">, { pitch: number; rate: number }> = {
  jaja: { pitch: 1.62, rate: 1.08 },
  desk: { pitch: 1, rate: 0.96 },
  briefing: { pitch: 0.82, rate: 0.9 },
};

export function presetProfile(preset: Exclude<VoicePresetId, "custom">, lang: Lang, voiceURI = ""): VoiceProfile {
  return { preset, ...VOICE_PRESETS[preset], voiceURI, lang };
}

export function shapeUtterance(text: string, profile: VoiceProfile): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (profile.preset !== "jaja") return clean;
  if (/^ja ja/i.test(clean)) return clean;
  return `Ja ja! ${clean}`;
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

export function loadVoices(): SpeechSynthesisVoice[] {
  if (!canSpeak()) return [];
  return window.speechSynthesis.getVoices();
}

export function speakText(
  text: string,
  profile: VoiceProfile,
  hooks?: { onStart?: () => void; onEnd?: () => void },
): void {
  if (!canSpeak()) {
    hooks?.onEnd?.();
    return;
  }
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(shapeUtterance(text, profile));
  utterance.lang = bcp47(profile.lang);
  utterance.pitch = clamp(profile.pitch, 0.5, 2);
  utterance.rate = clamp(profile.rate, 0.6, 1.45);
  const voice = loadVoices().find((item) => item.voiceURI === profile.voiceURI);
  if (voice) utterance.voice = voice;
  utterance.onstart = () => hooks?.onStart?.();
  utterance.onend = () => hooks?.onEnd?.();
  utterance.onerror = () => hooks?.onEnd?.();
  window.speechSynthesis.speak(utterance);
}

export function stopSpeaking(): void {
  if (canSpeak()) window.speechSynthesis.cancel();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
