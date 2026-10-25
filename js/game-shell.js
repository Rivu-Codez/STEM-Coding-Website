(function () {
  const roots = new Map();

  function register(root) {
    const gameId = root.dataset.gameRoot;
    if (!gameId) return;
    let status = root.querySelector('[data-game-status]');
    if (!status) {
      status = document.createElement('p');
      status.dataset.gameStatus = '';
      status.className = 'stem-sr-only';
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      status.setAttribute('aria-atomic', 'true');
      root.prepend(status);
    }
    root.classList.add('stem-game-frame');
    root.dataset.gameState = 'ready';
    roots.set(gameId, { root, status });
  }

  document.querySelectorAll('[data-game-root]').forEach(register);

  window.StemGameShell = Object.freeze({
    setBusy(gameId, busy) {
      const entry = roots.get(gameId);
      if (!entry) return;
      entry.root.setAttribute('aria-busy', String(Boolean(busy)));
      entry.root.dataset.gameState = busy ? 'checking' : 'ready';
      entry.root.querySelectorAll('[data-attempt-submit]').forEach(button => {
        button.disabled = Boolean(busy);
        button.setAttribute('aria-disabled', String(Boolean(busy)));
      });
    },
    announce(gameId, message) {
      const entry = roots.get(gameId);
      if (entry && typeof message === 'string') entry.status.textContent = message;
    },
    setState(gameId, state) {
      const entry = roots.get(gameId);
      if (entry && ['ready', 'checking', 'complete', 'error'].includes(state)) entry.root.dataset.gameState = state;
    },
    getState(gameId) { return roots.get(gameId)?.root.dataset.gameState || 'unmounted'; },
  });
})();
