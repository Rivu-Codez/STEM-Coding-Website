import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const config = {
  url: process.env.SUPABASE_TEST_URL,
  anonKey: process.env.SUPABASE_TEST_ANON_KEY,
  email: process.env.SUPABASE_TEST_EMAIL,
  password: process.env.SUPABASE_TEST_PASSWORD,
};
const enabled = process.env.SUPABASE_INTEGRATION === '1';
const missing = Object.entries(config).filter(([, value]) => !value).map(([key]) => key);

function requireIntegrationConfig() {
  if (!enabled) return false;
  if (missing.length) throw new Error(`Missing Supabase integration variables: ${missing.join(', ')}`);
  return true;
}

async function signIn() {
  const response = await fetch(`${config.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'content-type': 'application/json' },
    body: JSON.stringify({ email: config.email, password: config.password }),
  });
  const body = await response.json();
  assert.equal(response.ok, true, `Supabase sign-in failed with status ${response.status}`);
  assert.ok(body.access_token, 'Supabase did not return an access token');
  return body.access_token;
}

async function rpc(token, name, args) {
  return fetch(`${config.url}/rest/v1/rpc/${name}`, {
    method: 'POST',
    headers: {
      apikey: config.anonKey,
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(args),
  });
}

async function rows(token, table, query) {
  const response = await fetch(`${config.url}/rest/v1/${table}?${query}`, {
    headers: { apikey: config.anonKey, authorization: `Bearer ${token}` },
  });
  assert.equal(response.ok, true, `${table} query failed with status ${response.status}`);
  return response.json();
}

test('Supabase integration configuration is explicit', { skip: !enabled }, () => {
  requireIntegrationConfig();
});

test('authenticated test user can read canonical levels', { skip: !enabled }, async () => {
  requireIntegrationConfig();
  const token = await signIn();
  const response = await fetch(`${config.url}/rest/v1/game_levels?select=game_id,level_number&limit=1`, {
    headers: { apikey: config.anonKey, authorization: `Bearer ${token}` },
  });
  assert.equal(response.ok, true, `game_levels query failed with status ${response.status}`);
  const rows = await response.json();
  assert.ok(Array.isArray(rows));
});

test('dashboard summary RPC requires an authenticated user', { skip: !enabled }, async () => {
  requireIntegrationConfig();
  const response = await fetch(`${config.url}/rest/v1/rpc/get_dashboard_summaries`, {
    method: 'POST',
    headers: { apikey: config.anonKey, 'content-type': 'application/json' },
    body: '{}',
  });
  assert.equal(response.ok, false, 'anonymous caller unexpectedly read dashboard summaries');
  assert.ok([401, 403].includes(response.status), `unexpected anonymous response ${response.status}`);
});

test('dashboard summaries match authenticated progress and achievement totals', { skip: !enabled }, async () => {
  requireIntegrationConfig();
  const token = await signIn();
  const response = await rpc(token, 'get_dashboard_summaries', {});
  assert.equal(response.ok, true, `dashboard summary RPC failed with status ${response.status}`);
  const summaries = await response.json();
  assert.ok(Array.isArray(summaries));
  for (const summary of summaries) {
    assert.ok(summary.level_count > 0);
    const filter = `game_id=eq.${encodeURIComponent(summary.game_id)}&level_number=lte.${summary.level_count}`;
    const [progress, achievements] = await Promise.all([
      rows(token, 'level_progress', `select=level_number,status,best_result&${filter}`),
      rows(token, 'student_achievements', `select=stars,xp&${filter}`),
    ]);
    const completed = progress.filter(row => row.status === 'completed');
    const fallbackStars = completed.reduce((total, row) => total + Number(row.best_result?.stars || 0), 0);
    const fallbackXp = completed.reduce((total, row) => total + Number(row.best_result?.xp || 0), 0);
    const stars = achievements.length ? achievements.reduce((total, row) => total + Number(row.stars || 0), 0) : fallbackStars;
    const xp = achievements.length ? achievements.reduce((total, row) => total + Number(row.xp || 0), 0) : fallbackXp;
    assert.equal(summary.completed_levels, completed.length, `${summary.game_id} completed level total differs`);
    assert.equal(summary.stars, stars, `${summary.game_id} stars total differs`);
    assert.equal(summary.xp, xp, `${summary.game_id} XP total differs`);
    assert.equal(summary.next_level, completed.length >= summary.level_count ? null : completed.length + 1);
  }
});

test('authoritative RPC rejects an invalid level without accepting client success', { skip: !enabled }, async () => {
  requireIntegrationConfig();
  const token = await signIn();
  const response = await rpc(token, 'submit_physics_attempt_idempotent', {
    p_attempt_id: randomUUID(),
    p_level_number: 999999,
    p_attempt_data: { success: true },
  });
  assert.equal(response.ok, false, 'invalid level was unexpectedly accepted');
  assert.notEqual(response.status, 401, 'test user was not authenticated');
});
