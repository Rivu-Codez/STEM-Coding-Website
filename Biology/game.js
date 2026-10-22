(function () {
  const engine = window.BiologyGardenEngine;
  const client = () => window.StemGamePlatform.getClient();
  let garden = engine.createGarden();
  let plan = [];
  let dayPlanned = false;
  let renderedStage = null;
  let videoDuration = 0;
  const $ = id => document.getElementById(id);
  const labels = { water: "Water", sunlight: "Daylight exposure", nutrients: "Add fertilizer", observe: "Observe" };
  const stageLabels = { seed: "Seed", germinating: "Germinating seed", sprout: "Sprout", "first-leaves": "First leaves", leafy: "Leafy plant", branching: "Branching stem", bud: "Flower bud", flower: "Open flower", "fruit-set": "Fruit set", "ripe-harvest": "Ripe harvest" };
  const stageDescriptions = { seed: "The seed is absorbing water and preparing to germinate.", germinating: "The seed coat is softening and the first root is emerging.", sprout: "The root and shoot are finding their direction.", "first-leaves": "The first leaves unfold and begin looking for light.", leafy: "Leaves are expanding and chlorophyll is catching light.", branching: "The stem branches to support more leaves and future flowers.", bud: "The plant is investing energy in a flower bud.", flower: "The flower is open and ready for pollination.", "fruit-set": "A pollinated flower is becoming a small green tomato.", "ripe-harvest": "The tomato fruit is developing and can be harvested." };
  function syncGrowthVideo(playSegment) {
    const video = $("plantGrowthVideo");
    if (!video || !videoDuration) return;
    const stageIndex = engine.stages.indexOf(garden.stage);
    const segmentLength = videoDuration / engine.stages.length;
    const start = Math.min(videoDuration - 0.05, stageIndex * segmentLength);
    const end = stageIndex === engine.stages.length - 1 ? videoDuration : (stageIndex + 1) * segmentLength;
    video.pause(); video.currentTime = start;
    video.ontimeupdate = () => { if (video.currentTime >= end - 0.05) { video.pause(); video.currentTime = Math.max(start, end - 0.05); } };
    if (playSegment) video.play().catch(() => { /* A paused milestone frame is still useful when autoplay is blocked. */ });
  }
  function enableGrowthVideo() {
    const video = $("plantGrowthVideo");
    if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
    videoDuration = video.duration;
    $("plantScene").classList.add("video-ready");
    syncGrowthVideo(false);
  }
  function setText(id, value) { $(id).textContent = value; }
  function render() {
    const stageIndex = engine.stages.indexOf(garden.stage);
    setText("phaseLabel", garden.phase === "day" ? "DAYLIGHT" : "NIGHTFALL");
    setText("dayValue", garden.day); setText("plantTitle", stageLabels[garden.stage]);
    setText("dayProgress", ""); $("dayProgress").style.width = `${Math.min(100, garden.day / 30 * 100)}%`;
    $("dayCard").classList.toggle("night-mode", garden.phase === "night");
    setText("healthValue", `${garden.health}% healthy`); setText("observationText", garden.lastObservation);
    ["moisture", "nutrients"].forEach(key => { setText(`${key}Value`, `${garden[key]}%`); $(`${key}Bar`).style.width = `${garden[key]}%`; });
    const videoReady = $("plantScene").classList.contains("video-ready");
    $("plantScene").className = `plant-scene stage-${garden.stage}`;
    if (videoReady) $("plantScene").classList.add("video-ready");
    $("plantScene").classList.toggle("night-scene", garden.phase === "night");
    const stageChanged = renderedStage !== null && renderedStage !== garden.stage;
    renderedStage = garden.stage;
    syncGrowthVideo(stageChanged);
    setText("growthDayLabel", `Day ${garden.day}: ${stageLabels[garden.stage]}`);
    setText("growthDayText", stageDescriptions[garden.stage]);
    $("photosynthesisPanel").hidden = stageIndex < 2;
    $("actionCount").textContent = `${plan.length} / 3 actions`;
    const queue = $("planQueue"); queue.replaceChildren();
    if (!plan.length) { const empty = document.createElement("span"); empty.textContent = "Your plan is empty."; queue.append(empty); }
    plan.forEach((action, index) => { const item = document.createElement("div"); item.className = "plan-item"; item.innerHTML = `<span>${index + 1}. ${labels[action]}</span>`; const remove = document.createElement("button"); remove.textContent = "×"; remove.setAttribute("aria-label", `Remove ${labels[action]}`); remove.onclick = () => { plan.splice(index, 1); render(); }; item.append(remove); queue.append(item); });
    const predicted = plan.length ? engine.predict(garden, plan) : garden;
    setText("predictionText", plan.length ? `Expected moisture ${predicted.moisture}% and nutrients ${predicted.nutrients}%. Daylight is automatic.` : "Choose an action to see its expected effect.");
    $("advancePhase").disabled = garden.phase === "day" && !dayPlanned;
    const milestoneBox = $("milestones"); milestoneBox.replaceChildren(); engine.stages.forEach((stage, index) => { const item = document.createElement("div"); item.className = `milestone ${index < stageIndex ? "done" : ""} ${index === stageIndex ? "current" : ""}`; item.textContent = stageLabels[stage]; milestoneBox.append(item); });
  }
  async function load() {
    const result = await client().rpc("load_biology_garden");
    if (result.error) return setText("feedbackText", "Your garden could not be loaded. Refresh and try again.");
    garden = result.data?.garden || engine.createGarden(); render();
  }
  async function runPlan() {
    if (!plan.length) return setText("feedbackText", "Choose at least one care action first.");
    const result = await client().rpc("submit_biology_plan", { p_actions: plan, p_client_day: garden.day, p_client_phase: garden.phase });
    if (result.error) return setText("feedbackText", result.error.message || "The plan could not be saved.");
    garden = result.data.garden; plan = []; dayPlanned = true; render(); setText("feedbackText", result.data.feedback); $("feedbackText").className = "feedback success";
  }
  async function advancePhase() {
    if (garden.phase === "day" && !dayPlanned) return setText("feedbackText", "Plan at least one care action before advancing the day.");
    const result = await client().rpc("advance_biology_phase", { p_client_day: garden.day, p_client_phase: garden.phase });
    if (result.error) return setText("feedbackText", result.error.message || "Time could not advance.");
    garden = result.data.garden; dayPlanned = false; render(); setText("feedbackText", result.data.feedback); $("feedbackText").className = "feedback success";
  }
  async function resetGarden() {
    if (!window.confirm("Reset this garden to the beginning of Day 1?")) return;
    const result = await client().rpc("reset_biology_garden");
    if (result.error) return setText("feedbackText", result.error.message || "The garden could not be reset.");
    garden = result.data.garden; plan = []; dayPlanned = false; render(); setText("feedbackText", "Your garden is ready to begin again on Day 1."); $("feedbackText").className = "feedback success";
  }
  function bind() {
    document.querySelectorAll("[data-action]").forEach(button => button.onclick = () => { if (plan.length < 3) { plan.push(button.dataset.action); render(); } });
    $("runPlan").onclick = runPlan; $("advancePhase").onclick = advancePhase; $("resetGarden").onclick = resetGarden;
    const video = $("plantGrowthVideo");
    if (video) {
      video.addEventListener("loadedmetadata", enableGrowthVideo);
      video.addEventListener("loadeddata", enableGrowthVideo);
      video.addEventListener("canplay", enableGrowthVideo);
      video.addEventListener("error", () => $("plantScene").classList.remove("video-ready"));
      video.load();
      if (video.readyState >= 1) enableGrowthVideo();
    }
  }
  window.addEventListener("DOMContentLoaded", async () => { bind(); await window.StemGameAuth.init("biology", { requireSession: true }); await load(); });
})();
