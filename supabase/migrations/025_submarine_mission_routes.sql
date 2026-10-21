-- Replace symbol/numeric answers with server-validated multi-step submarine routes.
insert into public.submarine_math_answer_keys (level_number, correct_answer) values
  (1, '+15,+20'), (2, '+25,+15,+20'), (3, '-15,+10,+15'),
  (4, '+30,-20,+15'), (5, '-35,+20,+15'), (6, '+25,+20,-15,+10'),
  (7, '+30,+20,-10'), (8, '+15,-25,+10'), (9, '+35,+30,-20,+15'),
  (10, '+20,+15,-10,+30'), (11, '+30,+25,+20,-15'),
  (12, '+20,-10,+15'), (13, '+25,+15,-20,+10'),
  (14, '+24,+18,+30,-12'), (15, '-24,+18,+12,+24')
on conflict (level_number) do update set correct_answer = excluded.correct_answer;

update public.game_levels set title = 'Surface Dock Departure', instruction = 'Start at -35m. Go UP 15m, then UP 20m. Reach the surface.', configuration = '{"id":1,"section":1,"title":"Surface Dock Departure","startDepth":-35,"moves":[15,20],"checkpoints":[-20,0],"surfaceObjective":true,"targetDepth":0,"numericVal":0}'::jsonb where game_id = 'submarine_math' and level_number = 1;
update public.game_levels set title = 'Buoy Line Docking', instruction = 'Start at -60m. Go UP 25m, UP 15m, and UP 20m to reach 0m.', configuration = '{"id":2,"section":1,"title":"Buoy Line Docking","startDepth":-60,"moves":[25,15,20],"checkpoints":[-35,-20,0],"surfaceObjective":true,"targetDepth":0,"numericVal":0}'::jsonb where game_id = 'submarine_math' and level_number = 2;
update public.game_levels set title = 'Emergency Surface Route', instruction = 'Start at -10m. Go DOWN 15m, UP 10m, then UP 15m to reach the surface.', configuration = '{"id":3,"section":1,"title":"Emergency Surface Route","startDepth":-10,"moves":[-15,10,15],"checkpoints":[-25,-15,0],"surfaceObjective":true,"targetDepth":0,"numericVal":0}'::jsonb where game_id = 'submarine_math' and level_number = 3;
update public.game_levels set title = 'Current Correction', instruction = 'Start at -45m. Go UP 30m, DOWN 20m, then UP 15m.', configuration = '{"id":4,"section":2,"title":"Current Correction","startDepth":-45,"moves":[30,-20,15],"checkpoints":[-15,-35,-20],"targetDepth":-20,"numericVal":-20,"maxMoves":3}'::jsonb where game_id = 'submarine_math' and level_number = 4;
update public.game_levels set title = 'Deep Trench Turn', instruction = 'Start at -20m. Go DOWN 35m, UP 20m, then UP 15m.', configuration = '{"id":5,"section":2,"title":"Deep Trench Turn","startDepth":-20,"moves":[-35,20,15],"checkpoints":[-55,-35,-20],"targetDepth":-20,"numericVal":-20,"maxMoves":3}'::jsonb where game_id = 'submarine_math' and level_number = 5;
update public.game_levels set title = 'Four-Move Current Maze', instruction = 'From -70m, go UP 25m, UP 20m, DOWN 15m, and UP 10m.', configuration = '{"id":6,"section":2,"title":"Four-Move Current Maze","startDepth":-70,"moves":[25,20,-15,10],"checkpoints":[-45,-25,-40,-30],"targetDepth":-30,"numericVal":-30,"maxMoves":4}'::jsonb where game_id = 'submarine_math' and level_number = 6;
update public.game_levels set title = 'Surface-and-Return Drill', instruction = 'Start at -50m. Go UP 30m, UP 20m to touch the surface, then DOWN 10m.', configuration = '{"id":7,"section":3,"title":"Surface-and-Return Drill","startDepth":-50,"moves":[30,20,-10],"checkpoints":[-20,0,-10],"surfaceObjective":true,"targetDepth":-10,"numericVal":-10}'::jsonb where game_id = 'submarine_math' and level_number = 7;
update public.game_levels set title = 'Floodgate Recovery', instruction = 'Start at -15m. Go UP 15m, DOWN 25m, then UP 10m.', configuration = '{"id":8,"section":3,"title":"Floodgate Recovery","startDepth":-15,"moves":[15,-25,10],"checkpoints":[0,-25,-15],"surfaceObjective":true,"targetDepth":-15,"numericVal":-15}'::jsonb where game_id = 'submarine_math' and level_number = 8;
update public.game_levels set title = 'Blackwater Checkpoints', instruction = 'From -80m, visit four stops: UP 35m, UP 30m, DOWN 20m, UP 15m.', configuration = '{"id":9,"section":3,"title":"Blackwater Checkpoints","startDepth":-80,"moves":[35,30,-20,15],"checkpoints":[-45,-15,-35,-20],"targetDepth":-20,"numericVal":-20,"maxMoves":4}'::jsonb where game_id = 'submarine_math' and level_number = 9;
update public.game_levels set title = 'Rescue Dock Run', instruction = 'Start at -55m. Go UP 20m, UP 15m, DOWN 10m, then UP 30m to reach the dock.', configuration = '{"id":10,"section":4,"title":"Rescue Dock Run","startDepth":-55,"moves":[20,15,-10,30],"checkpoints":[-35,-20,-30,0],"surfaceObjective":true,"targetDepth":0,"numericVal":0,"hazards":[{"min":-18,"max":-12}]}'::jsonb where game_id = 'submarine_math' and level_number = 10;
update public.game_levels set title = 'Minefield Rescue', instruction = 'Start at -90m. Go UP 30m, UP 25m, UP 20m, then DOWN 15m. Avoid the mine band.', configuration = '{"id":11,"section":4,"title":"Minefield Rescue","startDepth":-90,"moves":[30,25,20,-15],"checkpoints":[-60,-35,-15,-30],"targetDepth":-30,"numericVal":-30,"hazards":[{"min":-55,"max":-45}]}'::jsonb where game_id = 'submarine_math' and level_number = 11;
update public.game_levels set title = 'Fuel-Efficient Patrol', instruction = 'Start at -40m. Go UP 20m, DOWN 10m, then UP 15m. Use 45m of fuel or less.', configuration = '{"id":12,"section":5,"title":"Fuel-Efficient Patrol","startDepth":-40,"moves":[20,-10,15],"checkpoints":[-20,-30,-15],"targetDepth":-15,"numericVal":-15,"maxDistance":45}'::jsonb where game_id = 'submarine_math' and level_number = 12;
update public.game_levels set title = 'Long-Range Survey', instruction = 'Start at -75m. Go UP 25m, UP 15m, DOWN 20m, then UP 10m. Use 70m or less.', configuration = '{"id":13,"section":5,"title":"Long-Range Survey","startDepth":-75,"moves":[25,15,-20,10],"checkpoints":[-50,-35,-55,-45],"targetDepth":-45,"numericVal":-45,"maxDistance":70}'::jsonb where game_id = 'submarine_math' and level_number = 13;
update public.game_levels set title = 'Engine Boost Calculations', instruction = 'Work out the four boosts, then enter the route: (-6 × -4), (54 ÷ 3), (15 × 2), (-36 ÷ 3).', configuration = '{"id":14,"section":6,"title":"Engine Boost Calculations","startDepth":-90,"moves":[24,18,30,-12],"checkpoints":[-66,-48,-18,-30],"targetDepth":-30,"numericVal":-30,"maxMoves":4}'::jsonb where game_id = 'submarine_math' and level_number = 14;
update public.game_levels set title = 'Final Surface Mission', instruction = 'Work out the four boosts, then enter the route to surface: (-8 × 3), (54 ÷ 3), (6 × 2), (48 ÷ 2).', configuration = '{"id":15,"section":6,"title":"Final Surface Mission","startDepth":-30,"moves":[-24,18,12,24],"checkpoints":[-54,-36,-24,0],"surfaceObjective":true,"targetDepth":0,"numericVal":0,"maxMoves":4}'::jsonb where game_id = 'submarine_math' and level_number = 15;

