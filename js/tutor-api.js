(function () {
  let lastState = "RULE_BASED_FALLBACK";
  const now = () => globalThis.performance?.now?.() ?? Date.now();

  window.StemTutorApi = {
    async analyze(levelNumber, category, details) {
      const startedAt = now();
      const platform = window.StemGamePlatform;
      if (!platform.getClient() || !platform.getSession()) {
        lastState = "RULE_BASED_FALLBACK";
        console.info("AI tutor result", { state: lastState, latencyMs: Math.round(now() - startedAt) });
        return null;
      }
      const response = await platform.getClient().functions.invoke("analyze-mistake", {
        body: { gameId: platform.getGameId(), levelNumber, category, details }
      });
      if (response.error) {
        lastState = response.data?.state || "AI_TEMPORARILY_UNAVAILABLE";
        console.info("AI tutor result", {
          state: lastState,
          latencyMs: Math.round(now() - startedAt),
        });
        return null;
      }
      lastState = response.data?.state || "AI_SUCCESS";
      console.info("AI tutor result", {
        state: lastState,
        latencyMs: Math.round(now() - startedAt),
      });
      return response.data?.insight || null;
    },
    getLastState() { return lastState; }
  };
})();
