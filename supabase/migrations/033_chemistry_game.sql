-- Chemistry Lab: public missions, private canonical answers, and server-owned completion.
insert into public.games (game_id, display_name, description, route, level_count, validator_key, icon, enabled)
values ('chemistry', 'Chemistry Lab', 'Build molecules, balance reactions, and learn Python as a molecular scientist.', 'Chemistry/index.html', 15, 'chemistry', '⚗', true)
on conflict (game_id) do update set
  display_name = excluded.display_name,
  description = excluded.description,
  route = excluded.route,
  level_count = excluded.level_count,
  validator_key = excluded.validator_key,
  icon = excluded.icon,
  enabled = excluded.enabled,
  updated_at = now();

create table if not exists public.chemistry_answer_keys (
  level_number integer primary key check (level_number between 1 and 15),
  canonical_formula text not null,
  canonical_count integer not null default 1 check (canonical_count > 0)
);
alter table public.chemistry_answer_keys enable row level security;
revoke all on table public.chemistry_answer_keys from public, anon, authenticated;

insert into public.chemistry_answer_keys (level_number, canonical_formula, canonical_count) values
  (1, 'H2O', 1), (2, 'CO2', 1), (3, 'NaCl', 1), (4, 'CH4', 1), (5, 'NH3', 1),
  (6, 'O2', 1), (7, 'HCl', 1), (8, 'C6H12O6', 1), (9, 'H2O2', 1), (10, 'Fe2O3', 1),
  (11, 'H2O', 1), (12, 'CO2', 1), (13, 'NaCl', 1), (14, 'CH4', 1), (15, 'C6H12O6', 1)
on conflict (level_number) do update set canonical_formula = excluded.canonical_formula, canonical_count = excluded.canonical_count;

