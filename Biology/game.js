(function () {
  const engine = window.BiologyGardenEngine;
  const client = () => window.StemGamePlatform.getClient();
  let garden = engine.createGarden();
  let plan = [];
  const $ = id => document.getElementById(id);
  const labels = { water: "Water", sunlight: "Give sunlight", nutrients: "Add compost", observe: "Observe" };
  const stageLabels = { seed: "Seed", sprout: "Sprout", leafy: "Leafy plant", bud: "Flower bud", flower: "Flower", fruit: "Fruit and harvest" };
  const stageDescriptions = { seed: "The seed is absorbing water and preparing to germinate.", sprout: "The root and shoot are finding their direction.", leafy: "Leaves are expanding and chlorophyll is catching light.", bud: "The plant is investing energy in a flower bud.", flower: "The flower is open and ready for pollination.", fruit: "The tomato fruit is developing and can be harvested." };
  function setText(id, value) { $(id).textContent = value; }
  function render() {
    const stageIndex = engine.stages.indexOf(garden.stage);
    setText("phaseLabel", garden.phase === "day" ? "DAYLIGHT" : "NIGHTFALL");
    setText("dayValue", garden.day); setText("plantTitle", stageLabels[garden.stage]);
    setText("dayProgress", ""); $("dayProgress").style.width = `${Math.min(100, garden.day / 30 * 100)}%`;
    $("dayCard").classList.toggle("night-mode", garden.phase === "night");
    setText("healthValue", `${garden.health}% healthy`); setText("observationText", garden.lastObservation);
    ["moisture", "light", "nutrients"].forEach(key => { setText(`${key}Value`, `${garden[key]}%`); $(`${key}Bar`).style.width = `${garden[key]}%`; });
    $("plantScene").className = `plant-scene stage-${garden.stage}`;
    $("plantScene").classList.toggle("night-scene", garden.phase === "night");
    setText("growthDayLabel", `Day ${garden.day}: ${stageLabels[garden.stage]}`);
    setText("growthDayText", stageDescriptions[garden.stage]);
    $("photosynthesisPanel").hidden = stageIndex < 2;
    $("actionCount").textContent = `${plan.length} / 3 actions`;
    const queue = $("planQueue"); queue.replaceChildren();
    if (!plan.length) { const empty = document.createElement("span"); empty.textContent = "Your plan is empty."; queue.append(empty); }
    plan.forEach((action, index) => { const item = document.createElement("div"); item.className = "plan-item"; item.innerHTML = `<span>${index + 1}. ${labels[action]}</span>`; const remove = document.createElement("button"); remove.textContent = "×"; remove.setAttribute("aria-label", `Remove ${labels[action]}`); remove.onclick = () => { plan.splice(index, 1); render(); }; item.append(remove); queue.append(item); });
    const predicted = plan.length ? engine.predict(garden, plan) : garden;
    setText("predictionText", plan.length ? `Expected moisture ${predicted.moisture}%, light ${predicted.light}%, and nutrients ${predicted.nutrients}%.` : "Choose an action to see its expected effect.");
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
    garden = result.data.garden; plan = []; render(); setText("feedbackText", result.data.feedback); $("feedbackText").className = "feedback success";
  }
  async function advancePhase() {
    const result = await client().rpc("advance_biology_phase", { p_client_day: garden.day, p_client_phase: garden.phase });
    if (result.error) return setText("feedbackText", result.error.message || "Time could not advance.");
    garden = result.data.garden; render(); setText("feedbackText", result.data.feedback); $("feedbackText").className = "feedback success";
  }
  function bind() {
    document.querySelectorAll("[data-action]").forEach(button => button.onclick = () => { if (plan.length < 3) { plan.push(button.dataset.action); render(); } });
    $("runPlan").onclick = runPlan; $("advancePhase").onclick = advancePhase;
    document.querySelectorAll("[data-reflection]").forEach(button => button.onclick = () => setText("reflectionPrompt", `Tomorrow, watch ${button.textContent.toLowerCase()} and explain whether it helped.`));
  }
  window.addEventListener("DOMContentLoaded", async () => { bind(); await window.StemGameAuth.init("biology", { requireSession: true }); await load(); });
})();
