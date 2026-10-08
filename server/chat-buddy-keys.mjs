export const CHAT_BUDDY_KEY_SCHEMA = "CHAT_BUDDY_KEYS@1";

/** Names only. Values are never returned. Billable keys are never selected. */
export const CHAT_BUDDY_KEY_CATALOG = [
  {
    id: "gemini",
    env: "GEMINI_API_KEY",
    label: "Gemini Flash",
    needed: true,
    bills: true,
    detail: "Kann über das Freikontingent hinaus kosten. Wird nicht aufgerufen.",
  },
  {
    id: "deepseek",
    env: "DEEPSEEK_API_KEY",
    label: "DeepSeek",
    needed: false,
    bills: true,
    detail: "Wird nach Token berechnet. Wird nicht aufgerufen.",
  },
  {
    id: "mistral",
    env: "MISTRAL_API_KEY",
    label: "Mistral Large",
    needed: false,
    bills: true,
    detail: "Kostenpflichtiges Modell. Wird nicht aufgerufen.",
  },
];

export function inspectChatBuddyKeys(env = process.env) {
  const keys = CHAT_BUDDY_KEY_CATALOG.map((item) => {
    const raw = env?.[item.env];
    const present = typeof raw === "string" && raw.trim().length > 0;
    const used = present && item.needed && item.bills === false;
    let state = "missing";
    if (present && item.bills) state = "blocked";
    else if (present && used) state = "ready";
    else if (present) state = "unused";
    return {
      id: item.id,
      env: item.env,
      label: item.label,
      needed: item.needed,
      bills: item.bills,
      present,
      used,
      state,
      detail: item.detail,
    };
  });
  const active = keys.find((item) => item.used)?.id ?? "local";
  return { schema: CHAT_BUDDY_KEY_SCHEMA, active, keys };
}
