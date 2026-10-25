(function () {
  const gameId = "signal_decrypter";
  const adapter = window.StemGameAdapter.create(gameId);
  const $ = id => document.getElementById(id);
  const originalLoad = window.load;

  function updateMap() {
    const map = $("map");
    if (!map) return;
    map.replaceChildren();
    L.forEach((level, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `${index === cur ? "cur " : ""}${stars[index] ? "done" : ""}`.trim();
      button.textContent = String(index + 1);
      button.setAttribute("aria-label", `Level ${index + 1}${stars[index] ? `, ${stars[index]} stars` : ""}`);
      button.disabled = !adapter.isLevelUnlocked(index);
      button.onclick = () => window.load(index);
      map.append(button);
    });
    $("total").textContent = `★ ${stars.reduce((sum, value) => sum + value, 0)} / 45`;
  }

  window.save = function () {};
  window.drawMap = updateMap;
  window.load = function (index) {
    if (!adapter.isLevelUnlocked(index)) {
      msg("Complete the previous room to unlock this one.", "h");
      return;
    }
    originalLoad(index);
    $("run").disabled = false;
    $("next").hidden = true;
    updateMap();
  };

  $("run").onclick = async function () {
    if (done) return;
    const level = L[cur];
    if (vals.indexOf("") >= 0 || (ta && !ta.value.trim())) {
      msg("Fill in every gap or write some code first.", "bad");
      return;
    }

    const code = getCode(level);
    if (code.length > 800) {
      msg("Keep your solution under 800 characters, then try again.", "bad");
      return;
    }
    const execution = run(code);
    const output = $("out");
    output.className = execution.err ? "e" : "";
    output.textContent = execution.err || execution.out.join("\n");

    let issue = check(level, code, execution);
    const canonical = value => value.replace(/\r\n?/g, "\n").trim();
    if (!issue && canonical(code) !== canonical(level.sol)) {
      issue = "Your code runs, but the Academy needs the lesson's expected Python structure to save this lock. Use the hint to review the model solution.";
    }

    const result = await adapter.submitAttempt(cur, "submitted", "incorrect_operation", {
      code,
      elapsedMs: 0,
      interference: 0
    });
    if (!result.ok) {
      msg(result.error || "The attempt could not be saved. Check your connection and retry.", "bad");
      return;
    }
    if (result.data?.server_result !== "success") {
      msg(issue || result.data?.feedback || "The lock stays closed. Review the clue and try again.", "bad");
      pop($("code"), "shake");
      return;
    }

    done = true;
    $("run").disabled = true;
    $("door").textContent = "Door: open";
    $("scene").classList.add("open");
    burst(cur === 14 ? 60 : 28);
    $("out").textContent = execution.out.join("\n");
    $("next").hidden = cur === L.length - 1;
    updateMap();
    const reward = await adapter.recordAchievement(cur);
    if (reward.ok && reward.data) stars[cur] = Number(reward.data.stars) || 0;
    updateMap();
    msg((cur === 14
      ? `The exit gate swings open. You escaped the Locked Academy! Total: ${stars.reduce((sum, value) => sum + value, 0)} / 45 stars.`
      : `Click! The lock opens. ${"★".repeat(stars[cur] || 1)}`) +
      `\n\nIn Python, your solution looks like this:\n${code}`, "ok");
  };

  $("next").onclick = () => {
    if (cur < L.length - 1) window.load(cur + 1);
  };

  async function initialize() {
    await window.StemGameAuth.init(gameId, { requireSession: true });
    if (!window.StemGamePlatform.getSession()) return;
    const progress = await window.StemGameAuth.getGameProgress(gameId);
    if (!progress.ok) return;
    stars = Array(L.length).fill(0);
    (progress.achievements || []).forEach(item => {
      const index = Number(item.level_number) - 1;
      if (index >= 0 && index < stars.length) stars[index] = Number(item.stars) || 0;
    });
    updateMap();
    window.load(Math.min(cur, L.length - 1));
  }

  initialize().catch(() => window.StemGamePlatform.showStatus("The Academy could not load your saved progress. Refresh and try again."));
})();
