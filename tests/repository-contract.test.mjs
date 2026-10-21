import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectMigrationNumbers, verifyRepository } from '../scripts/verify-repo.mjs';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

test('repository verification passes', () => {
  assert.deepEqual(verifyRepository(repositoryRoot), []);
});

test('migrations are numbered without gaps', () => {
  const numbers = collectMigrationNumbers(path.join(repositoryRoot, 'supabase', 'migrations'));
  assert.deepEqual(numbers, numbers.map((_, index) => index + 1));
});

test('authoritative progression migrations expose server-owned procedures', () => {
  const migrations = [
    '007_robo_maze_authoritative_attempts.sql',
    '008_physics_authoritative_attempts.sql',
    '009_authoritative_achievements.sql',
  ];

  const source = migrations
    .map((file) => fs.readFileSync(path.join(repositoryRoot, 'supabase', 'migrations', file), 'utf8'))
    .join('\n');

  assert.match(source, /submit_robo_maze_attempt/);
  assert.match(source, /submit_physics_attempt/);
  assert.match(source, /record_authoritative_achievement/);
});

test('legacy client-trusted RPCs are revoked after authoritative migration', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '011_revoke_legacy_client_rpcs.sql'),
    'utf8',
  );
  assert.match(source, /record_game_attempt/);
  assert.match(source, /record_student_achievement/);
  assert.match(source, /consume_tutor_quota/);
  assert.match(source, /from public, authenticated, anon/);
});

test('attempt idempotency wrappers protect authoritative validators', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '012_attempt_idempotency.sql'),
    'utf8',
  );
  assert.match(source, /create table public\.attempt_receipts/);
  assert.match(source, /submit_robo_maze_attempt_idempotent/);
  assert.match(source, /submit_physics_attempt_idempotent/);
  assert.match(source, /on conflict \(user_id, game_id, attempt_id\) do nothing/);
  assert.match(source, /submit_robo_maze_attempt\(p_level_number, p_program\)/);
  assert.match(source, /submit_physics_attempt\(p_level_number, p_attempt_data\)/);
  assert.match(source, /already deployed frontend does not break/);
});

test('final authoritative RPC cleanup is explicitly deployment-gated', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '013_revoke_direct_authoritative_rpcs.sql'),
    'utf8',
  );
  assert.match(source, /Apply only after the frontend/);
  assert.match(source, /submit_robo_maze_attempt\(integer, jsonb\)/);
  assert.match(source, /submit_physics_attempt\(integer, jsonb\)/);
  assert.match(source, /from public, authenticated, anon/);
});

test('tutor reliability contract includes retry states and quota refund', () => {
  const functionSource = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'functions', 'analyze-mistake', 'handler.ts'),
    'utf8',
  );
  const quotaMigration = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '010_tutor_quota_refunds.sql'),
    'utf8',
  );

  for (const state of ['AI_SUCCESS', 'AI_RATE_LIMITED', 'AI_TEMPORARILY_UNAVAILABLE', 'AI_INVALID_RESPONSE']) {
    assert.match(functionSource, new RegExp(state));
  }
  assert.match(quotaMigration, /refund_tutor_quota/);
});

test('creator migration protects drafts and validates published mazes', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '014_creator_levels.sql'),
    'utf8',
  );
  assert.match(source, /create table public\.creator_levels/);
  assert.match(source, /create table public\.creator_level_attempts/);
  assert.match(source, /create table public\.creator_level_progress/);
  assert.match(source, /alter table public\.creator_levels enable row level security/);
  assert.match(source, /validate_creator_level/);
  assert.match(source, /Grid must be exactly 8 by 8/);
  assert.match(source, /goal must be reachable/i);
  assert.match(source, /publish_creator_level/);
  assert.match(source, /submit_creator_level_attempt/);
  assert.match(source, /server_validated/);
  assert.match(source, /share_code/);
  assert.match(source, /revoke all on function public\.publish_creator_level/);
});

test('creator academy page and modules are present', () => {
  assert.equal(fs.existsSync(path.join(repositoryRoot, 'RoboMaze', 'creator.html')), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, 'RoboMaze', 'creator', 'creator-controller.js')), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, 'RoboMaze', 'creator', 'creator-grid.js')), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, 'RoboMaze', 'creator', 'creator-api.js')), true);
  assert.equal(fs.existsSync(path.join(repositoryRoot, 'RoboMaze', 'creator', 'creator-program.js')), true);
  const creatorLevels = fs.readFileSync(path.join(repositoryRoot, 'RoboMaze', 'creator', 'creator-levels.js'), 'utf8');
  assert.match(creatorLevels, /Obstacle Geometry/);
  assert.doesNotMatch(creatorLevels, /Dynamic Trajectory/);
});

test('integrated creator player uses the owner-read RPC', () => {
  const migration = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '015_creator_level_read_rpc.sql'),
    'utf8',
  );
  const api = fs.readFileSync(
    path.join(repositoryRoot, 'RoboMaze', 'creator', 'creator-api.js'),
    'utf8',
  );
  const page = fs.readFileSync(path.join(repositoryRoot, 'RoboMaze', 'index.html'), 'utf8');
  assert.match(migration, /create or replace function public\.get_my_creator_level/);
  assert.match(migration, /grant execute on function public\.get_my_creator_level\(integer\) to authenticated/);
  assert.match(api, /rpc\('get_my_creator_level'/);
  assert.match(page, /data-creator-level="31"/);
});

test('all creator levels bypass the legacy canonical-level lock after academy unlock', () => {
  const ui = fs.readFileSync(path.join(repositoryRoot, 'RoboMaze', 'ui.js'), 'utf8');
  assert.match(ui, /isActive\?\.\(\) && nextIndex >= 30/);
});

test('creator validation fix qualifies recursive walk columns', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '016_fix_creator_validation_walk.sql'),
    'utf8',
  );
  assert.match(source, /walk\.x = goal_x/);
  assert.match(source, /walk\.x \+ 1, walk\.y/);
});

test('creator challenge constraints are enforced by the database trigger', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '017_creator_challenge_constraints.sql'),
    'utf8',
  );
  const page = fs.readFileSync(path.join(repositoryRoot, 'RoboMaze', 'index.html'), 'utf8');
  assert.match(source, /enforce_creator_level_constraints/);
  assert.match(source, /Level 33 requires at least 1 wall obstacle/);
  assert.match(source, /Level 34 requires at least 3 wall obstacles/);
  for (const level of [31, 32, 33, 34, 35]) {
    assert.match(page, new RegExp(`data-creator-level="${level}"`));
  }
});

test('creator debugging requires a failed Level 34 attempt before success', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '018_creator_debug_gate.sql'),
    'utf8',
  );
  assert.match(source, /enforce_creator_debug_gate/);
  assert.match(source, /NEW\.result <> 'success'/);
  assert.match(source, /prior_attempt\.result in \('collision', 'miss'\)/);
  assert.match(source, /Level 34 requires a failed debugging attempt before success/);
});
