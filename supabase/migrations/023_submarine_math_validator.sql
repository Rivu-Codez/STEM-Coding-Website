-- Answer keys are private; game_levels remains safe for authenticated client reads.
create table if not exists public.submarine_math_answer_keys (
  level_number integer primary key check (level_number between 1 and 15),
  correct_answer text not null
);
alter table public.submarine_math_answer_keys enable row level security;
revoke all on table public.submarine_math_answer_keys from public, anon, authenticated;
insert into public.submarine_math_answer_keys (level_number, correct_answer) values
  (1, '>'),
  (2, '<'),
  (3, '>'),
  (4, '-35'),
  (5, '-55'),
  (6, '-15'),
  (7, '15'),
  (8, '-25'),
  (9, '<'),
  (10, '45'),
  (11, '>'),
  (12, '-60'),
  (13, '<'),
  (14, '48'),
  (15, '-12')
on conflict (level_number) do update set correct_answer = excluded.correct_answer;

insert into public.game_levels
  (game_id, level_number, title, instruction, configuration, is_bonus, bonus_number)
values
  ('submarine_math', 1, 'Greater Than with Negatives', 'Compare depths: -30 [ ? ] -70', '{"id":1,"section":1,"title":"Greater Than with Negatives","isComparison":true,"startDepth":-70,"compareVal1":-30,"compareVal2":-70,"targetDepth":-30,"question":"Compare depths: -30 [ ? ] -70","numericVal":-30,"hint":"-30 is higher up (closer to 0) than -70, so -30 > -70."}'::jsonb, false, null),
  ('submarine_math', 2, 'Less Than with Negatives', 'Compare depths: -80 [ ? ] -45', '{"id":2,"section":1,"title":"Less Than with Negatives","isComparison":true,"startDepth":-45,"compareVal1":-80,"compareVal2":-45,"targetDepth":-80,"question":"Compare depths: -80 [ ? ] -45","numericVal":-80,"hint":"-80 is deeper down (further below zero), so -80 < -45."}'::jsonb, false, null),
  ('submarine_math', 3, 'Zero vs a Negative', 'Compare sea level to depth -60: 0 [ ? ] -60', '{"id":3,"section":1,"title":"Zero vs a Negative","isComparison":true,"startDepth":-60,"compareVal1":0,"compareVal2":-60,"targetDepth":0,"question":"Compare sea level to depth -60: 0 [ ? ] -60","numericVal":0,"hint":"Zero is above any negative depth, so 0 > -60."}'::jsonb, false, null),
  ('submarine_math', 4, 'Adding a Positive (-60 + 25)', 'Start at -60 and move UP by +25. Calculate: -60 + 25 =', '{"id":4,"section":2,"kind":"pos","title":"Adding a Positive (-60 + 25)","startDepth":-60,"targetDepth":-35,"question":"Start at -60 and move UP by +25. Calculate: -60 + 25 =","numericVal":-35,"hint":"Adding a positive moves up toward 0. -60 + 25 = -35."}'::jsonb, false, null),
  ('submarine_math', 5, 'Subtracting a Positive (-20 - 35)', 'Start at -20 and dive DOWN 35. Calculate: -20 - 35 =', '{"id":5,"section":2,"kind":"pos","title":"Subtracting a Positive (-20 - 35)","startDepth":-20,"targetDepth":-55,"ghostPreview":true,"question":"Start at -20 and dive DOWN 35. Calculate: -20 - 35 =","numericVal":-55,"hint":"Subtracting a positive moves deeper into the negatives. -20 - 35 = -55."}'::jsonb, false, null),
  ('submarine_math', 6, 'Subtracting a Negative (-40 - (-25))', 'Subtracting a negative turns into addition! Calculate: -40 - (-25) =', '{"id":6,"section":2,"kind":"pos","title":"Subtracting a Negative (-40 - (-25))","startDepth":-40,"targetDepth":-15,"question":"Subtracting a negative turns into addition! Calculate: -40 - (-25) =","numericVal":-15,"hint":"Two minus signs together become addition: -40 - (-25) = -40 + 25 = -15."}'::jsonb, false, null),
  ('submarine_math', 7, 'Crossing Zero Upward (-25 + 40)', 'Start at depth -25. Ascend +40 toward the helipad. Calculate: -25 + 40 =', '{"id":7,"section":3,"kind":"pos","title":"Crossing Zero Upward (-25 + 40)","startDepth":-25,"targetDepth":15,"hasHelicarrier":true,"question":"Start at depth -25. Ascend +40 toward the helipad. Calculate: -25 + 40 =","numericVal":15,"hint":"25 units get you to zero, plus 15 more into the positives = +15."}'::jsonb, false, null),
  ('submarine_math', 8, 'Crossing Zero Downward (30 - 55)', 'Start at +30 altitude and drop down 55. Calculate: 30 - 55 =', '{"id":8,"section":3,"kind":"pos","title":"Crossing Zero Downward (30 - 55)","startDepth":30,"targetDepth":-25,"hasHelicarrier":true,"question":"Start at +30 altitude and drop down 55. Calculate: 30 - 55 =","numericVal":-25,"hint":"30 down to zero, plus 25 more into negative depths = -25."}'::jsonb, false, null),
  ('submarine_math', 9, 'Comparing Across Zero', 'Compare sub depth (-35m) to the surface platform (+20m): -35 [ ? ] +20', '{"id":9,"section":3,"title":"Comparing Across Zero","isComparison":true,"startDepth":-35,"compareVal1":-35,"compareVal2":20,"targetDepth":20,"question":"Compare sub depth (-35m) to the surface platform (+20m): -35 [ ? ] +20","numericVal":20,"hint":"Any negative value is less than any positive value!"}'::jsonb, false, null),
  ('submarine_math', 10, 'Absolute Value |-45|', 'What is the distance from sea level (0) to depth -45? Calculate: |-45| =', '{"id":10,"section":4,"title":"Absolute Value |-45|","startDepth":0,"targetDepth":-45,"question":"What is the distance from sea level (0) to depth -45? Calculate: |-45| =","numericVal":-45,"hint":"Absolute value measures pure distance from 0 and is always positive!"}'::jsonb, false, null),
  ('submarine_math', 11, 'Comparing Absolute Values', 'Which location is further from zero? Compare |-80| [ ? ] |+35|', '{"id":11,"section":4,"plot":[-80,35],"labels":["|-80| = 80","|+35| = 35"],"title":"Comparing Absolute Values","isComparison":true,"startDepth":35,"compareVal1":80,"compareVal2":35,"targetDepth":-80,"question":"Which location is further from zero? Compare |-80| [ ? ] |+35|","numericVal":-80,"hint":"|-80| = 80 and |+35| = 35. 80 is greater than 35."}'::jsonb, false, null),
  ('submarine_math', 12, 'Multi-Step Net Change', 'The sub starts at -20, then goes down 30, up 15, and down 25. What is its final depth?', '{"id":12,"section":5,"title":"Multi-Step Net Change","startDepth":-20,"targetDepth":-60,"question":"The sub starts at -20, then goes down 30, up 15, and down 25. What is its final depth?","numericVal":-60,"hint":"-20 - 30 + 15 - 25 = -60."}'::jsonb, false, null),
  ('submarine_math', 13, 'Net vs Total Distance', 'The sub starts at 0, then goes down 40, up 15, and down 20. Compare NET distance from the start with TOTAL distance traveled: Net [ ? ] Total', '{"id":13,"section":5,"plot":[-45,-75],"labels":["Net: 45","Total: 75"],"title":"Net vs Total Distance","isComparison":true,"startDepth":0,"compareVal1":45,"compareVal2":75,"targetDepth":-45,"question":"The sub starts at 0, then goes down 40, up 15, and down 20. Compare NET distance from the start with TOTAL distance traveled: Net [ ? ] Total","numericVal":-45,"hint":"Net: 0 - 40 + 15 - 20 = -45, so 45 from the start. Total: 40 + 15 + 20 = 75. 45 < 75."}'::jsonb, false, null),
  ('submarine_math', 14, 'Negative × Negative = Positive!', 'Multiply two negative numbers: (-12) × (-4) =', '{"id":14,"section":6,"title":"Negative × Negative = Positive!","startDepth":-90,"targetDepth":48,"question":"Multiply two negative numbers: (-12) × (-4) =","numericVal":48,"hint":"Rule: NEGATIVE × NEGATIVE = POSITIVE! 12 × 4 = 48."}'::jsonb, false, null),
  ('submarine_math', 15, 'Negative ÷ Positive = Negative', 'Divide a negative by a positive: (-84) ÷ 7 =', '{"id":15,"section":6,"title":"Negative ÷ Positive = Negative","startDepth":0,"targetDepth":-12,"question":"Divide a negative by a positive: (-84) ÷ 7 =","numericVal":-12,"hint":"Rule: NEGATIVE ÷ POSITIVE = NEGATIVE! 84 ÷ 7 = 12, so the answer is -12."}'::jsonb, false, null)
