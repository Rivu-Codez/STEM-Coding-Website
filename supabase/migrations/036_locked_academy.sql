-- Replace Signal Decrypter's student-facing curriculum with The Locked Academy.
-- Keep the existing game ID and tables so account progress and rewards continue
-- to use the established platform contracts.

update public.games
set display_name = 'The Locked Academy',
    description = 'Explore a clue-filled academy while learning Python print statements, variables, and basic arithmetic.',
    route = 'SignalDecrypter/index.html',
    icon = '🔐',
    updated_at = now()
where game_id = 'signal_decrypter';

insert into public.game_levels (game_id, level_number, title, instruction, configuration, is_bonus, bonus_number)
values
  ('signal_decrypter', 1, 'Moon Word', 'Find the word hidden in the room, then use print() to display it.', '{"id":1,"room":0,"mode":"blocks"}'::jsonb, false, null),
  ('signal_decrypter', 2, 'Clock Number', 'Find the number and print it. Numbers do not need quotes.', '{"id":2,"room":0,"mode":"blocks"}'::jsonb, false, null),
  ('signal_decrypter', 3, 'Book and Drawer', 'Find a word and a number. Print the word first, then the number.', '{"id":3,"room":0,"mode":"blocks"}'::jsonb, false, null),
  ('signal_decrypter', 4, 'Python Book', 'Find the book title. Store it in book, then print book.', '{"id":4,"room":1,"mode":"blocks"}'::jsonb, false, null),
  ('signal_decrypter', 5, 'Ada’s Signature', 'Find the author’s name. Store it in author, then print author.', '{"id":5,"room":1,"mode":"fill"}'::jsonb, false, null),
  ('signal_decrypter', 6, 'New Code', 'Find the new code and replace the old value in code.', '{"id":6,"room":1,"mode":"fill"}'::jsonb, false, null),
  ('signal_decrypter', 7, 'My Book', 'Store the title in my_book, then print the variable.', '{"id":7,"room":2,"mode":"fill"}'::jsonb, false, null),
  ('signal_decrypter', 8, 'The Key Variable', 'Print the value stored in key, not the word key.', '{"id":8,"room":2,"mode":"fill"}'::jsonb, false, null),
  ('signal_decrypter', 9, 'Chest Code', 'Find the code. Store it in code, then print it.', '{"id":9,"room":2,"mode":"type"}'::jsonb, false, null),
  ('signal_decrypter', 10, 'Age Report', 'Store the age and print “Age: 36” using a comma.', '{"id":10,"room":3,"mode":"type"}'::jsonb, false, null),
  ('signal_decrypter', 11, 'Clue Calculator', 'Find two numbers, add them into total, and print total.', '{"id":11,"room":3,"mode":"type"}'::jsonb, false, null),
  ('signal_decrypter', 12, 'Lives Report', 'Find the name and lives. Print them in a sentence with an f-string.', '{"id":12,"room":3,"mode":"type"}'::jsonb, false, null),
  ('signal_decrypter', 13, 'Three Clues', 'Store three clues in variables and print each on its own line.', '{"id":13,"room":4,"mode":"type"}'::jsonb, false, null),
  ('signal_decrypter', 14, 'Treasure Total', 'Find the coins and bonus. Add them into total, then print total.', '{"id":14,"room":4,"mode":"type"}'::jsonb, false, null),
  ('signal_decrypter', 15, 'The Exit Report', 'Use variables, a sum, and an f-string to open the final door.', '{"id":15,"room":4,"mode":"type"}'::jsonb, false, null)
on conflict (game_id, level_number) do update set
  title = excluded.title,
  instruction = excluded.instruction,
  configuration = excluded.configuration,
  is_bonus = excluded.is_bonus,
  bonus_number = excluded.bonus_number;

insert into public.signal_decrypter_answer_keys
  (level_number, canonical_operations, canonical_code, expected_output, question_answer)
