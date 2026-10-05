import type { ReactNode } from 'react';

type ApplicationViewportProps = {
  currentRoute: string;
  children: ReactNode;
};

export function ApplicationViewport({
  currentRoute,
  children,
}: ApplicationViewportProps) {
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

      <main
        id="main-content"
        tabIndex={-1}
        data-route={currentRoute}
        className="w-full max-w-[1440px] relative z-10 bg-[#02050e] outline-none"
      >
        {children}
      </main>
    </div>
  );
}
