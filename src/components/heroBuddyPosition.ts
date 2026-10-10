/**
 * Keep the draggable assistant within its measured viewport bounds.
 * If the panel itself is larger than the viewport, pin it to the origin
 * rather than introducing a negative or non-finite CSS coordinate.
 */
export type HeroBuddyPoint = Readonly<{ x: number; y: number }>;
export type HeroBuddySize = Readonly<{ width: number; height: number }>;

function clampAxis(coordinate: number, viewport: number, element: number): number {
  const safeViewport = Number.isFinite(viewport) ? Math.max(0, viewport) : 0;
  const safeElement = Number.isFinite(element) ? Math.max(0, element) : 0;
  const available = Math.max(0, safeViewport - safeElement);
  const inset = Math.min(8, available / 2);
  const coordinateOrInset = Number.isFinite(coordinate) ? coordinate : inset;
  return Math.max(inset, Math.min(available - inset, coordinateOrInset));
}

export function clampHeroBuddyPoint(
  point: HeroBuddyPoint,
  viewport: HeroBuddySize,
  element: HeroBuddySize,
): HeroBuddyPoint {
  return {
    x: clampAxis(point.x, viewport.width, element.width),
    y: clampAxis(point.y, viewport.height, element.height),
  };
}
