(() => {
  const showFailure = () => {
    const fallback = document.getElementById('capital-ai-bootstrap-fallback');
    const root = document.getElementById('root');
    // A server-delivered public snapshot can be read without the client bundle.
    // Do not replace it with an error banner when the bundle is unavailable.
    if (!fallback || !root || root.childElementCount > 0 || !fallback.hidden) return;
    // Deliberately create the diagnostic only after the entry script fails.
    // Static HTML crawlers must never mistake a hidden diagnostic for page content.
    fallback.innerHTML = `<section role="alert" class="w-full max-w-md rounded-3xl border border-amber-400/20 bg-slate-950/80 p-6 text-center">
      <img src="/branding/capital-ai-logo.jpg" alt="Capital-AI" width="640" height="360" class="mx-auto w-full max-w-xs rounded-xl" />
      <h2 class="mt-4 text-2xl font-bold">Die Anwendung konnte nicht gestartet werden.</h2>
      <p class="mt-3 text-sm text-slate-400">Der Anwendungs-Bootstrap ist technisch fehlgeschlagen. Bitte lade die Seite neu.</p>
      <button id="capital-ai-bootstrap-reload" type="button" class="mt-4 rounded-xl bg-amber-400 px-4 py-3 font-bold text-black">Seite neu laden</button>
    </section>`;
    fallback.hidden = false;
    fallback.classList.remove('hidden');
    fallback.classList.add('flex');
    document.getElementById('capital-ai-bootstrap-reload')
      ?.addEventListener('click', () => window.location.reload());
  };

  window.addEventListener('error', event => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && target.id === 'capital-ai-entry') {
      showFailure();
    }
  }, true);
})();