create or replace function public.submit_submarine_math_attempt(
  p_level_number integer,
  p_answer text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  expected_answer text;
  normalized_answer text;
  level_config jsonb;
  move_text text;
  move_value numeric;
  expected_move numeric;
  checkpoint numeric;
  depth numeric;
  distance numeric := 0;
  move_index integer := 0;
  attempt_total integer;
  is_correct boolean := false;
  result_code text;
  hazard jsonb;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_level_number not between 1 and 15 then raise exception 'Invalid Submarine Math level'; end if;
  if p_answer is null or length(p_answer) > 64 then raise exception 'Invalid route'; end if;
  if not exists (select 1 from public.games where game_id = 'submarine_math' and enabled = true and validator_key = 'submarine_math') then
    raise exception 'Submarine Math is not enabled';
  end if;
  if p_level_number > 1 and not exists (
    select 1 from public.level_progress where user_id = current_user_id and game_id = 'submarine_math'
      and level_number = p_level_number - 1 and status = 'completed'
  ) then raise exception 'Level is locked'; end if;

  select correct_answer into expected_answer from public.submarine_math_answer_keys where level_number = p_level_number;
  select configuration into level_config from public.game_levels where game_id = 'submarine_math' and level_number = p_level_number;
  if expected_answer is null or level_config is null then raise exception 'Mission is not configured'; end if;

  normalized_answer := regexp_replace(replace(replace(trim(p_answer), '−', '-'), '–', '-'), '\s+', '', 'g');
  if normalized_answer = expected_answer and normalized_answer ~ '^[+-][0-9]+(,[+-][0-9]+)*$' then
    is_correct := true;
    depth := (level_config->>'startDepth')::numeric;
    for move_text in select regexp_split_to_table(normalized_answer, ',') loop
      move_index := move_index + 1;
      move_value := move_text::numeric;
      expected_move := (level_config->'moves'->>(move_index - 1))::numeric;
      depth := depth + move_value;
      distance := distance + abs(move_value);
      if move_value <> expected_move or depth > 0 then is_correct := false; exit; end if;
      if level_config ? 'checkpoints' then
        checkpoint := (level_config->'checkpoints'->>(move_index - 1))::numeric;
        if checkpoint is not null and depth <> checkpoint then is_correct := false; exit; end if;
      end if;
      if level_config ? 'hazards' then
        for hazard in select value from jsonb_array_elements(level_config->'hazards') loop
          if depth between (hazard->>'min')::numeric and (hazard->>'max')::numeric then is_correct := false; exit; end if;
        end loop;
        if not is_correct and move_index > 0 then exit; end if;
      end if;
    end loop;
    if move_index = jsonb_array_length(level_config->'moves') and is_correct is not false then is_correct := true; end if;
    if level_config ? 'maxDistance' and distance > (level_config->>'maxDistance')::numeric then is_correct := false; end if;
  end if;

  result_code := case when is_correct then 'success' else 'miss' end;
  insert into public.level_attempts (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values (current_user_id, 'submarine_math', p_level_number, result_code,
    case when is_correct then null else 'incorrect_route' end,
    jsonb_build_object('answer', normalized_answer, 'serverValidated', true));

  if is_correct then
    insert into public.level_progress (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values (current_user_id, 'submarine_math', p_level_number, 'completed', now(), jsonb_build_object('answer', normalized_answer), 1)
    on conflict (user_id, game_id, level_number) do update set status = 'completed', completed_at = coalesce(level_progress.completed_at, now()), best_result = excluded.best_result, attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
    if p_level_number < 15 then
      insert into public.level_progress (user_id, game_id, level_number, status) values (current_user_id, 'submarine_math', p_level_number + 1, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end, updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count) values (current_user_id, 'submarine_math', p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end, attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
  end if;
  return jsonb_build_object('recorded', true, 'server_result', result_code, 'unlocked_next', is_correct and p_level_number < 15, 'attempt_count', attempt_total);
end;
$$;

revoke all on function public.submit_submarine_math_attempt(integer, text) from public, anon, authenticated;
grant execute on function public.submit_submarine_math_attempt(integer, text) to authenticated;
