-- Server-authoritative Physics replay using the same deterministic Euler model
-- as PhysicsSim/index.html.

update public.game_levels
set configuration = configuration || '{"requiredDrag":true}'::jsonb
where game_id = 'physics' and level_number in (12, 13, 25, 26, 27, 30);

update public.game_levels
set configuration = configuration || '{"minAngle":35,"maxAngle":65}'::jsonb
where game_id = 'physics' and level_number = 13;

update public.game_levels
set configuration = configuration || '{"minAngle":45,"maxAngle":75}'::jsonb
where game_id = 'physics' and level_number in (18, 26, 30);

update public.game_levels
set configuration = configuration || '{"minAngle":35,"maxAngle":55}'::jsonb
where game_id = 'physics' and level_number = 27;

update public.game_levels
set configuration = configuration || '{"minAngle":50,"maxAngle":80}'::jsonb
where game_id = 'physics' and level_number = 28;

create or replace function public.submit_physics_attempt(
  p_level_number integer,
  p_attempt_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  level_config jsonb;
  wall jsonb;
  angle numeric;
  speed numeric;
  reported_distance numeric;
  air_resistance boolean;
  target_distance numeric;
  tolerance numeric;
  x numeric := 50;
  y numeric := 280;
  vx numeric;
  vy numeric;
  elapsed numeric := 0;
  max_y numeric := 280;
  dt numeric := 0.025;
  gravity numeric := 9.8;
  scale numeric := 10;
  drag_coeff numeric := 0.0018;
  distance numeric := 0;
  speed_now numeric;
  wall_px numeric;
  wall_top_y numeric;
  step_number integer;
  collision boolean := false;
  landed boolean := false;
  success boolean := false;
  result_code text;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;
  if p_attempt_data is null or p_level_number not between 1 and 30
     or jsonb_typeof(p_attempt_data) <> 'object' then
    raise exception 'Invalid Physics attempt';
  end if;
  if not (p_attempt_data ? 'angle') or not (p_attempt_data ? 'speed') then
    raise exception 'Physics controls are required';
  end if;
  if (p_attempt_data->>'angle') !~ '^-?[0-9]+(\.[0-9]+)?$'
     or (p_attempt_data->>'speed') !~ '^-?[0-9]+(\.[0-9]+)?$' then
    raise exception 'Invalid Physics controls';
  end if;
  angle := (p_attempt_data->>'angle')::numeric;
  speed := (p_attempt_data->>'speed')::numeric;
  reported_distance := case
    when (p_attempt_data->>'distance') ~ '^-?[0-9]+(\.[0-9]+)?$'
    then (p_attempt_data->>'distance')::numeric else null end;
  air_resistance := coalesce((p_attempt_data->>'airResistance')::boolean, false);

  if angle not between 5 and 85 or speed not between 10 and 35 then
    raise exception 'Physics controls are outside the allowed range';
  end if;
  if p_level_number > 1 and not exists (
    select 1 from public.level_progress
    where user_id = current_user_id and game_id = 'physics'
      and level_number = p_level_number - 1 and status = 'completed'
  ) then
    raise exception 'Level is locked';
  end if;

  select configuration into level_config
  from public.game_levels
  where game_id = 'physics' and level_number = p_level_number;
  if level_config is null then raise exception 'Level does not exist'; end if;

  if coalesce((level_config->>'lockSpeed')::boolean, false)
     and abs(speed - (level_config->>'fixedSpeed')::numeric) > 0.01 then
    raise exception 'Speed is locked for this level';
  end if;
  if coalesce((level_config->>'lockDrag')::boolean, false) and air_resistance then
    raise exception 'Air resistance is locked off for this level';
  end if;
  if level_config->>'dragMode' = 'on' and not air_resistance then
    raise exception 'Air resistance is required for this level';
  end if;
  if level_config ? 'minAngle' and angle < (level_config->>'minAngle')::numeric then
    raise exception 'Launch angle is below the level minimum';
  end if;
  if level_config ? 'maxAngle' and angle > (level_config->>'maxAngle')::numeric then
    raise exception 'Launch angle is above the level maximum';
  end if;

  target_distance := (level_config->>'targetDistance')::numeric;
  tolerance := coalesce(nullif(level_config->>'targetTolerance', '')::numeric, 3.5);
  vx := speed * cos(radians(angle)) * scale;
  vy := -speed * sin(radians(angle)) * scale;
  wall := level_config->'wall';
  if jsonb_typeof(wall) = 'object' then
    wall_px := 50 + (wall->>'x')::numeric * scale;
    wall_top_y := 280 - (wall->>'height')::numeric * scale;
  end if;

  for step_number in 1..4000 loop
    elapsed := elapsed + dt;
    if air_resistance then
      speed_now := sqrt(vx * vx + vy * vy);
      vx := vx - drag_coeff * speed_now * vx * dt;
      vy := vy - drag_coeff * speed_now * vy * dt;
    end if;
    x := x + vx * dt;
    y := y + vy * dt;
    vy := vy + gravity * scale * dt;
    max_y := least(max_y, y);

    if jsonb_typeof(wall) = 'object' and abs(x - wall_px) < 7 and y >= wall_top_y then
      collision := true;
      exit;
    end if;
    if y >= 280 then
      y := 280;
      distance := (x - 50) / scale;
      landed := true;
      exit;
    end if;
  end loop;

  success := landed and not collision and abs(distance - target_distance) <= tolerance;
  result_code := case when success then 'success' else case when collision then 'collision' else 'miss' end end;
  insert into public.level_attempts
    (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values
    (current_user_id, 'physics', p_level_number, result_code,
     case when success then null when collision then 'wall_collision' else 'trajectory_miss' end,
     jsonb_build_object('angle', angle, 'speed', speed, 'airResistance', air_resistance,
       'distance', distance, 'reportedDistance', reported_distance, 'flightTime', elapsed,
       'apex', (280 - max_y) / scale, 'serverValidated', true));

  if success then
    insert into public.level_progress
      (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values
      (current_user_id, 'physics', p_level_number, 'completed', now(),
       jsonb_build_object('distance', distance, 'angle', angle, 'speed', speed), 1)
    on conflict (user_id, game_id, level_number) do update set
      status = 'completed', completed_at = coalesce(level_progress.completed_at, now()),
      best_result = excluded.best_result, attempt_count = level_progress.attempt_count + 1,
      updated_at = now();
    if p_level_number < 30 then
      insert into public.level_progress (user_id, game_id, level_number, status)
      values (current_user_id, 'physics', p_level_number + 1, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set
        status = case when level_progress.status = 'completed' then 'completed'::public.progress_status
          else 'unlocked'::public.progress_status end, updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count)
    values (current_user_id, 'physics', p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set
      attempt_count = level_progress.attempt_count + 1, updated_at = now();
  end if;

  return jsonb_build_object('recorded', true, 'server_result', result_code,
    'unlocked_next', success and p_level_number < 30, 'distance', distance,
    'flightTime', elapsed, 'apex', (280 - max_y) / scale);
end;
$$;

revoke all on function public.submit_physics_attempt(integer, jsonb) from public;
grant execute on function public.submit_physics_attempt(integer, jsonb) to authenticated;
