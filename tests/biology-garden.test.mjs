import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEngine() {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root, 'Biology/engine.js'), 'utf8'), context);
  return context.window.BiologyGardenEngine;
}

test('Biology Garden starts with a seed and bounded resources', () => {
  const engine = loadEngine();
  const garden = engine.createGarden();
  assert.equal(garden.stage, 'seed');
  assert.equal(garden.day, 1);
  assert.ok(garden.health >= 0 && garden.health <= 100);
});

test('care plans predict resource changes and reject more than three actions', () => {
  const engine = loadEngine();
  const garden = engine.createGarden();
  const predicted = engine.predict(garden, ['water', 'sunlight', 'nutrients']);
  assert.ok(predicted.moisture > garden.moisture);
  assert.ok(predicted.light > garden.light);
  assert.throws(() => engine.advance(garden, ['water', 'water', 'water', 'water']), /three/);
});

test('advancing a balanced plan moves through day and night phases', () => {
  const engine = loadEngine();
  const garden = engine.createGarden();
  const night = engine.advance(garden, ['water', 'sunlight', 'nutrients']);
  assert.equal(night.phase, 'night');
  const morning = engine.advance(night, ['observe']);
  assert.equal(morning.phase, 'day');
  assert.equal(morning.day, 2);
});

test('repeated watering creates recoverable stress', () => {
  const engine = loadEngine();
  const garden = engine.createGarden();
  const stressed = engine.advance(garden, ['water', 'water', 'sunlight']);
  assert.ok(stressed.health < garden.health);
  const recovered = engine.advance(stressed, ['sunlight', 'nutrients']);
  assert.ok(recovered.health >= 0);
});

test('Biology route, registry, dashboard entry, and migration are present', () => {
  const registry = fs.readFileSync(path.join(root, 'js/game-registry.js'), 'utf8');
  const dashboard = fs.readFileSync(path.join(root, 'dashboard.html'), 'utf8');
  const migration = fs.readFileSync(path.join(root, 'supabase/migrations/033_biology_garden.sql'), 'utf8');
  assert.match(registry, /gameId: "biology"/);
  assert.match(registry, /progressionMode: "stateful"/);
  assert.match(dashboard, /id="biologyGameButton"/);
  assert.match(migration, /create table if not exists public\.biology_gardens/);
  assert.match(migration, /submit_biology_plan/);
  assert.match(migration, /student_achievements/);
});
