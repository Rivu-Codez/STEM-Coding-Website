export function createGamePersistence({ gameId, auth, progress }) {
  if (!gameId || !auth || !progress) {
    return Object.freeze({
      isLevelUnlocked: () => false,
      restoreCheckpoint: async () => null,
      submitAttempt: async () => ({ ok: false, error: 'Authentication is unavailable.' }),
      recordMistake: async () => ({ ok: false, error: 'Authentication is unavailable.' }),
      analyzeMistake: async () => null,
      recordAchievement: async () => ({ ok: false, error: 'Authentication is unavailable.' }),
    });
  }

  return Object.freeze({
    gameId,
    isLevelUnlocked: (levelIndex) => progress.isLevelUnlocked(levelIndex),
    restoreCheckpoint: (levelIndex) => progress.restoreCheckpoint(levelIndex),
    submitAttempt: (levelIndex, outcome, category, details) => progress.submitAttempt(levelIndex, outcome, category, details),
    recordMistake: (levelIndex, category, details) => progress.recordMistake(levelIndex, category, details),
    analyzeMistake: (levelIndex, category, details) => progress.analyzeMistake(levelIndex, category, details),
    recordAchievement: (levelIndex) => progress.recordAchievement(levelIndex),
  });
}
