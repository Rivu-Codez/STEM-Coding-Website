// Physics persistence boundary. Gameplay code should not call the adapter directly.
const PhysicsProgress = Object.freeze({
  isLevelUnlocked(levelIndex) {
    return PhysicsAdapter.isLevelUnlocked(levelIndex);
  },
  restoreCheckpoint(levelIndex) {
    return PhysicsAdapter.restoreCheckpoint(levelIndex);
  },
  submitAttempt(levelIndex, result, category, details) {
    return PhysicsAdapter.submitAttempt(levelIndex, result, category, details);
  },
  recordMistake(levelIndex, category, details) {
    return PhysicsAdapter.recordMistake(levelIndex, category, details);
  },
  analyzeMistake(levelIndex, category, details) {
    return PhysicsAdapter.analyzeMistake(levelIndex, category, details);
  },
  recordAchievement(levelIndex) {
    return PhysicsAdapter.recordAchievement(levelIndex);
  },
});
window.PhysicsProgress = PhysicsProgress;
