import { test, expect } from '@playwright/test';

async function mockSupabase(page, session = null) {
  await page.route('**/npm/@supabase/supabase-js@2.118.0', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.supabase = { createClient: () => ({ auth: {
      getSession: async () => ({ data: { session: ${JSON.stringify(session)} }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
      signInWithPassword: async () => ({ data: {}, error: null }),
      signUp: async () => ({ data: {}, error: null }),
      signOut: async () => ({ error: null })
    }, from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) }) };`,
  }));
}

async function mockGameAuth(page) {
  await page.route('**/js/game-auth.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.StemGameAuth = {
      init: async () => {}, allowLevel: () => true,
      getLearningState: async () => null, recordAttempt: async () => ({ ok: true }),
      recordMistake: async () => ({ ok: true }), analyzeMistake: async () => null,
      recordAchievement: async () => ({ ok: true })
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

test('Physics controls render and reset locally', async ({ page }) => {
  await mockSupabase(page);
  await mockGameAuth(page);
  await page.goto('/PhysicsSim/index.html');
  await expect(page.locator('#levelTitle')).toContainText('Level 1');
  await page.locator('[data-action="fire"]').click();
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
