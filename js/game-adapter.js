(function () {
  const AUTH_ERROR = "Authentication is unavailable. Refresh and log in again.";

  function showAuthError() {
    window.StemGamePlatform?.showStatus?.(AUTH_ERROR);
  }

  function unavailableResult() {
    showAuthError();
    return Promise.resolve({ ok: false, error: AUTH_ERROR });
  }

  // randomUUID is missing in some browsers and non-secure preview origins.
  // Attempt IDs only provide request idempotency, so fall back to the Web
  // Crypto byte API before using a UUID-shaped local identifier.
  function createAttemptId() {
    const cryptoApi = window.crypto;
    if (typeof cryptoApi?.randomUUID === "function") return cryptoApi.randomUUID();
    const bytes = new Uint8Array(16);
    if (typeof cryptoApi?.getRandomValues === "function") cryptoApi.getRandomValues(bytes);
    else {
      for (let index = 0; index < bytes.length; index += 1) bytes[index] = Math.floor(Math.random() * 256);
      const time = Date.now().toString(16);
      for (let index = 0; index < Math.min(time.length, 12); index += 1) {
        bytes[index] ^= Number.parseInt(time[index], 16);
      }
    }
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = [...bytes].map(byte => byte.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }

  function create(gameId) {
    if (!gameId) throw new Error("A game ID is required for an adapter.");
    const inFlightAttempts = new Map();
    const volatileAttempts = new Map();

    function userKey() {
      const userId = window.StemGamePlatform?.getSession?.()?.user?.id || "anonymous";
      return `stem-pending-attempt:${gameId}:${userId}`;
    }

    function stableStringify(value) {
      if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
      if (value && typeof value === "object") {
        return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
      }
      return JSON.stringify(value);
    }

    function readPending(key) {
      try {
        const value = window.sessionStorage?.getItem(key);
        if (value) return JSON.parse(value);
      } catch { /* Fall back to this page's in-memory queue when storage is blocked. */ }
      return volatileAttempts.get(key) || null;
    }

    function writePending(key, value) {
      volatileAttempts.set(key, value);
      try { window.sessionStorage?.setItem(key, JSON.stringify(value)); } catch { /* In-memory retry remains available. */ }
    }

    function clearPending(key) {
      volatileAttempts.delete(key);
      try { window.sessionStorage?.removeItem(key); } catch { /* Nothing else to clear. */ }
    }

    function sendPending(key, pending, auth, levelNumber) {
      const active = inFlightAttempts.get(key);
      if (active) return active.signature === pending.signature
        ? active.promise
        : Promise.resolve({ ok: false, error: "Another attempt is still being submitted. Wait for it to finish before changing the solution." });

      const shell = window.StemGameShell;
      shell?.setBusy?.(gameId, true);
      const promise = Promise.resolve()
        .then(() => auth.recordAttempt(levelNumber, pending.outcome, pending.category, pending.details, pending.attemptId))
        .catch(error => ({ ok: false, error: error?.message || "Attempt submission failed.", retryable: true }))
        .then(result => {
          if (!result?.retryable) clearPending(key);
          if (result?.retryable) {
            shell?.setState?.(gameId, 'error');
            shell?.announce?.(gameId, "The response was interrupted. Retry this same solution to safely check the saved attempt.");
          } else if (result?.ok) {
            shell?.setState?.(gameId, 'complete');
            shell?.announce?.(gameId, "The server checked your attempt successfully.");
          } else {
            shell?.setState?.(gameId, 'error');
            shell?.announce?.(gameId, "The server checked your attempt. Review the feedback and adjust your solution.");
          }
          return result;
        })
        .finally(() => {
          if (inFlightAttempts.get(key)?.promise === promise) inFlightAttempts.delete(key);
          shell?.setBusy?.(gameId, false);
        });
      inFlightAttempts.set(key, { signature: pending.signature, promise });
      return promise;
    }

    return Object.freeze({
      gameId,
      levelNumber(levelIndex) { return levelIndex + 1; },

      isLevelUnlocked(levelIndex) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.allowLevel !== "function") {
          showAuthError();
          return false;
        }
        return auth.allowLevel(this.levelNumber(levelIndex));
      },

      restoreCheckpoint(levelIndex) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.getLearningState !== "function") return Promise.resolve(null);
        return auth.getLearningState(this.levelNumber(levelIndex));
      },

      submitAttempt(levelIndex, outcome, category, details) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.recordAttempt !== "function") return unavailableResult();
        const levelNumber = this.levelNumber(levelIndex);
        const key = `${userKey()}:${levelNumber}`;
        const signature = stableStringify({ outcome, category, details });
        let pending = readPending(key);

        if (pending && pending.signature !== signature) {
          return sendPending(key, pending, auth, levelNumber).then(result => {
            if (!result?.ok) return result;
            return { ok: false, error: "A previous attempt was safely recovered. Submit your current solution again." };
          });
        }

        if (!pending) {
          const attemptId = createAttemptId();
          if (!attemptId) return unavailableResult();
          pending = { attemptId, outcome, category, details, signature };
          writePending(key, pending);
        }
        return sendPending(key, pending, auth, levelNumber);
      },

      recordMistake(levelIndex, category, details) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.recordMistake !== "function") return unavailableResult();
        return auth.recordMistake(this.levelNumber(levelIndex), category, details);
      },

      analyzeMistake(levelIndex, category, details) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.analyzeMistake !== "function") return Promise.resolve(null);
        return auth.analyzeMistake(this.levelNumber(levelIndex), category, details);
      },

      recordAchievement(levelIndex) {
        const auth = window.StemGameAuth;
        if (!auth || typeof auth.recordAchievement !== "function") return unavailableResult();
        return auth.recordAchievement(this.levelNumber(levelIndex));
      },
    });
  }

  window.StemGameAdapter = Object.freeze({ create, createAttemptId });
})();
