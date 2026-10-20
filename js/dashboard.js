(function () {
  const games = {
    physics: { id: "physics", href: "PhysicsSim/index.html", prefix: "physics" },
    robo: { id: "robo_maze", href: "RoboMaze/index.html", prefix: "robo" }
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
    const percent = Math.round((stats.completedLevels / 30) * 100);
    setText(prefix + "Completed", `${stats.completedLevels}/30`);
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
    const [physics, robo] = await Promise.all([
      window.StemGameAuth.getDashboardStats(games.physics.id),
      window.StemGameAuth.getDashboardStats(games.robo.id)
    ]);
    renderStats(games.physics.prefix, physics);
    renderStats(games.robo.prefix, robo);
  }

  function bindEvents() {
    $("physicsGameButton").onclick = () => { window.location.href = games.physics.href; };
    $("roboGameButton").onclick = () => { window.location.href = games.robo.href; };
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
