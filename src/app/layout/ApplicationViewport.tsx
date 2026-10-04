import { useState, type ReactNode } from 'react';
import { Monitor, Smartphone } from 'lucide-react';
import { StatusBar } from '../../shared/ui/StatusBar';

type ApplicationViewportProps = {
  currentRoute: string;
  children: ReactNode;
};

export function ApplicationViewport({
  currentRoute,
  children,
}: ApplicationViewportProps) {
  const [viewMode, setViewMode] = useState<'mockup' | 'fullscreen'>('mockup');

  return (
    <div className="min-h-screen bg-[#02050e] text-slate-100 flex flex-col items-center justify-start relative overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-amber-400 focus:text-black focus:font-bold focus:rounded-xl focus:shadow-2xl focus:outline-none focus:ring-4 focus:ring-amber-500"
      >
        Zum Hauptinhalt springen
      </a>

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[650px] h-[650px] opacity-25"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(245, 176, 20, 0.18) 0%, rgba(245, 176, 20, 0.04) 45%, transparent 70%)',
            transform: 'rotate(-25deg)',
          }}
        />
        <div
          className="absolute top-1/3 -right-60 w-[750px] h-[750px] opacity-20"
          style={{
            background:
              'radial-gradient(ellipse at center, rgba(245, 176, 20, 0.15) 0%, transparent 65%)',
            transform: 'rotate(35deg)',
          }}
        />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-72 bg-gradient-to-t from-amber-500/5 via-transparent to-transparent blur-3xl" />
      </div>

      <div className="hidden sm:flex items-center justify-between w-full max-w-xl px-4 py-3 z-30 select-none">
        <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 bg-amber-400/10 px-3 py-1.5 rounded-full border border-amber-400/20 backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          <span>Capital-AI • Mobile Landing Page Preview</span>
        </div>

        <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-xl border border-slate-800 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setViewMode('mockup')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'mockup'
                ? 'bg-amber-400 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>iPhone Frame</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('fullscreen')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg transition-colors ${
              viewMode === 'fullscreen'
                ? 'bg-amber-400 text-black font-bold shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Monitor className="w-3.5 h-3.5" />
            <span>Vollbreite</span>
          </button>
        </div>
      </div>

      <div
        role="status"
        className="relative z-20 w-full bg-amber-500 text-black text-center text-xs font-bold p-2"
      >
        Vorschau: Teile dieser Oberfläche enthalten Beispieldaten. Nur ausdrücklich
        gekennzeichnete Provider-Antworten sind Marktdaten.
      </div>

      <main
        id="main-content"
        tabIndex={-1}
        className={`w-full relative z-10 transition-all duration-300 outline-none ${
          currentRoute !== '/'
            ? 'max-w-5xl bg-[#02050e]'
            : viewMode === 'mockup'
              ? 'sm:my-6 sm:max-w-[412px] sm:rounded-[52px] sm:border-[8px] sm:border-[#2a2f3e] sm:ring-1 sm:ring-amber-500/20 sm:shadow-[0_25px_70px_rgba(0,0,0,0.8),0_0_50px_rgba(245,176,20,0.15)] bg-[#02050e] overflow-hidden'
              : 'max-w-md bg-[#02050e]'
        }`}
      >
        {currentRoute === '/' && viewMode === 'mockup' && (
          <div className="hidden sm:block">
            <StatusBar />
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
