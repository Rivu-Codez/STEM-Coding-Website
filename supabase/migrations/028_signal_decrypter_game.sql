-- Register Signal Decrypter and keep its canonical answers private.
insert into public.games (game_id, display_name, description, route, level_count, validator_key, icon, enabled)
values ('signal_decrypter', 'Signal Decrypter', 'Clean corrupted transmissions and practise strings, indexing, slicing, and methods.', 'SignalDecrypter/index.html', 15, 'signal_decrypter', '📡', true)
on conflict (game_id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  route = excluded.route,
  enabled = excluded.enabled,
  level_count = excluded.level_count,
  validator_key = excluded.validator_key,
  icon = excluded.icon,
  updated_at = now();

create table if not exists public.signal_decrypter_answer_keys (
  level_number integer primary key check (level_number between 1 and 15),
  canonical_operations jsonb not null,
  canonical_code text,
  expected_output text not null
);
alter table public.signal_decrypter_answer_keys enable row level security;
revoke all on table public.signal_decrypter_answer_keys from public, anon, authenticated;

insert into public.signal_decrypter_answer_keys (level_number, canonical_operations, canonical_code, expected_output)
values
  (1, '[{"type":"reverse"}]', null, 'C-A-T'),
  (2, '[{"type":"length"}]', null, '7'),
  (3, '[{"type":"strip","chars":"#"}]', null, 'S-O-S'),
  (4, '[{"type":"lstrip","chars":"0"}]', null, '742'),
  (5, '[{"type":"lower"}]', null, 'a-l-i-e-n'),
  (6, '[{"type":"upper"}]', null, 'LAUNCH'),
  (7, '[{"type":"index","index":0}]', null, 'Z'),
  (8, '[{"type":"index","index":-1}]', null, 'X'),
  (9, '[{"type":"slice","start":2,"end":11}]', null, 'A-L-I-E-N'),
  (10, '[{"type":"slice_step","start":0,"step":2}]', null, 'SOS'),
  (11, '[{"type":"reverse"}]', 'signal[::-1]', 'R-A-N-U-L'),
  (12, '[{"type":"find","value":"K"}]', 'signal.find("K")', '4'),
  (13, '[{"type":"count","value":"1"}]', 'signal.count("1")', '4'),
  (14, '[{"type":"replace","from":"*","to":"-"}]', 'signal.replace("*","-")', 'S-O-S'),
  (15, '[{"type":"strip","chars":"#"},{"type":"reverse"},{"type":"upper"}]', 'signal.strip("#")[::-1].upper()', 'O-B-J-E-C-T')
on conflict (level_number) do update set
  canonical_operations = excluded.canonical_operations,
  canonical_code = excluded.canonical_code,
  expected_output = excluded.expected_output;

insert into public.game_levels (game_id, level_number, title, instruction, configuration, is_bonus, bonus_number)
values
  ('signal_decrypter', 1, 'Mirror Transmission', 'Reverse the transmission.', '{"id":1,"signal":"T-A-C","output":"C-A-T","mode":"blocks","operations":[{"type":"reverse"}]}'::jsonb, false, null),
  ('signal_decrypter', 2, 'Deep Space Beacon', 'How many characters are in the signal?', '{"id":2,"signal":"E-D-O-C","output":"7","mode":"blocks","operations":[{"type":"length"}]}'::jsonb, false, null),
  ('signal_decrypter', 3, 'Static Noise Filter', 'Remove the # noise from both ends.', '{"id":3,"signal":"###S-O-S###","output":"S-O-S","mode":"blocks","operations":[{"type":"strip","chars":"#"}]}'::jsonb, false, null),
  ('signal_decrypter', 4, 'Outpost Beacon', 'Remove the zeros at the start.', '{"id":4,"signal":"000742","output":"742","mode":"blocks","operations":[{"type":"lstrip","chars":"0"}]}'::jsonb, false, null),
  ('signal_decrypter', 5, 'Alien Dialect', 'Send the signal in lowercase.', '{"id":5,"signal":"A-L-I-E-N","output":"a-l-i-e-n","mode":"blocks","operations":[{"type":"lower"}]}'::jsonb, false, null),
  ('signal_decrypter', 6, 'Command Override', 'Send the command in uppercase.', '{"id":6,"signal":"launch","output":"LAUNCH","mode":"blocks","operations":[{"type":"upper"}]}'::jsonb, false, null),
  ('signal_decrypter', 7, 'Target Lock', 'Read the first character.', '{"id":7,"signal":"Z-8-9","output":"Z","mode":"blocks","operations":[{"type":"index","index":0}]}'::jsonb, false, null),
  ('signal_decrypter', 8, 'Tail End Telemetry', 'Read the final character.', '{"id":8,"signal":"P-R-O-B-E-X","output":"X","mode":"blocks","operations":[{"type":"index","index":-1}]}'::jsonb, false, null),
  ('signal_decrypter', 9, 'Flipped Frequency', 'Keep only A-L-I-E-N.', '{"id":9,"signal":"X-A-L-I-E-N-Y","output":"A-L-I-E-N","mode":"blocks","operations":[{"type":"slice","start":2,"end":11}]}'::jsonb, false, null),
  ('signal_decrypter', 10, 'Interleaved Channels', 'Read every other character to reveal the message.', '{"id":10,"signal":"S#O#S","output":"SOS","mode":"blocks","operations":[{"type":"slice_step","start":0,"step":2}]}'::jsonb, false, null),
  ('signal_decrypter', 11, 'Python: Mirror Transmission', 'Write a Python-style expression that reverses the signal.', '{"id":11,"signal":"L-U-N-A-R","output":"R-A-N-U-L","mode":"python","operations":[{"type":"reverse"}]}'::jsonb, false, null),
  ('signal_decrypter', 12, 'Python: Find the Key', 'Find the index of K.', '{"id":12,"signal":"A-B-K-Z","output":"4","mode":"python","operations":[{"type":"find","value":"K"}]}'::jsonb, false, null),
  ('signal_decrypter', 13, 'Python: Count the Pulses', 'Count how many times 1 appears.', '{"id":13,"signal":"1-0-1-1-0-1","output":"4","mode":"python","operations":[{"type":"count","value":"1"}]}'::jsonb, false, null),
  ('signal_decrypter', 14, 'Python: Repair the Wire', 'Replace every * with -.', '{"id":14,"signal":"S*O*S","output":"S-O-S","mode":"python","operations":[{"type":"replace","from":"*","to":"-"}]}'::jsonb, false, null),
  ('signal_decrypter', 15, 'Python: Final Decryption', 'Strip #, reverse the cleaned signal, then uppercase it.', '{"id":15,"signal":"##t-c-e-j-b-o##","output":"O-B-J-E-C-T","mode":"python","operations":[{"type":"strip","chars":"#"},{"type":"reverse"},{"type":"upper"}]}'::jsonb, false, null)
on conflict (game_id, level_number) do update set
  title = excluded.title,
  instruction = excluded.instruction,
  configuration = excluded.configuration,
  is_bonus = excluded.is_bonus,
  bonus_number = excluded.bonus_number;

create or replace function public.submit_signal_decrypter_attempt(
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
  key_row public.signal_decrypter_answer_keys;
  provided_operations jsonb;
  provided_code text;
  normalized_code text;
  is_correct boolean := false;
  result_code text;
  attempt_total integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_level_number not between 1 and 15 then raise exception 'Invalid Signal Decrypter level'; end if;
  if jsonb_typeof(p_attempt_data) is distinct from 'object' then raise exception 'Signal Decrypter payload is required'; end if;
  if not exists (select 1 from public.games where game_id = 'signal_decrypter' and enabled = true and validator_key = 'signal_decrypter') then raise exception 'Signal Decrypter is not enabled'; end if;
  if p_level_number > 1 and not exists (select 1 from public.level_progress where user_id = current_user_id and game_id = 'signal_decrypter' and level_number = p_level_number - 1 and status = 'completed') then raise exception 'Level is locked'; end if;
  select * into key_row from public.signal_decrypter_answer_keys where level_number = p_level_number;
  if key_row.level_number is null then raise exception 'Level answer is not configured'; end if;

  provided_operations := p_attempt_data->'operations';
  provided_code := p_attempt_data->>'code';
  if jsonb_typeof(provided_operations) = 'array' and jsonb_array_length(provided_operations) <= 12 then
    is_correct := provided_operations = key_row.canonical_operations;
  elsif provided_code is not null and length(provided_code) <= 800 and key_row.canonical_code is not null then
    normalized_code := regexp_replace(trim(provided_code), '\s+', '', 'g');
    is_correct := normalized_code = regexp_replace(key_row.canonical_code, '\s+', '', 'g');
  end if;
  result_code := case when is_correct then 'success' else 'miss' end;

  insert into public.level_attempts (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values (current_user_id, 'signal_decrypter', p_level_number, result_code,
    case when is_correct then null else 'incorrect_operation' end,
    p_attempt_data || jsonb_build_object('serverValidated', true, 'expectedOutput', key_row.expected_output));

  if is_correct then
    insert into public.level_progress (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values (current_user_id, 'signal_decrypter', p_level_number, 'completed', now(), p_attempt_data || jsonb_build_object('output', key_row.expected_output), 1)
    on conflict (user_id, game_id, level_number) do update set
      status = 'completed', completed_at = coalesce(level_progress.completed_at, now()), best_result = excluded.best_result,
      attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
    if p_level_number < 15 then
      insert into public.level_progress (user_id, game_id, level_number, status) values (current_user_id, 'signal_decrypter', p_level_number + 1, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set
        status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
        updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count) values (current_user_id, 'signal_decrypter', p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set
      status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
      attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
  end if;
  return jsonb_build_object('recorded', true, 'server_result', result_code, 'expected_output', key_row.expected_output,
    'feedback', case when is_correct then 'Correct! Transmission decoded.' else 'That operation sequence does not match this mission.' end,
    'unlocked_next', is_correct and p_level_number < 15, 'attempt_count', attempt_total);
end;
$$;

revoke all on function public.submit_signal_decrypter_attempt(integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_signal_decrypter_attempt(integer, jsonb) to authenticated;

create or replace function public.submit_signal_decrypter_attempt_idempotent(
  p_attempt_id uuid, p_level_number integer, p_attempt_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare current_user_id uuid := auth.uid(); saved_result jsonb; inserted boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_attempt_id is null then raise exception 'Attempt ID is required'; end if;
  insert into public.attempt_receipts (user_id, game_id, attempt_id) values (current_user_id, 'signal_decrypter', p_attempt_id)
  on conflict (user_id, game_id, attempt_id) do nothing returning true into inserted;
  if not coalesce(inserted, false) then
    select result into saved_result from public.attempt_receipts where user_id = current_user_id and game_id = 'signal_decrypter' and attempt_id = p_attempt_id;
    if saved_result is null then raise exception 'Attempt is already processing'; end if;
    return saved_result || jsonb_build_object('duplicate', true);
  end if;
  saved_result := public.submit_signal_decrypter_attempt(p_level_number, p_attempt_data);
  update public.attempt_receipts set result = saved_result where user_id = current_user_id and game_id = 'signal_decrypter' and attempt_id = p_attempt_id;
  return saved_result;
end;
$$;
revoke all on function public.submit_signal_decrypter_attempt_idempotent(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_signal_decrypter_attempt_idempotent(uuid, integer, jsonb) to authenticated;

create or replace function public.submit_game_attempt_idempotent(
  p_game_id public.game_id, p_attempt_id uuid, p_level_number integer, p_attempt_data jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_game_id = 'robo_maze' then
    if jsonb_typeof(p_attempt_data) <> 'object' or jsonb_typeof(p_attempt_data->'program') <> 'array' then raise exception 'RoboMaze program payload is required'; end if;
    return public.submit_robo_maze_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data->'program');
  elsif p_game_id = 'physics' then
    return public.submit_physics_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  elsif p_game_id = 'submarine_math' then
    return public.submit_submarine_math_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  elsif p_game_id = 'signal_decrypter' then
    return public.submit_signal_decrypter_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  end if;
  raise exception 'No authoritative validator is enabled for this game';
end;
$$;
