(function () {
  window.StemAchievementApi = {
    async record(levelNumber) {
      const platform = window.StemGamePlatform;
      if (!platform.getClient() || !platform.getSession()) return { ok: false, error: "Authentication required" };
      const response = await platform.getClient().rpc("record_authoritative_achievement", {
        p_game_id: platform.getGameId(), p_level_number: levelNumber
      });
      if (response.error) {
        platform.showStatus("Your reward could not be saved. Please retry.");
        return { ok: false, error: response.error.message };
      }
      return { ok: true, data: response.data };
    },
    async getTotalStars() {
      const platform = window.StemGamePlatform;
      if (!platform.getClient() || !platform.getSession()) return 0;
      const response = await platform.getClient().rpc("get_student_star_total", { p_game_id: platform.getGameId() });
      return response.error ? 0 : (response.data || 0);
    }
  };
})();
