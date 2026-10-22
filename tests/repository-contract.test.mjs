import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
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

test('Phase 8 game registry preserves existing games and keeps new games disabled', () => {
  const source = ['019_game_registry.sql', '020_common_attempt_boundary.sql']
    .map(file => fs.readFileSync(path.join(repositoryRoot, 'supabase', 'migrations', file), 'utf8'))
    .join('\n');
  assert.match(source, /alter type public\.game_id add value if not exists 'chemistry'/);
  assert.match(source, /create table if not exists public\.games/);
  assert.match(source, /'physics'.*true/s);
  assert.match(source, /'robo_maze'.*true/s);
  assert.match(source, /'chemistry'.*false/s);
});

test('Phase 8 exposes one common attempt boundary over existing validators', () => {
  const source = fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', '020_common_attempt_boundary.sql'),
    'utf8',
  );
  assert.match(source, /submit_game_attempt_idempotent/);
  assert.match(source, /submit_robo_maze_attempt_idempotent/);
  assert.match(source, /submit_physics_attempt_idempotent/);
  assert.match(source, /No authoritative validator is enabled/);
});

test('frontend game registry exposes stable routes and feature flags', () => {
  const source = fs.readFileSync(path.join(repositoryRoot, 'js', 'game-registry.js'), 'utf8');
  assert.match(source, /gameId: "physics"/);
  assert.match(source, /gameId: "robo_maze"/);
  assert.match(source, /gameId: "submarine_math"/);
  assert.match(source, /gameId: "signal_decrypter"/);
  assert.match(source, /gameId: "chemistry"/);
  assert.match(source, /enabled: false/);
  assert.match(source, /levelCount\(gameId\)/);
});

test('Signal Decrypter is registered across the dashboard, module boundary, and authoritative migration', () => {
  const dashboard = fs.readFileSync(path.join(repositoryRoot, 'dashboard.html'), 'utf8');
  const dashboardScript = fs.readFileSync(path.join(repositoryRoot, 'js', 'dashboard.js'), 'utf8');
  const page = fs.readFileSync(path.join(repositoryRoot, 'SignalDecrypter', 'index.html'), 'utf8');
  const module = fs.readFileSync(path.join(repositoryRoot, 'SignalDecrypter', 'module.js'), 'utf8');
  const migration = fs.readFileSync(path.join(repositoryRoot, 'supabase', 'migrations', '028_signal_decrypter_game.sql'), 'utf8');

  assert.match(dashboard, /id="signalGameButton"/);
  assert.match(dashboardScript, /signal_decrypter/);
  assert.match(page, /Signal Decrypter/);
  assert.match(module, /StemGameModule.create/);
  assert.match(migration, /signal_decrypter_answer_keys/);
  assert.match(migration, /submit_signal_decrypter_attempt_idempotent/);
  assert.match(migration, /p_game_id = 'signal_decrypter'/);
});

test('Submarine Math backend validates canonical answers and awards server-owned progress', () => {
  const names = ['021_submarine_math_game_id.sql', '022_submarine_math_registry.sql',
    '023_submarine_math_validator.sql', '024_submarine_math_rewards.sql',
    '025_submarine_mission_routes.sql', '026_submarine_target_guidance.sql'];
  const migrations = names.map(file => fs.readFileSync(
    path.join(repositoryRoot, 'supabase', 'migrations', file), 'utf8')).join('\n');
  assert.match(migrations, /add value if not exists 'submarine_math'/);
  assert.match(migrations, /validator_key = 'submarine_math'/);
  assert.match(migrations, /p_level_number not between 1 and 15/);
  assert.match(migrations, /create table if not exists public\.submarine_math_answer_keys/);
  assert.match(migrations, /revoke all on table public\.submarine_math_answer_keys from public, anon, authenticated/);
  assert.match(migrations, /select correct_answer into expected_answer/);
  assert.doesNotMatch(migrations, /\"correctAnswer\"/);
  assert.match(migrations, /p_level_number - 1 and status = 'completed'/);
  assert.match(migrations, /submit_submarine_math_attempt_idempotent/);
  assert.match(migrations, /attempts = 1 then stars := 3/);
  assert.match(migrations, /base_xp := 50/);
  assert.match(migrations, /incorrect_route/);
  assert.match(migrations, /maxDistance/);
});

test('Submarine Math target depths match answers and allow visible movement', () => {
  const context = { window: {} };
  vm.runInNewContext(fs.readFileSync(
    path.join(repositoryRoot, 'SubmarineMath', 'levels.js'), 'utf8'), context);
  const levels = context.window.SubmarineMathLevels;

  levels.forEach(level => assert.equal(level.targetDepth, level.numericVal,
    'Level ' + level.id + ' target must match its answer destination'));
  [2, 10, 11].forEach(levelNumber => {
    const level = levels[levelNumber - 1];
    assert.notEqual(level.startDepth, level.targetDepth,
      'Level ' + levelNumber + ' should move the submarine to its target');
  });
  assert.deepEqual(Array.from(levels[0].moves), [10]);
  assert.deepEqual(Array.from(levels[14].moves), [-24, 18, 12, 24]);
  assert.equal(levels[14].targetDepth, 0, 'Final mission must dock at sea level');
});

test('Submarine Math is linked from the dashboard and protected by the shared sign-in gate', () => {
  const dashboard = fs.readFileSync(path.join(repositoryRoot, 'dashboard.html'), 'utf8');
  const dashboardScript = fs.readFileSync(path.join(repositoryRoot, 'js', 'dashboard.js'), 'utf8');
  const page = fs.readFileSync(path.join(repositoryRoot, 'SubmarineMath', 'index.html'), 'utf8');
  const auth = fs.readFileSync(path.join(repositoryRoot, 'SubmarineMath', 'auth.js'), 'utf8');

  assert.match(dashboard, /id="submarineGameButton"/);
  assert.match(dashboardScript, /submarine_math/);
  assert.match(page, /src="game.js"/);
  assert.match(page, /aria-label="Submarine depth navigation"/);
  assert.doesNotMatch(page, /\son(?:click|change|input|load)=/i);
  assert.doesNotMatch(page, /<script>([\s\S]*?)<\/script>/i);
  assert.match(auth, /init\('submarine_math', \{ requireSession: true \}\)/);
});

test('game modules support optional tutor and mistake adapters', () => {
  const source = fs.readFileSync(path.join(repositoryRoot, 'js', 'game-module.js'), 'utf8');
  assert.match(source, /getMistakeCategory/);
  assert.match(source, /buildTutorContext/);
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
