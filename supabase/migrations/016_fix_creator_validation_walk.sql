-- Fix Creator Academy validation for PostgreSQL variable/column name resolution.
-- The recursive walk columns are explicitly qualified so save/publish cannot
-- fail with "column reference x is ambiguous".

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
  if p_academy_level not between 31 and 35 or jsonb_typeof(p_definition) <> 'object' then
    return jsonb_build_object('valid', false, 'error', 'Invalid creator level definition');
  end if;
  grid := p_definition->'grid';
  start_state := p_definition->'start';
  goal_state := p_definition->'goal';
  if jsonb_typeof(grid) <> 'array' or jsonb_array_length(grid) <> 8
     or jsonb_typeof(start_state) <> 'object' or jsonb_typeof(goal_state) <> 'object' then
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
  if (grid->start_y->start_x)::integer = 1 or (grid->goal_y->goal_x)::integer = 1 then
    return jsonb_build_object('valid', false, 'error', 'Start and goal must be on empty cells');
  end if;
  with recursive walk(x, y, visited) as (
    select start_x, start_y, array[start_x::text || ':' || start_y::text]
    union all
    select next_x, next_y, visited || (next_x::text || ':' || next_y::text)
    from walk
    cross join lateral (
      values (walk.x + 1, walk.y), (walk.x - 1, walk.y),
             (walk.x, walk.y + 1), (walk.x, walk.y - 1)
    ) as next_cell(next_x, next_y)
    where next_x between 0 and 7 and next_y between 0 and 7
      and (grid->next_y->next_x)::integer = 0
      and not ((next_x::text || ':' || next_y::text) = any(visited))
  )
  select exists(select 1 from walk where walk.x = goal_x and walk.y = goal_y)
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

revoke all on function public.validate_creator_level(integer, jsonb) from public, anon, authenticated;
grant execute on function public.validate_creator_level(integer, jsonb) to authenticated;