insert into public.game_levels (game_id, level_number, title, instruction, configuration, is_bonus, bonus_number)
values
  ('chemistry', 1, 'Water', 'Combine two hydrogen atoms with one oxygen atom.', '{"id":1,"compound":"Water","formula":"H2O","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 2, 'Carbon dioxide', 'Combine one carbon atom with two oxygen atoms.', '{"id":2,"compound":"Carbon dioxide","formula":"CO2","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 3, 'Table salt', 'Combine one sodium atom with one chlorine atom.', '{"id":3,"compound":"Table salt","formula":"NaCl","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 4, 'Methane', 'Combine one carbon atom with four hydrogen atoms.', '{"id":4,"compound":"Methane","formula":"CH4","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 5, 'Ammonia', 'Combine one nitrogen atom with three hydrogen atoms.', '{"id":5,"compound":"Ammonia","formula":"NH3","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 6, 'Oxygen gas', 'Join two oxygen atoms.', '{"id":6,"compound":"Oxygen gas","formula":"O2","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 7, 'Hydrogen chloride', 'Combine one hydrogen atom with one chlorine atom.', '{"id":7,"compound":"Hydrogen chloride","formula":"HCl","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 8, 'Glucose', 'Build glucose from six carbon, twelve hydrogen, and six oxygen atoms.', '{"id":8,"compound":"Glucose","formula":"C6H12O6","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 9, 'Hydrogen peroxide', 'Combine two hydrogen atoms with two oxygen atoms.', '{"id":9,"compound":"Hydrogen peroxide","formula":"H2O2","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 10, 'Iron oxide', 'Build iron(III) oxide from two iron and three oxygen atoms.', '{"id":10,"compound":"Iron oxide","formula":"Fe2O3","mode":"blocks"}'::jsonb, false, null),
  ('chemistry', 11, 'Hydrogen and oxygen', 'Use lab.mix("H2O", 1) to synthesize water.', '{"id":11,"compound":"Water","formula":"H2O","mode":"python"}'::jsonb, false, null),
  ('chemistry', 12, 'Carbon and oxygen', 'Use lab.mix("CO2", 1) to synthesize carbon dioxide.', '{"id":12,"compound":"Carbon dioxide","formula":"CO2","mode":"python"}'::jsonb, false, null),
  ('chemistry', 13, 'Sodium and chlorine', 'Use lab.mix("NaCl", 1) to synthesize table salt.', '{"id":13,"compound":"Table salt","formula":"NaCl","mode":"python"}'::jsonb, false, null),
  ('chemistry', 14, 'Carbon and hydrogen', 'Use lab.mix("CH4", 1) to synthesize methane.', '{"id":14,"compound":"Methane","formula":"CH4","mode":"python"}'::jsonb, false, null),
  ('chemistry', 15, 'Final synthesis: glucose', 'Synthesize glucose, then inspect the lab count.', '{"id":15,"compound":"Glucose","formula":"C6H12O6","mode":"python"}'::jsonb, false, null)
on conflict (game_id, level_number) do update set
  title = excluded.title, instruction = excluded.instruction, configuration = excluded.configuration,
  is_bonus = excluded.is_bonus, bonus_number = excluded.bonus_number;

create or replace function public.submit_chemistry_attempt(
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
  answer_row public.chemistry_answer_keys;
  provided_formula text;
  provided_count integer;
  provided_code text;
  code_parts text[];
  is_correct boolean := false;
  attempt_total integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_level_number not between 1 and 15 then raise exception 'Invalid Chemistry Lab level'; end if;
  if jsonb_typeof(p_attempt_data) is distinct from 'object' then raise exception 'Chemistry payload is required'; end if;
  if p_attempt_data->>'level_id' is distinct from p_level_number::text then raise exception 'Attempt level does not match the request'; end if;
  if not exists (select 1 from public.games where game_id = 'chemistry' and enabled = true and validator_key = 'chemistry') then raise exception 'Chemistry Lab is not enabled'; end if;
  if p_level_number > 1 and not exists (select 1 from public.level_progress where user_id = current_user_id and game_id = 'chemistry' and level_number = p_level_number - 1 and status = 'completed') then raise exception 'Level is locked'; end if;
  select * into answer_row from public.chemistry_answer_keys where level_number = p_level_number;
  if answer_row.level_number is null then raise exception 'Level answer is not configured'; end if;

  provided_formula := p_attempt_data->>'synthesized_compound';
  provided_count := case when (p_attempt_data->>'synthesized_count') ~ '^[0-9]{1,2}$' then (p_attempt_data->>'synthesized_count')::integer else -1 end;
  provided_code := p_attempt_data->>'student_code';
  if provided_formula is not null and length(provided_formula) <= 32 and provided_count between 1 and 99 then
    is_correct := provided_formula = answer_row.canonical_formula and provided_count = answer_row.canonical_count;
  end if;

  if p_level_number >= 11 then
    is_correct := false;
    if provided_code is not null and length(provided_code) <= 4000 then
      code_parts := regexp_match(provided_code, 'lab\.mix\(\s*"([A-Z][A-Za-z0-9]*)"\s*,\s*([0-9]{1,2})\s*\)');
      if code_parts is not null then
        is_correct := code_parts[1] = answer_row.canonical_formula
          and code_parts[1] = provided_formula
          and code_parts[2]::integer = answer_row.canonical_count
          and code_parts[2]::integer = provided_count;
      end if;
    end if;
  end if;

  insert into public.level_attempts (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values (current_user_id, 'chemistry', p_level_number, case when is_correct then 'success' else 'miss' end,
    case when is_correct then null else 'incorrect_formula' end,
    p_attempt_data || jsonb_build_object('serverValidated', true));

  if is_correct then
    insert into public.level_progress (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values (current_user_id, 'chemistry', p_level_number, 'completed', now(), p_attempt_data || jsonb_build_object('serverValidated', true), 1)
    on conflict (user_id, game_id, level_number) do update set
      status = 'completed', completed_at = coalesce(level_progress.completed_at, now()), best_result = excluded.best_result,
      attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
    if p_level_number < 15 then
      insert into public.level_progress (user_id, game_id, level_number, status)
      values (current_user_id, 'chemistry', p_level_number + 1, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set
        status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
        updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count)
    values (current_user_id, 'chemistry', p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set
      status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
      attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
  end if;
  return jsonb_build_object('recorded', true, 'server_result', case when is_correct then 'success' else 'miss' end,
    'feedback', case when is_correct then 'Correct! The synthesis is stable.' else 'The formula or atom count does not match this level.' end,
    'unlocked_next', is_correct and p_level_number < 15, 'attempt_count', attempt_total);
end;
$$;
revoke all on function public.submit_chemistry_attempt(integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_chemistry_attempt(integer, jsonb) to authenticated;

create or replace function public.submit_chemistry_attempt_idempotent(
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
  insert into public.attempt_receipts (user_id, game_id, attempt_id)
  values (current_user_id, 'chemistry', p_attempt_id)
  on conflict (user_id, game_id, attempt_id) do nothing returning true into inserted;
  if not coalesce(inserted, false) then
    select result into saved_result from public.attempt_receipts
    where user_id = current_user_id and game_id = 'chemistry' and attempt_id = p_attempt_id;
    if saved_result is null then raise exception 'Attempt is already processing'; end if;
    return saved_result || jsonb_build_object('duplicate', true);
  end if;
  saved_result := public.submit_chemistry_attempt(p_level_number, p_attempt_data);
  update public.attempt_receipts set result = saved_result
  where user_id = current_user_id and game_id = 'chemistry' and attempt_id = p_attempt_id;
  return saved_result;
end;
$$;
revoke all on function public.submit_chemistry_attempt_idempotent(uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_chemistry_attempt_idempotent(uuid, integer, jsonb) to authenticated;

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
  elsif p_game_id = 'chemistry' then
    return public.submit_chemistry_attempt_idempotent(p_attempt_id, p_level_number, p_attempt_data);
  end if;
  raise exception 'No authoritative validator is enabled for this game';
end;
$$;
revoke all on function public.submit_game_attempt_idempotent(public.game_id, uuid, integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_game_attempt_idempotent(public.game_id, uuid, integer, jsonb) to authenticated;
