-- Biology Garden: extend the same six milestones across a 30-day study.
-- Existing garden rows and rewards remain compatible.

create or replace function public.submit_biology_plan(p_actions jsonb, p_client_day integer, p_client_phase text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  current_user_id uuid := auth.uid(); garden_state jsonb; action text; water_count integer := 0; sunlight_count integer := 0;
  moisture integer; light integer; nutrients integer; health integer; balance integer; current_stage integer; nutrient_count integer := 0;
  next_stage text; old_stage text; next_phase text; next_day integer; observation text;
  stage_names text[] := array['seed','sprout','leafy','bud','flower','fruit']; required_days integer[] := array[1,4,9,15,22,30]; target_stage integer;
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
  old_stage := garden_state->>'stage'; current_stage := array_position(stage_names, old_stage);
  select count(*)::integer into target_stage from unnest(required_days) as required(day) where required.day <= next_day;
  if least(moisture, least(light, nutrients)) >= 48 and health >= 60 then current_stage := greatest(current_stage, least(array_length(stage_names, 1), target_stage)); end if;
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

grant execute on function public.submit_biology_plan(jsonb, integer, text) to authenticated;
