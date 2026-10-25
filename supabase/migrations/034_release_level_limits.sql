-- Keep the public Physics and RoboMaze paths aligned with their 15-level UI.
-- The remaining authored levels and existing student history are preserved.
update public.games
set level_count = 15, updated_at = now()
where game_id in ('physics', 'robo_maze');

-- Route browser submissions through the common boundary so the registry limit
-- is applied before either legacy validator can accept a hidden level.
revoke all on function public.submit_robo_maze_attempt_idempotent(uuid, integer, jsonb)
  from public, anon, authenticated;
revoke all on function public.submit_physics_attempt_idempotent(uuid, integer, jsonb)
  from public, anon, authenticated;

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
declare
  released_level_count integer;
  game_enabled boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_attempt_id is null then raise exception 'Attempt ID is required'; end if;

  select level_count, enabled into released_level_count, game_enabled
  from public.games
  where game_id = p_game_id;
  if not found or not game_enabled then
    raise exception 'No authoritative validator is enabled for this game';
  end if;
  if p_level_number is null or p_level_number < 1 or p_level_number > released_level_count then
    raise exception 'Level is outside the released game path';
  end if;

  if p_game_id = 'robo_maze' then
    if jsonb_typeof(p_attempt_data) <> 'object' or jsonb_typeof(p_attempt_data->'program') <> 'array' then
      raise exception 'RoboMaze program payload is required';
    end if;
    return public.submit_robo_maze_attempt_idempotent(
      p_attempt_id, p_level_number, p_attempt_data->'program'
    );
  elsif p_game_id = 'physics' then
    return public.submit_physics_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  elsif p_game_id = 'submarine_math' then
    return public.submit_submarine_math_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  elsif p_game_id = 'signal_decrypter' then
    return public.submit_signal_decrypter_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  elsif p_game_id = 'chemistry' then
    return public.submit_chemistry_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  end if;
  raise exception 'No authoritative validator is enabled for this game';
end;
$$;

revoke all on function public.submit_game_attempt_idempotent(public.game_id, uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_game_attempt_idempotent(public.game_id, uuid, integer, jsonb)
  to authenticated;

-- Keep the legacy reward logic internal and enforce each game's release limit
-- before it can award stars or XP for a hidden level.
alter function public.record_authoritative_achievement(public.game_id, integer)
  rename to record_authoritative_achievement_internal;
revoke all on function public.record_authoritative_achievement_internal(public.game_id, integer)
  from public, anon, authenticated;

create function public.record_authoritative_achievement(
  p_game_id public.game_id,
  p_level_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  released_level_count integer;
  game_enabled boolean;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select level_count, enabled into released_level_count, game_enabled
  from public.games
  where game_id = p_game_id;
  if not found or not game_enabled then raise exception 'Game is not enabled'; end if;
  if p_level_number is null or p_level_number < 1 or p_level_number > released_level_count then
    raise exception 'Level is outside the released game path';
  end if;
  return public.record_authoritative_achievement_internal(p_game_id, p_level_number);
end;
$$;

revoke all on function public.record_authoritative_achievement(public.game_id, integer)
  from public, anon, authenticated;
grant execute on function public.record_authoritative_achievement(public.game_id, integer)
  to authenticated;
