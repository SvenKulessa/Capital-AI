import { Loader2 } from 'lucide-react';

export function RouteLoadingFallback() {
  return (
    <div role="status" className="flex min-h-24 items-center justify-center gap-2 p-6 text-sm text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin text-amber-300" aria-hidden="true" />
      Ansicht wird geladen …
    </div>
  );
}
