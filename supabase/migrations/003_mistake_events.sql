create table public.mistake_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id not null,
  level_number integer not null,
  category text not null check (length(category) between 1 and 80),
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (game_id, level_number)
    references public.game_levels(game_id, level_number)
);

create index mistake_events_student_game_idx
  on public.mistake_events(user_id, game_id, created_at desc);

alter table public.mistake_events enable row level security;

create policy mistake_events_select_own
  on public.mistake_events for select
  using (auth.uid() = user_id);

create or replace function public.record_mistake_event(
  p_game_id public.game_id,
  p_level_number integer,
  p_category text,
  p_details jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if not exists (
    select 1 from public.game_levels
    where game_id = p_game_id and level_number = p_level_number
  ) then raise exception 'Level does not exist'; end if;

  insert into public.mistake_events
    (user_id, game_id, level_number, category, details)
  values
    (current_user_id, p_game_id, p_level_number, p_category, p_details);

  return jsonb_build_object('recorded', true);
end;
$$;

revoke all on function public.record_mistake_event(public.game_id, integer, text, jsonb) from public;
grant execute on function public.record_mistake_event(public.game_id, integer, text, jsonb) to authenticated;
