-- Replace instructional Signal Decrypter prompts with question-driven missions.
-- Answers and canonical solutions remain private in signal_decrypter_answer_keys.

alter table public.signal_decrypter_answer_keys
  add column if not exists question_answer text;

insert into public.signal_decrypter_answer_keys
  (level_number, canonical_operations, canonical_code, expected_output, question_answer)
values
  (1, '[{"type":"reverse"}]', null, 'PARIS', 'Paris'),
  (2, '[{"type":"reverse"}]', null, 'JUPITER', 'Jupiter'),
  (3, '[{"type":"reverse"}]', null, 'MARS', 'Mars'),
  (4, '[{"type":"remove","chars":"-"}]', null, '0C', '0°C'),
  (5, '[{"type":"reverse"}]', null, 'PACIFIC', 'Pacific Ocean'),
  (6, '[{"type":"reverse"}]', null, 'YEN', 'Yen'),
  (7, '[{"type":"strip","chars":"#"},{"type":"reverse"}]', null, 'CARBONDIOXIDE', 'Carbon dioxide'),
  (8, '[{"type":"remove","chars":"#"}]', null, '3', '3'),
  (9, '[{"type":"reverse"}]', null, 'ROWLING', 'J.K. Rowling'),
  (10, '[{"type":"reverse"}]', null, 'NEILARMSTRONG', 'Neil Armstrong'),
  (11, '[{"type":"reverse"}]', 'signal[::-1]', 'CANBERRA', 'Canberra'),
  (12, '[{"type":"reverse"}]', 'signal[::-1]', 'Au', 'Au'),
  (13, '[{"type":"strip","chars":"#"},{"type":"reverse"},{"type":"remove","chars":"-"}]', 'signal.strip("#")[::-1].replace("-","")', 'doublehelix', 'Double helix'),
  (14, '[{"type":"reverse"}]', 'signal[::-1]', '299792458', '299792458 m/s'),
  (15, '[{"type":"strip","chars":"#"},{"type":"reverse"},{"type":"remove","chars":"-"},{"type":"lower"}]', 'signal.strip("#")[::-1].replace("-","").lower()', 'skin', 'Skin')
on conflict (level_number) do update set
  canonical_operations = excluded.canonical_operations,
  canonical_code = excluded.canonical_code,
  expected_output = excluded.expected_output,
  question_answer = excluded.question_answer;

update public.game_levels
set configuration = case level_number
  when 1 then '{"id":1,"question":"What is the capital of France?","signal":"SIRAP","mode":"blocks","timeLimit":90,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","lower","upper"]}'::jsonb
  when 2 then '{"id":2,"question":"Which planet is the largest in our solar system?","signal":"RETIPUJ","mode":"blocks","timeLimit":85,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","lower","remove"]}'::jsonb
  when 3 then '{"id":3,"question":"Which planet is known as the Red Planet?","signal":"SRAM","mode":"blocks","timeLimit":80,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","upper","lower"]}'::jsonb
  when 4 then '{"id":4,"question":"What is the freezing point of water in Celsius?","signal":"0-C","mode":"blocks","timeLimit":78,"interferenceLimit":3,"hintCost":8,"availableOperations":["remove","reverse","strip"]}'::jsonb
  when 5 then '{"id":5,"question":"What is the largest ocean on Earth?","signal":"CIFICAP","mode":"blocks","timeLimit":75,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","lower","index"]}'::jsonb
  when 6 then '{"id":6,"question":"What is the currency of Japan?","signal":"NEY","mode":"blocks","timeLimit":72,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","upper","length"]}'::jsonb
  when 7 then '{"id":7,"question":"Which gas do plants absorb from the air?","signal":"#EDIXOIDNOBRAC#","mode":"blocks","timeLimit":70,"interferenceLimit":3,"hintCost":8,"availableOperations":["strip","reverse","lower","remove"]}'::jsonb
  when 8 then '{"id":8,"question":"How many sides does a triangle have?","signal":"3#","mode":"blocks","timeLimit":68,"interferenceLimit":3,"hintCost":8,"availableOperations":["remove","reverse","length"]}'::jsonb
  when 9 then '{"id":9,"question":"What is the surname of the author of Harry Potter?","signal":"GNILWOR","mode":"blocks","timeLimit":65,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","upper","slice"]}'::jsonb
  when 10 then '{"id":10,"question":"Who was the first person to walk on the Moon?","signal":"GNORTSMRALIEN","mode":"blocks","timeLimit":62,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","remove","lower"]}'::jsonb
  when 11 then '{"id":11,"question":"What is the capital of Australia?","signal":"ARREBNAC","mode":"python","timeLimit":78,"interferenceLimit":3,"hintCost":8}'::jsonb
  when 12 then '{"id":12,"question":"What is the chemical symbol for gold?","signal":"uA","mode":"python","timeLimit":72,"interferenceLimit":3,"hintCost":8}'::jsonb
  when 13 then '{"id":13,"question":"What shape is commonly used to describe DNA?","signal":"#xileh-elbuod#","mode":"python","timeLimit":68,"interferenceLimit":3,"hintCost":8}'::jsonb
  when 14 then '{"id":14,"question":"What is the approximate speed of light in metres per second?","signal":"854297992","mode":"python","timeLimit":62,"interferenceLimit":3,"hintCost":8}'::jsonb
  when 15 then '{"id":15,"question":"What is the largest organ in the human body?","signal":"#n-i-k-s#","mode":"python","timeLimit":58,"interferenceLimit":3,"hintCost":8}'::jsonb
  else configuration end
