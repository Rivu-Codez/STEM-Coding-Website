(function () {
  const stages = ["seed", "sprout", "leafy", "bud", "flower", "fruit"];
  const stageDays = [1, 4, 9, 15, 22, 30];
  const defaults = Object.freeze({
    day: 1, phase: "day", stage: "seed", health: 82, moisture: 52,
    light: 48, nutrients: 46, plannedActions: [], milestones: [],
    lastObservation: "Your seed is ready for its first care plan.",
    recovery: 0, photosynthesis: 0
  });

  function clamp(value) { return Math.max(0, Math.min(100, Math.round(value))); }
  function createGarden() { return { ...defaults, plannedActions: [], milestones: [] }; }

  function predict(state, actions) {
    const next = { ...state };
    const seen = {};
    actions.forEach(action => {
      seen[action] = (seen[action] || 0) + 1;
      if (action === "water") next.moisture += 24;
      if (action === "sunlight") next.light += 22;
      if (action === "nutrients") next.nutrients += 18;
    });
    if ((seen.water || 0) > 1) next.health -= 12 * (seen.water - 1);
    if ((seen.sunlight || 0) > 2) next.health -= 8 * (seen.sunlight - 2);
    next.moisture = clamp(next.moisture);
    next.light = clamp(next.light);
    next.nutrients = clamp(next.nutrients);
    const balance = Math.min(next.moisture, next.light, next.nutrients);
    next.health = clamp(next.health + (balance >= 45 ? 6 : -8));
    return next;
  }

  function advance(state, actions) {
    if (!Array.isArray(actions) || actions.length > 3) throw new Error("Choose up to three care actions.");
    const next = predict(state, actions);
    next.phase = state.phase === "day" ? "night" : "day";
    if (next.phase === "day") next.day += 1;
    next.moisture = clamp(next.moisture - 16);
    next.light = clamp(next.light - 10);
    next.nutrients = clamp(next.nutrients - 5);
    const balance = Math.min(next.moisture, next.light, next.nutrients);
    const currentStage = stages.indexOf(state.stage);
    const growth = balance >= 48 && next.health >= 60 && next.day >= stageDays[currentStage + 1];
    next.stage = stages[Math.min(stages.length - 1, currentStage + (growth ? 1 : 0))];
    next.health = clamp(next.health + (growth ? 5 : -4));
    next.recovery = growth ? Math.min(100, (state.recovery || 0) + 20) : Math.max(0, (state.recovery || 0) - 5);
    next.photosynthesis = next.phase === "day" && currentStage >= 2 ? Math.min(100, (state.photosynthesis || 0) + 18) : state.photosynthesis || 0;
    next.plannedActions = [];
    next.lastObservation = growth
      ? `Healthy care helped your plant reach the ${next.stage} stage.`
      : "Growth slowed because one or more plant needs were out of balance.";
    return next;
  }

  window.BiologyGardenEngine = Object.freeze({ stages, stageDays, defaults, createGarden, predict, advance });
})();
