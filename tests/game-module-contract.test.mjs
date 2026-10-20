import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadContract() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'js/game-module.js'), 'utf8'), context);
  return context.window.StemGameModule;
}

const StemGameModule = loadContract();
const noop = () => {};

function validConfig(overrides = {}) {
  return {
    gameId: 'test_game',
    levels: [{ title: 'Test level' }],
    loadLevel: noop,
    reset: noop,
    getAttemptPayload: () => ({ value: 1 }),
    renderFeedback: noop,
    ...overrides,
  };
}

test('creates a valid module with the required interface', () => {
  const module = StemGameModule.create(validConfig());
  assert.equal(module.gameId, 'test_game');
  assert.equal(module.levels.length, 1);
  assert.equal(typeof module.loadLevel, 'function');
  assert.equal(typeof module.reset, 'function');
  assert.equal(typeof module.getAttemptPayload, 'function');
  assert.equal(typeof module.renderFeedback, 'function');
  assert.equal(Object.isFrozen(module), true);
  assert.equal(Object.isFrozen(module.levels), true);
});

test('rejects missing or empty game IDs', () => {
  assert.throws(() => StemGameModule.create(validConfig({ gameId: '' })), /gameId is required/);
  assert.throws(() => StemGameModule.create(validConfig({ gameId: 123 })), /gameId is required/);
});

test('rejects missing or empty level data', () => {
  assert.throws(() => StemGameModule.create(validConfig({ levels: [] })), /non-empty levels array/);
  assert.throws(() => StemGameModule.create(validConfig({ levels: null })), /non-empty levels array/);
});

test('rejects modules missing required methods', () => {
  for (const method of ['loadLevel', 'reset', 'getAttemptPayload', 'renderFeedback']) {
    const config = validConfig();
    delete config[method];
    assert.throws(() => StemGameModule.create(config), new RegExp(`Game module method missing: ${method}`));
  }
});

test('copies the level array so later source mutations do not change the module', () => {
  const levels = [{ title: 'Original' }];
  const module = StemGameModule.create(validConfig({ levels }));
  levels.push({ title: 'Unexpected' });
  assert.equal(module.levels.length, 1);
});
