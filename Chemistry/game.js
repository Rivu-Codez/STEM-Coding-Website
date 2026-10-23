(function () {
  const atoms = ["H", "O", "C", "N", "Na", "Cl", "Fe"];
  const valence = { H: 1, O: 2, C: 4, N: 3, Na: 1, Cl: 1, Fe: 3 };
  const colors = { H: "#e6f4ff", O: "#fb7185", C: "#cbd5e1", N: "#818cf8", Na: "#fbbf24", Cl: "#4ade80", Fe: "#fb923c" };
  const $ = id => document.getElementById(id);
  const moduleApi = () => window.ChemistryGameModule;
  const adapter = window.StemGameAdapter.create("chemistry");
  const node = { workspace: null, editor: null, editorView: null, levelIndex: 0, counts: {}, formula: "", count: 0, connected: false, succeeded: false, busy: false, canvasFrame: 0, atomSequence: [], structure: null, animation: null, animationTimer: null };

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

  function getAtomStacks() {
    const roots = node.workspace?.getTopBlocks(true) || [];
    const stacks = [];
    const visited = new Set();
    roots.forEach(root => {
      const stack = [];
      let block = root;
      while (block && !visited.has(block.id)) {
        visited.add(block.id);
        if (block.type === "chem_atom") stack.push(block);
        block = block.getInputTargetBlock("NEXT");
      }
      if (stack.length) stacks.push(stack);
    });
    return stacks;
  }

  function readBlockly() {
    const stacks = getAtomStacks();
    const blocks = stacks.flat();
    const counts = {};
    const sequence = [];
    blocks.forEach(block => {
      const symbol = block.getFieldValue("ELEMENT");
      const amount = Number(block.getFieldValue("COUNT") || 1);
      counts[symbol] = (counts[symbol] || 0) + amount;
      for (let index = 0; index < amount; index++) sequence.push(symbol);
    });
    node.counts = counts;
    node.atomSequence = sequence;
    node.connected = stacks.length === 1 && blocks.length > 0;
    node.formula = formulaFromCounts(counts);
    node.count = node.formula && node.connected ? 1 : 0;
    updateReadout();
    updatePreview(stacks);
    scheduleStructure();
  }

  function updatePreview(stacks = []) {
    const lines = ["# Molecule assembly from atom blocks"];
    if (node.atomSequence.length) lines.push(`# Connected chain: ${node.atomSequence.join(" → ")}`);
    lines.push("atoms = {}");
    stacks.forEach((stack, stackIndex) => {
      stack.forEach(block => {
        const symbol = block.getFieldValue("ELEMENT");
        lines.push(`atoms["${symbol}"] = atoms.get("${symbol}", 0) + ${Number(block.getFieldValue("COUNT") || 1)}`);
      });
      if (stackIndex < stacks.length - 1) lines.push("");
    });
    if (!stacks.length) lines.push("# Connect atom blocks into one chain to build a molecule");
    else lines.push("lab.mix(atoms)");
    $("pythonPreview").textContent = lines.join("\n");
  }

  function moleculeModel(counts, formula) {
    const same = expected => Object.keys(counts).length === Object.keys(expected).length && Object.entries(expected).every(([symbol, amount]) => counts[symbol] === amount);
    const models = {
      H2O: [{ atoms: ["H", "O", "H"], edges: [[0, 1, 1], [1, 2, 1]], points: [[-.75, .38], [0, -.2], [.75, .38]] }],
      CO2: [{ atoms: ["O", "C", "O"], edges: [[0, 1, 2], [1, 2, 2]], points: [[-.78, 0], [0, 0], [.78, 0]] }],
      NaCl: [{ atoms: ["Na", "Cl"], edges: [[0, 1, 0]], points: [[-.55, 0], [.55, 0]] }],
      CH4: [{ atoms: ["H", "C", "H", "H", "H"], edges: [[0, 1, 1], [1, 2, 1], [1, 3, 1], [1, 4, 1]], points: [[0, -.78], [0, 0], [-.72, .48], [.72, .48], [0, .78]] }],
      NH3: [{ atoms: ["H", "N", "H", "H"], edges: [[0, 1, 1], [1, 2, 1], [1, 3, 1]], points: [[-.7, .45], [0, -.05], [.7, .45], [0, .78]] }],
      O2: [{ atoms: ["O", "O"], edges: [[0, 1, 2]], points: [[-.48, 0], [.48, 0]] }],
      HCl: [{ atoms: ["H", "Cl"], edges: [[0, 1, 1]], points: [[-.45, 0], [.45, 0]] }],
      H2O2: [{ atoms: ["H", "O", "O", "H"], edges: [[0, 1, 1], [1, 2, 1], [2, 3, 1]], points: [[-.78, 0], [-.26, 0], [.26, 0], [.78, 0]] }],
      Fe2O3: [{ atoms: ["Fe", "O", "Fe", "O", "O"], edges: [[0, 1, 1], [0, 3, 1], [0, 4, 1], [2, 1, 1], [2, 3, 1], [2, 4, 1]], points: [[-.6, -.25], [0, -.58], [.6, -.25], [-.35, .45], [.35, .45]] }]
    };
    if (formula === "C6H12O6" && same({ C: 6, H: 12, O: 6 })) {
      const points = [];
      const edges = [];
      for (let index = 0; index < 5; index++) {
        const angle = -Math.PI / 2 + index * Math.PI * 2 / 6;
        points.push([Math.cos(angle) * .48, Math.sin(angle) * .48]);
      }
      points.push([-.82, .45]); // terminal carbon
      points.push([Math.cos(Math.PI * 7 / 6) * .48, Math.sin(Math.PI * 7 / 6) * .48]); // ring oxygen
      [[0, 1], [1, 2], [2, 3], [3, 4], [4, 6], [6, 0]].forEach(([from, to]) => edges.push([from, to, 1]));
      edges.push([4, 5, 1]);
      const hydroxyCarbon = [0, 1, 2, 3, 5];
      hydroxyCarbon.forEach((carbon, index) => {
        const oxygenIndex = 7 + index;
        const carbonPoint = points[carbon];
        const length = Math.hypot(carbonPoint[0], carbonPoint[1]) || 1;
        points.push([carbonPoint[0] + carbonPoint[0] / length * .42, carbonPoint[1] + carbonPoint[1] / length * .42]);
        edges.push([carbon, oxygenIndex, 1]);
      });
      const carbonHydrogens = [0, 1, 2, 3, 4, 5, 5];
      carbonHydrogens.forEach((carbon, index) => {
        const point = points[carbon];
        const angle = index % 2 ? Math.PI / 2 : -Math.PI / 2;
        points.push([point[0] + Math.cos(angle) * .4, point[1] + Math.sin(angle) * .4]);
        edges.push([carbon, 12 + index, 1]);
      });
      for (let index = 0; index < 5; index++) {
        const oxygenPoint = points[7 + index];
        const carbonPoint = points[hydroxyCarbon[index]];
        const dx = oxygenPoint[0] - carbonPoint[0], dy = oxygenPoint[1] - carbonPoint[1];
        const length = Math.hypot(dx, dy) || 1;
        points.push([oxygenPoint[0] + dx / length * .32, oxygenPoint[1] + dy / length * .32]);
        edges.push([7 + index, 19 + index, 1]);
      }
      return { atoms: [...Array(6).fill("C"), ...Array(6).fill("O"), ...Array(12).fill("H")], edges, points };
    }
    const template = models[formula]?.find(() => {
      const expected = {};
      (formula.match(/[A-Z][a-z]?\d*/g) || []).forEach(part => {
        const [, symbol, amount] = part.match(/^([A-Z][a-z]?)(\d*)$/);
        expected[symbol] = Number(amount || 1);
      });
      return same(expected);
    });
    if (template) return template;

    const symbols = atoms.flatMap(symbol => Array.from({ length: Math.min(counts[symbol] || 0, 24) }, () => symbol));
    return { atoms: symbols, edges: [], points: symbols.map((_, index) => {
      const ratio = symbols.length < 2 ? 0 : index / (symbols.length - 1);
      return [-.7 + ratio * 1.4, 0];
    }) };
  }

  function scheduleStructure() {
    clearTimeout(node.animationTimer);
    const complete = node.connected && node.formula === level().formula;
    node.structure = complete ? moleculeModel(node.counts, node.formula) : moleculeModel(node.counts, "");
    if (!node.structure.atoms.length) { node.animation = null; drawMolecule(); return; }
    node.animationTimer = setTimeout(() => {
      node.animation = { start: performance.now(), duration: 1450 };
      drawMolecule();
    }, 130);
  }

  function drawMolecule() {
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
    const structure = node.structure || { atoms: [], edges: [], points: [] };
    const symbols = structure.atoms;
    $("canvasEmpty").hidden = symbols.length > 0;
    if (!symbols.length) return;
    const centerX = width / 2, centerY = height / 2;
    const radius = Math.max(34, Math.min(width * .38, height * .43));
    const elapsed = node.animation ? Math.min(1, (performance.now() - node.animation.start) / node.animation.duration) : 1;
    const progress = elapsed * elapsed * (3 - 2 * elapsed);
    const points = symbols.map((symbol, index) => {
      const [targetX, targetY] = structure.points[index] || [0, 0];
      const sourceX = symbols.length < 2 ? 0 : -.64 + index * 1.28 / (symbols.length - 1);
      const x = centerX + (sourceX + (targetX - sourceX) * progress) * radius;
      const y = centerY + (0 + (targetY - 0) * progress) * radius;
      return { symbol, x, y };
    });
    const atomSize = symbols.length > 12 ? 13 : 23;
    const atomFont = symbols.length > 12 ? 9 : 14;
    const pulse = node.reaction ? 1 + Math.sin(Date.now() / 95) * .75 : 0;
    structure.edges.forEach(([from, to, order]) => {
      const first = points[from], second = points[to];
      if (!first || !second || progress < .02) return;
      const bondProgress = Math.min(1, Math.max(0, (progress - .28) / .72));
      const x2 = first.x + (second.x - first.x) * bondProgress;
      const y2 = first.y + (second.y - first.y) * bondProgress;
      const dx = x2 - first.x, dy = y2 - first.y, length = Math.hypot(dx, dy) || 1;
      const offsetX = -dy / length * 3.2, offsetY = dx / length * 3.2;
      ctx.save(); ctx.globalAlpha = bondProgress; ctx.strokeStyle = order === 0 ? "#fbbf24" : "#6ee7d3";
      ctx.lineWidth = order === 0 ? 2 : 2.5 + pulse;
      if (order === 0) ctx.setLineDash([5, 5]);
      const offsets = order > 1 ? Array.from({ length: order }, (_, index) => (index - (order - 1) / 2) * 6) : [0];
      offsets.forEach(offset => {
        ctx.beginPath(); ctx.moveTo(first.x + offsetX * offset / 3.2, first.y + offsetY * offset / 3.2);
        ctx.lineTo(x2 + offsetX * offset / 3.2, y2 + offsetY * offset / 3.2); ctx.stroke();
      });
      ctx.restore();
    });
    points.forEach(point => {
      const glow = ctx.createRadialGradient(point.x - 5, point.y - 6, 2, point.x, point.y, 30);
      glow.addColorStop(0, colors[point.symbol] || "#94a3b8"); glow.addColorStop(1, "#102338");
      ctx.shadowColor = colors[point.symbol]; ctx.shadowBlur = 17 + pulse * 5;
      ctx.beginPath(); ctx.arc(point.x, point.y, atomSize, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
      ctx.shadowBlur = 0; ctx.strokeStyle = colors[point.symbol]; ctx.lineWidth = 1.5; ctx.stroke();
      ctx.fillStyle = "#f7fbff"; ctx.font = `700 ${atomFont}px Manrope, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(point.symbol, point.x, point.y);
      ctx.fillStyle = colors[point.symbol];
      for (let dot = 0; dot < valence[point.symbol]; dot++) { const angle = dot * Math.PI * 2 / valence[point.symbol]; ctx.beginPath(); ctx.arc(point.x + Math.cos(angle) * (atomSize + 6), point.y + Math.sin(angle) * (atomSize + 6), 1.5, 0, Math.PI * 2); ctx.fill(); }
    });
    if (elapsed < 1 || node.reaction) requestAnimationFrame(drawMolecule);
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
    node.connected = Boolean(match);
    node.counts = node.count ? Object.fromEntries(Object.entries(formulaCounts(node.formula)).map(([symbol, count]) => [symbol, count * node.count])) : {};
    updateReadout(); scheduleStructure();
  }

  function setupBlockly() {
    if (!window.Blockly) { status("Blockly did not load. Check your connection and refresh the lab."); return; }
    if (!Blockly.Blocks.chem_atom) Blockly.Blocks.chem_atom = {
      init() {
        this.appendDummyInput().appendField("atom").appendField(new Blockly.FieldDropdown(atoms.map(symbol => [symbol, symbol])), "ELEMENT").appendField("×").appendField(new Blockly.FieldNumber(1, 1, 12, 1), "COUNT");
        this.appendValueInput("NEXT").setCheck("Atom").appendField("→");
        this.setInputsInline(true); this.setOutput(true, "Atom"); this.setColour(165);
        this.setTooltip("Connect the next atom on the right. For water, assemble H → O → H.");
      }
    };
    node.workspace = Blockly.inject("blocklyWorkspace", {
      toolbox: { kind: "flyoutToolbox", contents: atoms.map(symbol => ({ kind: "block", type: "chem_atom", fields: { ELEMENT: symbol } })) },
      horizontalLayout: true, toolboxPosition: "start",
      theme: Blockly.Theme.defineTheme("chemistryDark", { base: Blockly.Themes.Dark, componentStyles: { workspaceBackgroundColour: "#0d1a29", toolboxBackgroundColour: "#102237", toolboxForegroundColour: "#dceeff", flyoutBackgroundColour: "#12263a", flyoutForegroundColour: "#dceeff", flyoutOpacity: 1, scrollbarColour: "#54738a", insertionMarkerColour: "#5eead4", insertionMarkerOpacity: .4, cursorColour: "#5eead4" } }),
      trashcan: true, move: { scrollbars: true, drag: true, wheel: true }, zoom: { controls: false, wheel: true, startScale: .9, maxScale: 1.25, minScale: .65 }
    });
    node.workspace.addChangeListener(readBlockly);
    window.addEventListener("resize", () => Blockly.svgResize(node.workspace));
    new ResizeObserver(() => Blockly.svgResize(node.workspace)).observe($("blocklyWorkspace"));
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
      ? `${levelConfig.instruction} Connect atom blocks from left to right. For water, build H → O → H.`
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
    node.counts = {}; node.formula = ""; node.count = 0; node.connected = false; node.structure = { atoms: [], edges: [], points: [] }; node.animation = null; clearTimeout(node.animationTimer); updateReadout(); drawMolecule();
    if (levelConfig.mode === "python") { await startEditor(); node.editor?.setValue('lab.mix("H2O", 1)'); readPython(); }
    $("levelPicker").value = String(node.levelIndex);
  }

  function reset() {
    if (node.workspace) node.workspace.clear();
    if (level().mode === "python") node.editor?.setValue("");
    node.succeeded = false; node.busy = false; node.counts = {}; node.formula = ""; node.count = 0; node.connected = false; node.structure = { atoms: [], edges: [], points: [] }; node.animation = null; clearTimeout(node.animationTimer);
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
