-- Achievement records: one best result per student, game, and level.
create table public.student_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  game_id public.game_id not null,
  level_number integer not null check (level_number between 1 and 35),
  stars integer not null check (stars between 0 and 3),
  xp integer not null check (xp >= 0),
  attempts integer not null check (attempts >= 1),
  concept_completed boolean not null default true,
  best_result jsonb not null default '{}'::jsonb,
  completed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id, level_number),
  foreign key (game_id, level_number)
    references public.game_levels(game_id, level_number)
);

create index student_achievements_user_game_idx
  on public.student_achievements(user_id, game_id, level_number);

alter table public.student_achievements enable row level security;

create policy achievements_select_own
  on public.student_achievements for select
  using (auth.uid() = user_id);

create or replace function public.record_student_achievement(
  p_game_id public.game_id,
  p_level_number integer,
  p_stars integer,
  p_xp integer,
  p_attempts integer,
  p_concept_completed boolean,
  p_best_result jsonb default '{}'::jsonb
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
  if p_stars not between 0 and 3 or p_xp < 0 or p_attempts < 1 then
    raise exception 'Invalid achievement data';
  end if;

  insert into public.student_achievements
    (user_id, game_id, level_number, stars, xp, attempts, concept_completed, best_result)
  values
    (current_user_id, p_game_id, p_level_number, p_stars, p_xp, p_attempts, p_concept_completed, p_best_result)
  on conflict (user_id, game_id, level_number) do update set
    stars = excluded.stars,
    xp = excluded.xp,
    attempts = excluded.attempts,
    concept_completed = excluded.concept_completed,
    best_result = excluded.best_result,
    completed_at = now(),
    updated_at = now()
  where excluded.stars > student_achievements.stars
     or (excluded.stars = student_achievements.stars and excluded.xp > student_achievements.xp);

  return jsonb_build_object('recorded', true);
end;
$$;

revoke all on function public.record_student_achievement(public.game_id, integer, integer, integer, integer, boolean, jsonb) from public;
grant execute on function public.record_student_achievement(public.game_id, integer, integer, integer, integer, boolean, jsonb) to authenticated;

create or replace function public.get_student_star_total(p_game_id public.game_id)
returns integer
language sql
security invoker
as $$
  select coalesce(sum(stars), 0)::integer
  from public.student_achievements
  where user_id = auth.uid() and game_id = p_game_id;
$$;

grant execute on function public.get_student_star_total(public.game_id) to authenticated;
