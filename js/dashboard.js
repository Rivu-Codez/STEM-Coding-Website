(function () {
  const registry = () => window.StemGameRegistry;
  const physicsDefinition = () => registry().get("physics");
  const roboDefinition = () => registry().get("robo_maze");
  const signalDefinition = () => registry().get("signal_decrypter");
  const submarineDefinition = () => registry().get("submarine_math");
  const biologyDefinition = () => registry().get("biology");
  const games = {
    physics: { prefix: "physics", definition: physicsDefinition },
    robo: { prefix: "robo", definition: roboDefinition },
    signal: { prefix: "signal", definition: signalDefinition },
    submarine: { prefix: "submarine", definition: submarineDefinition },
    biology: { prefix: "biology", definition: biologyDefinition }
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

  function bindSubjectAccordion() {
    const panel = $("subjectPanel");
    const subjects = [...document.querySelectorAll(".subject-card")].map((subject, index) => ({
      subject,
      summary: subject.querySelector("summary"),
      body: subject.querySelector(".subject-body"),
      panelId: "subject-panel-" + (index + 1)
    }));
    if (!panel || !subjects.length) return;

    subjects.forEach(({ body, summary, panelId }) => {
      body.id = panelId;
      body.hidden = true;
      body.remove();
      panel.append(body);
      summary.setAttribute("aria-controls", panelId);
      summary.setAttribute("aria-expanded", "false");
    });

    const activate = activeIndex => {
      subjects.forEach(({ subject, summary, body }, index) => {
        const active = index === activeIndex;
        subject.open = active;
        subject.classList.toggle("is-active", active);
        summary.setAttribute("aria-expanded", String(active));
        body.hidden = !active;
      });
    };

    subjects.forEach(({ summary }, index) => {
      summary.addEventListener("click", event => {
        event.preventDefault();
        const active = subjects[index].subject.classList.contains("is-active");
        activate(active ? -1 : index);
      });
    });

    activate(0);
  }

  async function load() {
    const ready = await window.StemGameAuth.initDashboard();
    if (!ready) return;
    const profile = await window.StemGameAuth.getStudentProfile();
    renderProfile(profile, window.StemGameAuth.getCurrentUser());
    const physicsGame = games.physics.definition();
    const roboGame = games.robo.definition();
    const signalGame = games.signal.definition();
    const submarineGame = games.submarine.definition();
    const biologyGame = games.biology.definition();
    const [physics, robo, signal, submarine, biology] = await Promise.all([
      window.StemGameAuth.getDashboardStats(physicsGame.gameId),
      window.StemGameAuth.getDashboardStats(roboGame.gameId),
      window.StemGameAuth.getDashboardStats(signalGame.gameId),
      window.StemGameAuth.getDashboardStats(submarineGame.gameId),
      window.StemGameAuth.getDashboardStats(biologyGame.gameId)
    ]);
    renderStats(games.physics.prefix, physics);
    renderStats(games.robo.prefix, robo);
    renderStats(games.signal.prefix, signal);
    renderStats(games.submarine.prefix, submarine);
    renderStats(games.biology.prefix, biology);
  }

  function bindEvents() {
    $("physicsGameButton").onclick = () => { window.location.href = games.physics.definition().route; };
    $("roboGameButton").onclick = () => { window.location.href = games.robo.definition().route; };
    $("signalGameButton").onclick = () => { window.location.href = games.signal.definition().route; };
    $("submarineGameButton").onclick = () => { window.location.href = games.submarine.definition().route; };
    $("biologyGameButton").onclick = () => { window.location.href = games.biology.definition().route; };
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

  window.addEventListener("DOMContentLoaded", () => { bindSubjectAccordion(); bindEvents(); load(); });
})();
