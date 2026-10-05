export function RouteLoadingFallback() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-32 items-center justify-center p-8 text-center text-sm text-slate-400"
    >
      Ansicht wird geladen…
    </div>
  );
}
