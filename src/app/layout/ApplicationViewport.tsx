import { hubBrandForRoute, UNIVERSE_VIEW_BRANDING } from '../../../shared/hub-branding.mjs';
import type { ReactNode } from 'react';
import { Footer } from '../../components/Footer';

type ApplicationViewportProps = {
  currentRoute: string;
  children: ReactNode;
  onNavigate: (path: string) => void;
};

export function ApplicationViewport({
  currentRoute: _currentRoute,
  children,
  onNavigate,
}: ApplicationViewportProps) {
  return (
    <div data-hub={hubBrandForRoute(_currentRoute)} className="universe-viewport min-h-screen text-slate-100 flex flex-col items-center justify-start relative overflow-x-hidden" style={{ backgroundColor: UNIVERSE_VIEW_BRANDING.canvas }}>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-black focus:font-bold focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-amber-500"
      >
        Zum Hauptinhalt springen
      </a>

      <div aria-hidden="true" className="universe-space fixed inset-0 pointer-events-none z-0 overflow-hidden" />

      <main
        id="main-content"
        tabIndex={-1}
        className="w-full max-w-[1440px] flex-1 relative z-10 outline-none"
      >
        {children}
      </main>
      <div className="w-full max-w-[1440px] relative z-10"><Footer onNavigate={onNavigate} /></div>
    </div>
  );
}
