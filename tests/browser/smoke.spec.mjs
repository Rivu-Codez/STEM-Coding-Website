import { test, expect } from '@playwright/test';

async function mockSupabase(page, session = null) {
  await page.route('**/vendor/supabase-browser.js', (route) => route.fulfill({
    contentType: 'application/javascript', body: '/* mocked Supabase client supplied by addInitScript */',
  }));
  await page.addInitScript(({ session }) => {
    const progressRows = [];
    window.supabase = { createClient: () => ({ auth: {
      getSession: async () => ({ data: { session }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null })
    }, from: (table) => ({ select: () => {
      const filters = {};
      const query = {
        eq: (key, value) => { filters[key] = value; return query; },
        order: () => query,
        maybeSingle: async () => ({ data: null, error: null }),
        then: (resolve) => {
          const data = table === 'level_progress' ? progressRows.filter(row =>
            Object.entries(filters).every(([key, value]) => row[key] === value)) : [];
          return Promise.resolve({ data, error: null }).then(resolve);
        }
      };
      return query;
    } }), rpc: async (name, args) => {
      if (name === 'submit_game_attempt_idempotent') {
        const success = args.p_attempt_data.answer === '+10';
        if (success) {
          progressRows.push({ game_id: 'submarine_math', level_number: args.p_level_number, status: 'completed' });
          if (args.p_level_number < 15) progressRows.push({ game_id: 'submarine_math', level_number: args.p_level_number + 1, status: 'unlocked' });
        }
        return { data: { server_result: success ? 'success' : 'miss', attempt_count: 1 }, error: null };
      }
      return { data: { recorded: true, awarded: true, stars: 3, xp: 50 }, error: null };
    } }) };
  }, { session });
}

async function mockGameAuth(page) {
  await page.route('**/js/game-auth.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `let mockedUnlockedLevel = 1;
    const mockedAttempts = {};
    window.StemGameAuth = {
      init: async (gameId) => {
        window.StemGamePlatform?.configure(gameId);
        window.StemGamePlatform?.setSession({ user: { id: 'student-1', email: 'student@example.test' } });
      }, allowLevel: (level) => level <= mockedUnlockedLevel,
      getLearningState: async () => null, recordAttempt: async () => ({ ok: true }),
      recordMistake: async () => ({ ok: true }), analyzeMistake: async () => null,
      recordAchievement: async (level) => ({ ok: true, data: { awarded: true, stars: 3, xp: 100 } })
    };`,
  }));
}

async function mockProgressionAuth(page) {
  await page.route('**/js/game-auth.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `let mockedUnlockedLevel = 1;
    const mockedAttempts = {};
    window.StemGameAuth = {
      init: async (gameId) => {
        window.StemGamePlatform?.configure(gameId);
        window.StemGamePlatform?.setSession({ user: { id: 'student-1', email: 'student@example.test' } });
      }, allowLevel: (level) => level <= mockedUnlockedLevel,
      getLearningState: async () => null,
      recordAttempt: async (level, result, _category, details) => {
        const isSignalSolution = details?.operations?.[0]?.type === 'remove' &&
          details?.operations?.[0]?.chars === '-' &&
          details?.operations?.[1]?.type === 'reverse';
        const correct = (result === 'success' && details?.program?.length === 5) ||
          (level === 1 && isSignalSolution) ||
          (level === 1 && details?.answer === '+10');
        mockedAttempts[level] = (mockedAttempts[level] || 0) + 1;
        if (correct) mockedUnlockedLevel = Math.max(mockedUnlockedLevel, level + 1);
        return { ok: true, data: { server_result: correct ? 'success' : 'miss', attempt_count: mockedAttempts[level], revealed_answer: !correct && mockedAttempts[level] >= 5 ? 'Paris' : null, feedback: correct ? 'Correct! You decoded the answer.' : 'The decoder does not produce the answer.' } };
      },
      recordMistake: async () => ({ ok: true }), analyzeMistake: async () => null,
      recordAchievement: async () => ({ ok: true, data: { awarded: true, stars: 3, xp: 100 } })
    };`,
  }));
}

async function mockChemistryAuth(page) {
  await page.route('**/js/game-auth.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.StemGameAuth = {
      init: async () => {}, allowLevel: () => true, getLearningState: async () => null,
      recordAttempt: async () => ({ ok: true, data: { server_result: 'success' } }),
      recordMistake: async () => ({ ok: true }), analyzeMistake: async () => null,
      recordAchievement: async () => ({ ok: true, data: { awarded: false } }),
      getTotalStars: async () => 0, getDashboardStats: async () => ({ xp: 0 })
    };`,
  }));
}

test('login page validates an empty submission', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/login.html');
  await page.locator('#authSubmit').click();
  await expect(page.locator('#loginMessage')).toHaveText('Enter your email and password.');
});

test('protected Physics page redirects unauthenticated visitors', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/PhysicsSim/index.html');
  await expect(page).toHaveURL(/\/login\.html$/);
});

test('protected Submarine Math page redirects unauthenticated visitors', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/SubmarineMath/index.html');
  await expect(page).toHaveURL(/\/login\.html$/);
});

test('protected Signal Decrypter page redirects unauthenticated visitors', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/SignalDecrypter/index.html');
  await expect(page).toHaveURL(/\/login\.html$/);
});

