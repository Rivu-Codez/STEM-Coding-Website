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
};
