-- Creator Academy foundation for RoboMaze Levels 31-35.
-- Drafts are owner-scoped; only validated published levels receive share codes.

create type public.creator_level_status as enum ('draft', 'published');

create table public.creator_levels (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  academy_level integer not null check (academy_level between 31 and 35),
  title text not null default 'Untitled RoboMaze',
  description text not null default '',
  definition jsonb not null default '{}'::jsonb,
  status public.creator_level_status not null default 'draft',
  share_code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  published_at timestamptz,
  check (
    (status = 'draft' and share_code is null and published_at is null)
    or (status = 'published' and share_code is not null and published_at is not null)
  )
);

create index creator_levels_owner_idx on public.creator_levels(owner_id, academy_level);
create index creator_levels_share_code_idx on public.creator_levels(share_code)
  where status = 'published';

create table public.creator_level_attempts (
  id uuid primary key default gen_random_uuid(),
  creator_level_id uuid not null references public.creator_levels(id) on delete cascade,
  player_id uuid not null references auth.users(id) on delete cascade,
  attempt_id uuid not null,
  result text not null check (result in ('success', 'collision', 'miss', 'invalid')),
  program jsonb not null default '[]'::jsonb,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (player_id, attempt_id)
);

create index creator_attempts_level_player_idx
  on public.creator_level_attempts(creator_level_id, player_id, created_at desc);

create table public.creator_level_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  creator_level_id uuid not null references public.creator_levels(id) on delete cascade,
  status public.progress_status not null default 'unlocked',
  attempt_count integer not null default 0 check (attempt_count >= 0),
  completed_at timestamptz,
  best_result jsonb,
  updated_at timestamptz not null default now(),
  primary key (user_id, creator_level_id)
);

alter table public.creator_levels enable row level security;
alter table public.creator_level_attempts enable row level security;
alter table public.creator_level_progress enable row level security;
revoke all on public.creator_levels, public.creator_level_attempts from public, anon, authenticated;
revoke all on public.creator_level_progress from public, anon, authenticated;

create policy creator_levels_owner_select on public.creator_levels
  for select to authenticated using (auth.uid() = owner_id);
create policy creator_attempts_player_select on public.creator_level_attempts
  for select to authenticated using (auth.uid() = player_id);
create policy creator_progress_owner_select on public.creator_level_progress
  for select to authenticated using (auth.uid() = user_id);

create or replace function public.validate_creator_level(
  p_academy_level integer,
  p_definition jsonb
)
returns jsonb
language plpgsql
immutable
set search_path = public
as $$
declare
  grid jsonb;
  start_state jsonb;
  goal_state jsonb;
  row_data jsonb;
  start_x integer;
  start_y integer;
  goal_x integer;
  goal_y integer;
  wall_count integer := 0;
  y integer;
  x integer;
  cell integer;
  reachable boolean := false;
begin
  if p_academy_level not between 31 and 35
     or jsonb_typeof(p_definition) <> 'object' then
    return jsonb_build_object('valid', false, 'error', 'Invalid creator level definition');
  end if;

  grid := p_definition->'grid';
  start_state := p_definition->'start';
  goal_state := p_definition->'goal';

  if jsonb_typeof(grid) <> 'array'
     or jsonb_array_length(grid) <> 8
     or jsonb_typeof(start_state) <> 'object'
     or jsonb_typeof(goal_state) <> 'object' then
    return jsonb_build_object('valid', false, 'error', 'Grid, start, and goal are required');
  end if;

  begin
    start_x := (start_state->>'x')::integer;
    start_y := (start_state->>'y')::integer;
    goal_x := (goal_state->>'x')::integer;
    goal_y := (goal_state->>'y')::integer;
  exception when others then
    return jsonb_build_object('valid', false, 'error', 'Start and goal coordinates must be integers');
  end;

  if start_x not between 0 and 7 or start_y not between 0 and 7
     or goal_x not between 0 and 7 or goal_y not between 0 and 7
     or (start_x = goal_x and start_y = goal_y) then
    return jsonb_build_object('valid', false, 'error', 'Start and goal must be different in-bounds cells');
  end if;

  if coalesce((start_state->>'dir')::integer, -1) not between 0 and 3 then
    return jsonb_build_object('valid', false, 'error', 'Start direction must be 0, 1, 2, or 3');
  end if;

  for y in 0..7 loop
    row_data := grid->y;
    if jsonb_typeof(row_data) <> 'array' or jsonb_array_length(row_data) <> 8 then
      return jsonb_build_object('valid', false, 'error', 'Grid must be exactly 8 by 8');
    end if;
    for x in 0..7 loop
      begin
        cell := (row_data->>x)::integer;
      exception when others then
        return jsonb_build_object('valid', false, 'error', 'Grid cells must be integers');
      end;
      if cell not in (0, 1) then
        return jsonb_build_object('valid', false, 'error', 'Grid cells must be 0 for empty or 1 for wall');
      end if;
      if cell = 1 then wall_count := wall_count + 1; end if;
    end loop;
  end loop;

  if (grid->start_y->start_x)::integer = 1
     or (grid->goal_y->goal_x)::integer = 1 then
    return jsonb_build_object('valid', false, 'error', 'Start and goal must be on empty cells');
  end if;

  with recursive walk(x, y, visited) as (
    select start_x, start_y, array[start_x::text || ':' || start_y::text]
    union all
    select next_x, next_y, visited || (next_x::text || ':' || next_y::text)
    from walk
    cross join lateral (
      values (x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)
    ) as next_cell(next_x, next_y)
    where next_x between 0 and 7
      and next_y between 0 and 7
      and (grid->next_y->next_x)::integer = 0
      and not ((next_x::text || ':' || next_y::text) = any(visited))
  )
  select exists(select 1 from walk where x = goal_x and y = goal_y)
  into reachable;

  if not reachable then
    return jsonb_build_object('valid', false, 'error', 'The goal must be reachable from the start');
  end if;

  if p_academy_level = 31 and wall_count < 3 then
    return jsonb_build_object('valid', false, 'error', 'Level 31 requires at least 3 walls');
  end if;

  return jsonb_build_object('valid', true, 'wall_count', wall_count, 'reachable', true);
