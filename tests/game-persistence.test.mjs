import test from 'node:test';
import assert from 'node:assert/strict';
import { createGamePersistence } from '../js/game-persistence.js';

test('persistence fails closed when platform services are unavailable', async () => {
  const persistence = createGamePersistence({ gameId: 'physics', auth: null, progress: null });
  assert.equal(persistence.isLevelUnlocked(0), false);
  assert.deepEqual(await persistence.submitAttempt(0, 'success'), {
    ok: false,
    error: 'Authentication is unavailable.',
  });
});

test('persistence delegates level-indexed operations to the game boundary', async () => {
  const calls = [];
  const progress = {
    isLevelUnlocked(index) { calls.push(['unlock', index]); return true; },
    restoreCheckpoint(index) { calls.push(['restore', index]); return Promise.resolve({ failures: [] }); },
    submitAttempt(...args) { calls.push(['submit', ...args]); return Promise.resolve({ ok: true }); },
    recordMistake(...args) { calls.push(['mistake', ...args]); return Promise.resolve({ ok: true }); },
    analyzeMistake(...args) { calls.push(['analyze', ...args]); return Promise.resolve(null); },
    recordAchievement(index) { calls.push(['achievement', index]); return Promise.resolve({ ok: true }); },
  };
  const persistence = createGamePersistence({ gameId: 'robo_maze', auth: {}, progress });

  assert.equal(persistence.isLevelUnlocked(2), true);
  await persistence.restoreCheckpoint(2);
  await persistence.submitAttempt(2, 'miss', 'collision', { step: 1 });
  await persistence.recordMistake(2, 'wall_collision', {});
  await persistence.analyzeMistake(2, 'wall_collision', {});
  await persistence.recordAchievement(2);

  assert.deepEqual(calls.map(([name, ...args]) => [name, ...args]), [
    ['unlock', 2],
    ['restore', 2],
    ['submit', 2, 'miss', 'collision', { step: 1 }],
    ['mistake', 2, 'wall_collision', {}],
    ['analyze', 2, 'wall_collision', {}],
    ['achievement', 2],
  ]);
});
