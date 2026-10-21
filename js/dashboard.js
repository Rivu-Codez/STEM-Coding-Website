(function () {
  const registry = () => window.StemGameRegistry;
  const physicsDefinition = () => registry().get("physics");
  const roboDefinition = () => registry().get("robo_maze");
  const submarineDefinition = () => registry().get("submarine_math");
  const games = {
    physics: { prefix: "physics", definition: physicsDefinition },
    robo: { prefix: "robo", definition: roboDefinition },
    submarine: { prefix: "submarine", definition: submarineDefinition }
  };

  const $ = id => document.getElementById(id);
  const setText = (id, value) => { $(id).textContent = value; };

  function renderProfile(profile, user) {
    const name = profile?.display_name?.trim() || "Student";
    setText("profileName", name);
    setText("profileEmail", user?.email || "Account email unavailable");
    setText("profileInitials", name.slice(0, 1).toUpperCase());
    $("profileNameInput").value = name === "Student" ? "" : name;
  }

  function renderStats(prefix, stats) {
    const maxLevels = stats.maxLevels || 30;
    const percent = Math.round((stats.completedLevels / maxLevels) * 100);
    setText(prefix + "Completed", `${stats.completedLevels}/${maxLevels}`);
    setText(prefix + "Stars", stats.stars);
    setText(prefix + "Xp", stats.xp);
    setText(prefix + "Progress", `${percent}%`);
    $(prefix + "ProgressBar").style.width = `${percent}%`;
  }

  async function load() {
    const ready = await window.StemGameAuth.initDashboard();
    if (!ready) return;
    const profile = await window.StemGameAuth.getStudentProfile();
    renderProfile(profile, window.StemGameAuth.getCurrentUser());
    const physicsGame = games.physics.definition();
    const roboGame = games.robo.definition();
    const submarineGame = games.submarine.definition();
    const [physics, robo, submarine] = await Promise.all([
      window.StemGameAuth.getDashboardStats(physicsGame.gameId),
      window.StemGameAuth.getDashboardStats(roboGame.gameId),
      window.StemGameAuth.getDashboardStats(submarineGame.gameId)
    ]);
    renderStats(games.physics.prefix, physics);
    renderStats(games.robo.prefix, robo);
    renderStats(games.submarine.prefix, submarine);
  }

  function bindEvents() {
    $("physicsGameButton").onclick = () => { window.location.href = games.physics.definition().route; };
    $("roboGameButton").onclick = () => { window.location.href = games.robo.definition().route; };
    $("submarineGameButton").onclick = () => { window.location.href = games.submarine.definition().route; };
    $("logoutButton").onclick = () => window.StemGameAuth.signOut();
    $("editProfileButton").onclick = () => {
      $("profileForm").hidden = false;
      $("editProfileButton").hidden = true;
      $("profileNameInput").focus();
    };
    $("cancelProfileButton").onclick = () => {
      $("profileForm").hidden = true;
      $("editProfileButton").hidden = false;
      $("profileMessage").textContent = "";
    };
    $("profileForm").onsubmit = async event => {
      event.preventDefault();
      const name = $("profileNameInput").value.trim();
      if (!name) return $("profileMessage").textContent = "Enter a display name.";
      const saved = await window.StemGameAuth.updateStudentProfile(name);
      if (!saved) return $("profileMessage").textContent = "Could not save your name.";
      renderProfile({ display_name: name }, window.StemGameAuth.getCurrentUser());
      $("profileForm").hidden = true;
      $("editProfileButton").hidden = false;
      $("profileMessage").textContent = "";
    };
  }

  window.addEventListener("DOMContentLoaded", () => { bindEvents(); load(); });
})();
