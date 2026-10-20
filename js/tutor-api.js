(function () {
  let lastState = "RULE_BASED_FALLBACK";

  window.StemTutorApi = {
    async analyze(levelNumber, category, details) {
      const platform = window.StemGamePlatform;
      if (!platform.getClient() || !platform.getSession()) {
        lastState = "RULE_BASED_FALLBACK";
        return null;
      }
      const response = await platform.getClient().functions.invoke("analyze-mistake", {
        body: { gameId: platform.getGameId(), levelNumber, category, details }
      });
      if (response.error) {
        lastState = response.data?.state || "AI_TEMPORARILY_UNAVAILABLE";
        console.info("AI tutor fallback:", lastState);
        return null;
      }
      lastState = response.data?.state || "AI_SUCCESS";
      return response.data?.insight || null;
    },
    getLastState() { return lastState; }
  };
})();
