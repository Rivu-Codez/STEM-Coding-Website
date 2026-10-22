-- Biology Garden is a stateful game: milestones award progress, but gameplay is not level-gated.
alter table public.games add column if not exists progression_mode text not null default 'levels';
alter table public.games drop constraint if exists games_check;
alter table public.games drop constraint if exists games_progression_check;
alter table public.games add constraint games_progression_check check (
  enabled = false or (
    validator_key is not null and
    ((progression_mode = 'levels' and level_count > 0) or progression_mode = 'stateful')
  )
);

update public.games set progression_mode = 'levels' where progression_mode is null;
update public.games set
  display_name = 'Biology Garden',
  description = 'Grow a tomato plant and discover how care, light, water, and photosynthesis work together.',
  route = 'Biology/index.html', level_count = 0, validator_key = 'biology',
  icon = '✦', enabled = true, progression_mode = 'stateful', updated_at = now()
where game_id = 'biology';

insert into public.game_levels (game_id, level_number, title, instruction, configuration, is_bonus, bonus_number)
select 'biology'::public.game_id, milestone.number, milestone.title, milestone.instruction,
  jsonb_build_object('milestone', milestone.key), false, null
from (values
  (1, 'Seed', 'Begin the tomato garden.', 'seed'),
  (2, 'Sprout', 'Help the seed become a sprout.', 'sprout'),
  (3, 'Leafy plant', 'Grow the first leaves and discover photosynthesis.', 'leafy'),
  (4, 'Flower bud', 'Keep the plant balanced as a bud forms.', 'bud'),
  (5, 'Flower', 'Support flowering with thoughtful care.', 'flower'),
  (6, 'Fruit and harvest', 'Complete the first tomato growth cycle.', 'fruit')
) as milestone(number, title, instruction, key)
on conflict (game_id, level_number) do update set
  title = excluded.title, instruction = excluded.instruction,
  configuration = excluded.configuration, is_bonus = excluded.is_bonus,
  bonus_number = excluded.bonus_number;

create table if not exists public.biology_gardens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.biology_gardens enable row level security;
drop policy if exists biology_gardens_owner_select on public.biology_gardens;
create policy biology_gardens_owner_select on public.biology_gardens for select to authenticated using (user_id = auth.uid());

create or replace function public.load_biology_garden()
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); garden_state jsonb;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  insert into public.biology_gardens(user_id, state)
  values (current_user_id, '{"day":1,"phase":"day","stage":"seed","health":82,"moisture":52,"light":48,"nutrients":46,"plannedActions":[],"milestones":[],"lastObservation":"Your seed is ready for its first care plan."}'::jsonb)
  on conflict (user_id) do nothing;
  select state into garden_state from public.biology_gardens where user_id = current_user_id;
  return jsonb_build_object('garden', garden_state);
end; $$;

