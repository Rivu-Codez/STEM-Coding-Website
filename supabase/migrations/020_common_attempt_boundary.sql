-- Phase 8: registry metadata and one submission boundary for all enabled games.
-- Game-specific validators remain authoritative and are dispatched internally.

create table if not exists public.games (
  game_id public.game_id primary key,
  display_name text not null,
  description text not null,
  route text not null,
  level_count integer not null default 0 check (level_count >= 0),
  validator_key text,
  icon text,
  enabled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((enabled = false) or (level_count > 0 and validator_key is not null))
);

insert into public.games
  (game_id, display_name, description, route, level_count, validator_key, icon, enabled)
values
  ('physics', 'Physics Kinematics Lab', 'Explore speed, angles, distance, and trajectory through experiments.', 'PhysicsSim/index.html', 15, 'physics', '⚡', true),
  ('robo_maze', 'RoboLogic Maze', 'Plan routes, practise logic, and teach a robot to solve the maze.', 'RoboMaze/index.html', 15, 'robo_maze', '▦', true),
  ('chemistry', 'Chemistry Lab', 'Experiment with reactions, matter, and the building blocks of chemistry.', 'Chemistry/index.html', 0, null, '⚗', false),
  ('biology', 'Biology & Environment Lab', 'Discover living systems, ecosystems, and practical environmental science.', 'Biology/index.html', 0, null, '✦', false)
on conflict (game_id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  route = excluded.route,
  level_count = excluded.level_count,
  validator_key = excluded.validator_key,
  icon = excluded.icon,
  enabled = excluded.enabled,
  updated_at = now();

alter table public.games enable row level security;
drop policy if exists games_select_authenticated on public.games;
create policy games_select_authenticated
  on public.games for select to authenticated using (true);

comment on table public.games is 'Registry metadata and release flags for every STEM game.';
comment on column public.games.enabled is 'A game is playable only after levels and an authoritative validator are ready.';

create or replace function public.submit_game_attempt_idempotent(
  p_game_id public.game_id,
  p_attempt_id uuid,
  p_level_number integer,
  p_attempt_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_game_id = 'robo_maze' then
    if jsonb_typeof(p_attempt_data) <> 'object' or jsonb_typeof(p_attempt_data->'program') <> 'array' then
      raise exception 'RoboMaze program payload is required';
    end if;
    return public.submit_robo_maze_attempt_idempotent(
      p_attempt_id, p_level_number, p_attempt_data->'program'
    );
  elsif p_game_id = 'physics' then
    return public.submit_physics_attempt_idempotent(
      p_attempt_id, p_level_number, p_attempt_data
    );
  else
    raise exception 'No authoritative validator is enabled for this game';
  end if;
end;
$$;

revoke all on function public.submit_game_attempt_idempotent(public.game_id, uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_game_attempt_idempotent(public.game_id, uuid, integer, jsonb)
  to authenticated;
