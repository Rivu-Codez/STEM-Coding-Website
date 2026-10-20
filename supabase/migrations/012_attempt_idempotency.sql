-- Make authoritative attempt submissions safe to retry.
-- The existing validators remain the single source of truth; these wrappers
-- reserve a request receipt and return its saved result on duplicates.

create table public.attempt_receipts (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id not null,
  attempt_id uuid not null,
  result jsonb,
  created_at timestamptz not null default now(),
  primary key (user_id, game_id, attempt_id)
);

alter table public.attempt_receipts enable row level security;
revoke all on public.attempt_receipts from public, authenticated, anon;

create or replace function public.submit_robo_maze_attempt_idempotent(
  p_attempt_id uuid,
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
  saved_result jsonb;
  inserted boolean;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_attempt_id is null then raise exception 'Attempt ID is required'; end if;

  insert into public.attempt_receipts (user_id, game_id, attempt_id)
  values (current_user_id, 'robo_maze', p_attempt_id)
  on conflict (user_id, game_id, attempt_id) do nothing
  returning true into inserted;

  if not coalesce(inserted, false) then
    select result into saved_result
    from public.attempt_receipts
    where user_id = current_user_id and game_id = 'robo_maze'
      and attempt_id = p_attempt_id;
    if saved_result is null then raise exception 'Attempt is already processing'; end if;
    return saved_result || jsonb_build_object('duplicate', true);
  end if;

  saved_result := public.submit_robo_maze_attempt(p_level_number, p_program);
  update public.attempt_receipts
  set result = saved_result
  where user_id = current_user_id and game_id = 'robo_maze'
    and attempt_id = p_attempt_id;
  return saved_result;
end;
$$;

create or replace function public.submit_physics_attempt_idempotent(
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

  insert into public.attempt_receipts (user_id, game_id, attempt_id)
  values (current_user_id, 'physics', p_attempt_id)
  on conflict (user_id, game_id, attempt_id) do nothing
  returning true into inserted;

  if not coalesce(inserted, false) then
    select result into saved_result
    from public.attempt_receipts
    where user_id = current_user_id and game_id = 'physics'
      and attempt_id = p_attempt_id;
    if saved_result is null then raise exception 'Attempt is already processing'; end if;
    return saved_result || jsonb_build_object('duplicate', true);
  end if;

  saved_result := public.submit_physics_attempt(p_level_number, p_attempt_data);
  update public.attempt_receipts
  set result = saved_result
  where user_id = current_user_id and game_id = 'physics'
    and attempt_id = p_attempt_id;
  return saved_result;
end;
$$;

-- Keep the old authoritative grants during this compatibility window so an
-- already deployed frontend does not break before the new client is live.
revoke all on function public.submit_robo_maze_attempt_idempotent(uuid, integer, jsonb)
  from public, authenticated, anon;
revoke all on function public.submit_physics_attempt_idempotent(uuid, integer, jsonb)
  from public, authenticated, anon;

grant execute on function public.submit_robo_maze_attempt_idempotent(uuid, integer, jsonb)
  to authenticated;
grant execute on function public.submit_physics_attempt_idempotent(uuid, integer, jsonb)
  to authenticated;