values
  (1, '[]'::jsonb, $code$print("moon")$code$, 'moon', 'moon'),
  (2, '[]'::jsonb, $code$print(7)$code$, '7', '7'),
  (3, '[]'::jsonb, E'print("star")\nprint(12)', E'star\n12', E'star\n12'),
  (4, '[]'::jsonb, E'book = "Python"\nprint(book)', 'Python', 'Python'),
  (5, '[]'::jsonb, E'author = "Ada"\nprint(author)', 'Ada', 'Ada'),
  (6, '[]'::jsonb, E'code = 1234\ncode = 5678\nprint(code)', '5678', '5678'),
  (7, '[]'::jsonb, E'my_book = "Spells"\nprint(my_book)', 'Spells', 'Spells'),
  (8, '[]'::jsonb, E'key = "owl"\nprint(key)', 'owl', 'owl'),
  (9, '[]'::jsonb, E'code = 4821\nprint(code)', '4821', '4821'),
  (10, '[]'::jsonb, E'age = 36\nprint("Age:", age)', 'Age: 36', 'Age: 36'),
  (11, '[]'::jsonb, E'a = 40\nb = 25\ntotal = a + b\nprint(total)', '65', '65'),
  (12, '[]'::jsonb, E'name = "Mia"\nlives = 3\nprint(f"{name} has {lives} lives")', 'Mia has 3 lives', 'Mia has 3 lives'),
  (13, '[]'::jsonb, E'name = "Mia"\nlives = 3\nkey = 99\nprint(name)\nprint(lives)\nprint(key)', E'Mia\n3\n99', E'Mia\n3\n99'),
  (14, '[]'::jsonb, E'coins = 20\nbonus = 5\ntotal = coins + bonus\nprint(total)', '25', '25'),
  (15, '[]'::jsonb, E'name = "Mia"\ncoins = 20\nbonus = 5\ntotal = coins + bonus\nprint(f"{name} escaped with {total} coins")', 'Mia escaped with 25 coins', 'Mia escaped with 25 coins')
on conflict (level_number) do update set
  canonical_operations = excluded.canonical_operations,
  canonical_code = excluded.canonical_code,
  expected_output = excluded.expected_output,
  question_answer = excluded.question_answer;

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
  provided_code text;
  is_correct boolean := false;
  result_code text;
  attempt_total integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_level_number not between 1 and 15 then raise exception 'Invalid Academy level'; end if;
  if jsonb_typeof(p_attempt_data) is distinct from 'object' then raise exception 'Academy attempt payload is required'; end if;
  if not exists (select 1 from public.games where game_id = 'signal_decrypter' and enabled = true and validator_key = 'signal_decrypter') then raise exception 'The Locked Academy is not enabled'; end if;
  if p_level_number > 1 and not exists (
    select 1 from public.level_progress
    where user_id = current_user_id and game_id = 'signal_decrypter'
      and level_number = p_level_number - 1 and status = 'completed'
  ) then raise exception 'Level is locked'; end if;

  select * into key_row from public.signal_decrypter_answer_keys where level_number = p_level_number;
  if key_row.level_number is null then raise exception 'Academy answer is not configured'; end if;
  provided_code := replace(coalesce(p_attempt_data->>'code', ''), E'\r\n', E'\n');
  if length(provided_code) <= 800 then
    is_correct := btrim(provided_code) = btrim(key_row.canonical_code);
  end if;
  result_code := case when is_correct then 'success' else 'miss' end;

  insert into public.level_attempts (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values (current_user_id, 'signal_decrypter', p_level_number, result_code,
    case when is_correct then null else 'incorrect_python_solution' end,
    p_attempt_data || jsonb_build_object('serverValidated', true));

  if is_correct then
    insert into public.level_progress (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values (current_user_id, 'signal_decrypter', p_level_number, 'completed', now(), p_attempt_data || jsonb_build_object('output', key_row.expected_output), 1)
    on conflict (user_id, game_id, level_number) do update set
      status = 'completed', completed_at = coalesce(level_progress.completed_at, now()), best_result = excluded.best_result,
      attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
    if p_level_number < 15 then
      insert into public.level_progress (user_id, game_id, level_number, status)
      values (current_user_id, 'signal_decrypter', p_level_number + 1, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set
        status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
        updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count)
    values (current_user_id, 'signal_decrypter', p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set
      status = case when level_progress.status = 'completed' then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
      attempt_count = level_progress.attempt_count + 1, updated_at = now()
    returning attempt_count into attempt_total;
  end if;

  return jsonb_build_object('recorded', true, 'server_result', result_code,
    'feedback', case when is_correct then 'Correct! The code opens the lock.'
      else 'Review the clue and Python lesson, then try the reference code structure.' end,
    'failure_code', case when is_correct then null else 'incorrect_python_solution' end,
    'attempt_count', attempt_total,
    'revealed_answer', case when not is_correct and attempt_total >= 5 then key_row.question_answer else null end,
    'unlocked_next', is_correct and p_level_number < 15);
end;
$$;

revoke all on function public.submit_signal_decrypter_attempt(integer, jsonb) from public, anon, authenticated;
grant execute on function public.submit_signal_decrypter_attempt(integer, jsonb) to authenticated;
