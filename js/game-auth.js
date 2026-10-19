(function () {
  const config = window.STEM_SUPABASE_CONFIG || {};
  const state = { client: null, session: null, gameId: null, unlocked: new Set() };

  function addStyles() {
    if (document.getElementById("stem-auth-styles")) return;
    const style = document.createElement("style");
    style.id = "stem-auth-styles";
    style.textContent = [
      ".stem-auth { display:flex; align-items:center; gap:6px; flex-wrap:wrap; justify-content:flex-end; }",
      ".stem-auth input { width:150px; padding:6px 8px; border:1px solid #475569; border-radius:6px; background:#0f172a; color:#f8fafc; }",
      ".stem-auth button { padding:6px 9px; border:0; border-radius:6px; cursor:pointer; background:#0284c7; color:white; font-weight:700; }",
      ".stem-auth button.secondary { background:#475569; }",
      ".stem-auth small { color:#cbd5e1; }",
      ".level-select option:disabled { color:#64748b; }"
    ].join("");
    document.head.appendChild(style);
  }

  function showStatus(message) {
    const target = document.getElementById("statusMessage") ||
      document.getElementById("loginMessage");
    if (target) {
      target.textContent = message;
      target.className = "status-toast toast-error";
    }
  }

  function renderAuth() {
    const header = document.querySelector("header");
    if (!header || document.getElementById("stemAuth")) return;
    const box = document.createElement("div");
    box.id = "stemAuth";
    box.className = "stem-auth";
    box.innerHTML = '<input id="stemEmail" type="email" placeholder="Student email" autocomplete="email">' +
      '<input id="stemPassword" type="password" placeholder="Password" autocomplete="current-password">' +
      '<button id="stemLogin">Log in</button>' +
      '<button id="stemSignup" class="secondary">Sign up</button>' +
      '<small id="stemAuthStatus">Log in to unlock levels</small>';
    header.appendChild(box);
    document.getElementById("stemLogin").onclick = () => authenticate("signInWithPassword");
    document.getElementById("stemSignup").onclick = () => authenticate("signUp");
  }

  async function authenticate(method) {
    const email = document.getElementById("stemEmail").value.trim();
    const password = document.getElementById("stemPassword").value;
    if (!email || !password) return showStatus("Enter your email and password first.");
    const result = method === "signUp"
      ? await state.client.auth.signUp({ email, password })
      : await state.client.auth.signInWithPassword({ email, password });
    if (result.error) return showStatus(result.error.message);
    if (method === "signUp" && !result.data.session) showStatus("Check your email to confirm your account.");
  }

  function renderSignedIn() {
    const box = document.getElementById("stemAuth");
    if (!box) return;
    box.innerHTML = '<small>Signed in: ' + state.session.user.email + '</small>' +
      '<button id="stemLogout" class="secondary">Log out</button>';
    document.getElementById("stemLogout").onclick = () => state.client.auth.signOut();
  }

  async function loadProgress() {
    state.unlocked = new Set([1]);
    if (!state.session) return applyLevelAccess();
    const result = await state.client.from("level_progress")
      .select("level_number,status").eq("game_id", state.gameId);
    if (result.error) return showStatus("Could not load your level progress.");
    (result.data || []).forEach(row => {
      if (row.status === "completed" || row.status === "unlocked") state.unlocked.add(row.level_number);
    });
    applyLevelAccess();
  }

  function applyLevelAccess() {
    const picker = document.getElementById("levelPicker");
    if (!picker) return;
    [...picker.options].forEach(option => {
      option.disabled = !state.unlocked.has(Number(option.value) + 1);
    });
  }

  window.StemGameAuth = {
    async init(gameId, options = {}) {
      state.gameId = gameId;
      addStyles();
      if (!options.requireSession) renderAuth();
      if (!config.url || !config.anonKey || !window.supabase) {
        showStatus("Add your Supabase URL and anonymous key in js/supabase-config.js.");
        return;
      }
      state.client = window.supabase.createClient(config.url, config.anonKey);
      state.client.auth.onAuthStateChange(async (_event, session) => {
        state.session = session;
        if (!session && options.requireSession) {
          window.location.href = "../login.html";
          return;
        }
        if (session) renderSignedIn(); else renderAuth();
        await loadProgress();
      });
      const result = await state.client.auth.getSession();
      state.session = result.data.session;
      if (!state.session && options.requireSession) {
        window.location.href = "../login.html";
        return;
      }
      if (state.session) renderSignedIn();
      await loadProgress();
    },
    async initLoginPage() {
      addStyles();
      if (!config.url || !config.anonKey || !window.supabase) {
        return showStatus("Add your Supabase URL and anonymous key in js/supabase-config.js.");
      }
      state.client = window.supabase.createClient(config.url, config.anonKey);
      const email = document.getElementById("loginEmail");
      const password = document.getElementById("loginPassword");
      const confirmPassword = document.getElementById("confirmPassword");
      const message = document.getElementById("loginMessage");
      const submitButton = document.getElementById("authSubmit");
      const modeToggle = document.getElementById("modeToggle");
      const title = document.getElementById("authTitle");
      const description = document.getElementById("authDescription");
      const confirmRow = document.getElementById("confirmRow");
      const rules = document.getElementById("passwordRules");
      let mode = "login";
      let busy = false;
      const setMessage = text => { message.textContent = text; };
      const updateMode = () => {
        const signup = mode === "signup";
        title.textContent = signup ? "Create your student account" : "Welcome back";
        description.textContent = signup
          ? "Use an email and password to save your learning progress."
          : "Log in to continue your learning journey.";
        submitButton.textContent = signup ? "Create account" : "Log in";
        modeToggle.textContent = signup ? "Already have an account? Log in" : "Need an account? Create one";
        confirmRow.hidden = !signup;
        rules.hidden = !signup;
        setMessage("");
      };
      const submit = async () => {
        if (busy) return;
        if (!email.value.trim() || !password.value) return setMessage("Enter your email and password.");
        if (mode === "signup" && password.value !== confirmPassword.value) {
          return setMessage("The passwords do not match.");
        }
        busy = true;
        submitButton.disabled = true;
        submitButton.textContent = mode === "signup" ? "Creating account..." : "Logging in...";
        const result = mode === "signup"
          ? await state.client.auth.signUp({ email: email.value.trim(), password: password.value })
          : await state.client.auth.signInWithPassword({ email: email.value.trim(), password: password.value });
        busy = false;
        submitButton.disabled = false;
        submitButton.textContent = mode === "signup" ? "Create account" : "Log in";
        if (result.error) return setMessage(result.error.message);
        if (mode === "signup" && !result.data.session) {
          return setMessage("Account created. Check your email, confirm it, then log in.");
        }
        showGameChoices(result.data.session);
      };
      document.getElementById("authForm").onsubmit = event => {
        event.preventDefault();
        submit();
      };
      modeToggle.onclick = () => {
        mode = mode === "login" ? "signup" : "login";
        updateMode();
      };
      document.getElementById("togglePassword").onclick = () => {
        password.type = password.type === "password" ? "text" : "password";
        document.getElementById("togglePassword").textContent =
          password.type === "password" ? "Show" : "Hide";
      };
      updateMode();
      const current = await state.client.auth.getSession();
      if (current.data.session) showGameChoices(current.data.session);
    },
    allowLevel(levelNumber) {
      if (!state.session) {
        showStatus("Log in before starting a level.");
        return false;
      }
      if (!state.unlocked.has(levelNumber)) {
        showStatus("Complete the previous level to unlock this one.");
        return false;
      }
      return true;
    },
    async recordAttempt(levelNumber, result, mistakeCode, attemptData) {
      if (!state.client || !state.session) return;
      const response = await state.client.rpc("record_game_attempt", {
        p_game_id: state.gameId, p_level_number: levelNumber, p_result: result,
        p_mistake_code: mistakeCode || null, p_attempt_data: attemptData || {}
      });
      if (response.error) return console.error("Progress update failed:", response.error.message);
      await loadProgress();
    },
    async recordMistake(levelNumber, category, details) {
      if (!state.client || !state.session) return;
      const response = await state.client.rpc("record_mistake_event", {
        p_game_id: state.gameId,
        p_level_number: levelNumber,
        p_category: category,
        p_details: details || {}
      });
      if (response.error) console.error("Mistake event failed:", response.error.message);
    },
    async analyzeMistake(levelNumber, category, details) {
      if (!state.client || !state.session) return null;
      const response = await state.client.functions.invoke("analyze-mistake", {
        body: { gameId: state.gameId, levelNumber, category, details }
      });
      if (response.error) {
        console.info("AI tutor fallback:", response.error.message);
        return null;
      }
      return response.data?.insight || null;
    }
  };

  function showGameChoices(session) {
    document.getElementById("loginPanel").hidden = true;
    document.getElementById("gameChoices").hidden = false;
    document.getElementById("studentName").textContent = session.user.email;
    document.getElementById("physicsChoice").onclick = () => {
      window.location.href = "PhysicsSim/index.html";
    };
    document.getElementById("mazeChoice").onclick = () => {
      window.location.href = "RoboMaze/index.html";
    };
    document.getElementById("logoutButton").onclick = async () => {
      await state.client.auth.signOut();
      window.location.reload();
    };
  }
})();
