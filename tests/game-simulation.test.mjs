import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadClassicScript(relativePath, resultExpression) {
  const context = {};
  context.window = context;
  vm.createContext(context);
  const source = fs.readFileSync(path.join(root, relativePath), 'utf8')
    .replace(/export\s*\{[^}]+\};?/g, '');
  return vm.runInContext(`${source}\n${resultExpression}`, context);
}

function plain(value) {
  return JSON.parse(JSON.stringify(value));
}

const roboLevels = loadClassicScript('RoboMaze/levels.js', 'LEVELS');
const robo = loadClassicScript('RoboMaze/simulation.js', 'RoboMazeSimulation');
const physics = loadClassicScript('PhysicsSim/simulation.js', 'PhysicsSimulation');

test('RoboMaze exposes the compact 15-level expo path', () => {
  assert.equal(roboLevels.length, 15);
  assert.deepEqual(plain(roboLevels[0].start), { x: 1, y: 1, dir: 1 });
});

test('RoboMaze expands loops while preserving original command indexes', () => {
  const steps = robo.expandProgramToSteps([
    { type: 'FORWARD', count: 1 },
    { type: 'REPEAT_FORWARD', count: 3 },
    { type: 'TURN_RIGHT', count: 1 },
  ]);

  assert.deepEqual(plain(steps), [
    { action: 'FORWARD', originalIndex: 0 },
    { action: 'FORWARD', originalIndex: 1 },
    { action: 'FORWARD', originalIndex: 1 },
    { action: 'FORWARD', originalIndex: 1 },
    { action: 'TURN_RIGHT', originalIndex: 2 },
  ]);
});

test('RoboMaze calculates orientation-aware next positions', () => {
  assert.deepEqual(plain(robo.nextPosition({ x: 2, y: 2, dir: 0 })), { x: 2, y: 1 });
  assert.deepEqual(plain(robo.nextPosition({ x: 2, y: 2, dir: 1 })), { x: 3, y: 2 });
  assert.deepEqual(plain(robo.nextPosition({ x: 2, y: 2, dir: 2 })), { x: 2, y: 3 });
  assert.deepEqual(plain(robo.nextPosition({ x: 2, y: 2, dir: 3 })), { x: 1, y: 2 });
});

test('RoboMaze detects walls, open cells, and goals', () => {
  const grid = [[0, 1], [0, 2]];
  assert.equal(robo.isBlocked(grid, { x: 1, y: 0 }), true);
  assert.equal(robo.isBlocked(grid, { x: 0, y: 0 }), false);
  assert.equal(robo.isBlocked(grid, { x: -1, y: 0 }), true);
  assert.equal(robo.isGoal(grid, { x: 1, y: 1 }), true);
});

test('PhysicsSim initializes a projectile with correct direction', () => {
  const ball = physics.createBall({ angleDeg: 45, speedMps: 20, originX: 50, groundY: 280, scale: 10 });
  assert.equal(ball.x, 50);
  assert.equal(ball.y, 280);
  assert.ok(ball.vx > 0);
  assert.ok(ball.vy < 0);
  assert.equal(ball.trail.length, 1);
});

test('PhysicsSim advances time, position, trail, and apex', () => {
  const ball = physics.createBall({ angleDeg: 45, speedMps: 20, originX: 50, groundY: 280, scale: 10 });
  physics.advance(ball, { dt: 0.025, useDrag: false, gravity: 9.8, scale: 10, dragCoefficient: 0.0018 });
  assert.equal(ball.elapsedTime, 0.025);
  assert.ok(ball.x > 50);
  assert.ok(ball.y < 280);
  assert.ok(ball.maxY < 280);
  assert.equal(ball.trail.length, 2);
});

test('PhysicsSim drag reduces horizontal velocity', () => {
  const withoutDrag = physics.createBall({ angleDeg: 45, speedMps: 20, originX: 50, groundY: 280, scale: 10 });
  const withDrag = physics.createBall({ angleDeg: 45, speedMps: 20, originX: 50, groundY: 280, scale: 10 });
  physics.advance(withoutDrag, { dt: 0.025, useDrag: false, gravity: 9.8, scale: 10, dragCoefficient: 0.0018 });
  physics.advance(withDrag, { dt: 0.025, useDrag: true, gravity: 9.8, scale: 10, dragCoefficient: 0.0018 });
  assert.ok(withDrag.vx < withoutDrag.vx);
});

test('PhysicsSim selects captured, ring, or missed results', () => {
  const rings = [
    { r: 1, stars: 3 },
    { r: 2.2, stars: 2 },
    { r: 3.5, stars: 1 },
  ];
  assert.equal(physics.ringForDistance(0.5, rings, 3.5).stars, 3);
  assert.equal(physics.ringForDistance(1.8, rings, 3.5).stars, 2);
  assert.equal(physics.ringForDistance(4, rings, 3.5), undefined);
});
