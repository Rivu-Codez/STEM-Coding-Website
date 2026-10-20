-- Server-owned stars and XP. The client identifies the level only; all reward
-- inputs come from a server-validated success attempt and canonical config.

update public.game_levels
set configuration = configuration || '{"maxBlocks":8}'::jsonb
where game_id = 'robo_maze' and level_number in (13, 16, 19, 28);

update public.game_levels
set configuration = configuration || '{"maxBlocks":10}'::jsonb
where game_id = 'robo_maze' and level_number in (23, 24, 25);

create or replace function public.record_authoritative_achievement(
  p_game_id public.game_id,
  p_level_number integer
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  progress_row public.level_progress;
  attempt_row public.level_attempts;
  existing_row public.student_achievements;
  level_config jsonb;
  best_result jsonb;
  metric numeric;
  target_distance numeric;
  tolerance numeric;
  delta numeric;
  star_limit integer;
  attempts integer;
  stars integer;
  base_xp integer;
  xp integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_level_number not between 1 and 30 then raise exception 'Invalid level'; end if;

  select * into progress_row
  from public.level_progress
  where user_id = current_user_id and game_id = p_game_id
    and level_number = p_level_number and status = 'completed';
  if not found then raise exception 'Level has not been server-completed'; end if;

  select configuration into level_config
  from public.game_levels
  where game_id = p_game_id and level_number = p_level_number;

  select * into attempt_row
  from public.level_attempts
  where user_id = current_user_id and game_id = p_game_id
    and level_number = p_level_number and result = 'success'
    and coalesce(attempt_data->>'serverValidated', attempt_data->>'server_validated') = 'true'
  order by created_at desc
  limit 1;
  if not found then raise exception 'No server-validated success attempt'; end if;

  best_result := attempt_row.attempt_data;
  attempts := greatest(progress_row.attempt_count, 1);

  if p_game_id = 'physics' then
    metric := (best_result->>'distance')::numeric;
    target_distance := (level_config->>'targetDistance')::numeric;
    tolerance := coalesce(nullif(level_config->>'targetTolerance', '')::numeric, 3.5);
    delta := abs(metric - target_distance);
    if delta <= 1.2 then stars := 3; base_xp := 100;
    elsif delta <= least(2.2, tolerance) then stars := 2; base_xp := 50;
    else stars := 1; base_xp := 25;
    end if;
  else
    metric := jsonb_array_length(coalesce(best_result->'program', '[]'::jsonb));
    star_limit := coalesce((level_config->>'maxBlocks')::integer, 12);
    if metric <= star_limit then stars := 3;
    elsif metric <= star_limit + 2 then stars := 2;
    else stars := 1;
    end if;
    base_xp := 50;
  end if;

  xp := greatest(10, round(base_xp * power(0.75, floor((attempts - 1)::numeric / 3)))::integer);

  select * into existing_row
  from public.student_achievements
  where user_id = current_user_id and game_id = p_game_id
    and level_number = p_level_number;
  if found then
    return jsonb_build_object('recorded', true, 'awarded', false,
      'stars', existing_row.stars, 'xp', existing_row.xp, 'attempts', existing_row.attempts);
  end if;

  insert into public.student_achievements
    (user_id, game_id, level_number, stars, xp, attempts, concept_completed, best_result)
  values
    (current_user_id, p_game_id, p_level_number, stars, xp, attempts, true, best_result);

  return jsonb_build_object('recorded', true, 'awarded', true,
    'stars', stars, 'xp', xp, 'attempts', attempts);
end;
$$;

revoke all on function public.record_authoritative_achievement(public.game_id, integer) from public;
grant execute on function public.record_authoritative_achievement(public.game_id, integer) to authenticated;