test('Signal Decrypter completes an easy block mission and advances levels', async ({ page }) => {
  await mockSupabase(page, { user: { id: 'student-1', email: 'student@example.test' } });
  await mockProgressionAuth(page);
  await page.goto('/SignalDecrypter/index.html');

  await expect(page.locator('#levelIndicator')).toHaveText('Level 1 of 15');
  const remainingSeconds = Number((await page.locator('#timerValue').textContent()).replace(/\D/g, ''));
  expect(remainingSeconds).toBeGreaterThan(0);
  expect(remainingSeconds).toBeLessThanOrEqual(90);
  await page.getByRole('button', { name: 'Add Remove hyphens to pipeline' }).click();
  await page.getByRole('button', { name: 'Add Reverse signal to pipeline' }).click();
  await expect(page.locator('#outputPreview')).toContainText('2 modules ready');
  await expect(page.locator('#decodedOutput')).toHaveText('LOCKED UNTIL RUN');
  await page.locator('#executeButton').click();
  await expect(page.locator('#feedbackText')).toContainText('Correct!');
  await expect(page.locator('#executionTrace')).toContainText('Reverse signal');
  await page.locator('#nextButton').click();
  await expect(page.locator('#levelIndicator')).toHaveText('Level 2 of 15');
});

test('Signal Decrypter wrong decoder increases interference and gives stage feedback', async ({ page }) => {
  await mockSupabase(page, { user: { id: 'student-1', email: 'student@example.test' } });
  await mockProgressionAuth(page);
  await page.goto('/SignalDecrypter/index.html');
  await page.getByRole('button', { name: 'Add Make uppercase to pipeline' }).click();
  await page.locator('#executeButton').click();
  await expect(page.locator('#feedbackText')).toContainText('pipeline');
  await expect(page.locator('#interferenceValue')).toHaveText('1 / 3');
});

test('Signal Decrypter reveals the question answer after five failed submissions', async ({ page }) => {
  await mockSupabase(page, { user: { id: 'student-1', email: 'student@example.test' } });
  await mockProgressionAuth(page);
  await page.goto('/SignalDecrypter/index.html');
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.getByRole('button', { name: 'Add Make lowercase to pipeline' }).click();
    await page.locator('#executeButton').click();
    if (attempt < 4) await expect(page.locator('#answerReveal')).toBeHidden();
  }
  await expect(page.locator('#answerReveal')).toContainText('Paris');
});

test('Submarine Math checks an answer and advances levels', async ({ page }) => {
  await mockSupabase(page, { user: { id: 'student-1', email: 'student@example.test' } });
  await mockProgressionAuth(page);
  await page.goto('/SubmarineMath/index.html');

  await expect(page.locator('#level-indicator')).toHaveText('Level 1 of 15');
  await page.locator('#native-user-input').fill('+10');
  await page.locator('[data-action="submit-answer"]').click();
  await expect(page.locator('#feedback-text')).toContainText('Correct!');
  await page.locator('[data-action="next-level"]').click();
  await expect(page.locator('#level-indicator')).toHaveText('Level 2 of 15');
});

test('Chemistry loads local Blockly and CodeMirror editor bundles', async ({ page }) => {
  await mockSupabase(page, { user: { id: 'student-1', email: 'student@example.test' } });
  await mockChemistryAuth(page);
  await page.goto('/Chemistry/index.html');
  await expect(page.locator('[data-game-status][role="status"]')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#chemistryGame')).toHaveAttribute('data-game-state', 'ready');
  await expect(page.locator('#blocklyWorkspace .blocklySvg')).toBeVisible();
  await expect(page.locator('.element-legend')).toContainText('Na Sodium');
  await page.locator('#levelPicker').selectOption('10');
  await expect(page.locator('#pythonEditor .cm-editor')).toBeVisible();
});

test('attempt IDs remain available when randomUUID is unsupported', async ({ page }) => {
  await mockSupabase(page, { user: { id: 'student-1', email: 'student@example.test' } });
  await mockGameAuth(page);
  await page.addInitScript(() => {
    const originalCrypto = window.crypto;
    Object.defineProperty(window, 'crypto', {
      configurable: true,
      value: { getRandomValues: originalCrypto.getRandomValues.bind(originalCrypto) },
    });
  });
  await page.goto('/PhysicsSim/index.html');
  const attemptId = await page.evaluate(() => window.StemGameAdapter.createAttemptId());
  expect(attemptId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
});

test('Physics controls render and reset locally', async ({ page }) => {
  await mockSupabase(page);
  await mockGameAuth(page);
  await page.goto('/PhysicsSim/index.html');
  await expect(page.locator('#levelTitle')).toContainText('Level 1');
  await page.locator('[data-action="fire"]').click();
  await expect.poll(() => page.evaluate(() => window.currentBall?.x || 0)).toBeGreaterThan(50);
  await page.locator('[data-action="reset"]').click();
  await expect(page.locator('#statusMessage')).toContainText('Trajectory cleared');
});

test('RoboMaze commands render and reset locally', async ({ page }) => {
  await mockSupabase(page);
  await mockGameAuth(page);
  await page.goto('/RoboMaze/index.html');
  await expect(page.locator('#levelTitle')).toContainText('Level 1');
  await page.locator('[data-command="FORWARD"]').click();
  await expect(page.locator('.command-item')).toHaveCount(1);
  await page.locator('[data-action="reset"]').click();
  await expect(page.locator('#statusMessage')).toContainText('Robot reset');
});

test('RoboMaze completes a level and unlocks the next level', async ({ page }) => {
  await mockSupabase(page);
  await mockProgressionAuth(page);
  await page.goto('/RoboMaze/index.html');

  await expect(page.locator('#levelTitle')).toContainText('Level 1');
  await page.locator('[data-command="FORWARD"]').click({ clickCount: 5 });
  await page.locator('[data-action="run"]').click();

  await expect(page.locator('#victoryModal')).toBeVisible({ timeout: 8_000 });
  await expect(page.locator('#modalTitle')).toContainText('Passed');
  await page.locator('[data-action="next-level"]').click();
  await expect(page.locator('#levelTitle')).toContainText('Level 2');
  await expect(page.locator('[data-action="change-level"]')).toHaveValue('1');
});
