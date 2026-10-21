import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

function loadMissionRuntime() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('SubmarineMath/levels.js', 'utf8'), context);
  vm.runInContext(fs.readFileSync('SubmarineMath/mission-engine.js', 'utf8'), context);
  return { levels: context.window.SubmarineMathLevels, engine: context.window.SubmarineMissionEngine };
}

test('mission route parser normalizes signed routes and rejects zero moves', () => {
  const { engine } = loadMissionRuntime();
  assert.deepEqual(Array.from(engine.parseRoute(' +25, -10, +15 ').moves), [25, -10, 15]);
  assert.equal(engine.parseRoute('+25,0,+15').ok, false);
  assert.equal(engine.parseRoute('25,-10').ok, false);
});

test('valid target mission calculates and reaches the first target', () => {
  const { levels, engine } = loadMissionRuntime();
  const result = engine.validateRoute(levels[0], '+20');
  assert.equal(result.ok, false);
  const valid = engine.validateRoute(levels[0], '+10');
  assert.equal(valid.ok, true);
  assert.deepEqual(Array.from(valid.positions), [-10]);
  assert.equal(valid.finalDepth, -10);
});

test('mission rejects routes that cross above sea level', () => {
  const { levels, engine } = loadMissionRuntime();
  const result = engine.validateRoute({ ...levels[0], moves: [40], checkpoints: [5] }, '+40');
  assert.equal(result.code, 'above_surface');
});

test('mission rejects a wrong route even when its move count matches', () => {
  const { levels, engine } = loadMissionRuntime();
  const result = engine.validateRoute(levels[0], '-10');
  assert.equal(result.code, 'wrong_move');
  assert.match(result.message, /Move 1/);
});

test('fuel limits and hazards are enforced', () => {
  const { levels, engine } = loadMissionRuntime();
  const fuel = engine.validateRoute({ ...levels[11], maxDistance: 20 }, '+20,-10,+15');
  assert.equal(fuel.code, 'fuel');
  const hazard = engine.validateRoute({ ...levels[9], hazards: [{ min: -36, max: -34 }] }, '+20,+15,-10,+30');
  assert.equal(hazard.code, 'hazard');
});
