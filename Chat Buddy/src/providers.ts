import type { ProviderId } from "./types";

export type ProviderMeta = {
  id: ProviderId;
  label: string;
  model: string;
  needsKey: boolean;
  freeTier: boolean;
  hint: string;
};

export const PROVIDERS: readonly ProviderMeta[] = [
  {
    id: "local",
    label: "Lokales Gehirn",
    model: "jaja-nlu-graph",
    needsKey: false,
    freeTier: true,
    hint: "NLU, Graph und umkehrbare Spur, ohne Schlüssel",
  },
  {
    id: "deepseek",
    label: "DeepSeek",
    model: "deepseek-chat",
    needsKey: true,
    freeTier: true,
    hint: "platform.deepseek.com",
  },
  {
    id: "gemini",
    label: "Gemini Flash",
    model: "gemini-2.5-flash",
    needsKey: true,
    freeTier: true,
    hint: "aistudio.google.com",
  },
  {
    id: "mistral",
    label: "Mistral Large",
    model: "mistral-large-latest",
    needsKey: true,
    freeTier: false,
    hint: "console.mistral.ai",
  },
];

export function providerMeta(id: ProviderId): ProviderMeta {
  return PROVIDERS.find((item) => item.id === id) ?? PROVIDERS[0];
}
