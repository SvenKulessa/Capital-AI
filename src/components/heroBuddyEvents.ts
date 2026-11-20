/** Small event bridge keeps the optional JaJa chat out of the initial app bundle. */
export const HERO_BUDDY_EVENT = 'capital-ai:open-hero-buddy';
let pendingOpen = false;

export function openHeroBuddy(): void {
  pendingOpen = true;
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(HERO_BUDDY_EVENT));
}

/** Prevents losing a user click while the chat's lazy module is still loading. */
export function takePendingHeroBuddyOpen(): boolean {
  const value = pendingOpen;
  pendingOpen = false;
  return value;
}
