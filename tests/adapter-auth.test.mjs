import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadAdapter(relativePath, globalName, auth, messages = []) {
  const context = {
    StemGameAuth: auth,
    StemGamePlatform: { showStatus: (message) => messages.push(message) },
    window: {
      StemGameAuth: auth,
      StemGamePlatform: { showStatus: (message) => messages.push(message) },
    },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/game-adapter.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), context);
  context.adapter = vm.runInContext(globalName, context);
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
}