on conflict (game_id, level_number) do update set
  title = excluded.title,
  instruction = excluded.instruction,
  configuration = excluded.configuration,
  is_bonus = excluded.is_bonus,
  bonus_number = excluded.bonus_number;

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
  is_correct boolean := false;
  result_code text;
  attempt_total integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_level_number not between 1 and 15 then raise exception 'Invalid Submarine Math level'; end if;
  if p_answer is null or length(p_answer) > 32 then raise exception 'Invalid answer'; end if;
  if not exists (
    select 1 from public.games
    where game_id = 'submarine_math' and enabled = true and validator_key = 'submarine_math'
  ) then raise exception 'Submarine Math is not enabled'; end if;
  if p_level_number > 1 and not exists (
    select 1 from public.level_progress
    where user_id = current_user_id and game_id = 'submarine_math'
      and level_number = p_level_number - 1 and status = 'completed'
  ) then raise exception 'Level is locked'; end if;

  select correct_answer into expected_answer
  from public.submarine_math_answer_keys
  where level_number = p_level_number;
  if expected_answer is null then raise exception 'Level answer is not configured'; end if;
  normalized_answer := regexp_replace(
    replace(replace(trim(p_answer), '−', '-'), '–', '-'), '\s+', '', 'g'
  );
  if normalized_answer in ('<', '>', '=') then
    is_correct := normalized_answer = expected_answer;
  elsif expected_answer ~ '^[+-]?[0-9]+(\.[0-9]+)?$'
     and normalized_answer ~ '^[+-]?[0-9]+(\.[0-9]+)?$' then
    is_correct := abs(normalized_answer::numeric - expected_answer::numeric) < 0.05;
  end if;

  result_code := case when is_correct then 'success' else 'miss' end;
  insert into public.level_attempts
    (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values
    (current_user_id, 'submarine_math', p_level_number, result_code,
     case when is_correct then null else 'incorrect_answer' end,
     jsonb_build_object('answer', normalized_answer, 'serverValidated', true));

  if is_correct then
    insert into public.level_progress
      (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values
      (current_user_id, 'submarine_math', p_level_number, 'completed', now(),
       jsonb_build_object('answer', normalized_answer), 1)
    on conflict (user_id, game_id, level_number) do update set
      status = 'completed',
      completed_at = coalesce(level_progress.completed_at, now()),
      best_result = excluded.best_result,
      attempt_count = level_progress.attempt_count + 1,
      updated_at = now()
    returning attempt_count into attempt_total;

    if p_level_number < 15 then
      insert into public.level_progress (user_id, game_id, level_number, status)
      values (current_user_id, 'submarine_math', p_level_number + 1, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set
        status = case when level_progress.status = 'completed'
          then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
        updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count)
    values (current_user_id, 'submarine_math', p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set
      status = case when level_progress.status = 'completed'
        then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
      attempt_count = level_progress.attempt_count + 1,
      updated_at = now()
    returning attempt_count into attempt_total;
  end if;

  return jsonb_build_object('recorded', true, 'server_result', result_code,
    'unlocked_next', is_correct and p_level_number < 15, 'attempt_count', attempt_total);
end;
$$;

revoke all on function public.submit_submarine_math_attempt(integer, text) from public, anon, authenticated;
grant execute on function public.submit_submarine_math_attempt(integer, text) to authenticated;

create or replace function public.submit_submarine_math_attempt_idempotent(
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
  current_user_id uuid := auth.uid();
  saved_result jsonb;
  inserted boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_attempt_id is null then raise exception 'Attempt ID is required'; end if;
  if jsonb_typeof(p_attempt_data) is distinct from 'object'
     or jsonb_typeof(p_attempt_data->'answer') is distinct from 'string' then
    raise exception 'Submarine Math answer is required';
  end if;

  insert into public.attempt_receipts (user_id, game_id, attempt_id)
  values (current_user_id, 'submarine_math', p_attempt_id)
  on conflict (user_id, game_id, attempt_id) do nothing
  returning true into inserted;

  if not coalesce(inserted, false) then
    select result into saved_result
    from public.attempt_receipts
    where user_id = current_user_id and game_id = 'submarine_math'
      and attempt_id = p_attempt_id;
    if saved_result is null then raise exception 'Attempt is already processing'; end if;
    return saved_result || jsonb_build_object('duplicate', true);
  end if;

  saved_result := public.submit_submarine_math_attempt(
    p_level_number, p_attempt_data->>'answer'
  );
  update public.attempt_receipts
  set result = saved_result
  where user_id = current_user_id and game_id = 'submarine_math'
    and attempt_id = p_attempt_id;
  return saved_result;
end;
$$;

revoke all on function public.submit_submarine_math_attempt_idempotent(uuid, integer, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_submarine_math_attempt_idempotent(uuid, integer, jsonb)
  to authenticated;

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
  elsif p_game_id = 'submarine_math' then
    return public.submit_submarine_math_attempt_idempotent(
      p_attempt_id, p_level_number, p_attempt_data
    );
  end if;
  raise exception 'No authoritative validator is enabled for this game';
end;
$$;

update public.games set enabled = true, updated_at = now()
where game_id = 'submarine_math' and validator_key = 'submarine_math';
