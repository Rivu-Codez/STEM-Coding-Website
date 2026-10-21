const SubmarineAdapter = window.StemGameAdapter.create("submarine_math");

window.SubmarineAdapter = Object.freeze({
  isLevelUnlocked(levelIndex) {
    return SubmarineAdapter.isLevelUnlocked(levelIndex);
  },
  submitAttempt(levelIndex, answer) {
    return SubmarineAdapter.submitAttempt(levelIndex, "attempt", null, { answer });
  },
  recordAchievement(levelIndex) {
    return SubmarineAdapter.recordAchievement(levelIndex);
  },
  loadProgress() {
    return window.StemGameAuth.getGameProgress();
  }
});
