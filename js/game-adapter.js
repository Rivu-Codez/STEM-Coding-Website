(function () {
  const AUTH_ERROR = "Authentication is unavailable. Refresh and log in again.";

  function showAuthError() {
    window.StemGamePlatform?.showStatus?.(AUTH_ERROR);
  }

  function unavailableResult() {
    showAuthError();
    return Promise.resolve({ ok: false, error: AUTH_ERROR });
  }

  function create(gameId) {
    if (!gameId) throw new Error("A game ID is required for an adapter.");

    return Object.freeze({
      gameId,
      levelNumber(levelIndex) { return levelIndex + 1; },

      isLevelUnlocked(levelIndex) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.allowLevel !== "function") {
          showAuthError();
          return false;
        }
        return auth.allowLevel(this.levelNumber(levelIndex));
      },

      restoreCheckpoint(levelIndex) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.getLearningState !== "function") return Promise.resolve(null);
        return auth.getLearningState(this.levelNumber(levelIndex));
      },

      submitAttempt(levelIndex, outcome, category, details) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.recordAttempt !== "function") return unavailableResult();
        return auth.recordAttempt(this.levelNumber(levelIndex), outcome, category, details);
      },

      recordMistake(levelIndex, category, details) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.recordMistake !== "function") return unavailableResult();
        return auth.recordMistake(this.levelNumber(levelIndex), category, details);
      },

      analyzeMistake(levelIndex, category, details) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.analyzeMistake !== "function") return Promise.resolve(null);
        return auth.analyzeMistake(this.levelNumber(levelIndex), category, details);
      },

      recordAchievement(levelIndex) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.recordAchievement !== "function") return unavailableResult();
        return auth.recordAchievement(this.levelNumber(levelIndex));
      },
    });
  }

  window.StemGameAdapter = Object.freeze({ create });
})();
