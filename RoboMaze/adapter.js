// The RoboMaze boundary for shared platform services.
const RoboMazeAdapter = {
  levelNumber(levelIndex) {
    return levelIndex + 1;
  },

  isLevelUnlocked(levelIndex) {
    return !window.StemGameAuth || StemGameAuth.allowLevel(this.levelNumber(levelIndex));
  },

  async restoreCheckpoint(levelIndex) {
    if (!window.StemGameAuth) return null;
    return StemGameAuth.getLearningState(this.levelNumber(levelIndex));
  },
};