end;
$$;

create or replace function public.save_creator_level(
  p_creator_level_id uuid,
  p_academy_level integer,
  p_title text,
  p_description text,
  p_definition jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  saved_id uuid;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_title is null or length(trim(p_title)) not between 1 and 80 then
    raise exception 'Title must be between 1 and 80 characters';
  end if;
  if p_description is null or length(p_description) > 500 then
    raise exception 'Description is too long';
  end if;
  if p_creator_level_id is null then
    insert into public.creator_levels(owner_id, academy_level, title, description, definition)
    values (current_user_id, p_academy_level, trim(p_title), p_description, p_definition)
    returning id into saved_id;
  else
    update public.creator_levels
    set academy_level = p_academy_level, title = trim(p_title),
        description = p_description, definition = p_definition,
        updated_at = now()
    where id = p_creator_level_id and owner_id = current_user_id and status = 'draft'
    returning id into saved_id;
    if saved_id is null then raise exception 'Draft not found or already published'; end if;
  end if;
  return jsonb_build_object('saved', true, 'creator_level_id', saved_id);
end;
$$;

create or replace function public.publish_creator_level(p_creator_level_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  draft public.creator_levels;
  validation jsonb;
  generated_code text;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select * into draft from public.creator_levels
  where id = p_creator_level_id and owner_id = current_user_id and status = 'draft'
  for update;
  if not found then raise exception 'Draft not found or already published'; end if;

  validation := public.validate_creator_level(draft.academy_level, draft.definition);
  if coalesce((validation->>'valid')::boolean, false) is not true then
    raise exception '%', validation->>'error';
  end if;

  loop
    generated_code := lpad((floor(random() * 1000000))::integer::text, 6, '0');
    exit when not exists (select 1 from public.creator_levels where share_code = generated_code);
  end loop;

  update public.creator_levels
  set status = 'published', share_code = generated_code,
      published_at = now(), updated_at = now()
  where id = draft.id;

  return jsonb_build_object('published', true, 'creator_level_id', draft.id, 'share_code', generated_code);
end;
$$;

create or replace function public.get_published_creator_level(p_share_code text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select jsonb_build_object(
    'creator_level_id', id,
    'academy_level', academy_level,
    'title', title,
    'description', description,
    'definition', definition,
    'share_code', share_code
  )
  from public.creator_levels
  where status = 'published' and share_code = p_share_code;
$$;

create or replace function public.submit_creator_level_attempt(
  p_creator_level_id uuid,
  p_attempt_id uuid,
  p_program jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  creator_level public.creator_levels;
  saved_attempt public.creator_level_attempts;
  definition jsonb;
  grid jsonb;
  start_state jsonb;
  goal_state jsonb;
  command jsonb;
  command_type text;
  command_count integer;
  x integer;
  y integer;
  direction integer;
  goal_x integer;
  goal_y integer;
  next_x integer;
  next_y integer;
  expanded_steps integer := 0;
  max_steps integer := 200;
  solved boolean := false;
  halted boolean := false;
  i integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if p_creator_level_id is null or p_attempt_id is null
     or jsonb_typeof(p_program) <> 'array' then
    raise exception 'Invalid creator attempt';
  end if;
  if jsonb_array_length(p_program) > 40 then raise exception 'Program is too large'; end if;

  select * into saved_attempt from public.creator_level_attempts
  where player_id = current_user_id and attempt_id = p_attempt_id;
  if found then
    return jsonb_build_object('duplicate', true, 'server_result', saved_attempt.result)
      || saved_attempt.details;
  end if;

  select * into creator_level from public.creator_levels
  where id = p_creator_level_id
    and (status = 'published' or owner_id = current_user_id);
  if not found then raise exception 'Creator level is unavailable'; end if;

  definition := creator_level.definition;
  if not coalesce((public.validate_creator_level(creator_level.academy_level, definition)->>'valid')::boolean, false) then
    raise exception 'Creator level is not valid';
  end if;
  if creator_level.academy_level = 32 and jsonb_array_length(p_program) >= 10 then
    raise exception 'Level 32 requires fewer than 10 commands';
  end if;

  grid := definition->'grid';
  start_state := definition->'start';
  goal_state := definition->'goal';
  x := (start_state->>'x')::integer;
  y := (start_state->>'y')::integer;
  direction := (start_state->>'dir')::integer;
  goal_x := (goal_state->>'x')::integer;
  goal_y := (goal_state->>'y')::integer;

  for command in select value from jsonb_array_elements(p_program) loop
    command_type := command->>'type';
    command_count := coalesce((command->>'count')::integer, 1);
    if command_type = 'REPEAT_FORWARD' then
      if command_count not between 2 and 5 then raise exception 'Invalid repeat count'; end if;
      for i in 1..command_count loop
        expanded_steps := expanded_steps + 1;
        if expanded_steps > max_steps then raise exception 'Program exceeds step limit'; end if;
        next_x := x + case direction when 1 then 1 when 3 then -1 else 0 end;
        next_y := y + case direction when 2 then 1 when 0 then -1 else 0 end;
        if next_x not between 0 and 7 or next_y not between 0 and 7
           or (grid->next_y->next_x)::integer = 1 then halted := true; exit; end if;
        x := next_x; y := next_y;
        if x = goal_x and y = goal_y then solved := true; exit; end if;
      end loop;
      if solved or halted then exit; end if;
      continue;
    end if;

    if command_type not in ('FORWARD', 'TURN_LEFT', 'TURN_RIGHT', 'IF_PATH_CLEAR', 'IF_WALL_RIGHT', 'IF_WALL_LEFT') then
      raise exception 'Unsupported command';
    end if;
    expanded_steps := expanded_steps + 1;
    if expanded_steps > max_steps then raise exception 'Program exceeds step limit'; end if;
    if command_type = 'TURN_LEFT' then direction := (direction + 3) % 4;
    elsif command_type = 'TURN_RIGHT' then direction := (direction + 1) % 4;
    else
      next_x := x + case direction when 1 then 1 when 3 then -1 else 0 end;
      next_y := y + case direction when 2 then 1 when 0 then -1 else 0 end;
      if next_x not between 0 and 7 or next_y not between 0 and 7
         or (grid->next_y->next_x)::integer = 1 then
        if command_type = 'IF_WALL_RIGHT' then direction := (direction + 1) % 4;
        elsif command_type = 'IF_WALL_LEFT' then direction := (direction + 3) % 4;
        elsif command_type = 'FORWARD' then halted := true; exit;
        end if;
      elsif command_type in ('FORWARD', 'IF_PATH_CLEAR') then x := next_x; y := next_y;
      end if;
    end if;
    if x = goal_x and y = goal_y then solved := true; exit; end if;
  end loop;

  insert into public.creator_level_attempts(creator_level_id, player_id, attempt_id, result, program, details)
  values (p_creator_level_id, current_user_id, p_attempt_id,
    case when solved then 'success' else 'miss' end, p_program,
    jsonb_build_object('server_validated', true, 'steps', expanded_steps));

  insert into public.creator_level_progress(user_id, creator_level_id, status, attempt_count, completed_at, best_result)
  values (current_user_id, p_creator_level_id, case when solved then 'completed' else 'unlocked' end,
    1, case when solved then now() else null end, jsonb_build_object('steps', expanded_steps))
  on conflict (user_id, creator_level_id) do update set
    status = case when solved then 'completed'::public.progress_status else creator_level_progress.status end,
    attempt_count = creator_level_progress.attempt_count + 1,
    completed_at = case when solved then coalesce(creator_level_progress.completed_at, now()) else creator_level_progress.completed_at end,
    best_result = case when solved then excluded.best_result else creator_level_progress.best_result end,
    updated_at = now();

  return jsonb_build_object('recorded', true, 'server_result', case when solved then 'success' else 'miss' end,
    'steps', expanded_steps, 'halted', halted);
end;
$$;

revoke all on function public.validate_creator_level(integer, jsonb) from public, anon, authenticated;
revoke all on function public.save_creator_level(uuid, integer, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.publish_creator_level(uuid) from public, anon, authenticated;
revoke all on function public.get_published_creator_level(text) from public, anon, authenticated;
revoke all on function public.submit_creator_level_attempt(uuid, uuid, jsonb) from public, anon, authenticated;

grant execute on function public.validate_creator_level(integer, jsonb) to authenticated;
grant execute on function public.save_creator_level(uuid, integer, text, text, jsonb) to authenticated;
grant execute on function public.publish_creator_level(uuid) to authenticated;
grant execute on function public.get_published_creator_level(text) to authenticated;
grant execute on function public.submit_creator_level_attempt(uuid, uuid, jsonb) to authenticated;
