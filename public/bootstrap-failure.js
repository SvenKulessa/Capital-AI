(() => {
  const showFailure = () => {
    const fallback = document.getElementById('capital-ai-bootstrap-fallback');
    const root = document.getElementById('root');
    if (!fallback || !root || root.childElementCount > 0) return;
    fallback.hidden = false;
  };

  window.addEventListener('error', event => {
    const target = event.target;
    if (target instanceof HTMLScriptElement && target.id === 'capital-ai-entry') {
      showFailure();
    }
  }, true);

  window.addEventListener('DOMContentLoaded', () => {
    document.getElementById('capital-ai-bootstrap-reload')
      ?.addEventListener('click', () => window.location.reload());
  }, { once: true });
})();
