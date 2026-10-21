(function () {
  const requiredMethods = [
    "loadLevel",
    "reset",
    "getAttemptPayload",
    "renderFeedback"
  ];

  function create(config) {
    if (!config || typeof config.gameId !== "string" || !config.gameId) {
      throw new Error("A gameId is required.");
    }
    if (!Array.isArray(config.levels) || config.levels.length === 0) {
      throw new Error("A non-empty levels array is required.");
    }
    requiredMethods.forEach(name => {
      if (typeof config[name] !== "function") {
        throw new Error(`Game module method missing: ${name}`);
      }
    });

    const module = {
      gameId: config.gameId,
      levels: Object.freeze([...config.levels]),
      loadLevel: config.loadLevel,
      reset: config.reset,
      getAttemptPayload: config.getAttemptPayload,
      renderFeedback: config.renderFeedback
    };
    ["getMistakeCategory", "buildTutorContext"].forEach(name => {
      if (typeof config[name] === "function") module[name] = config[name];
    });
    return Object.freeze(module);
  }

  window.StemGameModule = Object.freeze({ create });
})();
