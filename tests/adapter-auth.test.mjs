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
}
