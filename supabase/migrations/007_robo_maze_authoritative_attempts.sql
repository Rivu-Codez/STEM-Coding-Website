-- Server-authoritative RoboMaze replay.
-- The browser submits the command program; the database replays it against
-- canonical level configuration before recording progress or unlocking.

create or replace function public.submit_robo_maze_attempt(
  p_level_number integer,
  p_program jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  level_config jsonb;
  grid jsonb;
  start_state jsonb;
  command jsonb;
  command_type text;
  command_count integer;
  action text;
  x integer;
  y integer;
  direction integer;
  next_x integer;
  next_y integer;
  expanded_steps integer := 0;
  max_steps integer := 200;
  solved boolean := false;
  result_code text;
  halted boolean := false;
  i integer;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_level_number not between 1 and 30 or jsonb_typeof(p_program) <> 'array' then
    raise exception 'Invalid RoboMaze attempt';
  end if;
  if jsonb_array_length(p_program) > 40 then
    raise exception 'Program is too large';
  end if;
  if p_level_number > 1 and not exists (
    select 1 from public.level_progress
    where user_id = current_user_id and game_id = 'robo_maze'
      and level_number = p_level_number - 1 and status = 'completed'
  ) then
    raise exception 'Level is locked';
  end if;

  select configuration into level_config
  from public.game_levels
  where game_id = 'robo_maze' and level_number = p_level_number;
  if level_config is null then
    raise exception 'Level does not exist';
  end if;

  grid := level_config->'grid';
  start_state := level_config->'start';
  if jsonb_typeof(grid) <> 'array' or jsonb_typeof(start_state) <> 'object' then
    raise exception 'Invalid canonical level configuration';
  end if;
  x := (start_state->>'x')::integer;
  y := (start_state->>'y')::integer;
  direction := (start_state->>'dir')::integer;
  if direction not between 0 and 3 then
    raise exception 'Invalid canonical start direction';
  end if;

  for command in select value from jsonb_array_elements(p_program) loop
    command_type := command->>'type';
    command_count := coalesce((command->>'count')::integer, 1);
    if command_type = 'REPEAT_FORWARD' then
      if command_count not between 2 and 5 then
        raise exception 'Invalid repeat count';
      end if;
      for i in 1..command_count loop
        expanded_steps := expanded_steps + 1;
        if expanded_steps > max_steps then raise exception 'Program exceeds step limit'; end if;
        next_x := x + case direction when 1 then 1 when 3 then -1 else 0 end;
        next_y := y + case direction when 2 then 1 when 0 then -1 else 0 end;
        if next_x < 0 or next_x >= jsonb_array_length(grid->0)
           or next_y < 0 or next_y >= jsonb_array_length(grid)
           or (grid->next_y->next_x)::integer = 1 then
          halted := true;
          exit;
        end if;
        x := next_x; y := next_y;
        if (grid->y->x)::integer = 2 then solved := true; exit; end if;
      end loop;
      if solved or halted then exit; end if;
      continue;
    end if;

    if command_type not in ('FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'IF_PATH_CLEAR', 'IF_WALL_RIGHT', 'IF_WALL_LEFT') then
      raise exception 'Unsupported command';
    end if;
    expanded_steps := expanded_steps + 1;
    if expanded_steps > max_steps then raise exception 'Program exceeds step limit'; end if;
    action := command_type;

    if action = 'TURN_LEFT' then
      direction := (direction + 3) % 4;
    elsif action = 'TURN_RIGHT' then
      direction := (direction + 1) % 4;
    elsif action in ('FORWARD', 'IF_PATH_CLEAR', 'IF_WALL_RIGHT', 'IF_WALL_LEFT') then
      next_x := x + case direction when 1 then 1 when 3 then -1 else 0 end;
      next_y := y + case direction when 2 then 1 when 0 then -1 else 0 end;
      if next_x < 0 or next_x >= jsonb_array_length(grid->0)
         or next_y < 0 or next_y >= jsonb_array_length(grid)
         or (grid->next_y->next_x)::integer = 1 then
        if action = 'IF_WALL_RIGHT' then direction := (direction + 1) % 4;
        elsif action = 'IF_WALL_LEFT' then direction := (direction + 3) % 4;
        elsif action = 'IF_PATH_CLEAR' then null;
        else halted := true; exit;
        end if;
      elsif action in ('FORWARD', 'IF_PATH_CLEAR') then
        x := next_x; y := next_y;
      end if;
    end if;
    if (grid->y->x)::integer = 2 then solved := true; exit; end if;
  end loop;

  result_code := case when solved then 'success' else 'miss' end;
  insert into public.level_attempts
    (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values
    (current_user_id, 'robo_maze', p_level_number, result_code,
     case when solved then null else 'goal_not_reached' end,
     jsonb_build_object('program', p_program, 'steps', expanded_steps, 'server_validated', true));

  if solved then
    insert into public.level_progress
      (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values
      (current_user_id, 'robo_maze', p_level_number, 'completed', now(),
       jsonb_build_object('steps', expanded_steps), 1)
    on conflict (user_id, game_id, level_number) do update set
      status = 'completed', completed_at = coalesce(level_progress.completed_at, now()),
      best_result = excluded.best_result, attempt_count = level_progress.attempt_count + 1,
      updated_at = now();
    if p_level_number < 30 then
      insert into public.level_progress (user_id, game_id, level_number, status)
      values (current_user_id, 'robo_maze', p_level_number + 1, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set
        status = case when level_progress.status = 'completed' then 'completed'::public.progress_status
          else 'unlocked'::public.progress_status end, updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count)
    values (current_user_id, 'robo_maze', p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set
      attempt_count = level_progress.attempt_count + 1, updated_at = now();
  end if;

  return jsonb_build_object('recorded', true, 'server_result', result_code,
    'unlocked_next', solved and p_level_number < 30, 'steps', expanded_steps);
end;
$$;

revoke all on function public.submit_robo_maze_attempt(integer, jsonb) from public;
grant execute on function public.submit_robo_maze_attempt(integer, jsonb) to authenticated;
