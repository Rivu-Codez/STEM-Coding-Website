(function () {
  const failureCategories = [
    "shot_missed", "wall_collision", "program_incomplete", "unchanged_program", "concept_not_applied"
  ];

  window.StemMistakeApi = {
    async record(levelNumber, category, details) {
      const platform = window.StemGamePlatform;
      if (!platform.getClient() || !platform.getSession()) return { ok: false, error: "Authentication required" };
      const response = await platform.getClient().rpc("record_mistake_event", {
        p_game_id: platform.getGameId(), p_level_number: levelNumber,
        p_category: category, p_details: details || {}
      });
      if (response.error) {
        platform.showStatus("Learning feedback could not be saved. Please retry.");
        return { ok: false, error: response.error.message };
      }
      return { ok: true, data: response.data };
    },
    async getLearningState(levelNumber) {
      const platform = window.StemGamePlatform;
      if (!platform.getClient() || !platform.getSession()) return { failures: [] };
      const result = await platform.getClient().from("mistake_events")
        .select("category,details,created_at").eq("game_id", platform.getGameId())
        .eq("level_number", levelNumber).order("created_at", { ascending: true });
      if (result.error) return { failures: [] };
      const events = result.data || [];
      const lastReflection = events.map((event, index) =>
        ["reflection_completed", "level_completed"].includes(event.category) ? index : -1
      ).pop();
      return { failures: events.slice(lastReflection + 1).filter(event => failureCategories.includes(event.category)) };
    }
  };
})();