where game_id = 'signal_decrypter';

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
  level_config jsonb;
  provided_operations jsonb;
  provided_code text;
  normalized_code text;
  is_correct boolean := false;
  result_code text;
  attempt_total integer;
  elapsed_ms integer := coalesce(nullif(p_attempt_data->>'elapsedMs', '')::integer, 0);
  reported_interference integer := coalesce(nullif(p_attempt_data->>'interference', '')::integer, 0);
  time_limit integer;
  interference_limit integer;
  failure_code text := 'incorrect_operation';
  first_incorrect_stage integer;
  stage integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_level_number not between 1 and 15 then raise exception 'Invalid Signal Decrypter level'; end if;
  if jsonb_typeof(p_attempt_data) is distinct from 'object' then raise exception 'Signal Decrypter payload is required'; end if;
  if not exists (select 1 from public.games where game_id = 'signal_decrypter' and enabled = true and validator_key = 'signal_decrypter') then raise exception 'Signal Decrypter is not enabled'; end if;
  if p_level_number > 1 and not exists (select 1 from public.level_progress where user_id = current_user_id and game_id = 'signal_decrypter' and level_number = p_level_number - 1 and status = 'completed') then raise exception 'Level is locked'; end if;
  select * into key_row from public.signal_decrypter_answer_keys where level_number = p_level_number;
  select configuration into level_config from public.game_levels where game_id = 'signal_decrypter' and level_number = p_level_number;
  if key_row.level_number is null then raise exception 'Level answer is not configured'; end if;
  time_limit := coalesce((level_config->>'timeLimit')::integer, 90);
  interference_limit := coalesce((level_config->>'interferenceLimit')::integer, 3);

  if elapsed_ms > time_limit * 1000 then
    failure_code := 'timeout';
  elsif reported_interference > interference_limit then
    failure_code := 'interference_limit';
  else
    provided_operations := p_attempt_data->'operations';
    provided_code := p_attempt_data->>'code';
    if jsonb_typeof(provided_operations) = 'array' and jsonb_array_length(provided_operations) <= 12 then
      is_correct := provided_operations = key_row.canonical_operations;
      if not is_correct then
        for stage in 0..greatest(jsonb_array_length(provided_operations), jsonb_array_length(key_row.canonical_operations)) - 1 loop
          if (provided_operations->stage) is distinct from (key_row.canonical_operations->stage) then
            first_incorrect_stage := stage + 1;
            exit;
          end if;
        end loop;
      end if;
    elsif provided_code is not null and length(provided_code) <= 800 and key_row.canonical_code is not null then
      normalized_code := regexp_replace(trim(provided_code), '\s+', '', 'g');
      is_correct := normalized_code = regexp_replace(key_row.canonical_code, '\s+', '', 'g');
    end if;
  end if;
  result_code := case when is_correct then 'success' else 'miss' end;

  insert into public.level_attempts (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values (current_user_id, 'signal_decrypter', p_level_number, result_code,
    case when is_correct then null else failure_code end,
    p_attempt_data || jsonb_build_object('serverValidated', true));

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

  return jsonb_build_object('recorded', true, 'server_result', result_code,
    'feedback', case when is_correct then 'Correct! You decoded the answer.'
      when failure_code = 'timeout' then 'The signal timed out before it was decoded.'
      when failure_code = 'interference_limit' then 'Too much interference corrupted the signal.'
      else 'The decoder does not produce the answer to this question.' end,
    'failure_code', case when is_correct then null else failure_code end,
    'first_incorrect_stage', first_incorrect_stage,
    'attempt_count', attempt_total,
    'revealed_answer', case when not is_correct and attempt_total >= 5 then key_row.question_answer else null end,
    'unlocked_next', is_correct and p_level_number < 15);
end;
$$;

revoke all on function public.submit_signal_decrypter_attempt(integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_signal_decrypter_attempt(integer, jsonb) to authenticated;
