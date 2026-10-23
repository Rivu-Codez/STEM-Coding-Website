export const ChemistryGameModule = {
  gameId: "chemistry",
  currentLevel: null,
  triesLeft: 3,

  async loadLevel(levelConfig, containerSelector) {
    if (!levelConfig || !Number.isInteger(Number(levelConfig.id))) throw new Error("A valid chemistry level is required.");
    this.currentLevel = levelConfig;
    this.triesLeft = 3;
    await window.ChemistryLabUI?.loadLevel(levelConfig, containerSelector);
    return levelConfig;
  },

  reset() {
    this.triesLeft = 3;
    window.ChemistryLabUI?.reset();
  },

  getAttemptPayload() {
    return {
      level_id: Number(this.currentLevel?.id),
      synthesized_compound: window.ChemistryLabUI?.getCanvasCompoundFormula() || "",
      synthesized_count: window.ChemistryLabUI?.getSynthesizedMoleculeCount() || 0,
      student_code: window.ChemistryLabUI?.getEditorCode() || ""
    };
  },

  renderFeedback(serverResponse) {
    return window.ChemistryLabUI?.renderFeedback(serverResponse);
  }
};

window.ChemistryGameModule = ChemistryGameModule;
window.ChemistryPlatformModule = window.StemGameModule.create({
  gameId: ChemistryGameModule.gameId,
  levels: window.ChemistryLevels,
  async loadLevel(levelIndex) {
    const level = this.levels[levelIndex];
    if (!level) throw new Error("Unknown chemistry level.");
    await ChemistryGameModule.loadLevel(level, "#chemistryGame");
    return level;
  },
  reset: () => ChemistryGameModule.reset(),
  getAttemptPayload: () => ChemistryGameModule.getAttemptPayload(),
  renderFeedback: result => ChemistryGameModule.renderFeedback(result)
});
