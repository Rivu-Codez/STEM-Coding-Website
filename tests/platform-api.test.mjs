import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function createHarness({ session = null, rpcResponse = { data: {}, error: null }, functionResponse = { data: {}, error: null } } = {}) {
  const messages = [];
  const levelOptions = [{ value: '0', disabled: false }, { value: '1', disabled: false }, { value: '2', disabled: false }];
  const document = {
    getElementById(id) {
      if (id === 'levelPicker') return { options: levelOptions };
      return null;
    },
  };
  const query = {
    select() { return this; },
    eq() { return Promise.resolve({ data: [], error: null }); },
    maybeSingle() { return Promise.resolve({ data: null, error: null }); },
  };
  const client = {
    from() { return query; },
    rpc() { return Promise.resolve(rpcResponse); },
    functions: { invoke() { return Promise.resolve(functionResponse); } },
    auth: {},
  };
  const context = {
    document,
    console,
    STEM_SUPABASE_CONFIG: { url: 'https://example.supabase.co', anonKey: 'test-key' },
    supabase: { createClient() { return client; } },
    setTimeout,
  };
  context.window = context;
  vm.createContext(context);
  for (const relativePath of ['js/game-platform.js', 'js/progress-api.js', 'js/tutor-api.js']) {
    vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context);
  }
  context.StemGamePlatform.showStatus = (message) => messages.push(message);
  context.StemGamePlatform.initClient();
  context.StemGamePlatform.configure('robo_maze');
  context.StemGamePlatform.setSession(session);
  return { context, messages, levelOptions, client };
}

test('progress access rejects unauthenticated users', () => {
  const { context, messages } = createHarness();
  assert.equal(context.StemProgressApi.allowLevel(1), false);
  assert.match(messages[0], /Log in before starting/);
});

test('progress access rejects locked levels and allows unlocked levels', () => {
  const { context, messages } = createHarness({ session: { user: { id: 'student-1' } } });
  context.StemGamePlatform.setUnlocked([1, 2]);
  assert.equal(context.StemProgressApi.allowLevel(2), true);
  assert.equal(context.StemProgressApi.allowLevel(3), false);
  assert.match(messages[0], /Complete the previous level/);
});

test('failed attempt writes return a retryable result', async () => {
  const { context, messages, client } = createHarness({ session: { user: { id: 'student-1' } } });
  client.rpc = () => Promise.resolve({ data: null, error: { message: 'temporary failure' } });
  const result = await context.StemProgressApi.recordAttempt(1, 'miss', 'wall_collision', { program: [] });
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: false, error: 'temporary failure' });
  assert.match(messages[0], /retry this attempt/);
});

test('successful attempt returns data and refreshes progress', async () => {
  const { context, client } = createHarness({
    session: { user: { id: 'student-1' } },
    rpcResponse: { data: { server_result: 'success' }, error: null },
  });
  let progressReloaded = false;
  const originalFrom = client.from;
  client.from = (...args) => {
    progressReloaded = true;
    return originalFrom(...args);
  };
  const result = await context.StemProgressApi.recordAttempt(1, 'success', null, { program: [] });
  assert.equal(result.ok, true);
  assert.deepEqual(result.data, { server_result: 'success' });
  assert.equal(progressReloaded, true);
  assert.equal(client !== null, true);
});

test('unsupported attempt payloads do not use the legacy client-trusted RPC', async () => {
  const { context, messages, client } = createHarness({
    session: { user: { id: 'student-1' } },
  });
  let rpcCalled = false;
  client.rpc = () => {
    rpcCalled = true;
    return Promise.resolve({ data: null, error: null });
  };
  const result = await context.StemProgressApi.recordAttempt(1, 'success', null, {});
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ok: false, error: 'Unsupported attempt payload' });
  assert.equal(rpcCalled, false);
  assert.match(messages[0], /cannot submit attempts safely/);
});

test('tutor without a session uses rule-based fallback', async () => {
  const { context } = createHarness();
  const insight = await context.StemTutorApi.analyze(1, 'wall_collision', {});
  assert.equal(insight, null);
  assert.equal(context.StemTutorApi.getLastState(), 'RULE_BASED_FALLBACK');
});

test('tutor preserves provider failure state', async () => {
  const { context, client } = createHarness({ session: { user: { id: 'student-1' } } });
  client.functions.invoke = () => Promise.resolve({ data: { state: 'AI_RATE_LIMITED' }, error: { message: '429' } });
  const insight = await context.StemTutorApi.analyze(1, 'wall_collision', {});
  assert.equal(insight, null);
  assert.equal(context.StemTutorApi.getLastState(), 'AI_RATE_LIMITED');
});

test('tutor returns successful insight and state', async () => {
  const { context, client } = createHarness({ session: { user: { id: 'student-1' } } });
  client.functions.invoke = () => Promise.resolve({ data: { state: 'AI_SUCCESS', insight: { hint: 'Check the next tile.' } }, error: null });
  const insight = await context.StemTutorApi.analyze(1, 'wall_collision', {});
  assert.deepEqual(JSON.parse(JSON.stringify(insight)), { hint: 'Check the next tile.' });
  assert.equal(context.StemTutorApi.getLastState(), 'AI_SUCCESS');
});