create or replace function public.submit_biology_plan(p_actions jsonb, p_client_day integer, p_client_phase text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid(); garden_state jsonb; action text; water_count integer := 0; sunlight_count integer := 0;
  moisture integer; light integer; nutrients integer; health integer; balance integer; current_stage integer; nutrient_count integer := 0;
  next_stage text; old_stage text; next_phase text; next_day integer; observation text; stage_names text[] := array['seed','sprout','leafy','bud','flower','fruit']; required_days integer[] := array[1,4,9,15,22,30]; target_stage integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  if jsonb_typeof(p_actions) <> 'array' or jsonb_array_length(p_actions) > 3 then raise exception 'Choose up to three care actions'; end if;
  if p_client_phase not in ('day','night') then raise exception 'Invalid garden phase'; end if;
  select bg.state into garden_state from public.biology_gardens as bg where bg.user_id = current_user_id for update;
  if garden_state is null then perform public.load_biology_garden(); select bg.state into garden_state from public.biology_gardens as bg where bg.user_id = current_user_id for update; end if;
  if (garden_state->>'day')::integer <> p_client_day or garden_state->>'phase' <> p_client_phase then raise exception 'Garden changed; reload before planning'; end if;
  for action in select jsonb_array_elements_text(p_actions) loop
    if action not in ('water','sunlight','nutrients','observe') then raise exception 'Unsupported care action'; end if;
    if action = 'water' then water_count := water_count + 1; end if;
    if action = 'sunlight' then sunlight_count := sunlight_count + 1; end if;
    if action = 'nutrients' then nutrient_count := nutrient_count + 1; end if;
  end loop;
  moisture := least(100, (garden_state->>'moisture')::integer + water_count * 24);
  light := least(100, (garden_state->>'light')::integer + sunlight_count * 22);
  nutrients := least(100, (garden_state->>'nutrients')::integer + nutrient_count * 18);
  health := (garden_state->>'health')::integer;
  if water_count > 1 then health := health - (water_count - 1) * 12; end if;
  if sunlight_count > 2 then health := health - (sunlight_count - 2) * 8; end if;
  balance := least(moisture, least(light, nutrients));
  if balance >= 45 then health := health + 6; else health := health - 8; end if;
  health := greatest(0, least(100, health));
  next_phase := case when p_client_phase = 'day' then 'night' else 'day' end;
  next_day := p_client_day + case when next_phase = 'day' then 1 else 0 end;
  moisture := greatest(0, moisture - 16); light := greatest(0, light - 10); nutrients := greatest(0, nutrients - 5);
  old_stage := garden_state->>'stage';
  current_stage := array_position(stage_names, old_stage);
  select count(*)::integer into target_stage from unnest(required_days) as required(day) where required.day <= next_day;
  if least(moisture, least(light, nutrients)) >= 48 and health >= 60 then
    current_stage := greatest(current_stage, least(array_length(stage_names, 1), target_stage));
  end if;
  next_stage := stage_names[current_stage];
  observation := case when next_stage <> garden_state->>'stage' then 'Healthy care helped your plant reach the ' || next_stage || ' stage.' else 'Growth slowed because one or more plant needs were out of balance.' end;
  garden_state := jsonb_build_object('day', next_day, 'phase', next_phase, 'stage', next_stage, 'health', health, 'moisture', moisture, 'light', light, 'nutrients', nutrients, 'plannedActions', '[]'::jsonb, 'milestones', coalesce(garden_state->'milestones','[]'::jsonb), 'lastObservation', observation);
  if next_stage <> old_stage and not (garden_state->'milestones' @> to_jsonb(next_stage)) then
    garden_state := jsonb_set(garden_state, '{milestones}', (garden_state->'milestones') || to_jsonb(next_stage));
    insert into public.student_achievements(user_id, game_id, level_number, stars, xp, attempts, concept_completed, best_result)
    values (current_user_id, 'biology', current_stage, 3, 50, 1, true, jsonb_build_object('stage', next_stage))
    on conflict (user_id, game_id, level_number) do nothing;
  end if;
  update public.biology_gardens as bg set state = garden_state, updated_at = now() where bg.user_id = current_user_id;
  return jsonb_build_object('garden', garden_state, 'feedback', observation);
end; $$;

create or replace function public.advance_biology_phase(p_client_day integer, p_client_phase text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare current_user_id uuid := auth.uid(); garden_state jsonb; next_phase text; next_day integer;
begin
  if current_user_id is null then raise exception 'Authentication required'; end if;
  select bg.state into garden_state from public.biology_gardens as bg where bg.user_id = current_user_id for update;
  if garden_state is null then return public.load_biology_garden(); end if;
  if (garden_state->>'day')::integer <> p_client_day or garden_state->>'phase' <> p_client_phase then raise exception 'Garden changed; reload before advancing'; end if;
  next_phase := case when p_client_phase = 'day' then 'night' else 'day' end;
  next_day := p_client_day + case when next_phase = 'day' then 1 else 0 end;
  garden_state := jsonb_set(jsonb_set(garden_state, '{phase}', to_jsonb(next_phase)), '{day}', to_jsonb(next_day));
  update public.biology_gardens as bg set state = garden_state, updated_at = now() where bg.user_id = current_user_id;
  return jsonb_build_object('garden', garden_state, 'feedback', case when next_phase = 'night' then 'Night has begun. The plant uses stored sugar to keep growing.' else 'A new day has begun. Make a fresh care plan.' end);
end; $$;

create or replace function public.get_biology_dashboard_stats()
returns jsonb language sql security definer set search_path = public as $$
  select jsonb_build_object('completedLevels', coalesce(count(*)::integer,0), 'stars', coalesce(sum(stars),0), 'xp', coalesce(sum(xp),0))
  from public.student_achievements where user_id = auth.uid() and game_id = 'biology';
$$;

revoke all on function public.load_biology_garden() from public, anon;
revoke all on function public.submit_biology_plan(jsonb, integer, text) from public, anon;
revoke all on function public.advance_biology_phase(integer, text) from public, anon;
revoke all on function public.get_biology_dashboard_stats() from public, anon;
grant execute on function public.load_biology_garden() to authenticated;
grant execute on function public.submit_biology_plan(jsonb, integer, text) to authenticated;
grant execute on function public.advance_biology_phase(integer, text) to authenticated;
grant execute on function public.get_biology_dashboard_stats() to authenticated;
