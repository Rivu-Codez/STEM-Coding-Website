(function () {
  const levels = window.SignalDecrypterLevels;
  const engine = window.SignalDecrypterEngine;
  const adapter = window.StemGameAdapter.create("signal_decrypter");
  let levelIndex = 0;
  let selected = [];
  let completed = false;
  let failures = 0;
  let elapsed = 0;
  let interference = 0;
  let timerId = null;
  let attemptId = 0;
  let programView = "blocks";
  const $ = id => document.getElementById(id);
  const setText = (id, value) => { const node = $(id); if (node) node.textContent = value; };
  const currentLevel = () => levels[levelIndex];
  const operationLabel = operation => operation.label || operation.type;

  function pythonLiteral(value) { return JSON.stringify(String(value)); }

  function operationToPython(operation) {
    switch (operation.type) {
      case "reverse": return ["signal = signal[::-1]"];
      case "remove": return [`signal = signal.replace(${pythonLiteral(operation.chars)}, "")`];
      case "replace": return [`signal = signal.replace(${pythonLiteral(operation.from)}, ${pythonLiteral(operation.to)})`];
      case "lower": return ["signal = signal.lower()"];
      case "upper": return ["signal = signal.upper()"];
      case "strip": return [`signal = signal.strip(${pythonLiteral(operation.chars)})`];
      case "lstrip": return [`signal = signal.lstrip(${pythonLiteral(operation.chars)})`];
      case "slice": return [`signal = signal[${operation.start}:${operation.end}]`];
      case "slice_step": return [`signal = signal[${operation.start}::${operation.step}]`];
      case "index": return [`signal = signal[${operation.index}]`];
      case "find": return [`signal = signal.find(${pythonLiteral(operation.value)})`];
      case "count": return [`signal = signal.count(${pythonLiteral(operation.value)})`];
      case "length": return ["signal = len(signal)"];
      case "swap": return [
        "characters = list(signal)",
        `characters[${operation.first}], characters[${operation.second}] = characters[${operation.second}], characters[${operation.first}]`,
        'signal = "".join(characters)'
      ];
      default: return [`# Unsupported block: ${operationLabel(operation)}`];
    }
  }

  function renderPythonPreview() {
    const preview = $("pythonCodePreview");
    if (!preview || currentLevel().mode === "python") return;
    const lines = [`signal = ${pythonLiteral(currentLevel().signal)}`];
    if (!selected.length) {
      lines.push("# Add a decoder block to continue");
    } else {
      selected.forEach((operation, index) => {
        lines.push(`# Block ${index + 1}: ${operationLabel(operation)}`);
        lines.push(...operationToPython(operation));
      });
      lines.push("print(signal)");
    }
    preview.textContent = lines.join("\n");
  }

  function setProgramView(view) {
    programView = view;
    const blocks = programView === "blocks";
    $("blockBuilderMain").hidden = !blocks;
    $("pythonPreview").hidden = blocks;
    $("showBlocksView").classList.toggle("active", blocks);
    $("showPythonView").classList.toggle("active", !blocks);
    $("showBlocksView").setAttribute("aria-pressed", String(blocks));
    $("showPythonView").setAttribute("aria-pressed", String(!blocks));
  }

  function canonicalOperations(operations) {
    return operations.map(({ type, chars, index, start, end, step, value, from, to, first, second }) =>
      Object.fromEntries(Object.entries({ type, chars, index, start, end, step, value, from, to, first, second })
        .filter(([, operationValue]) => operationValue !== undefined && operationValue !== null)));
  }

  function renderPicker() {
    const picker = $("levelPicker");
    picker.replaceChildren();
    levels.forEach(level => {
      const option = document.createElement("option");
      option.value = level.id;
      option.textContent = `Level ${level.id}: ${level.title}`;
      option.disabled = !adapter.isLevelUnlocked(level.id - 1);
      picker.append(option);
    });
    picker.value = String(currentLevel().id);
  }

  function updateMeters() {
    const level = currentLevel();
    const remaining = Math.max(0, level.timeLimit - elapsed);
    setText("timerValue", `${remaining}s`);
    setText("interferenceValue", `${interference} / ${level.interferenceLimit}`);
    $("interferenceBar").style.width = `${Math.min(100, interference / level.interferenceLimit * 100)}%`;
    $("timerValue").classList.toggle("urgent", remaining <= 15);
    $("interferenceBar").classList.toggle("critical", interference >= level.interferenceLimit - 1);
  }

  function stopTimer() { if (timerId) window.clearInterval(timerId); timerId = null; }

  function failMission(message) {
    if (completed) return;
    stopTimer();
    showFeedback(message);
    $("transmissionStatus").textContent = "SIGNAL LOST";
    $("executeButton").disabled = true;
  }

  function tick() {
    if (completed) return;
    elapsed += 1;
    updateMeters();
    if (elapsed >= currentLevel().timeLimit) {
      interference = currentLevel().interferenceLimit;
      updateMeters();
      failMission("Time expired. Reset the level and try a cleaner decoder pipeline.");
    }
  }

  function startTimer() { stopTimer(); timerId = window.setInterval(tick, 1000); }

  function renderSelected() {
    const target = $("selectedOperations");
    target.replaceChildren();
    setText("pipelineCount", `${selected.length} module${selected.length === 1 ? "" : "s"}`);
    if (!selected.length) {
      const empty = document.createElement("span");
      empty.className = "empty-state";
      empty.textContent = "Drop a module here to start.";
      target.append(empty);
      setText("outputPreview", "Build your pipeline");
      renderPythonPreview();
      return;
    }
    selected.forEach((operation, index) => {
      const item = document.createElement("div");
      item.className = "selected-operation";
      item.draggable = true;
      item.tabIndex = 0;
      item.setAttribute("role", "listitem");
      item.setAttribute("aria-label", `${index + 1}. ${operationLabel(operation)}`);
      item.innerHTML = `<span class="stage-number">${index + 1}</span><span>${operationLabel(operation)}</span>`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.textContent = "×";
      remove.setAttribute("aria-label", `Remove ${operationLabel(operation)}`);
      remove.onclick = () => { selected.splice(index, 1); renderSelected(); };
      item.append(remove);
      item.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", String(index)));
      item.addEventListener("dragover", event => event.preventDefault());
      item.addEventListener("drop", event => {
        event.preventDefault();
        const from = Number(event.dataTransfer.getData("text/plain"));
        if (!Number.isInteger(from) || !selected[from]) return;
        const [moved] = selected.splice(from, 1);
        selected.splice(index, 0, moved);
        renderSelected();
      });
      item.addEventListener("keydown", event => {
        if (event.key === "ArrowUp" && index > 0) { [selected[index - 1], selected[index]] = [selected[index], selected[index - 1]]; renderSelected(); }
        if (event.key === "ArrowDown" && index < selected.length - 1) { [selected[index + 1], selected[index]] = [selected[index], selected[index + 1]]; renderSelected(); }
        if (event.key === "Delete" || event.key === "Backspace") { selected.splice(index, 1); renderSelected(); }
      });
      target.append(item);
    });
    setText("outputPreview", `${selected.length} module${selected.length === 1 ? "" : "s"} ready`);
    renderPythonPreview();
  }

  function renderPalette(level) {
    const palette = $("operationPalette");
    palette.replaceChildren();
    (level.operations || []).forEach(operation => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "operation-button";
      button.draggable = true;
      button.textContent = operationLabel(operation);
      button.setAttribute("aria-label", `Add ${operationLabel(operation)} to pipeline`);
      button.addEventListener("dragstart", event => event.dataTransfer.setData("text/plain", JSON.stringify(operation)));
      button.onclick = () => { selected.push({ ...operation }); renderSelected(); };
      palette.append(button);
    });
  }

  function renderTrace(operations) {
    const list = $("executionTrace");
    list.replaceChildren();
    let value = currentLevel().signal;
    operations.forEach((operation, index) => {
      const before = value;
      value = engine.execute(value, [operation]);
      const item = document.createElement("li");
      item.innerHTML = `<span>Stage ${index + 1}: ${operationLabel(operation)}</span><code>${before} → ${value}</code>`;
      list.append(item);
    });
    $("tracePanel").hidden = false;
  }

  function getOperations() {
    if (currentLevel().mode === "python") return engine.parseCode($("pythonEditor").value);
    return { operations: selected };
  }

  function showFeedback(message, success = false) {
    setText("feedbackText", message);
    $("feedbackText").className = `feedback${success ? " success" : ""}`;
  }

  function revealAnswer(answer) {
    if (!answer) return;
    setText("revealedAnswer", answer);
    $("answerReveal").hidden = false;
  }

  function renderLevel() {
    stopTimer();
    const level = currentLevel();
    selected = [];
    completed = false;
    failures = 0;
    elapsed = 0;
    interference = 0;
    attemptId += 1;
    programView = "blocks";
    $("pythonEditor").value = "";
    $("pythonWorkspace").hidden = level.mode !== "python";
    $("blockWorkspace").hidden = level.mode === "python";
    $("programViewToggle").hidden = level.mode === "python";
    setProgramView("blocks");
    setText("missionTitle", level.title);
    setText("questionText", level.question);
    setText("objectiveText", level.mode === "python" ? "Write Python code that transforms the signal into the answer." : "Use the decoder modules to transform the signal into the answer.");
    setText("signalInput", level.signal);
    setText("missionSignal", level.signal);
    setText("decodedOutput", "LOCKED UNTIL RUN");
    setText("sectionLabel", level.section);
    setText("levelIndicator", `Level ${level.id} of ${levels.length}`);
    setText("progressLabel", `Level ${level.id} of ${levels.length}`);
    setText("hintText", "Hint available: use it when you need a nudge, but it costs time.");
    setText("hintCost", `−${level.hintCost}s`);
    setText("pythonHint", level.pythonHint || "Only the approved string operations are accepted.");
    setText("objectiveTag", `Decode the answer before interference reaches ${level.interferenceLimit}.`);
    setText("feedbackText", "");
    $("feedbackText").className = "feedback";
    $("answerReveal").hidden = true;
    $("revealedAnswer").textContent = "";
    $("nextButton").hidden = true;
    $("tracePanel").hidden = true;
    $("executeButton").disabled = false;
    $("transmissionStatus").textContent = "READY";
    $("progressBar").style.width = `${(level.id / levels.length) * 100}%`;
    $("modeTitle").textContent = level.mode === "python" ? "Python decoder — required" : "Build the decoder pipeline";
    renderPalette(level);
    renderSelected();
    renderPicker();
    updateMeters();
    startTimer();
  }

  function useHint() {
    if (completed) return;
    const level = currentLevel();
    elapsed = Math.min(level.timeLimit, elapsed + level.hintCost);
    setText("hintText", level.hint);
    showFeedback(`Hint used. ${level.hintCost} seconds were added to the clock.`);
    updateMeters();
    if (elapsed >= level.timeLimit) failMission("The hint used the last seconds. Reset the level and try again.");
  }

  async function submit() {
    if (completed) return;
    const level = currentLevel();
    const parsed = getOperations();
    if (parsed.error) return showFeedback(parsed.error);
    if (!parsed.operations.length) return showFeedback(level.mode === "python" ? "Write a Python expression before running the signal." : "Add at least one decoder module before running the signal.");
    let output;
    try { output = engine.execute(level.signal, parsed.operations); } catch { return showFeedback("That decoder cannot process this signal."); }
    renderTrace(parsed.operations);
    const attemptData = level.mode === "python"
      ? { code: $("pythonEditor").value, elapsedMs: elapsed * 1000, interference, attemptId }
      : { operations: canonicalOperations(parsed.operations), elapsedMs: elapsed * 1000, interference, attemptId };
    const result = await adapter.submitAttempt(levelIndex, "submitted", "incorrect_operation", attemptData);
    if (!result.ok) return showFeedback(result.error || "The attempt could not be saved.");
    const data = result.data || {};
    if (data.revealed_answer) revealAnswer(data.revealed_answer);
    if (data.server_result !== "success") {
      failures += 1;
      interference = Math.min(level.interferenceLimit, Math.max(interference + 1, Number(data.interference || 0)));
      updateMeters();
      const stage = data.first_incorrect_stage ? `Stage ${data.first_incorrect_stage}` : "This pipeline";
      showFeedback(`${stage} does not solve the question. Interference increased to ${interference}/${level.interferenceLimit}. ${data.feedback || "Try again."}`);
      if (interference >= level.interferenceLimit && failures >= 5) failMission("Too much interference. The answer is now available; reset the level to try again.");
      return;
    }
    completed = true;
    stopTimer();
    setText("decodedOutput", output);
    $("transmissionStatus").textContent = "DECODED";
    showFeedback(`Correct! You recovered the answer with ${Math.max(0, level.timeLimit - elapsed)} seconds left.`, true);
    const reward = await adapter.recordAchievement(levelIndex);
    if (reward.ok && reward.data) { setText("starCount", reward.data.stars ?? "0"); setText("xpCount", reward.data.xp ?? "0"); }
    if (level.id < levels.length) $("nextButton").hidden = false;
  }

  function showDiagnostic() {
    const level = currentLevel();
    const target = $("diagnosticOptions");
    target.replaceChildren();
    [level.hint, "Try random modules until the answer appears.", "The order of modules does not matter."].sort(() => Math.random() - 0.5).forEach(text => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "diagnostic-option";
      button.textContent = text;
      button.onclick = () => { $("diagnosticFeedback").textContent = text === level.hint ? "Good clue. Return to the workspace and try again." : "Not quite. Inspect the question and signal carefully."; };
      target.append(button);
    });
    $("diagnosticFeedback").textContent = "";
    $("diagnosticOverlay").hidden = false;
  }

  function bind() {
    $("executeButton").onclick = submit;
    $("hintButton").onclick = useHint;
    $("pythonEditor").oninput = () => setText("outputPreview", "Python expression ready to run");
    $("showBlocksView").onclick = () => setProgramView("blocks");
    $("showPythonView").onclick = () => setProgramView("python");
    $("selectedOperations").addEventListener("dragover", event => event.preventDefault());
    $("selectedOperations").addEventListener("drop", event => {
      event.preventDefault();
      try { const operation = JSON.parse(event.dataTransfer.getData("text/plain")); if (operation.type) { selected.push(operation); renderSelected(); } } catch { /* item drops reorder the pipeline */ }
    });
    $("levelPicker").onchange = event => { const next = Number(event.target.value) - 1; if (adapter.isLevelUnlocked(next)) { levelIndex = next; renderLevel(); } else renderPicker(); };
    $("nextButton").onclick = () => { if (levelIndex < levels.length - 1) { levelIndex += 1; renderLevel(); } };
    $("closeDiagnostic").onclick = () => { $("diagnosticOverlay").hidden = true; };
  }

  window.addEventListener("DOMContentLoaded", async () => { bind(); await window.StemGameAuth.init("signal_decrypter", { requireSession: true }); renderLevel(); });
})();
