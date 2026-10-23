(function () {
  const definitions = [
    {
      gameId: "physics",
      displayName: "Physics Kinematics Lab",
      description: "Explore speed, angles, distance, and trajectory through experiments.",
      route: "PhysicsSim/index.html",
      enabled: true,
      levelCount: 15,
      validator: "physics",
      icon: "⚡"
    },
    {
      gameId: "robo_maze",
      displayName: "RoboLogic Maze",
      description: "Plan routes, practise logic, and teach a robot to solve the maze.",
      route: "RoboMaze/index.html",
      enabled: true,
      levelCount: 15,
      validator: "robo_maze",
      icon: "▦"
    },
    {
      gameId: "signal_decrypter",
      displayName: "Signal Decrypter",
      description: "Clean corrupted transmissions and practise strings, indexing, slicing, and methods.",
      route: "SignalDecrypter/index.html",
      enabled: true,
      levelCount: 15,
      validator: "signal_decrypter",
      icon: "📡"
    },
    {
      gameId: "submarine_math",
      displayName: "Submarine Math Expedition",
      description: "Use integers and number operations to navigate a submarine through 15 deep-sea levels.",
      route: "SubmarineMath/index.html",
      enabled: true,
      levelCount: 15,
      validator: "submarine_math",
      icon: "⚓"
    },
    {
      gameId: "chemistry",
      displayName: "Chemistry Lab",
      description: "Experiment with reactions, matter, and the building blocks of chemistry.",
      route: "Chemistry/index.html",
      enabled: true,
      levelCount: 15,
      validator: "chemistry",
      icon: "⚗"
    }
  ];

  const byId = new Map(definitions.map(game => [game.gameId, Object.freeze({ ...game })]));
  const registry = Object.freeze({
    get(gameId) { return byId.get(gameId) || null; },
    all() { return definitions.map(game => byId.get(game.gameId)); },
    enabled() { return definitions.filter(game => game.enabled).map(game => byId.get(game.gameId)); },
    isKnown(gameId) { return byId.has(gameId); },
    isEnabled(gameId) { return byId.get(gameId)?.enabled === true; },
    levelCount(gameId) { return byId.get(gameId)?.levelCount || 0; }
  });

  window.StemGameRegistry = registry;
})();
