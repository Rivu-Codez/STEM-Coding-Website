import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadAdapter(relativePath, globalName, auth, messages = [], storage = new Map()) {
  let id = 0;
  const platform = { showStatus: (message) => messages.push(message), getSession: () => ({ user: { id: 'student-1' } }) };
  const sessionStorage = {
    getItem(key) { return storage.get(key) ?? null; },
    setItem(key, value) { storage.set(key, value); },
    removeItem(key) { storage.delete(key); },
  };
  const context = {
    StemGameAuth: auth,
    window: {
      StemGameAuth: auth,
      StemGamePlatform: platform,
      sessionStorage,
      crypto: { randomUUID: () => `attempt-${++id}` },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/game-adapter.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context);
  context.adapter = vm.runInContext(globalName, context);
  context.storage = storage;
  return context;
}

for (const [name, file, globalName] of [
  ['RoboMaze', 'RoboMaze/adapter.js', 'RoboMazeAdapter'],
  ['PhysicsSim', 'PhysicsSim/adapter.js', 'PhysicsAdapter'],
]) {
  test(`${name} blocks level access when authentication is unavailable`, () => {
    const messages = [];
    const context = loadAdapter(file, globalName, undefined, messages);
    assert.equal(context.adapter.isLevelUnlocked(0), false);
    assert.match(messages[0], /Authentication is unavailable/);
  });

  test(`${name} delegates level access when authentication is available`, () => {
    const calls = [];
    const context = loadAdapter(file, globalName, {
      allowLevel(levelNumber) {
        calls.push(levelNumber);
        return true;
      },
      getLearningState() {
        return Promise.resolve(null);
      },
    });
    assert.equal(context.adapter.isLevelUnlocked(2), true);
    assert.deepEqual(calls, [3]);
  });

  test(`${name} delegates all shared platform operations`, async () => {
    const calls = [];
    const context = loadAdapter(file, globalName, {
      allowLevel() { return true; },
      getLearningState(level) { calls.push(['checkpoint', level]); return Promise.resolve(null); },
      recordAttempt(...args) { calls.push(['attempt', ...args]); return Promise.resolve({ ok: true }); },
      recordMistake(...args) { calls.push(['mistake', ...args]); return Promise.resolve({ ok: true }); },
      analyzeMistake(...args) { calls.push(['tutor', ...args]); return Promise.resolve(null); },
      recordAchievement(...args) { calls.push(['achievement', ...args]); return Promise.resolve({ ok: true }); },
    });
    await context.adapter.restoreCheckpoint(1);
    await context.adapter.submitAttempt(1, 'success', null, { value: 1 });
    await context.adapter.recordMistake(1, 'test', {});
    await context.adapter.analyzeMistake(1, 'test', {});
    await context.adapter.recordAchievement(1);
    assert.deepEqual(calls.map(([type, level]) => [type, level]), [
      ['checkpoint', 2], ['attempt', 2], ['mistake', 2], ['tutor', 2], ['achievement', 2],
    ]);
  });

  test(`${name} reuses the persisted attempt ID and payload after an ambiguous response`, async () => {
    const calls = [];
    const storage = new Map();
    let response = { ok: false, error: 'network interrupted', retryable: true };
    const auth = { recordAttempt(...args) { calls.push(args); return Promise.resolve(response); } };
    const firstPage = loadAdapter(file, globalName, auth, [], storage);
    const payload = { program: [{ type: 'FORWARD' }] };
    await firstPage.adapter.submitAttempt(2, 'success', null, payload);
    assert.equal(storage.size, 1);

    response = { ok: true, data: { server_result: 'success' } };
    const reloadedPage = loadAdapter(file, globalName, auth, [], storage);
    await reloadedPage.adapter.submitAttempt(2, 'success', null, payload);
    assert.equal(calls.length, 2);
    assert.equal(calls[0][4], calls[1][4]);
    assert.equal(JSON.stringify(calls[0][3]), JSON.stringify(calls[1][3]));
    assert.equal(storage.size, 0);
  });

  test(`${name} coalesces duplicate clicks while one attempt is in flight`, async () => {
    const calls = [];
    let resolveAttempt;
    const auth = {
      recordAttempt(...args) {
        calls.push(args);
        return new Promise(resolve => { resolveAttempt = resolve; });
      },
    };
    const context = loadAdapter(file, globalName, auth);
    const payload = { angle: 45, speed: 20 };
    const first = context.adapter.submitAttempt(0, 'success', null, payload);
    const second = context.adapter.submitAttempt(0, 'success', null, payload);
    assert.equal(first, second);
    await Promise.resolve();
    assert.equal(calls.length, 1);
    resolveAttempt({ ok: true, data: { server_result: 'success' } });
    await Promise.all([first, second]);
  });
}
