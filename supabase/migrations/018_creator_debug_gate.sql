-- Require a genuine failed attempt before a Level 34 success.
-- This makes the debugging objective server-authoritative.

create or replace function public.enforce_creator_debug_gate()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  academy_level_number integer;
begin
  if NEW.result <> 'success' then
    return NEW;
  end if;

  select academy_level into academy_level_number
  from public.creator_levels
  where id = NEW.creator_level_id;

  if academy_level_number = 34
     and not exists (
       select 1
       from public.creator_level_attempts prior_attempt
       where prior_attempt.creator_level_id = NEW.creator_level_id
         and prior_attempt.player_id = NEW.player_id
         and prior_attempt.result in ('collision', 'miss')
     ) then
    raise exception 'Level 34 requires a failed debugging attempt before success';
  end if;

  return NEW;
end;
$$;

drop trigger if exists creator_debug_gate_trigger on public.creator_level_attempts;
create trigger creator_debug_gate_trigger
before insert on public.creator_level_attempts
for each row execute function public.enforce_creator_debug_gate();
