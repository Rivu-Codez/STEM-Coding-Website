create or replace function public.record_game_attempt(
  p_game_id public.game_id,
  p_level_number integer,
  p_result text,
  p_mistake_code text default null,
  p_attempt_data jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  next_level integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_result not in ('success', 'collision', 'miss', 'invalid', 'abandoned') then
    raise exception 'Invalid attempt result';
  end if;
  if not exists (select 1 from public.game_levels where game_id = p_game_id and level_number = p_level_number) then
    raise exception 'Level does not exist';
  end if;
  if p_level_number > 1 and not exists (
    select 1 from public.level_progress
    where user_id = current_user_id and game_id = p_game_id
      and level_number = p_level_number - 1 and status = 'completed'
  ) then raise exception 'Level is locked'; end if;

  insert into public.level_attempts
    (user_id, game_id, level_number, result, mistake_code, attempt_data)
  values
    (current_user_id, p_game_id, p_level_number, p_result, p_mistake_code, p_attempt_data);

  if p_result = 'success' then
    insert into public.level_progress
      (user_id, game_id, level_number, status, completed_at, best_result, attempt_count)
    values
      (current_user_id, p_game_id, p_level_number, 'completed', now(), p_attempt_data, 1)
    on conflict (user_id, game_id, level_number) do update set
      status = 'completed', completed_at = coalesce(level_progress.completed_at, now()),
      best_result = excluded.best_result, attempt_count = level_progress.attempt_count + 1,
      updated_at = now();
    next_level := p_level_number + 1;
    if exists (select 1 from public.game_levels where game_id = p_game_id and level_number = next_level) then
      insert into public.level_progress (user_id, game_id, level_number, status)
      values (current_user_id, p_game_id, next_level, 'unlocked')
      on conflict (user_id, game_id, level_number) do update set
        status = case when level_progress.status = 'completed'
          then 'completed'::public.progress_status else 'unlocked'::public.progress_status end,
        updated_at = now();
    end if;
  else
    insert into public.level_progress (user_id, game_id, level_number, status, attempt_count)
    values (current_user_id, p_game_id, p_level_number, 'unlocked', 1)
    on conflict (user_id, game_id, level_number) do update set
      attempt_count = level_progress.attempt_count + 1, updated_at = now();
  end if;
  return jsonb_build_object('recorded', true, 'unlocked_next', p_result = 'success');
end;
$$;

revoke all on function public.record_game_attempt(public.game_id, integer, text, text, jsonb) from public;
grant execute on function public.record_game_attempt(public.game_id, integer, text, text, jsonb) to authenticated;
