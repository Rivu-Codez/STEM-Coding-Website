// PhysicsSim boundary for shared platform services.
const PhysicsAdapter = {
  levelNumber(levelIndex) {
    return levelIndex + 1;
  },

  isLevelUnlocked(levelIndex) {
    if (!window.StemGameAuth || typeof StemGameAuth.allowLevel !== "function") {
      window.StemGamePlatform?.showStatus?.("Authentication is unavailable. Refresh and log in again.");
      return false;
    }
    return StemGameAuth.allowLevel(this.levelNumber(levelIndex));
  },

  async restoreCheckpoint(levelIndex) {
    if (!window.StemGameAuth || typeof StemGameAuth.getLearningState !== "function") return null;
    return StemGameAuth.getLearningState(this.levelNumber(levelIndex));
  },

  submitAttempt(levelIndex, outcome, category, details) {
    return StemGameAuth.recordAttempt(this.levelNumber(levelIndex), outcome, category, details);
  },

  recordMistake(levelIndex, category, details) {
    return StemGameAuth.recordMistake(this.levelNumber(levelIndex), category, details);
  },

  analyzeMistake(levelIndex, category, details) {
    return StemGameAuth.analyzeMistake(this.levelNumber(levelIndex), category, details);
  },

  recordAchievement(levelIndex) {
    return StemGameAuth.recordAchievement(this.levelNumber(levelIndex));
  },
};
