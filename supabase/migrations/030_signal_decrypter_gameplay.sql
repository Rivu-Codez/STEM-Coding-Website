-- Signal Decrypter gameplay metadata. This keeps the existing game ID,
-- answer keys, progress rows, and reward records intact.
update public.game_levels
set configuration = configuration || case level_number
  when 1 then '{"timeLimit":90,"interferenceLimit":3,"hintCost":8,"availableOperations":["reverse","upper","lower"]}'::jsonb
  when 2 then '{"timeLimit":85,"interferenceLimit":3,"hintCost":8,"availableOperations":["length","reverse","strip"]}'::jsonb
  when 3 then '{"timeLimit":80,"interferenceLimit":3,"hintCost":8,"availableOperations":["strip","lstrip","reverse"]}'::jsonb
  when 4 then '{"timeLimit":75,"interferenceLimit":3,"hintCost":8,"availableOperations":["lstrip","strip","length"]}'::jsonb
  when 5 then '{"timeLimit":75,"interferenceLimit":3,"hintCost":8,"availableOperations":["lower","upper","reverse"]}'::jsonb
  when 6 then '{"timeLimit":70,"interferenceLimit":3,"hintCost":8,"availableOperations":["upper","lower","length"]}'::jsonb
  when 7 then '{"timeLimit":70,"interferenceLimit":3,"hintCost":8,"availableOperations":["index","slice","reverse"]}'::jsonb
  when 8 then '{"timeLimit":65,"interferenceLimit":3,"hintCost":8,"availableOperations":["index","reverse"]}'::jsonb
  when 9 then '{"timeLimit":65,"interferenceLimit":3,"hintCost":8,"availableOperations":["slice","reverse"]}'::jsonb
  when 10 then '{"timeLimit":60,"interferenceLimit":3,"hintCost":8,"availableOperations":["slice_step","strip"]}'::jsonb
  when 11 then '{"timeLimit":75,"interferenceLimit":3,"hintCost":8,"hintCostSeconds":8}'::jsonb
  when 12 then '{"timeLimit":70,"interferenceLimit":3,"hintCost":8,"hintCostSeconds":8}'::jsonb
  when 13 then '{"timeLimit":65,"interferenceLimit":3,"hintCost":8,"hintCostSeconds":8}'::jsonb
  when 14 then '{"timeLimit":60,"interferenceLimit":3,"hintCost":8,"hintCostSeconds":8}'::jsonb
  when 15 then '{"timeLimit":55,"interferenceLimit":3,"hintCost":8,"hintCostSeconds":8}'::jsonb
  else '{}'::jsonb end
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

  if elapsed_ms > time_limit * 1000 then failure_code := 'timeout';
  elsif reported_interference >= interference_limit then failure_code := 'interference_limit';
  else
    provided_operations := p_attempt_data->'operations';
    provided_code := p_attempt_data->>'code';
    if jsonb_typeof(provided_operations) = 'array' and jsonb_array_length(provided_operations) <= 12 then
      is_correct := provided_operations = key_row.canonical_operations;
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
    'feedback', case when is_correct then 'Correct! Transmission decoded.'
      when failure_code = 'timeout' then 'The signal timed out before it was decoded.'
      when failure_code = 'interference_limit' then 'Too much interference corrupted the signal.'
      else 'The decoder pipeline does not match this mission.' end,
    'failure_code', case when is_correct then null else failure_code end,
    'unlocked_next', is_correct and p_level_number < 15, 'attempt_count', attempt_total);
end;
$$;

revoke all on function public.submit_signal_decrypter_attempt(integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_signal_decrypter_attempt(integer, jsonb) to authenticated;
