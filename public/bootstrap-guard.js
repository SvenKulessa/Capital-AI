(() => {
  let mounted = false;

  const reveal = () => {
    if (mounted || window.__CAPITAL_AI_BOOTSTRAP_MOUNTED__ === true) return;
    const fallback = document.getElementById('capital-ai-bootstrap-fallback');
    if (fallback) fallback.setAttribute('data-visible', 'true');
  };

  window.addEventListener('capital-ai:bootstrap-mounted', () => {
    mounted = true;
  }, { once: true });

  window.addEventListener('error', (event) => {
    const target = event.target;
    const resourceFailure = target instanceof HTMLScriptElement
      || target instanceof HTMLLinkElement;
    if (resourceFailure || event.error) reveal();
  }, true);

  window.addEventListener('unhandledrejection', () => reveal(), { once: true });
})();
