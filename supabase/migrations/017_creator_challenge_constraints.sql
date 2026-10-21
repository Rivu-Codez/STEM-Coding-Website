-- Enforce Creator Academy challenge-specific construction rules at the database boundary.
-- This keeps browser validation helpful without making it authoritative.

create or replace function public.enforce_creator_level_constraints()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  wall_count integer;
begin
  if NEW.academy_level in (33, 34) then
    select count(*) into wall_count
    from jsonb_array_elements(NEW.definition->'grid') as row_data
    cross join jsonb_array_elements(row_data) as cell
    where (cell #>> '{}')::integer = 1;

    if NEW.academy_level = 33 and wall_count < 1 then
      raise exception 'Level 33 requires at least 1 wall obstacle';
    end if;
    if NEW.academy_level = 34 and wall_count < 3 then
      raise exception 'Level 34 requires at least 3 wall obstacles';
    end if;
  end if;
  return NEW;
end;
$$;

drop trigger if exists creator_level_constraints_trigger on public.creator_levels;
create trigger creator_level_constraints_trigger
before insert or update of academy_level, definition on public.creator_levels
for each row execute function public.enforce_creator_level_constraints();
