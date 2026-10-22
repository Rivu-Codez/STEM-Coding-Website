(function () {
  let currentLevelIndex = 0;
  let attempt = {};
  window.SignalDecrypterModule = window.StemGameModule.create({
    gameId: "signal_decrypter",
    levels: window.SignalDecrypterLevels,
    loadLevel(levelIndex) {
      currentLevelIndex = levelIndex;
      attempt = {};
      return this.levels[levelIndex];
    },
    reset() { attempt = {}; },
    getAttemptPayload() { return { ...attempt, levelNumber: currentLevelIndex + 1 }; },
    renderFeedback(feedback) { return feedback; },
    getMistakeCategory() { return "incorrect_operation"; },
    buildTutorContext() { return { gameId: "signal_decrypter", levelNumber: currentLevelIndex + 1 }; }
  });
})();
