(function () {
  const config = window.STEM_SUPABASE_CONFIG || {};
  const state = { client: null, session: null, gameId: null, unlocked: new Set([1]) };

  function showStatus(message) {
    const target = document.getElementById("statusMessage") || document.getElementById("loginMessage");
    if (target) {
      target.textContent = message;
      target.className = "status-toast toast-error";
    }
  }

  function requireConfig() {
    if (!config.url || !config.anonKey || !window.supabase) {
      showStatus("Add your Supabase URL and anonymous key in js/supabase-config.js.");
      return false;
    }
    return true;
  }

  function initClient() {
    if (!requireConfig()) return null;
    if (!state.client) state.client = window.supabase.createClient(config.url, config.anonKey);
    return state.client;
  }

  function applyLevelAccess() {
    const picker = document.getElementById("levelPicker");
    if (!picker) return;
    [...picker.options].forEach(option => {
      if (option.dataset?.creatorLevel) {
        option.disabled = false;
        return;
      }
      option.disabled = !state.unlocked.has(Number(option.value) + 1);
    });
  }

  window.StemGamePlatform = {
    configure(gameId) { state.gameId = gameId || null; },
    getClient() { return state.client; },
    getSession() { return state.session; },
    getGameId() { return state.gameId; },
    setSession(session) { state.session = session; },
    setUnlocked(levels) { state.unlocked = new Set(levels); applyLevelAccess(); },
    isUnlocked(levelNumber) { return state.unlocked.has(levelNumber); },
    applyLevelAccess,
    initClient,
    showStatus,
    redirectToLogin(path) { window.location.href = path; }
  };
})();
