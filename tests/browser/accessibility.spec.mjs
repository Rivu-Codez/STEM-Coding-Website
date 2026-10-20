import { test, expect } from '@playwright/test';

async function mockSupabase(page) {
  await page.route('**/npm/@supabase/supabase-js@2.118.0', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.supabase = { createClient: () => ({ auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } })
    } }) };`,
  }));
}

async function mockGameAuth(page) {
  await page.route('**/js/game-auth.js', (route) => route.fulfill({
    contentType: 'application/javascript',
    body: `window.StemGameAuth = {
      init: async () => {}, allowLevel: () => true,
      getLearningState: async () => null, recordAttempt: async () => ({ ok: true }),
      recordMistake: async () => ({ ok: true }), analyzeMistake: async () => null,
      recordAchievement: async () => ({ ok: true, data: { awarded: false, stars: 0, xp: 0 } })
    };`,
  }));
}

test('login controls have accessible names and labels', async ({ page }) => {
  await mockSupabase(page);
  await page.goto('/login.html');
  await expect(page.getByLabel('Email address')).toBeVisible();
  await expect(page.locator('#loginPassword')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Log in' })).toBeVisible();
});

test('game canvases and primary controls have accessible names', async ({ page }) => {
  await mockSupabase(page);
  await mockGameAuth(page);

  await page.goto('/PhysicsSim/index.html');
  await expect(page.getByLabel('Projectile trajectory simulation')).toBeVisible();
  await expect(page.getByRole('button', { name: /Fire Cannon/ })).toBeVisible();

  await page.goto('/RoboMaze/index.html');
  await expect(page.getByLabel('Robot maze game board')).toBeVisible();
  await expect(page.locator('[data-command="FORWARD"]')).toBeVisible();
});
