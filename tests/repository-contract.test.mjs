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
