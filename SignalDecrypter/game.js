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
  const $ = id => document.getElementById(id);
  const setText = (id, value) => { const node = $(id); if (node) node.textContent = value; };
  const currentLevel = () => levels[levelIndex];
  const operationLabel = operation => operation.label || operation.type;

  function canonicalOperations(operations) {
    return operations.map(({ type, chars, index, start, end, step, value, from, to }) =>
      Object.fromEntries(Object.entries({ type, chars, index, start, end, step, value, from, to })
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

  function startTimer() {
    stopTimer();
    timerId = window.setInterval(tick, 1000);
  }

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
      return;
    }
    selected.forEach((operation, index) => {
      const item = document.createElement("div");
      item.className = "selected-operation";
      item.draggable = true;
      item.dataset.index = String(index);
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
        const [moved] = selected.splice(from, 1);
        selected.splice(index, 0, moved);
        renderSelected();
      });
      item.addEventListener("keydown", event => {
        if (event.key === "ArrowUp" && index > 0) { [selected[index - 1], selected[index]] = [selected[index], selected[index - 1]]; renderSelected(); $("selectedOperations").children[index - 1]?.focus(); }
        if (event.key === "ArrowDown" && index < selected.length - 1) { [selected[index + 1], selected[index]] = [selected[index], selected[index + 1]]; renderSelected(); $("selectedOperations").children[index + 1]?.focus(); }
        if (event.key === "Delete" || event.key === "Backspace") { selected.splice(index, 1); renderSelected(); }
      });
      target.append(item);
    });
    setText("outputPreview", `${selected.length} module${selected.length === 1 ? "" : "s"} ready`);
  }

  function renderPalette(level) {
    const palette = $("operationPalette");
    palette.replaceChildren();
    level.operations.forEach(operation => {
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
    const level = currentLevel();
    if (level.mode === "python") return engine.parseCode($("pythonEditor").value);
    return { operations: selected };
  }

  function showFeedback(message, success = false) {
    setText("feedbackText", message);
    $("feedbackText").className = `feedback${success ? " success" : ""}`;
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
    $("pythonEditor").value = "";
    $("pythonWorkspace").hidden = level.mode !== "python";
    $("blockWorkspace").hidden = level.mode === "python";
    setText("missionTitle", level.title);
    setText("objectiveText", level.objective);
    setText("signalInput", level.signal);
    setText("missionSignal", level.signal);
    setText("decodedOutput", "LOCKED UNTIL RUN");
    setText("sectionLabel", level.section);
    setText("levelIndicator", `Level ${level.id} of ${levels.length}`);
    setText("progressLabel", `Level ${level.id} of ${levels.length}`);
    setText("hintText", "Hint available: use it when you need a nudge, but it costs time.");
    setText("hintCost", `−${level.hintCost}s`);
    setText("objectiveTag", `Recover the transmission before interference reaches ${level.interferenceLimit}.`);
    setText("feedbackText", "");
    $("feedbackText").className = "feedback";
    $("nextButton").hidden = true;
    $("tracePanel").hidden = true;
    $("executeButton").disabled = false;
    $("transmissionStatus").textContent = "READY";
    $("progressBar").style.width = `${(level.id / levels.length) * 100}%`;
    $("modeTitle").textContent = level.mode === "python" ? "Write the expression" : "Build the decoder pipeline";
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
    if (!parsed.operations.length) return showFeedback("Add at least one decoder module before running the signal.");
    let output;
    try { output = engine.execute(level.signal, parsed.operations); } catch { return showFeedback("That decoder cannot process this signal."); }
    renderTrace(parsed.operations);
    const expected = level.operations.filter(operation => operation.role === "correct");
    const isCorrect = JSON.stringify(canonicalOperations(parsed.operations)) === JSON.stringify(canonicalOperations(expected.length ? expected : level.operations));
    if (!isCorrect) {
      failures += 1;
      interference += 1;
      updateMeters();
      const firstWrong = parsed.operations.findIndex((operation, index) => JSON.stringify(canonicalOperations([operation])) !== JSON.stringify(canonicalOperations([expected[index]])));
      const stage = firstWrong < 0 ? parsed.operations.length : firstWrong + 1;
      const result = await adapter.submitAttempt(levelIndex, "miss", "incorrect_operation", { operations: canonicalOperations(parsed.operations), elapsedMs: elapsed * 1000, interference, attemptId });
      if (!result.ok) return showFeedback(result.error || "The attempt could not be saved.");
      showFeedback(`Stage ${stage} is not the decoder this mission needs. Interference increased to ${interference}/${level.interferenceLimit}.`);
      if (interference >= level.interferenceLimit) failMission("Too much interference. Reset the level and rebuild the pipeline.");
      else if (failures >= 3) showDiagnostic();
      return;
    }
    const result = await adapter.submitAttempt(levelIndex, "success", null, level.mode === "python"
      ? { code: $("pythonEditor").value, elapsedMs: elapsed * 1000, interference, attemptId }
      : { operations: canonicalOperations(parsed.operations), elapsedMs: elapsed * 1000, interference, attemptId });
    if (!result.ok) return showFeedback(result.error || "The attempt could not be saved.");
    if (result.data?.server_result && result.data.server_result !== "success") return showFeedback(result.data.feedback || "The server rejected this decryption.");
    completed = true;
    stopTimer();
    setText("decodedOutput", output);
    $("transmissionStatus").textContent = "DECODED";
    showFeedback(`Correct! You recovered the signal with ${Math.max(0, level.timeLimit - elapsed)} seconds left.`, true);
    const reward = await adapter.recordAchievement(levelIndex);
    if (reward.ok && reward.data) { setText("starCount", reward.data.stars ?? "0"); setText("xpCount", reward.data.xp ?? "0"); }
    if (level.id < levels.length) $("nextButton").hidden = false;
  }

  function showDiagnostic() {
    const level = currentLevel();
    const target = $("diagnosticOptions");
    target.replaceChildren();
    [{ text: level.hint, correct: true }, { text: "Try random modules until the output looks right.", correct: false }, { text: "The order of modules does not matter.", correct: false }].sort(() => Math.random() - 0.5).forEach(option => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "diagnostic-option";
      button.textContent = option.text;
      button.onclick = () => { $("diagnosticFeedback").textContent = option.correct ? "Good recovery plan. Return to the workspace and try again." : "Not quite. Inspect the mission objective and use the hint."; };
      target.append(button);
    });
    $("diagnosticFeedback").textContent = "";
    $("diagnosticOverlay").hidden = false;
  }

  function bind() {
    $("executeButton").onclick = submit;
    $("hintButton").onclick = useHint;
    $("pythonEditor").oninput = () => setText("outputPreview", "Expression ready to run");
    $("selectedOperations").addEventListener("dragover", event => event.preventDefault());
    $("selectedOperations").addEventListener("drop", event => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("text/plain");
      try { const operation = JSON.parse(raw); if (operation.type) { selected.push(operation); renderSelected(); } } catch { /* reordering is handled by the item drop target */ }
    });
    $("levelPicker").onchange = event => { const next = Number(event.target.value) - 1; if (adapter.isLevelUnlocked(next)) { levelIndex = next; renderLevel(); } else renderPicker(); };
    $("nextButton").onclick = () => { if (levelIndex < levels.length - 1) { levelIndex += 1; renderLevel(); } };
    $("closeDiagnostic").onclick = () => { $("diagnosticOverlay").hidden = true; };
  }

  window.addEventListener("DOMContentLoaded", async () => { bind(); await window.StemGameAuth.init("signal_decrypter", { requireSession: true }); renderLevel(); });
})();
