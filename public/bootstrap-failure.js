(() => {
  const entry = document.getElementById('capital-ai-entry');
  const fallback = document.getElementById('capital-ai-bootstrap-fallback');
  if (!entry || !fallback) return;

  entry.addEventListener('error', () => {
    fallback.hidden = false;
  }, { once: true });
})();
