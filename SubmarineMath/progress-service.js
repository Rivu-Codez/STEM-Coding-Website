window.SubmarineProgress = Object.freeze({
  isLevelUnlocked(levelIndex) {
    return window.SubmarineAdapter.isLevelUnlocked(levelIndex);
  },
  submitAttempt(levelIndex, answer) {
    return window.SubmarineAdapter.submitAttempt(levelIndex, answer);
  },
  recordAchievement(levelIndex) {
    return window.SubmarineAdapter.recordAchievement(levelIndex);
  },
  loadProgress() {
    return window.SubmarineAdapter.loadProgress();
  }
});
