(function () {
  const atoms = ["H", "O", "C", "N", "Na", "Cl", "Fe"];
  const valence = { H: 1, O: 2, C: 4, N: 3, Na: 1, Cl: 1, Fe: 3 };
  const colors = { H: "#e6f4ff", O: "#fb7185", C: "#cbd5e1", N: "#818cf8", Na: "#fbbf24", Cl: "#4ade80", Fe: "#fb923c" };
  const $ = id => document.getElementById(id);
  const moduleApi = () => window.ChemistryGameModule;
  const adapter = window.StemGameAdapter.create("chemistry");
  const node = { workspace: null, editor: null, editorView: null, levelIndex: 0, counts: {}, formula: "", count: 0, succeeded: false, busy: false, canvasFrame: 0 };

  function status(message) {
    const toast = document.createElement("div");
    toast.className = "status-toast";
    toast.setAttribute("role", "status");
    toast.textContent = message;
    document.body.append(toast);
    setTimeout(() => toast.remove(), 4500);
  }

  function level() { return window.ChemistryLevels[node.levelIndex]; }

  function formulaFromCounts(counts) {
    const targetOrder = level()?.formula.match(/[A-Z][a-z]?/g) || [];
    const order = [...new Set([...targetOrder, ...atoms])];
    return order.filter(symbol => counts[symbol] > 0).map(symbol => symbol + (counts[symbol] > 1 ? counts[symbol] : "")).join("");
  }

  function formulaCounts(formula) {
    const parsed = {};
    for (const match of formula.matchAll(/([A-Z][a-z]?)(\d*)/g)) parsed[match[1]] = (parsed[match[1]] || 0) + Number(match[2] || 1);
    return parsed;
  }

  function readBlockly() {
    const blocks = node.workspace?.getTopBlocks(true) || [];
    const counts = {};
    blocks.forEach(block => {
      if (block.type !== "chem_atom") return;
      const symbol = block.getFieldValue("ELEMENT");
      counts[symbol] = (counts[symbol] || 0) + Number(block.getFieldValue("COUNT") || 1);
    });
    node.counts = counts;
    node.formula = formulaFromCounts(counts);
    node.count = node.formula ? 1 : 0;
    updateReadout();
    updatePreview(blocks);
    drawMolecule(counts);
  }

  function updatePreview(blocks = []) {
    const lines = ["# Molecule assembly from atom blocks", "atoms = {}"];
    blocks.forEach(block => {
      if (block.type !== "chem_atom") return;
      lines.push(`atoms["${block.getFieldValue("ELEMENT")}"] = atoms.get("${block.getFieldValue("ELEMENT")}", 0) + ${Number(block.getFieldValue("COUNT") || 1)}`);
    });
    if (!blocks.length) lines.push("# Add atom blocks to build a molecule");
    else lines.push("lab.mix(atoms)");
    $("pythonPreview").textContent = lines.join("\n");
  }

  function drawMolecule(counts = {}) {
    const canvas = $("moleculeCanvas");
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(rect.width * ratio);
    canvas.height = Math.round(rect.height * ratio);
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    const width = rect.width, height = rect.height;
    ctx.clearRect(0, 0, width, height);
    const symbols = atoms.flatMap(symbol => Array.from({ length: Math.min(counts[symbol] || 0, 12) }, () => symbol));
    $("canvasEmpty").hidden = symbols.length > 0;
    if (!symbols.length) return;
    const centerX = width / 2, centerY = height / 2;
    const radius = Math.min(width, height) * (symbols.length < 4 ? .24 : .32);
    const points = symbols.map((symbol, index) => {
      const angle = (Math.PI * 2 * index / symbols.length) - Math.PI / 2;
      return { symbol, x: centerX + (symbols.length === 1 ? 0 : Math.cos(angle) * radius), y: centerY + (symbols.length === 1 ? 0 : Math.sin(angle) * radius) };
    });
    const pulse = node.reaction ? 1 + Math.sin(Date.now() / 95) * .75 : 0;
    ctx.strokeStyle = "#6ee7d3aa"; ctx.lineWidth = 2.5 + pulse;
    for (let index = 1; index < points.length; index++) {
      ctx.beginPath(); ctx.moveTo(points[index - 1].x, points[index - 1].y); ctx.lineTo(points[index].x, points[index].y); ctx.stroke();
    }
    if (points.length > 2) { ctx.beginPath(); ctx.moveTo(points.at(-1).x, points.at(-1).y); ctx.lineTo(points[0].x, points[0].y); ctx.stroke(); }
    points.forEach(point => {
      const glow = ctx.createRadialGradient(point.x - 5, point.y - 6, 2, point.x, point.y, 30);
      glow.addColorStop(0, colors[point.symbol] || "#94a3b8"); glow.addColorStop(1, "#102338");
      ctx.shadowColor = colors[point.symbol]; ctx.shadowBlur = 17 + pulse * 5;
      ctx.beginPath(); ctx.arc(point.x, point.y, 23, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = colors[point.symbol]; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#f7fbff"; ctx.font = "700 14px Manrope, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(point.symbol, point.x, point.y);
      ctx.fillStyle = colors[point.symbol];
      for (let dot = 0; dot < valence[point.symbol]; dot++) { const angle = dot * Math.PI * 2 / valence[point.symbol]; ctx.beginPath(); ctx.arc(point.x + Math.cos(angle) * 29, point.y + Math.sin(angle) * 29, 2, 0, Math.PI * 2); ctx.fill(); }
    });
    if (node.reaction) requestAnimationFrame(() => drawMolecule(node.counts));
  }

  function updateReadout() {
    $("formulaReadout").textContent = node.formula || "—";
    $("moleculeCount").textContent = `${node.count} ${node.count === 1 ? "molecule" : "molecules"}`;
  }

  async function startEditor() {
    if (node.editor) return;
    try {
      const [{ EditorView, basicSetup }, { python }, { oneDark }] = await Promise.all([
        import("https://esm.sh/codemirror@6.0.1"),
        import("https://esm.sh/@codemirror/lang-python@6.2.1"),
        import("https://esm.sh/@codemirror/theme-one-dark@6.1.2")
      ]);
      node.editorView = new EditorView({ doc: 'lab.mix("H2O", 1)', extensions: [basicSetup, python(), oneDark, EditorView.updateListener.of(update => { if (update.docChanged) readPython(); })], parent: $("pythonEditor") });
      node.editor = {
        getValue: () => node.editorView.state.doc.toString(),
        setValue: value => node.editorView.dispatch({ changes: { from: 0, to: node.editorView.state.doc.length, insert: value } }),
        insert: value => node.editorView.dispatch(node.editorView.state.replaceSelection(value))
      };
    } catch {
      $("pythonFallback").hidden = false;
      $("pythonEditor").hidden = true;
      node.editor = { getValue: () => $("pythonFallback").value, setValue: value => { $("pythonFallback").value = value; }, insert: value => { const field = $("pythonFallback"); const start = field.selectionStart, end = field.selectionEnd; field.setRangeText(value, start, end, "end"); field.dispatchEvent(new Event("input")); } };
      $("pythonFallback").addEventListener("input", readPython);
    }
    readPython();
  }

  function readPython() {
    if (!node.editor) return;
    const code = node.editor.getValue();
    const match = code.match(/lab\.mix\(\s*["']([A-Z][A-Za-z0-9]*)["']\s*,\s*(\d+)\s*\)/);
    node.formula = match?.[1] || "";
    node.count = match ? Math.min(Number(match[2]), 99) : 0;
    node.counts = node.count ? Object.fromEntries(Object.entries(formulaCounts(node.formula)).map(([symbol, count]) => [symbol, count * node.count])) : {};
    updateReadout(); drawMolecule(node.counts);
  }

  function setupBlockly() {
    if (!window.Blockly) { status("Blockly did not load. Check your connection and refresh the lab."); return; }
    if (!Blockly.Blocks.chem_atom) Blockly.Blocks.chem_atom = {
      init() {
        this.appendDummyInput().appendField("atom").appendField(new Blockly.FieldDropdown(atoms.map(symbol => [symbol, symbol])), "ELEMENT").appendField("×").appendField(new Blockly.FieldNumber(1, 1, 12, 1), "COUNT");
        this.setPreviousStatement(true); this.setNextStatement(true); this.setColour(165); this.setTooltip("Add atoms of one element to the molecular formula.");
      }
    };
    node.workspace = Blockly.inject("blocklyWorkspace", {
      toolbox: { kind: "flyoutToolbox", contents: atoms.map(symbol => ({ kind: "block", type: "chem_atom", fields: { ELEMENT: symbol } })) },
      theme: Blockly.Theme.defineTheme("chemistryDark", { base: Blockly.Themes.Dark, componentStyles: { workspaceBackgroundColour: "#0d1a29", toolboxBackgroundColour: "#102237", toolboxForegroundColour: "#dceeff", flyoutBackgroundColour: "#12263a", flyoutForegroundColour: "#dceeff", flyoutOpacity: 1, scrollbarColour: "#54738a", insertionMarkerColour: "#5eead4", insertionMarkerOpacity: .4, cursorColour: "#5eead4" } }),
      trashcan: true, move: { scrollbars: true, drag: true, wheel: true }, zoom: { controls: true, wheel: true, startScale: .9, maxScale: 1.4, minScale: .55 }
    });
    node.workspace.addChangeListener(readBlockly);
    window.addEventListener("resize", () => Blockly.svgResize(node.workspace));
  }

  function setTries(value) {
    moduleApi().triesLeft = value;
    $("hearts").textContent = "❤️".repeat(value) + "🖤".repeat(3 - value);
    $("hearts").setAttribute("aria-label", `${value} tries left`);
  }

  async function loadLevel(levelConfig) {
    node.levelIndex = Number(levelConfig.id) - 1;
    node.succeeded = false; node.busy = false;
    setTries(3);
    $("levelTitle").textContent = levelConfig.title;
    $("goalText").textContent = levelConfig.instruction;
    $("compoundGoal").textContent = `${levelConfig.compound} · ${levelConfig.formula}`;
    $("instructionText").textContent = levelConfig.mode === "blocks"
      ? `${levelConfig.instruction} Drag atom blocks into the workspace; adjust their counts.`
      : `${levelConfig.instruction} Use the Python synthesis API shown in the snippets.`;
    $("modeBadge").textContent = levelConfig.mode === "blocks" ? "BLOCK PHASE · 1–10" : "PYTHON PHASE · 11–15";
    $("blockMode").hidden = levelConfig.mode !== "blocks";
    $("pythonMode").hidden = levelConfig.mode !== "python";
    $("nextButton").hidden = true;
    $("feedbackText").textContent = "";
    $("feedbackText").classList.remove("success");
    $("chamberStatus").textContent = "🟢 STABLE"; $("chamberStatus").className = "stable";
    $("reactionMessage").textContent = "Awaiting atom sequence";
    if (node.workspace) node.workspace.clear();
    node.counts = {}; node.formula = ""; node.count = 0; updateReadout(); drawMolecule();
    if (levelConfig.mode === "python") { await startEditor(); node.editor?.setValue('lab.mix("H2O", 1)'); readPython(); }
    $("levelPicker").value = String(node.levelIndex);
  }

  function reset() {
    if (node.workspace) node.workspace.clear();
    if (level().mode === "python") node.editor?.setValue("");
    node.succeeded = false; node.busy = false; node.counts = {}; node.formula = ""; node.count = 0;
    setTries(3); updateReadout(); drawMolecule();
    $("chamberStatus").textContent = "🟢 STABLE"; $("chamberStatus").className = "stable";
    $("reactionMessage").textContent = "Workspace reset"; $("feedbackText").textContent = ""; $("nextButton").hidden = true;
  }

  function getEditorCode() {
    if (level().mode === "blocks") return $("pythonPreview").textContent;
    return node.editor?.getValue() || $("pythonFallback").value || "";
  }

  async function synthesize() {
    if (node.busy || node.succeeded) return;
    if (!moduleApi().triesLeft) { $("feedbackText").textContent = "No tries remain. Reset the workspace to try again."; return; }
    if (!node.formula || !node.count) { $("feedbackText").textContent = "Add a molecule to the reactor before synthesis."; return; }
    node.busy = true; $("synthesizeButton").disabled = true;
    node.reaction = true; drawMolecule(node.counts);
    $("chamberStatus").textContent = "⚡ REACTION IN PROGRESS"; $("chamberStatus").className = "working";
    $("reactionMessage").textContent = "Checking the synthesis with the lab server…";
    const payload = moduleApi().getAttemptPayload();
    const attempt = await adapter.submitAttempt(node.levelIndex, "submitted", null, payload);
    node.reaction = false; drawMolecule(node.counts);
    node.busy = false; $("synthesizeButton").disabled = false;
    if (!attempt.ok) { $("chamberStatus").textContent = "🔴 UNSTABLE"; $("reactionMessage").textContent = "Server could not validate this attempt"; return; }
    const result = attempt.data;
    moduleApi().renderFeedback(result);
    if (result?.server_result === "success") {
      node.succeeded = true;
      $("chamberStatus").textContent = "🟢 STABLE"; $("chamberStatus").className = "stable";
      $("feedbackText").textContent = result.feedback || "Synthesis verified by the lab server.";
      $("feedbackText").classList.add("success"); $("reactionMessage").textContent = "Compound verified · server validated";
      $("nextButton").hidden = node.levelIndex >= 14;
      const reward = await adapter.recordAchievement(node.levelIndex);
      if (reward.ok) {
        $("starCount").textContent = await window.StemGameAuth.getTotalStars();
        if (reward.data?.awarded) $("xpCount").textContent = Number($("xpCount").textContent) + (reward.data.xp || 0);
      }
      return;
    }
    setTries(Math.max(0, moduleApi().triesLeft - 1));
    $("chamberStatus").textContent = "🔴 UNSTABLE"; $("chamberStatus").className = "unstable";
    $("feedbackText").textContent = result?.feedback || "The compound did not match this level's target.";
    $("reactionMessage").textContent = "Check your atom counts and formula";
  }

  function setup() {
    const picker = $("levelPicker");
    window.ChemistryLevels.forEach((item, index) => picker.add(new Option(`Level ${index + 1} · ${item.compound}`, index)));
    setupBlockly();
    window.ChemistryLabUI = {
      loadLevel: levelConfig => loadLevel(levelConfig), reset,
      getCanvasCompoundFormula: () => node.formula,
      getSynthesizedMoleculeCount: () => node.count,
      getEditorCode,
      renderFeedback: result => {
        const success = result?.server_result === "success";
        $("chamberStatus").textContent = success ? "🟢 STABLE" : "🔴 UNSTABLE";
        $("reactionMessage").textContent = success ? "Compound verified · server validated" : "Check your atom counts and formula";
        $("feedbackText").textContent = result?.feedback || "The lab server returned no feedback.";
        $("feedbackText").classList.toggle("success", success);
        return result;
      }
    };
    $("resetButton").addEventListener("click", () => moduleApi().reset());
    $("synthesizeButton").addEventListener("click", synthesize);
    $("nextButton").addEventListener("click", async () => {
      const next = Math.min(14, node.levelIndex + 1);
      if (next === node.levelIndex) return;
      if (!adapter.isLevelUnlocked(next)) return;
      await window.ChemistryPlatformModule.loadLevel(next);
    });
    picker.addEventListener("change", async () => {
      const next = Number(picker.value);
      if (next === node.levelIndex) return;
      if (!adapter.isLevelUnlocked(next)) { picker.value = String(node.levelIndex); return; }
      await window.ChemistryPlatformModule.loadLevel(next);
    });
    $("pythonMode").addEventListener("click", event => {
      const button = event.target.closest("[data-snippet]"); if (!button) return;
      const snippets = { mix: 'lab.mix("H2O", 1)', count: "lab.count()", balance: ".balance()" };
      node.editor?.insert(snippets[button.dataset.snippet]);
      readPython();
    });
    window.StemGameAuth.init("chemistry").then(async () => {
      const stars = await window.StemGameAuth.getTotalStars();
      $("starCount").textContent = stars;
      const stats = await window.StemGameAuth.getDashboardStats("chemistry");
      $("xpCount").textContent = stats.xp;
      await window.ChemistryPlatformModule.loadLevel(0);
    });
  }

  window.addEventListener("DOMContentLoaded", setup);
})();
