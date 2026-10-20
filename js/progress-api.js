(function () {
  function platform() { return window.StemGamePlatform; }
  function client() { return platform().getClient(); }
  function session() { return platform().getSession(); }
  function createAttemptId() {
    return window.crypto?.randomUUID?.() || null;
  }

  async function load(gameId) {
    platform().setUnlocked([1]);
    if (!session()) return;
    const result = await client().from("level_progress")
      .select("level_number,status").eq("game_id", gameId);
    if (result.error) {
      platform().showStatus("Could not load your level progress. Refresh and retry.");
      return;
    }
    const unlocked = [1];
    (result.data || []).forEach(row => {
      if (["completed", "unlocked"].includes(row.status)) unlocked.push(row.level_number);
    });
    platform().setUnlocked(unlocked);
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
      if (!session()) return { completedLevels: 0, stars: 0, xp: 0, nextLevel: 1 };
      const progress = await client().from("level_progress")
        .select("level_number,status,best_result").eq("game_id", gameId);
      const achievements = await client().from("student_achievements")
        .select("level_number,stars,xp").eq("game_id", gameId);
      const completed = (progress.data || []).filter(row => row.status === "completed");
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
      return { completedLevels: completed.length, stars, xp, nextLevel: Math.min(30, completed.length + 1) };
    },
    async recordAttempt(levelNumber, result, mistakeCode, attemptData) {
      if (!client() || !session()) return { ok: false, error: "Authentication required" };
      const gameId = platform().getGameId();
      const isRoboMaze = gameId === "robo_maze" && Array.isArray(attemptData?.program);
      const isPhysics = gameId === "physics" && attemptData &&
        Number.isFinite(Number(attemptData.angle)) && Number.isFinite(Number(attemptData.speed));
      if (!isRoboMaze && !isPhysics) {
        platform().showStatus("This game cannot submit attempts safely. Please refresh and retry.");
        return { ok: false, error: "Unsupported attempt payload" };
      }
      const attemptId = createAttemptId();
      if (!attemptId) {
        platform().showStatus("Your browser cannot create a safe attempt ID. Please refresh and retry.");
        return { ok: false, error: "Attempt ID unavailable" };
      }
      const response = isRoboMaze
        ? await client().rpc("submit_robo_maze_attempt_idempotent", {
          p_attempt_id: attemptId, p_level_number: levelNumber, p_program: attemptData.program
        })
        : await client().rpc("submit_physics_attempt_idempotent", {
          p_attempt_id: attemptId, p_level_number: levelNumber, p_attempt_data: attemptData
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
