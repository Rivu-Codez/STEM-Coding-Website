-- Read-only backend verification.
-- Run this in Supabase Dashboard > SQL Editor after migrations 001-017 are applied.
-- This file must not contain INSERT, UPDATE, DELETE, or ALTER statements.

-- 1. Required authoritative functions should exist.
select to_regprocedure('public.submit_robo_maze_attempt(integer,jsonb)') as robo_maze_function,
       to_regprocedure('public.submit_physics_attempt(integer,jsonb)') as physics_function,
       to_regprocedure('public.submit_robo_maze_attempt_idempotent(uuid,integer,jsonb)') as robo_maze_idempotent_function,
       to_regprocedure('public.submit_physics_attempt_idempotent(uuid,integer,jsonb)') as physics_idempotent_function,
       to_regprocedure('public.record_authoritative_achievement(public.game_id,integer)') as achievement_function,
       to_regprocedure('public.reserve_tutor_quota(uuid,integer)') as quota_reserve_function,
       to_regprocedure('public.refund_tutor_quota(uuid)') as quota_refund_function;

-- 2. These tables must have Row Level Security enabled.
select n.nspname as schema_name,
       c.relname as table_name,
       c.relrowsecurity as rls_enabled,
       c.relforcerowsecurity as rls_forced
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in (
    'profiles', 'level_progress', 'level_attempts', 'mistake_events',
    'ai_insights', 'student_achievements', 'tutor_quota_events'
  )
order by c.relname;

-- 3. Inspect policies that should isolate user-owned rows.
select schemaname, tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in (
    'profiles', 'level_progress', 'level_attempts', 'mistake_events',
    'ai_insights', 'student_achievements', 'tutor_quota_events'
  )
order by tablename, policyname;

-- 4. Confirm authenticated users can execute only the intended public procedures.
select routine_schema, routine_name, specific_name, grantee, privilege_type
from information_schema.routine_privileges
where routine_schema = 'public'
  and grantee = 'authenticated'
  and routine_name in (
    'submit_robo_maze_attempt', 'submit_physics_attempt',
    'submit_robo_maze_attempt_idempotent', 'submit_physics_attempt_idempotent',
    'record_authoritative_achievement', 'reserve_tutor_quota', 'refund_tutor_quota'
  )
order by routine_name, specific_name;

-- 5. Canonical game configuration should contain 30 levels for each game.
select game_id, count(*) as level_count,
       min(level_number) as first_level,
       max(level_number) as last_level
from public.game_levels
group by game_id
order by game_id;

-- 6. These constraints/indexes support duplicate-safe progression records.
select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('level_progress', 'level_attempts', 'student_achievements', 'tutor_quota_events')
order by tablename, indexname;
