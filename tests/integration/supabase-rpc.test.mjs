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
