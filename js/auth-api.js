(function () {
  function client() { return window.StemGamePlatform.getClient(); }

  window.StemAuthApi = {
    async getSession() { return client().auth.getSession(); },
    onAuthStateChange(callback) { return client().auth.onAuthStateChange(callback); },
    signIn(email, password) { return client().auth.signInWithPassword({ email, password }); },
    signUp(email, password, displayName) {
      return client().auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } }
      });
    },
    signOut() { return client().auth.signOut(); },
    async getProfile() {
      const session = window.StemGamePlatform.getSession();
      if (!session) return null;
      const result = await client().from("profiles")
        .select("id,display_name").eq("id", session.user.id).maybeSingle();
      return result.data || { display_name: "" };
    },
    async updateProfile(displayName) {
      const session = window.StemGamePlatform.getSession();
      if (!session) return false;
      const name = displayName.trim();
      const profile = await client().from("profiles")
        .update({ display_name: name, updated_at: new Date().toISOString() })
        .eq("id", session.user.id);
      if (profile.error) return false;
      const user = await client().auth.updateUser({ data: { display_name: name } });
      return !user.error;
    }
  };
})();
