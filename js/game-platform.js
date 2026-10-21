(function () {
  const config = window.STEM_SUPABASE_CONFIG || {};
  const state = { client: null, session: null, gameId: null, unlocked: new Set([1]), creatorUnlocked: false };

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
    if (picker) [...picker.options].forEach(option => {
      if (option.dataset?.creatorLevel) {
        option.disabled = !state.creatorUnlocked;
        return;
      }
      option.disabled = !state.unlocked.has(Number(option.value) + 1);
    });
    const link = document.getElementById("creatorAcademyLink");
    if (link) {
      link.classList.toggle("is-locked", !state.creatorUnlocked);
      link.textContent = state.creatorUnlocked ? "🛠️ Creator Academy" : "🔒 Creator Academy";
      link.title = state.creatorUnlocked ? "Open Creator Academy" : "Complete Level 30 to unlock Creator Academy";
      link.setAttribute("aria-disabled", String(!state.creatorUnlocked));
      link.href = state.creatorUnlocked ? "creator.html" : "#";
    }
  }

  window.StemGamePlatform = {
    configure(gameId) { state.gameId = gameId || null; },
    getClient() { return state.client; },
    getSession() { return state.session; },
    getGameId() { return state.gameId; },
    setSession(session) { state.session = session; },
    setUnlocked(levels) { state.unlocked = new Set(levels); applyLevelAccess(); },
    setCreatorUnlocked(value) { state.creatorUnlocked = Boolean(value); applyLevelAccess(); },
    isCreatorUnlocked() { return state.creatorUnlocked; },
    isUnlocked(levelNumber) { return state.unlocked.has(levelNumber); },
    applyLevelAccess,
    initClient,
    showStatus,
    redirectToLogin(path) { window.location.href = path; }
  };
})();
