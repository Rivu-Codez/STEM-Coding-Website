(function () {
  const legacyDefinitions = {
    physics: { gameId: "physics", enabled: true, levelCount: 15, validator: "physics" },
    robo_maze: { gameId: "robo_maze", enabled: true, levelCount: 15, validator: "robo_maze" }
  };
  function platform() { return window.StemGamePlatform; }
  function registry() { return window.StemGameRegistry; }
  function gameDefinition(gameId) { return registry()?.get(gameId) || legacyDefinitions[gameId] || null; }
  function client() { return platform().getClient(); }
  function session() { return platform().getSession(); }
  function createAttemptId() {
    return window.crypto?.randomUUID?.() || null;
  }

  async function load(gameId) {
    const game = gameDefinition(gameId);
    if (!game || !game.enabled) return;
    platform().setUnlocked([1]);
    if (!session()) return;
    const result = await client().from("level_progress")
      .select("level_number,status").eq("game_id", gameId);
    if (result.error) {
      platform().showStatus("Could not load your level progress. Refresh and retry.");
      return;
    }
    const unlocked = [1];
    const finalLevel = game.levelCount;
    let finalLevelCompleted = false;
    (result.data || []).forEach(row => {
      if (["completed", "unlocked"].includes(row.status)) unlocked.push(row.level_number);
      if (row.level_number === finalLevel && row.status === "completed") finalLevelCompleted = true;
    });
    platform().setUnlocked(unlocked);
    platform().setCreatorUnlocked(gameId === "robo_maze" && finalLevelCompleted);
  }

  window.StemProgressApi = {
    load,
    allowLevel(levelNumber) {
      if (!session()) {
        platform().showStatus("Log in before starting a level.");
        return false;
      }
      if (!platform().isUnlocked(levelNumber)) {
        platform().showStatus("Complete the previous level to unlock this one.");
        return false;
      }
      return true;
    },
    async getDashboardStats(gameId) {
      const game = gameDefinition(gameId);
      const maxLevels = game?.levelCount || 0;
      if (!session() || !game || !game.enabled) return { completedLevels: 0, stars: 0, xp: 0, nextLevel: 1, maxLevels };
      const progress = await client().from("level_progress")
        .select("level_number,status,best_result").eq("game_id", gameId);
      const achievements = await client().from("student_achievements")
        .select("level_number,stars,xp").eq("game_id", gameId);
      const completed = (progress.data || []).filter(row => row.status === "completed" && row.level_number <= maxLevels);
      const records = achievements.error ? [] : (achievements.data || []);
      const fallback = completed.map(row => row.best_result || {});
      const starsFromRecords = records.reduce((total, row) => total + (row.stars || 0), 0);
      const totalStars = await client().rpc("get_student_star_total", { p_game_id: gameId });
      const stars = totalStars.error
        ? (records.length ? starsFromRecords : fallback.reduce((total, row) => total + (row.stars || 0), 0))
        : (totalStars.data || 0);
      const xp = records.length
        ? records.reduce((total, row) => total + (row.xp || 0), 0)
        : fallback.reduce((total, row) => total + (row.xp || 0), 0);
      return { completedLevels: completed.length, stars, xp, nextLevel: Math.min(maxLevels, completed.length + 1), maxLevels };
    },
    async getGameProgress(gameId = platform().getGameId()) {
      if (!client() || !session()) return { ok: false, levels: [], achievements: [] };
      const [levels, achievements] = await Promise.all([
        client().from("level_progress")
          .select("level_number,status,attempt_count").eq("game_id", gameId),
        client().from("student_achievements")
          .select("level_number,stars,xp").eq("game_id", gameId)
      ]);
      if (levels.error || achievements.error) {
        platform().showStatus("Could not load your level progress. Refresh and retry.");
        return { ok: false, levels: [], achievements: [] };
      }
      return { ok: true, levels: levels.data || [], achievements: achievements.data || [] };
    },
    async recordAttempt(levelNumber, result, mistakeCode, attemptData) {
      if (!client() || !session()) return { ok: false, error: "Authentication required" };
      const gameId = platform().getGameId();
      const game = gameDefinition(gameId);
      if (!game?.enabled || !game.validator) return { ok: false, error: "This game is not enabled for submissions" };
      const isRoboMaze = gameId === "robo_maze" && Array.isArray(attemptData?.program);
      const isPhysics = gameId === "physics" && attemptData &&
        Number.isFinite(Number(attemptData.angle)) && Number.isFinite(Number(attemptData.speed));
      const isSubmarineMath = gameId === "submarine_math" &&
        typeof attemptData?.answer === "string" && attemptData.answer.length <= 32;
      const isSignalDecrypter = gameId === "signal_decrypter" && attemptData &&
        ((Array.isArray(attemptData.operations) && attemptData.operations.length <= 12) ||
         (typeof attemptData.code === "string" && attemptData.code.length <= 800));
      const isChemistry = gameId === "chemistry" && attemptData &&
        Number.isInteger(attemptData.level_id) &&
        typeof attemptData.synthesized_compound === "string" && attemptData.synthesized_compound.length <= 32 &&
        Number.isInteger(attemptData.synthesized_count) && attemptData.synthesized_count >= 0 &&
        typeof attemptData.student_code === "string" && attemptData.student_code.length <= 4000;
      if (!isRoboMaze && !isPhysics && !isSubmarineMath && !isSignalDecrypter && !isChemistry) {
        platform().showStatus("This game cannot submit attempts safely. Please refresh and retry.");
        return { ok: false, error: "Unsupported attempt payload" };
      }
      const attemptId = createAttemptId();
      if (!attemptId) {
        platform().showStatus("Your browser cannot create a safe attempt ID. Please refresh and retry.");
        return { ok: false, error: "Attempt ID unavailable" };
      }
      const response = await client().rpc("submit_game_attempt_idempotent", {
        p_game_id: gameId,
        p_attempt_id: attemptId,
        p_level_number: levelNumber,
        p_attempt_data: isRoboMaze ? { program: attemptData.program } : attemptData
      });
      if (response.error) {
        platform().showStatus("Progress could not be saved. Please retry this attempt.");
        return { ok: false, error: response.error.message };
      }
      await load(gameId);
      return { ok: true, data: response.data };
    },
    async getLevelAttemptCount(levelNumber) {
      if (!client() || !session()) return 0;
      const result = await client().from("level_progress")
        .select("attempt_count").eq("game_id", platform().getGameId())
        .eq("level_number", levelNumber).maybeSingle();
      return result.data?.attempt_count || 0;
    }
  };
})();
