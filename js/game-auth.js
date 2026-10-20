(function () {
  const platform = () => window.StemGamePlatform;
  const auth = () => window.StemAuthApi;
  const progress = () => window.StemProgressApi;

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
    document.getElementById("stemLogin").onclick = () => authenticate("signIn");
    document.getElementById("stemSignup").onclick = () => authenticate("signUp");
  }

  function renderSignedIn() {
    const box = document.getElementById("stemAuth");
    const user = platform().getSession()?.user;
    if (!box || !user) return;
    box.replaceChildren();
    const signedIn = document.createElement("small");
    signedIn.textContent = `Signed in: ${user.email || "student"}`;
    const logout = document.createElement("button");
    logout.id = "stemLogout";
    logout.className = "secondary";
    logout.textContent = "Log out";
    logout.onclick = () => signOut();
    box.append(signedIn, logout);
  }

  async function authenticate(method) {
    const email = document.getElementById("stemEmail").value.trim();
    const password = document.getElementById("stemPassword").value;
    if (!email || !password) return platform().showStatus("Enter your email and password first.");
    const result = method === "signUp"
      ? await auth().signUp(email, password, "")
      : await auth().signIn(email, password);
    if (result.error) return platform().showStatus(result.error.message);
    if (method === "signUp" && !result.data.session) {
      platform().showStatus("Check your email to confirm your account.");
    }
  }

  async function signOut() {
    await auth().signOut();
    platform().setSession(null);
    const inGame = /\/(PhysicsSim|RoboMaze)\//.test(window.location.pathname);
    platform().redirectToLogin(inGame ? "../login.html" : "login.html");
  }

  async function initClient() {
    if (!platform().initClient()) return false;
    const result = await auth().getSession();
    platform().setSession(result.data.session);
    return true;
  }

  window.StemGameAuth = {
    async initDashboard() {
      addStyles();
      if (!await initClient()) return false;
      if (!platform().getSession()) {
        platform().redirectToLogin("login.html");
        return false;
      }
      return true;
    },
    getStudentProfile: () => auth().getProfile(),
    getCurrentUser: () => platform().getSession()?.user || null,
    updateStudentProfile: name => auth().updateProfile(name),
    getDashboardStats: gameId => progress().getDashboardStats(gameId),
    signOut,
    async init(gameId, options = {}) {
      platform().configure(gameId);
      addStyles();
      if (!options.requireSession) renderAuth();
      if (!await initClient()) return;
      auth().onAuthStateChange(async (_event, session) => {
        platform().setSession(session);
        if (!session && options.requireSession) {
          platform().redirectToLogin("../login.html");
          return;
        }
        if (session) renderSignedIn(); else renderAuth();
        await progress().load(gameId);
      });
      if (!platform().getSession() && options.requireSession) {
        platform().redirectToLogin("../login.html");
        return;
      }
      if (platform().getSession()) renderSignedIn();
      await progress().load(gameId);
    },
    async initLoginPage() {
      addStyles();
      if (!platform().initClient()) return;
      const email = document.getElementById("loginEmail");
      const password = document.getElementById("loginPassword");
      const confirmPassword = document.getElementById("confirmPassword");
      const displayName = document.getElementById("displayName");
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
        document.getElementById("displayNameRow").hidden = !signup;
        rules.hidden = !signup;
        setMessage("");
      };
      const submit = async () => {
        if (busy) return;
        if (!email.value.trim() || !password.value) return setMessage("Enter your email and password.");
        if (mode === "signup" && !displayName.value.trim()) return setMessage("Enter a display name.");
        if (mode === "signup" && password.value !== confirmPassword.value) {
          return setMessage("The passwords do not match.");
        }
        busy = true;
        submitButton.disabled = true;
        submitButton.textContent = mode === "signup" ? "Creating account..." : "Logging in...";
        const result = mode === "signup"
          ? await auth().signUp(email.value.trim(), password.value, displayName.value.trim())
          : await auth().signIn(email.value.trim(), password.value);
        busy = false;
        submitButton.disabled = false;
        submitButton.textContent = mode === "signup" ? "Create account" : "Log in";
        if (result.error) return setMessage(result.error.message);
        if (mode === "signup" && !result.data.session) {
          return setMessage("Account created. Check your email, confirm it, then log in.");
        }
        platform().redirectToLogin("dashboard.html");
      };
      document.getElementById("authForm").onsubmit = event => { event.preventDefault(); submit(); };
      modeToggle.onclick = () => { mode = mode === "login" ? "signup" : "login"; updateMode(); };
      document.getElementById("togglePassword").onclick = () => {
        password.type = password.type === "password" ? "text" : "password";
        document.getElementById("togglePassword").textContent = password.type === "password" ? "Show" : "Hide";
      };
      updateMode();
      const current = await auth().getSession();
      if (current.data.session) platform().redirectToLogin("dashboard.html");
    },
    allowLevel: levelNumber => progress().allowLevel(levelNumber),
    recordAttempt: (levelNumber, result, mistakeCode, attemptData) =>
      progress().recordAttempt(levelNumber, result, mistakeCode, attemptData),
    getLevelAttemptCount: levelNumber => progress().getLevelAttemptCount(levelNumber),
    recordAchievement: levelNumber => window.StemAchievementApi.record(levelNumber),
    getTotalStars: () => window.StemAchievementApi.getTotalStars(),
    recordMistake: (levelNumber, category, details) => window.StemMistakeApi.record(levelNumber, category, details),
    getLearningState: levelNumber => window.StemMistakeApi.getLearningState(levelNumber),
    analyzeMistake: (levelNumber, category, details) => window.StemTutorApi.analyze(levelNumber, category, details)
  };
})();
