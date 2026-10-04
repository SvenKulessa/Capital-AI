import React, { Component, type ErrorInfo, type ReactNode } from 'react';

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  failed: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Never expose stack traces, exception messages, tokens, URLs or provider data to the UI.
    console.error('[CAPITAL-AI] UI_RUNTIME_FAILURE');
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return <BootstrapFailure />;
  }
}

export function BootstrapFailure() {
  return (
    <main
      role="alert"
      aria-live="assertive"
      className="min-h-screen bg-[#02050e] text-slate-100 flex items-center justify-center px-6"
    >
      <section className="w-full max-w-md rounded-3xl border border-amber-400/30 bg-slate-950/90 p-6 text-center shadow-2xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300">Capital-AI</p>
        <h1 className="mt-3 text-xl font-bold">Oberfläche konnte nicht sicher gestartet werden.</h1>
        <p className="mt-3 text-sm text-slate-400">
          Der Dienst ist erreichbar, aber die Browser-Oberfläche wurde abgebrochen. Es wurden keine technischen
          Fehlerdetails oder Zugangsdaten eingeblendet.
        </p>
        <a
          href="/"
          className="mt-6 inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-400 px-5 py-2 text-sm font-bold text-black"
        >
          Startseite neu laden
        </a>
      </section>
    </main>
  );
}
