// RoboMaze persistence boundary. Gameplay code should not call the adapter directly.
const RoboMazeProgress = Object.freeze({
  isLevelUnlocked(levelIndex) {
    return RoboMazeAdapter.isLevelUnlocked(levelIndex);
  },
  restoreCheckpoint(levelIndex) {
    return RoboMazeAdapter.restoreCheckpoint(levelIndex);
  },
  submitAttempt(levelIndex, result, category, details) {
    return RoboMazeAdapter.submitAttempt(levelIndex, result, category, details);
  },
  recordMistake(levelIndex, category, details) {
    return RoboMazeAdapter.recordMistake(levelIndex, category, details);
  },
  analyzeMistake(levelIndex, category, details) {
    return RoboMazeAdapter.analyzeMistake(levelIndex, category, details);
  },
  recordAchievement(levelIndex) {
    return RoboMazeAdapter.recordAchievement(levelIndex);
  },
});
